# ADR-015 — Discovery Evidence & Replay Integration

**Status:** Accepted  
**Date:** 2026-07-15  
**Author:** Synth Architecture  
**Deciders:** Synth Architecture

---

## Context

ADR-006 established the Environment Layer and declared that the Discovery Evidence Artifact is "machine-readable, versioned, and replayable" and "becomes part of the constitutional evidence for every Mission execution." EXP-ENV-001 through EXP-ENV-009 delivered the discovery orchestrator, the `synth-discovery-evidence-v1` schema, and all capability providers. EXP-ENV-010 now requires that discovery evidence become replayable constitutional evidence integrated with Replay and Proof.

The constitutional constraint is that **Replay, the Event Model, and the `synth-proof-v1` proof schema are frozen Protected Assets**. This ADR therefore defines an integration that adds no event types, modifies no replay reducer behavior, and changes no proof object fields.

## Decision

### 1. Canonical Evidence Schema Confirmed

`synth-discovery-evidence-v1` (defined in ADR-006, implemented in EXP-ENV-001) is confirmed as the canonical discovery evidence schema. No schema change is required or made.

### 2. Canonical Serialization and Content Hash

Two pure functions give every evidence artifact a stable identity:

- `canonicalizeEvidence(evidence)` — deterministic JSON serialization (sorted keys, recorded array order preserved).
- `hashDiscoveryEvidence(evidence)` — SHA-256 over the canonical form, **excluding volatile fields** (the root `timestamp` and each observation's `timestamp`). Volatile fields record *when* discovery happened; they are not part of *what* was discovered. Two discovery runs in an identical environment must produce identical hashes.

### 3. Evidence Replay Within the Environment Layer

Evidence replay is implemented inside the Environment Layer. The frozen Replay engine, its reducers, and the Event Model are **not modified**.

`replayDiscoveryEvidence(evidence)` re-derives every derived section of the artifact purely from the recorded observations and provider selections:

```text
recorded observations
        ↓
environment.classification, environment.platform
capabilities
assumptions
compatibility
```

`verifyDiscoveryReplay(evidence)` compares the re-derived sections against the recorded sections and reports `consistent` plus any divergences. Provider *selections* are treated as recorded decisions (inputs), exactly as events are treated in kernel replay; everything *derived* from them must reproduce exactly. This satisfies the acceptance criterion: the same discovery evidence always produces the same result, using only the evidence.

### 4. Evidence Persistence

`persistDiscoveryEvidence` / `loadDiscoveryEvidence` write and read the canonical artifact through the `FilesystemProvider` capability (ADR-010). The evidence artifact is a file artifact, not an event; the event log is untouched.

### 5. Proof Inclusion Without Schema Change

The `synth-proof-v1` object shape is **unchanged**. Discovery evidence becomes part of the proof *gate*:

```text
npm run proof
  = node scripts/verify-discovery-evidence.js
 && node scripts/generate-proof.js
```

The verification script runs discovery twice in the current environment (determinism), persists and reloads the artifact (round-trip), and replays the recorded evidence (consistency). Any divergence fails the proof gate before proof generation begins.

### 6. Core Boundary Rule

No frozen kernel component is modified. All replay and verification logic for discovery evidence lives in the Environment Layer and in governance scripts.

## Consequences

- **Easier:** Discovery evidence has a stable, hashable identity suitable for evidence chains.
- **Easier:** Evidence replay proves environmental determinism without touching frozen assets.
- **Easier:** The proof gate now covers environmental discovery, closing the gap between ADR-006's declaration and enforcement.
- **Harder:** If the proof object itself must one day embed discovery evidence, that requires a future `synth-proof-v2` ADR — explicitly out of scope here.

## Proof Impact

- **P1 Structural:** Reinforced — evidence handling is isolated in the Environment Layer.
- **P2 Behavioral:** Strengthened — environmental determinism is verified on every proof run.
- **P3 Historical:** Strengthened — discovery artifacts are canonical, persistable, and replayable, fulfilling ADR-006's P3 declaration without modifying kernel replay.
- **P4 Adversarial:** Strengthened — tampering with a recorded artifact is detectable through replay divergence.
- **P5 Reproducibility:** Strengthened — identical environments produce identical evidence hashes; evidence alone reproduces all derived sections.

## Kernel Impact

No frozen kernel components are modified. The Event Model gains no event types. The Replay engine and its reducers are untouched. The `synth-proof-v1` proof object shape is unchanged; only the proof *gate* pipeline gains a step.

## Constitutional Baseline Impact

No version numbers change. This ADR is added to the active ADR list in `docs/adr/README.md` and referenced from `docs/architecture/constitutional-baseline.md`.

## Related

- `docs/adr/ADR-006-environment-discovery-framework.md`
- `docs/adr/ADR-007-capability-graph-model.md`
- `docs/adr/ADR-010-filesystem-capability.md`
- `docs/expeditions/EXP-PROGRAM-007.md`
- `docs/expeditions/EXP-ENV-010.md`
