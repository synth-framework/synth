# EXP-DISCOVERY-006 — Replay Verification

> **Discovery expedition.** Elevate replay from a verification utility to a first-class compiler subsystem responsible for proving provenance, determinism, and reproducibility of every DiscoverySession.

**Status:** Completed  
**Started:** 2026-07-18  
**Completed:** 2026-07-18  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-006 — Discovery Platform  
**Depends On:** EXP-DISCOVERY-002, EXP-DISCOVERY-003, EXP-DISCOVERY-004, EXP-DISCOVERY-005

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Objective

Elevate replay from a verification utility to a first-class compiler subsystem responsible for proving provenance, determinism, and reproducibility.

After this expedition, the Discovery compiler exposes a formal replay contract: every stage declares what it means to replay, how equivalence is determined, and what evidence is required. The `ReplayVerifier` becomes a specification-driven subsystem that produces a structured `ReplayReport`, not merely a status enum.

---

## Problem Statement

The current replay model in `src/discovery/replay.ts` validates a `DiscoverySession` by recomputing pipeline hashes and comparing them to stored values. It works, but it remains an implementation detail rather than a compiler invariant.

Limitations today:

- Replay status is a coarse enum (`exact`, `equivalent`, `contextual`, `invalid`, `impossible`) without per-stage detail.
- There is no formal replay contract per pipeline stage.
- Tamper detection is implicit in hash mismatches, not explicit.
- Adapter determinism is not systematically classified.
- Canonical serialization and hashing are utilities, not first-class compiler infrastructure.
- Cross-run equivalence is tested incidentally, not certified.

Without a hardened replay subsystem, future consumers (CLI, CI, drift detection, governance) will each have to reason about replay semantics independently.

---

## Motivation

Replay is the bridge between evidence and trust. A DiscoverySession claims to represent an observed system at a point in time. Replay proves whether that claim still holds.

If replay is weak or under-specified, everything built on Discovery—bootstrap, governance, audit, drift detection—rests on an uncertain foundation. Strengthening replay now makes every future consumer more reliable and every future expedition smaller.

---

## Goals

This expedition shall:

- Formalize a **Replay Contract** for every Discovery pipeline stage.
- Harden `ReplayVerifier` into a first-class compiler subsystem.
- Implement **stage-by-stage hash verification** with explicit per-stage results.
- Add explicit **tamper detection** for session content and provenance.
- Prove **cross-run equivalence** for deterministic adapters.
- Introduce **deterministic adapter classification**: `deterministic`, `contextual`, `non-deterministic`.
- Graduate canonical serialization and hashing into compiler infrastructure (`Canonicalizer` / `Serializer` / `Hasher`).
- Replace the coarse `ReplayResult` enum with a structured `ReplayReport`.
- Ensure `npm run govern` passes.

---

## Non-Goals

This expedition shall not:

- Load stored sessions from disk.
- Add CLI replay commands.
- Implement replay providers or drift detection UX.
- Introduce persistence for sessions.
- Build operator-facing replay workflows.
- Modify Protected Assets.
- Change the Genesis event model.

---

## Replay Contract

Every pipeline stage declares a replay invariant.

| Stage          | Replay invariant                                              |
| -------------- | ------------------------------------------------------------- |
| Acquire        | Adapter metadata and source state are equivalent or explainable. |
| Normalize      | Canonical observations hash matches.                          |
| Correlate      | EvidenceGraph hash matches.                                   |
| Project        | Each projection output hash matches its declared dependencies.  |
| Verification   | Overall session hash matches.                                 |

A stage passes replay when its invariant holds. A session passes replay when every stage passes and the overall session hash is intact.

---

## Deterministic Adapter Classification

Adapters shall be classified at registration time:

- **Deterministic:** Same source state always produces the same observations. Examples: filesystem, Git.
- **Contextual:** Observations depend on external state that may change between runs. Examples: live HTTP, cloud APIs.
- **Non-deterministic:** Observations include inherently random or sampled data. Examples: profiling with random sampling.

Replay status is derived from these classifications. A contextual adapter does not produce an `exact` replay, but it may still produce a valid `contextual` replay if source-state snapshots are preserved.

---

## Canonicalization Infrastructure

Introduce compiler infrastructure for canonical serialization and hashing:

```text
Canonicalizer
  └── normalize object shape, key order, and encoding

Serializer
  └── produce a stable byte representation

Hasher
  └── produce a cryptographic digest
```

`hashCanonical()` becomes a consumer of these primitives. The primitives become reusable across the compiler, not only inside replay.

---

## ReplayReport

Replace `ReplayResult` with a structured report:

```ts
type ReplayStageResult = {
  stage: PipelineStageName
  status: "passed" | "failed" | "contextual" | "skipped"
  expectedHash: string
  actualHash: string
  invariant: string
  warnings: string[]
}

type ReplayReport = {
  status: "exact" | "equivalent" | "contextual" | "invalid" | "impossible"
  sessionId: string
  sessionHash: string
  stageResults: ReplayStageResult[]
  adapterChecks: AdapterCheckResult[]
  provenanceChecks: ProvenanceCheckResult[]
  tamperDetected: boolean
  tamperDetails?: string[]
  durationMs: number
}
```

The report is the canonical output of replay. Future UX, providers, and governance consume the report rather than inferring meaning from a single status value.

---

## Tamper Detection

Replay shall explicitly detect tampering:

- Session hash does not match recomputed canonical hash.
- Stage hashes do not match recorded provenance.
- Evidence claim references are missing or altered.
- Adapter metadata has been modified.
- Projection output hashes do not match dependencies.

When tampering is detected, the report marks `tamperDetected: true` and lists `tamperDetails`. It does not silently downgrade to `contextual`.

---

## Cross-Run Equivalence

The compiler shall certify that deterministic adapters produce equivalent sessions across runs.

Two notions of equivalence are distinguished:

- **Identity:** Canonical hashes are byte-identical. This proves the compiler reproduced the exact same canonical output.
- **Equivalence:** Semantic content is identical even if benign surface differences exist. Equivalence is verified by comparing the canonical structures that produced the hashes, not merely the hashes themselves.

Acceptance tests shall:

- Run Discovery twice against the same source state.
- Assert that both sessions produce `exact` replay reports.
- Assert that canonical hashes are identical (identity).
- Assert that `ReplayReport` contents are equivalent.

For contextual adapters, tests shall assert that replay status is `contextual` and that source-state snapshots are preserved.

### Compiler reproducibility, not world reproducibility

Replay certifies that the compiler reproduces the same outputs from equivalent observations and configuration. It does **not** prove that the external world has not changed. A contextual adapter may legitimately produce different observations because the world changed; replay's job is to report that faithfully, not to prevent it.

---

## Bootstrap Integration

`bootstrap-analyzer.ts` already carries `discoverySessionId` and `discoverySessionHash`. This expedition does not change that contract, but it ensures the hashes are produced by the hardened canonicalization infrastructure and that replay can validate them.

---

## Acceptance Criteria

A successful expedition:

- [x] Replay Contract is defined for every pipeline stage.
- [x] `ReplayVerifier` is refactored into a first-class subsystem.
- [x] Stage-by-stage hash verification produces per-stage results.
- [x] Tamper detection is explicit and reported.
- [x] Adapter determinism classification is implemented and used.
- [x] Canonicalization infrastructure (`Canonicalizer`, `Serializer`, `Hasher`) exists.
- [x] `ReplayReport` replaces the coarse `ReplayResult` enum.
- [x] Cross-run equivalence is certified for deterministic adapters.
- [x] Existing replay tests pass without semantic regression.
- [x] New tests cover tamper detection, stage results, and adapter classification.
- [x] `npm run build` passes.
- [x] `npm run govern` passes.

---

## Architectural Principles

This expedition reinforces:

> **Replay is a compiler invariant, not a utility.**

> **Every pipeline stage declares how it can be replayed.**

> **Determinism is classified, not assumed.**

> **Canonicalization is compiler infrastructure.**

> **Replay produces evidence, not just a verdict.**

---

## Expected Outcome

After completion:

- The Discovery compiler can prove the integrity of any `DiscoverySession`.
- Replay failures are actionable and point to specific stages or artifacts.
- Tampering is detected explicitly rather than inferred from hash noise.
- Deterministic adapters are certified for cross-run equivalence.
- Canonicalization primitives are reusable across the compiler.
- Future expeditions can build replay providers, drift detection, and operator workflows on a stable foundation.
- The `ReplayReport` provides the foundation for a future immutable **Replay Certificate** that can be signed, attached to governance proofs, and referenced by Genesis.

---

## Governance

### Protected

- Replay Contract
- `ReplayReport` shape
- Canonicalization primitives
- Adapter determinism classification

### Not included

- Session persistence
- Replay CLI
- Replay providers
- Drift detection UX
- Operator workflows

---

## Related Documents

- [EXP-PROGRAM-006 — Discovery Platform](EXP-PROGRAM-006.md)
- [EXP-DISCOVERY-002 — Discovery Engine](EXP-DISCOVERY-002.md)
- [EXP-DISCOVERY-003 — First Observation Capabilities](EXP-DISCOVERY-003.md)
- [EXP-DISCOVERY-004 — Projection Capability Mechanism](EXP-DISCOVERY-004.md)
- [EXP-DISCOVERY-005 — Brownfield Genesis Integration](EXP-DISCOVERY-005.md)
