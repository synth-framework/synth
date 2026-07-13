# Synth v2 Kernel Freeze v1.0

**Freeze Date:** 2026-06-29  
**Authority:** `docs/architecture/constitutional-baseline.md`

---

## Purpose

The kernel freeze declares that the core execution and verification model of Synth v2 is stable. Future work becomes additive: new capabilities, new projections, new audit gates. The kernel itself does not change without an ADR and a new baseline.

---

## Frozen Interfaces

### Adapter Architecture

- EXP-ADP-000 is frozen as the constitutional adapter specification.
- The Adapter Lifecycle (`discover → configure → validate → enable → healthy → operational → disable`) is frozen.
- The Adapter Registry interface is frozen.
- The Adapter Health Model (`unknown | healthy | degraded | unhealthy | disabled`) is frozen.

### ExecutionGate

```ts
class ExecutionGate {
  execute(invocation: CapabilityInvocation): Promise<ExecutionResult>
  executeGenesis(events: SynthEvent[]): Promise<void>
}
```

No new public mutation methods may be added without an ADR.

### SynthEvent

Required fields:

- `id`
- `type`
- `timestamp`
- `transactionId`
- `capability`
- `actor`
- `payload`
- `eventHash`
- `previousHash`

Optional fields:

- `partitionKey`
- `partition`
- `offset`

No required field may be removed. New optional fields require an ADR.

### Replay Engine

```ts
function rebuildState(events: SynthEvent[]): CanonicalState
function computeStateHash(state: CanonicalState): string
```

Replay semantics are frozen. The fold must remain backward-compatible with all events written after this baseline.

### Proof Schema

Current: `synth-proof-v1`

Required top-level fields:

- `schema`
- `generatedAt`
- `repository.commit`
- `repository.sourceHash`
- `build.distHash`
- `runtime.eventCount`
- `runtime.replayHash`
- `proofs`
- `overall.passed`

### EventStore

```ts
class EventStore {
  append(event: SynthEvent): Promise<void>
  appendBatch(events: SynthEvent[]): Promise<void>
  loadAll(): Promise<SynthEvent[]>
  count(): Promise<number>
  getLastEvent(): Promise<SynthEvent | null>
}
```

Writes require the module-private authorization token. This mechanism is frozen.

---

## Mutable Interfaces

The following may be extended without an ADR, provided proof classes are preserved:

- Domain capabilities (new capabilities may be added)
- Projections (new views may be added)
- Audit gates (new P-class checks may be added)
- Documentation (new ADRs, runbooks)

---

## Change Process

To unfreeze any component:

1. Write ADR under `docs/adr/`.
2. Update `docs/architecture/constitutional-baseline.md`.
3. Bump kernel version in this document.
4. Produce updated proof object.
5. Obtain maintainer approval.
