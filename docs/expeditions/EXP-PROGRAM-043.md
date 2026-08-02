# EXP-PROGRAM-043 — Agent Onboarding & Operator Experience

> Close the gap between SYNTH's sound governance kernel and the rough, tribal onboarding experience that agents and operators hit in production.

**Status:** Active  
**Kind:** Program  
**Priority:** High  
**Authority:** TaskPRO real-world onboarding retrospective, EXP-GOV-024 brownfield migration findings, EXP-CLI-001 operator feedback  
**Scope:** CLI onboarding flow, human-readable output, capability transparency, derived-state guardrails, agent identity, and evidence tooling  
**Era:** IV — Ecosystem & Adoption  
**Architecture Impact:** Medium  
**Constitutional Impact:** Low  
**Public Impact:** High  
**Execution Impact:** High

---

## Thesis

> SYNTH has the right architectural bones, but it still ships like a kernel without a shell.

The event-log model, mission/expedition lifecycle, and verification gates are sound. The failure mode in the field is not architecture — it is **operator friction**: a black-box bootstrap, missing capability transparency, interleaved log/JSON streams, and error messages that are machine-correct but operator-vague. Agents cannot discover the happy path, and operators cannot tell whether a replay divergence means "revert," "patch the CLI," or "wait for a release."

This program makes SYNTH **adoptable by AI agents and comprehensible to humans** without changing the constitutional event model or replay semantics.

---

## Inputs

Real-world onboarding of TaskPRO under Synth v2.4.1 produced the following validated pain points:

| Pain point | Symptom | Workstream |
|---|---|---|
| Bootstrap is a black box | 13 internal steps, alignment contract, divergence gate, and intent model run without explanation | A |
| No guided first-contact path | Agent cannot tell whether to run `bootstrap`, `alignment prepare`, or `mission create` first | A |
| Missing capabilities are silent | Convergence Certification is required but no command exposes it; `synth docs generate` does not regenerate `AGENTS.md` | C |
| Error messages are vague | "Replay inconsistent: expedition.X.status" gives no recovery action | B |
| CLI help lists commands but not lifecycle sequence | Agent had to infer create → approve → commit → start → complete | B |
| No list command for open programs/expeditions | Operator must grep charters or run dependency checks to see open work | B |
| Mixed log/JSON streams | Bootstrap INFO logs break simple JSON parsing | B |
| Derived files are editable by hand | Agent edited `canonical-state.json` and stale `AGENTS.md` directly | D |
| No expedition scope enforcement | A mobile defect expedition could touch `.synth/` or `knowledge/` unchecked | D |
| No agent identity in events | Cannot answer "what did the agent do, and when?" | F |
| No event-log query CLI | Operator must read raw `.jsonl` | E |
| No automatic evidence capture | Proof files are created manually and may not be attached | E |

---

## Workstreams

### A — Guided Onboarding & First Contact

Objective: replace the `synth bootstrap . --approve` black box with an explicit, explainable path for greenfield and brownfield projects.

```text
EXP-PROGRAM-043 / A
├── EXP-ONBOARD-001   Guided first-contact command (`synth first-contact` / `synth init --guided`)   [COMPLETED]
├── EXP-ONBOARD-002   Migrate first-contact onboarding to the EXP-PROGRAM-034 task engine            [COMPLETED]
├── EXP-AIFC-011      Detected-stack adapter & workflow recommendation                             [DRAFT]
├── EXP-MIGRATE-001   Detect legacy Synth state and offer archive-vs-import                       [DRAFT]
└── EXP-BOOTSTRAP-001 Explain bootstrap stages and emit clean JSON output                          [DRAFT]
```

_Note: ONBOARD-001 shipped first because it bounds the brownfield "archive vs. import" decision before any state mutates. ONBOARD-002 was chartered under EXP-REVIEW-003 to consume the now-operational task engine rather than duplicating orchestration logic; it is now complete._

### B — Actionable CLI Output

Objective: every CLI response must tell the operator what just happened and what to do next.

```text
EXP-PROGRAM-043 / B
├── EXP-CLI-002       Human-readable output mode (`--human`)                                      [COMPLETED]
├── EXP-CLI-003       `synth expedition list` and `synth program list` commands                   [COMPLETED]
├── EXP-EXPLAIN-001   Actionable `synth explain status`                                           [COMPLETED]
├── EXP-DRYRUN-001    Pre-flight dry-run for state-changing commands                              [COMPLETED]
└── EXP-OUTPUT-001    Separate structured stdout from diagnostic logs                             [COMPLETED]
```

_Note: B was prioritized because every state-changing command needs both human-readable output and a safe preview. DRYRUN-001 prevents the `canonical-state.json` hand-edit class of mistakes._

### C — Capability Transparency & Graceful Degradation

Objective: the CLI must advertise what it can and cannot do, and offer safe fallbacks when a capability is missing.

```text
EXP-PROGRAM-043 / C
├── EXP-CAPTRANS-001  `synth capabilities` command                                                [COMPLETED]
├── EXP-CAPTRANS-002  Graceful handling of missing capabilities (e.g. archive fallback)           [COMPLETED]
└── EXP-ADP-001   Surface repository adapter during onboarding                                [COMPLETED]
```

_Note: CAPTRANS-001 ships before CAPTRANS-002 because transparency about missing capabilities is required before a fallback can be chosen safely. EXP-ADP-001 builds on that transparency by showing whether the installed repository adapter is actually connected to a git repo during onboarding._

### D — Derived-State Protection & Guardrails

Objective: agents cannot accidentally edit derived or protected files; expeditions are sandboxed to their declared scope.

```text
EXP-PROGRAM-043 / D
├── EXP-GUARD-001     Refuse direct edits to derived files (canonical-state, AGENTS.md, projections) [COMPLETED]
├── EXP-SCOPE-001     Sandboxed expedition file scope                                              [COMPLETED]
└── EXP-GATE-014      Mandatory verification gates before expedition completion                   [COMPLETED]
```

_Note: GUARD-001 and SCOPE-001 were implemented before the completion gate because refusing accidental writes is a lower-risk, higher-payoff first step. The completion gate is chartered as EXP-GATE-014 because EXP-GATE-001 already names the Program 035 review-lifecycle expedition. The gate checks Convergence Certification first, then attached evidence, then `synth verify`; `--force --reason` bypasses only the operational evidence and verification checks._

### E — Evidence, Audit & Tooling

Objective: make it easy to attach proof, query history, and keep derived documentation in sync.

```text
EXP-PROGRAM-043 / E
├── EXP-EVIDENCE-001  Automatic expedition evidence capture                                       [COMPLETED]
├── EXP-EVENTLOG-001  Event-log query CLI (`synth log`)                                           [COMPLETED]
└── EXP-AGENTS-001    AGENTS.md synchronization command                                             [COMPLETED]
```

_Note: Workstream E runs in parallel with D because evidence tooling is read-only or append-only and does not change the event model._

### F — Agent Identity & Trust

Objective: every governance event is attributable, verifiable, and reversible only with explicit authorization.

```text
EXP-PROGRAM-043 / F
├── EXP-IDENTITY-001  Agent/session identity in events                                            [COMPLETED]
├── EXP-SIGN-001      Event-log signing / Merkle root                                              [IN REVIEW]  (depends on EXP-IDENTITY-001; requires ADR-039 review — touches Event Model)
├── EXP-APPROVAL-001  Two-party approval for destructive operations                               [DRAFT]  (depends on EXP-IDENTITY-001, EXP-SIGN-001; requires ADR-039 review)
└── EXP-GIT-001       Git integration for governance state snapshots                               [DRAFT]  (depends on EXP-IDENTITY-001, EXP-SIGN-001; requires ADR-039 review)
```

_Note: Workstream F is deferred until guardrails (D) are proven. Identity and trust layers require the boundaries they enforce. All four charters are draft and must pass an ADR-039 Convergence Review before implementation; `EXP-SIGN-001` in particular touches the Protected Event Model and is chartered as an Architecture Expedition._

---

## Dependency Chain

```text
A (Guided Onboarding)      — enables B, C
B (Actionable CLI Output)  — enables D, E
C (Capability Transparency) — enables D
D (Guardrails)             — enables F
E (Evidence Tooling)       — runs in parallel
F (Agent Identity & Trust) — depends on D
```

---

## Success Criteria

1. A first-time agent can complete brownfield onboarding without hand-editing state.
2. `synth first-contact` exists and explains each stage before mutating the repo.
3. `synth status --human` produces a prose summary with next action.
4. `synth explain status` returns a concrete blocker and suggested command.
5. State-changing commands support `--dry-run` that previews the event to be appended.
6. `synth capabilities` lists installed and missing capabilities.
7. Direct edits to `canonical-state.json`, `.synth/data/event-log.jsonl`, and `AGENTS.md` are rejected by the CLI/S DK.
8. Expedition scope is enforced: out-of-scope file writes require explicit authorization.
9. Every event records agent identity, parent expedition, and human/autonomous approval status.
10. `npm run govern` passes after every workstream closes.

---

## Protected Assets

- **Event Model** — No changes to event schema or replay semantics.
- **Replay Engine** — Output changes only; replay logic is untouched.
- **Constitutional Baseline** — No new constitutional rules; guardrails are enforcement layers.
- **Public Vocabulary** — The seven canonical terms remain unchanged.

---

## Relationship to Other Work

- **EXP-GOV-024** — Brownfield migration blockers; some findings (missing `expedition certify`, validation map) are prerequisites for this program.
- **EXP-DOC-007** — Generated docs provenance warning; overlaps with Workstream E.
- **EXP-CLI-001** — CLI Consistency & AI Portability; this program extends it with human-readable output and onboarding.
- **EXP-PROGRAM-038 — Audit Remediation** — Hardened the kernel; this program hardens the operator/agent surface.
- **EXP-PROGRAM-042 — Release Certification** — Certifies v1.0; this program is post-v1.0 adoption work.

---

## Definition of Done

- [x] Workstream A deliverable: guided first-contact flow passes first-operator-experience test.
- [x] Workstream B deliverable: every state-changing command has `--dry-run` and `--human` output.
- [x] Workstream C deliverable: `synth capabilities` passes contract tests and the repository adapter is surfaced during onboarding.
- [x] Workstream D deliverable: derived-file edits are rejected and expedition scope is enforced.
- [x] Workstream E deliverable: evidence capture, event-log query, and AGENTS.md sync are operational.
- [x] Workstream F deliverable (part 1): events include agent/session identity metadata.
- [ ] Workstream F deliverable (part 2): destructive ops require two-party approval and event-log signatures are verifiable.
- [x] `npm run govern` passes from a clean clone.
- [x] Phase 3 deliverable: `EXP-ONBOARD-002` merged — first-contact onboarding flow consumes the EXP-PROGRAM-034 task engine.
- [ ] Phase 4 deliverable: Workstream F chartered and implemented (`IDENTITY-001` complete; `SIGN-001` in ADR-039 review; `APPROVAL-001` and `GIT-001` drafted).

---

## Convergence Review

- **Outcome:** CONVERGED.
- **Reviews:**
  - EXP-REVIEW-001 / `docs/governance/convergence-review-043-034.md` — initial review; Workstream F deferred.
  - EXP-REVIEW-003 / `docs/governance/convergence-review-043-003.md` — post-implementation review after Workstreams A–E and 034 task-engine implementation.
- **Caveats:**
  - Workstream F (agent identity, event signing, two-party approval, git integration) is approved to proceed under the existing program charter, but each charter must still pass its own Convergence Review if it touches Protected Assets or the event model.
  - Phase 3 must be chartered as a new expedition that migrates first-contact to the 034 task engine; 043 must not introduce duplicate task-scheduling or graph-engine code.

---

## Current Recommendation

**Start now.** This is the only program among 031/034/043 backed by direct, recent evidence from a real project (TaskPRO). The charters are small, user-facing, and do not require kernel changes.

**Sequencing:**

- Phase 1 (completed): implement the high-impact, low-risk charters:
  - `EXP-ONBOARD-001` — guided first-contact
  - `EXP-CLI-002` / `EXP-CLI-003` — human output and list commands
  - `EXP-EXPLAIN-001` — actionable status explanation
  - `EXP-GUARD-001` — derived-state protection
  - `EXP-SCOPE-001` — expedition scope enforcement
  - `EXP-CAPTRANS-001` — capability transparency
  - `EXP-DRYRUN-001` — pre-flight dry-run for lifecycle commands
- Phase 2 (completed): implement Workstream E evidence tooling:
  - `EXP-EVENTLOG-001` — event-log query CLI
  - `EXP-EVIDENCE-001` — automatic evidence capture
  - `EXP-AGENTS-001` — AGENTS.md synchronization
- Phase 3 (completed): implement `EXP-ONBOARD-002` to migrate the first-contact onboarding flow to the EXP-PROGRAM-034 task engine.
- Phase 4 (in progress): implement Workstream F (agent identity and trust).
  - `EXP-IDENTITY-001` — agent/session identity in events: **completed**.
  - `EXP-SIGN-001` — event-log signing / Merkle root: **in ADR-039 Convergence Review**.
  - `EXP-APPROVAL-001` — two-party approval for destructive operations: drafted, blocked on `SIGN-001`.
  - `EXP-GIT-001` — git integration for governance state snapshots: drafted, blocked on `SIGN-001`.

**Why this ordering:** fixing onboarding and clarity first prevents users from hitting the walls that make `npm run govern` feel slow and scary. The engine upgrade comes after the pain is understood and bounded. Workstream E is safe to run in parallel because it is read-only or append-only and does not mutate the event model.
