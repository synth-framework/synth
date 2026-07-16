# EXP-PROGRAM-010 — Completion Report

**Program:** EXP-PROGRAM-010 — Constitutional Hardening Program
**Status:** Accepted — Constitutional objectives achieved
**Accepted:** 2026-07-16
**Era:** II — Adoption

---

## Verdict

EXP-PROGRAM-010 is the program where the implementation caught up to the Constitution instead of changing it.

The sequence held end to end:

```text
Constitution
        ↓
Implementation violates Constitution
        ↓
Governance exposes violation
        ↓
Implementation corrected
        ↓
Constitution unchanged
```

Every fix landed below the constitutional boundary. The freeze was never relaxed. No Protected Asset was modified. The seven-concept public vocabulary is unchanged.

---

## What the program proved

1. **Defects discovered during First Contact were traced to concrete implementation causes, not architectural flaws.** Broken proposal parent references, unpersisted snapshots, trusting Genesis intake, and determinism-only replay were all implementation gaps.
2. **Every fix was applied below the constitutional boundary.**
3. **New permanent governance mechanisms make those defect classes difficult to reintroduce** — P6 Graph Integrity is now a constitutional proof dimension, snapshots are sealed at approval, and Genesis certifies everything it commits.

---

## Expedition outcomes

| Expedition | Result | PR |
|---|---|---|
| EXP-HARDEN-001 — Mission Studio Integrity | Proposal parent references corrected; proposal graphs validated | #77 |
| EXP-HARDEN-002 — Snapshot Integrity | Snapshots persisted, signed, chained, certified on load | #78 |
| EXP-HARDEN-003 — Genesis Hardening | Genesis certifies snapshots at both commit paths | #79 |
| EXP-HARDEN-004 — Replay Hardening | Additive `graphValid` / `graphViolations`; legacy logs grandfathered | #80 |
| EXP-HARDEN-005 — Graph Integrity | P6 constitutional proof dimension in proof generation and verification | #81 |
| EXP-HARDEN-006 — Validation Expansion | `InMemoryEventStore` persistence footgun eliminated; regression suites | #82 |
| EXP-HARDEN-007 — Observability | `synth explain` lineage / proposals / snapshots / graph / diagnostics / status / all | #83 |

All seven PRs merged with the CI `proof` check green. 122 new hardening tests added across the program.

---

## Key implementation evidence

- `MissionStudio.approve()` now seals snapshots through `validateProposalGraph` before a snapshot can exist.
- `src/mission-studio/snapshot-integrity.ts` — snapshot signing, chaining, certification-on-load; storage contract in `docs/reference/snapshot-storage.md`.
- `src/genesis/certification.ts` — Genesis intake certification at both commit paths.
- `scripts/verify-replay.js` — additive graph verification; `--strict-graph` enforces on new logs; `--log <path>` inspects any log read-only.
- `scripts/generate-proof.js` / `scripts/verify-proof.js` — P6 Graph Integrity proof dimension; documented in `docs/governance.md`.
- `src/cli/explain-observability.ts` + `src/core/replay-attribution.ts` — the `synth explain` subsystem.

---

## Constitution Provenance Matrix

Mapping constitutional principles to the expeditions that hardened them and the evidence that now enforces them.

| Constitutional Principle | Expedition | Evidence |
|---|---|---|
| Mission Studio never mutates runtime state; approval is explicit | HARDEN-001 | `validateProposalGraph` seals snapshots at `MissionStudio.approve()` |
| Approved snapshots are constitutional artifacts | HARDEN-002 | `src/mission-studio/snapshot-integrity.ts`; signatures, chaining, certification-on-load; `docs/reference/snapshot-storage.md` |
| State mutates only through a single governed execution boundary | HARDEN-003 | `src/genesis/certification.ts` — Genesis certifies at both commit paths |
| Replay is deterministic | HARDEN-004 | `consistent` semantics preserved; additive `graphValid` / `graphViolations`; `--strict-graph` |
| Graph Integrity as first-class proof | HARDEN-005 | P6 in `scripts/generate-proof.js` / `verify-proof.js`; `docs/governance.md` |
| Every validation becomes a permanent regression guard | HARDEN-006 | Regression suites; `InMemoryEventStore` footgun eliminated |
| Everything discovered is explainable by replay | HARDEN-007 | `synth explain` lineage / proposals / snapshots / graph / diagnostics / status / all |

---

## Semantic replay

Replay evolved from deterministic replay to semantic replay.

Originally Replay answered:

> "Did we replay the same events?"

Now it also answers:

> "Did those events describe a coherent system?"

`consistent` semantics are untouched; graph verification is additive. Legacy logs (including the local forensic log and the First Contact Archive A) are grandfathered: they report violations as warnings unless `--strict-graph` is passed.

---

## Findings register and dispositions

### F1 — WorkItem → Objective event-model edge

**Disposition: Accepted Constitutional Gap.**

Not an implementation bug — an event-model limitation. `WORK_ITEM_CREATED` payloads carry no `objectiveId` (`src/genesis/snapshot-bridge.ts:158-166`); the edge exists only on `GeneratedWorkItem` (`src/types/state.ts:115-126`); nothing emits `WORK_ITEM_GENERATED`.

Not to be solved inside v2. Route: **ADR → event-model evolution → v2.1**, through the constitutional evolution process.

### F2 — Legacy forensic logs

**Disposition: preserved as immutable forensic evidence.**

- Local `data/event-log.jsonl` — 215 events, sha256 `03718ab49133e34a13ae4a12f677672fc16605a9031f0481d0dee959643c3db5`, 206 pinned graph violations (78 broken-parent, 126 duplicate-creation, 2 orphan).
- First Contact Archive A — `examples/first-contact/recorded-journey/evidence-archive/events.jsonl`, 32 events, `chainValid`/`consistent` true, 36 violations (12 broken-parent / 12 orphan / 12 broken-navigation).

History is not regenerated because it contains known defects. Those defects are the evidence that governance worked:

```text
First Contact → Discovery → Hardening → Proof
```

### F3 — Confidence thresholds

**Disposition: unchanged.** Mission Studio's confidence model remains evidence-driven. The drift guard is the correct place to encode that expectation; thresholds were not weakened to make defects pass.

---

## External validation — TaskPRO first-contact experiment

An independent zero-shot field experiment (SYNTH `2.0.0-rc.1`, Windows, autonomous AI agent, no SYNTH-specific prompting) exercised the unhardened pipeline and confirmed — before the fixes shipped — that this program targeted real failure classes:

- Approval evaporation through memory-only persistence (HARDEN-006 class) — observed in the field.
- Approved snapshots never becoming artifacts (HARDEN-002 class) — observed in the field.
- Runtime state not being inspectable without reading implementation source (HARDEN-007 class) — observed in the field.

The hardened verifier and graph tooling were run against the experiment's event log: `chainValid`, `consistent`, and `graphValid` all pass, including `--strict-graph`.

The experiment also surfaced **new** findings that do not reopen this program (govern recursion, draft-artifact integrity, CLI self-description). They are recorded with proposed follow-on programs in the evidence annex.

**Annex:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md`

---

## Program evolution

| Program | Contribution |
|---|---|
| EXP-PROGRAM-007 | Environmental independence |
| EXP-PROGRAM-008 | Documentation and projection synchronization |
| EXP-PROGRAM-009 | Canonical end-to-end experience that exercised the platform |
| EXP-PROGRAM-010 | Hardened the implementation using findings from that experience — without changing the Constitution |

This sequence demonstrates that SYNTH can improve itself through its own governed workflow.

---

## Acceptance record

- ✅ All seven EXP-HARDEN expeditions completed and merged (PRs #77–#83, CI `proof` green).
- ✅ F1 recorded as a constitutional evolution candidate, not implementation debt.
- ✅ F2 forensic archives preserved immutable.
- ✅ F3 confidence thresholds unchanged.
- ✅ New canonical re-recording ordered as EXP-FIRSTCONTACT-009 rather than overwriting Archive A.
- ✅ Remaining First Contact work resumes on the hardened pipeline.

**Accepted — Constitutional objectives achieved. 2026-07-16.**
