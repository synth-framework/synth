# EXP-SIGN-001 — Event-Log Signing / Merkle Root

> Cryptographically sign the governance event log and publish a Merkle root so replay can prove log integrity without trusting the storage layer alone.

**Status:** Completed  
**Kind:** Architecture Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** EXP-PROGRAM-043 Workstream F, EXP-REVIEW-003 required actions, ADR-004 Protected Assets  
**Depends On:** EXP-IDENTITY-001, ADR-039 Convergence Review outcome  
**Blocks:** EXP-GIT-001

---

```yaml
Impact:
  Constitutional: Yes
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Requires ADR
  Requires ADR: Yes
```

---

## Purpose

The event log already uses `eventHash`/`previousHash` chaining for tamper detection, but the chain is self-referential: an attacker who can rewrite the log can recompute every hash. This expedition adds an external cryptographic anchor so that:

- Every hashed event is attributable to an agent identity (via EXP-IDENTITY-001).
- The log can be verified against a published Merkle root without re-running the full replay engine.
- A signature over the Merkle root binds the entire log to a key that is not stored in the log itself.

Because the `SynthEvent` envelope must carry new fields (`signature`, `merkleRoot`, or both), this charter touches the Protected Event Model and must pass an ADR-039 Convergence Review before implementation.

---

## Scope

### In scope

1. Define a signing scheme for individual events and/or periodic Merkle roots.
2. Decide whether signatures live in the event envelope, in a sidecar, or as a new event type.
3. Define key-management scope: which keys sign, where they are stored, rotation, and fallback when no key is configured.
4. Specify what is signed (canonical event bytes, Merkle root of a batch, or both).
5. Add a verification command (`synth verify signatures` or equivalent) that checks signatures and Merkle roots against the current log.
6. Update replay diagnostics to surface signature/Merkle failures independently of chain breaks.
7. Obtain an ADR-039 Convergence Review outcome before writing implementation code.

### Out of scope

- Changing replay semantics or state-folding logic.
- Two-party approval workflows (see EXP-APPROVAL-001).
- Git state snapshots (see EXP-GIT-001).
- Identity capture (see EXP-IDENTITY-001).

---

## Design Decisions (Tentative)

### 1. Envelope field vs. sidecar

The default proposal is to add an optional `signature` field to the `SynthEvent` envelope for every hashed operational event. A periodic `MERKLE_ROOT_PUBLISHED` event (or sidecar file in `.synth/signatures/`) publishes a root over a range of events. The ADR-039 review must confirm whether this is acceptable or whether a sidecar-only design is required to keep the envelope frozen.

### 2. Key management scope

Signing keys are **operator-owned** and live outside the repository by default:

- Primary key: `~/.synth/keys/event-signing.key` (or platform equivalent), generated on first `synth init` if not present.
- Public key: stored in `.synth/keys/event-signing.pub` and committed as governance configuration.
- Rotation: a `KEY_ROTATED` event records the new public key fingerprint and the offset from which it applies.
- No key configured: events are still hashed and chained, but `signature` is absent and verification reports `UNSIGNED` rather than `INVALID`.

### 3. What is signed

For each hashed event:

```text
signature = Sign(signingKey, canonicalize({ eventHash, identity, timestamp }))
```

The payload is deliberately **not** signed directly; `eventHash` already commits to the payload. Identity is included so the signature binds the event to the agent/session that emitted it.

For periodic Merkle roots:

```text
merkleRoot = MerkleRoot([eventHash(i) ... eventHash(j)])
merkleSignature = Sign(signingKey, canonicalize({ merkleRoot, startOffset, endOffset, timestamp }))
```

Merkle root events are appended to the log as a new governance event type.

### 4. Verification command

```text
synth verify signatures [--since <offset>] [--public-key <path>]
```

Output:

- `VALID` — every event in range has a verifiable signature and Merkle roots match.
- `UNSIGNED` — no signing key configured; only chain integrity is checked.
- `INVALID` — at least one signature or Merkle root does not verify; report offsets.
- `KEY_UNKNOWN` — a signature references a key fingerprint not present in the key registry.

### 5. Relationship to replay

Replay continues to use `eventHash`/`previousHash` as the source of truth. Signature verification is a separate, additive check run by `synth verify signatures` and optionally during `synth explain replay`. A signature failure does not change replay output; it adds an integrity warning to the replay report.

---

## Deliverables

### 1. Signing ADR

- Draft an ADR proposing the envelope change, key-management model, and new event type(s).
- Route through ADR-039 Convergence Review.

### 2. Key management utilities

- `src/signing/key-store.ts` — load, generate, rotate, and validate signing keys.
- `src/signing/registry.ts` — public-key registry persisted in `.synth/keys/`.

### 3. Event envelope extension

- Add optional `signature` and `signingKeyFingerprint` fields to `SynthEvent`.
- Add `MERKLE_ROOT_PUBLISHED` event type.
- Update canonicalization to include new fields in a deterministic order.

### 4. Signing hook in ExecutionGate

- After computing `eventHash`, sign the event if a signing key is configured.
- Include `signingKeyFingerprint` in the envelope.

### 5. Verification command

- `synth verify signatures` checks every event signature and every Merkle root.
- `--public-key` allows verification against a key not configured locally.

### 6. Tests

- `tests/event-log-signing.test.js`:
  - Signed events verify with the correct public key.
  - Tampered events fail verification.
  - Unsigned events report `UNSIGNED`.
  - Key rotation produces valid signatures after the rotation offset.
  - Merkle root verifies over a batch of events.

---

## Acceptance Criteria

1. ADR-039 Convergence Review is completed with a **CONVERGED** outcome before implementation merges.
2. A signing ADR is accepted and references ADR-004 Protected Assets.
3. `SynthEvent` envelope gains `signature` and `signingKeyFingerprint` fields without breaking existing replay.
4. `MERKLE_ROOT_PUBLISHED` event type is defined and can be replayed.
5. `synth verify signatures` returns `VALID`, `UNSIGNED`, `INVALID`, or `KEY_UNKNOWN` as appropriate.
6. Tampering with any signed event is detected by `synth verify signatures`.
7. Existing tests pass without changes to event hashes or replay behavior when no signing key is configured.
8. `npm run govern` passes.

---

## Convergence Review

Per `EXP-REVIEW-003` required action 3, this charter **must** pass an ADR-039 Convergence Review before implementation begins. The review must decide:

1. Whether adding `signature`/`signingKeyFingerprint` to the `SynthEvent` envelope is a change to the Protected Event Model.
2. Whether the proposed key-management model is consistent with the architectural baseline.
3. Whether Merkle roots should be envelope events, sidecar files, or both.
4. Whether this charter should remain an Architecture Expedition or be split into a sidecar-signing expedition and a separate event-model evolution expedition.

**Review outcome is a prerequisite.** If the review returns **REWRITE REQUIRED** or **SUPERSEDED**, this charter is updated before any code is written.

### Review record

- **Review ID:** EXP-REVIEW-005
- **Record:** [convergence-review-sign-001.md](../governance/convergence-review-sign-001.md)
- **Outcome:** **CONVERGED** — optional envelope fields and operator-owned Ed25519 keys accepted.
- **Date:** 2026-08-02

---

## Governance

### Protected

- Event Model (`SynthEvent` schema and replay semantics).
- ExecutionGate mutation authority.
- Public Vocabulary.

### Not included

- New mission/expedition lifecycle states.
- Two-party approval policy.
- Git repository operations.

---

## Risks

| Risk | Mitigation |
|---|---|
| Envelope change breaks replay proofs | Keep new fields optional; default to unsigned events; replay ignores signature fields. |
| Key loss locks an operator out of verification | Public key is committed; private key is operator-managed and backed up by standard platform mechanisms. |
| Performance cost of signing every event | Use Ed25519; batch Merkle roots for heavy workloads; signing is optional. |
| Review rejects envelope changes | Charter explicitly scopes sidecar-only alternative; if rejected, split into sidecar expedition and event-model evolution. |

---

## Related Documents

- [EXP-PROGRAM-043 — Agent Onboarding & Operator Experience](EXP-PROGRAM-043.md)
- [EXP-IDENTITY-001 — Agent/Session Identity in Events](EXP-IDENTITY-001.md)
- [EXP-APPROVAL-001 — Two-party Approval for Destructive Operations](EXP-APPROVAL-001.md) (future)
- [EXP-GIT-001 — Git Integration for Governance State Snapshots](EXP-GIT-001.md) (future)
- [docs/architecture/09-event-model.md](../architecture/09-event-model.md)
- [docs/architecture/11-replay.md](../architecture/11-replay.md)
- [docs/adr/ADR-004-synth-eras-and-protected-assets.md](../adr/ADR-004-synth-eras-and-protected-assets.md)
- [docs/adr/ADR-039-architectural-convergence-review.md](../adr/ADR-039-architectural-convergence-review.md)
