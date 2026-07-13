# EXP-AUD-002 — Zero-Trust Architecture Verification

**Status:** Completed  
**Priority:** High  
**Depends On:** `docs/architecture/constitution.md`, EXP-SMA-001, EXP-DET-001  
**Blocks:** EXP-GOV-001

---

## Objective

Make the auditor stronger than the developers. The auditor must actively try to violate every architectural invariant and fail the build when it succeeds.

> "Assume the developer made a mistake. Can I prove the architecture is still intact?"

This expedition shifts Synth from *building* an architecture to *proving* an architecture.

---

## Proof Classes

The audit is organized into five proof classes. Each proof class asks a different question and produces its own evidence.

### P1 — Structural Proofs

**Question:** Can the code even violate the architecture?

| Invariant | Evidence |
|-----------|----------|
| Exactly one mutation authority | `scripts/audit-bypass-map.js` finds every `.append(` / `.appendBatch(` and confirms they occur only inside `ExecutionGate`. |
| No forbidden imports | Static scan confirms layer ordering (Domain does not import Control, etc.). |
| Read-only workspace | `.synth/` is not mutated during repository inspection. |
| Frozen registries | `CapabilityRegistry.freeze()` and `PolicyEngine.freeze()` reject mutations after seal. |
| Generated `dist/` only | `dist/` is produced deterministically from `src/`; no hand-edited artifacts. |

**Script:** `npm run test:audit`

---

### P2 — Behavioral Proofs

**Question:** Does the system behave correctly?

| Invariant | Evidence |
|-----------|----------|
| Replay correctness | `ReplayVerifier` independently reconstructs state from immutable history and compares it bit-for-bit to operational state. |
| Deterministic execution | `scripts/verify-determinism.js` executes identical commands twice and confirms identical fingerprints + state hashes. |
| Deterministic build | Rebuilding `dist/` from the same `src/` produces byte-identical outputs. |
| Deterministic descriptors | Workspace descriptors are pure functions of source state. |

**Scripts:** `npm run test:replay`, `npm run test:determinism`

---

### P3 — Historical Proofs

**Question:** Can every historical event still be understood?

| Invariant | Evidence |
|-----------|----------|
| Replay compatibility | Legacy events (e.g., `TICKET_CREATED`) replay through canonical aliases to the same state. |
| Migration compatibility | Old event logs load and replay without code changes. |
| Schema evolution | Events with and without hash-chain fields coexist; the verifier tolerates legacy segments but enforces the chain once it starts. |

**Scripts:** `tests/skr/compatibility-tests.js`, `npm run test:replay` on archived logs

---

### P4 — Adversarial Proofs

**Question:** Can an attacker violate the constitution?

| Attack | Expected Result |
|--------|-----------------|
| Direct `EventStore.append()` outside `ExecutionGate` | Blocked — `EventStore` requires an authorization token. |
| Capability registry mutation after seal | Blocked — `freeze()` throws. |
| Policy mutation after freeze | Blocked — `freeze()` throws. |
| Event payload tampering | Detected — hash-chain verification fails. |
| Event reordering | Detected — hash-chain verification fails. |
| Event hash forgery | Detected — recomputed event hash does not match. |

**Script:** `npm run test:adversarial`

A failed attack is a **PASS** for the architecture.

---

### P5 — Reproducibility Proofs

**Question:** Can someone else obtain exactly the same result?

| Invariant | Evidence |
|-----------|----------|
| Identical builds from identical sources | Two `npm run build` runs produce identical `dist/` hashes. |
| Identical replay hashes | Replaying the same event log on different machines yields the same state hash. |
| Identical execution fingerprints | Same command + same prior state → same fingerprint. |
| Identical proof objects | `scripts/generate-proof.js` produces a deterministic artifact for a given commit. |

**Scripts:** Build hash comparison inside `scripts/generate-proof.js`, `npm run test:determinism`

---

## Proof Object

After every audit, Synth produces a machine-verifiable artifact:

```
proof/proof-YYYY-MM-DD-HHMMSS.json
```

Contents:

```json
{
  "schema": "synth-proof-v1",
  "generatedAt": "...",
  "repository": { "commit": "...", "sourceHash": "..." },
  "build": { "distHash": "..." },
  "runtime": {
    "eventCount": 9,
    "replayHash": "511548540",
    "projections": { "workItems": 3, "projects": 2, ... }
  },
  "proofs": {
    "p1Structural": { "passed": true, ... },
    "p2Replay": { "passed": true, ... },
    "p2Determinism": { "passed": true, ... },
    "p4Adversarial": { "passed": true, ... }
  },
  "overall": { "passed": true, "summary": [...] }
}
```

**Script:** `npm run proof`

---

## Verification Pipeline

1. **Repository** — verify required documents and source-to-dist relationship.
2. **Dependencies** — verify dependency graph direction.
3. **P1 Structural** — `npm run test:audit`
4. **P2 Behavioral** — `npm run test:replay`, `npm run test:determinism`
5. **P3 Historical** — replay archived and legacy event logs
6. **P4 Adversarial** — `npm run test:adversarial`
7. **P5 Reproducibility** — compare build hashes, generate proof object
8. **Final Assessment** — produce PASS / FAIL verdict with evidence table

---

## Pass Criteria

PASS requires:

- No Critical findings.
- All P1–P5 proof classes satisfied.
- `ReplayVerifier` reports `consistent: true` with `chainValid: true`.
- `scripts/verify-determinism.js` reports paired-execution agreement.
- `scripts/audit-adversarial.js` reports all attacks blocked.
- `scripts/generate-proof.js` produces an accepted proof object.
- Deterministic build.
- 202 tests passing.

Passing tests alone does not constitute architectural compliance.

---

## Implementation Status

| Component | Status | Evidence |
|-----------|--------|----------|
| `src/core/replay-verifier.ts` | ✅ Implemented | Independent witness with hash-chain + state comparison |
| `scripts/verify-replay.js` | ✅ Implemented | Uses canonical `rebuildState` and `ReplayVerifier` |
| `scripts/verify-determinism.js` | ✅ Implemented | Paired-execution check |
| `scripts/audit-bypass-map.js` | ✅ Implemented | Zero exemptions for operational code |
| `scripts/audit-adversarial.js` | ✅ Implemented | 6 attack scenarios |
| `scripts/generate-proof.js` | ✅ Implemented | Produces `proof/proof-*.json` |
| Event hash-chain | ✅ Implemented | `eventHash` + `previousHash` on every new event |
| `EXP-AUD-002.md` | ✅ Implemented | This document |

---

## Definition of Done

- [x] Auditor detects direct mutation attempts.
- [x] Auditor verifies replay with real state comparison.
- [x] Auditor verifies hash-chain continuity.
- [x] Auditor runs adversarial attacks.
- [x] Proof object is generated after audit.
- [x] All tests pass.
- [x] Audit report updated to mark auditor as operational.
