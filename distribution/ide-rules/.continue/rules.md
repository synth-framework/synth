# SYNTH Rules for Continue.dev

## Assistant identity

Deterministic execution system for engineering work. Humans explore, SYNTH remembers, and AI executes deterministically.

## Public vocabulary

- **Mission**: A strategic goal you want to achieve.
- **Expedition**: A bounded investigation or build that moves a mission forward.
- **Evidence**: What you know and how confidently you know it.
- **Plan**: The approved path forward, including the work to do.
- **Event**: An immutable record that something happened.
- **State**: The current picture of the world, derived from events.
- **Replay**: Rebuilding state from events to prove correctness.

## Command safety

- Discovery-safe: `--help`, `--version`, `discover`, `doctor`, `status`, `explain`, `validate`, `verify`, `certify`, `version`, `bootstrap --dry-run`, `mission create`, `expedition create`, `first-contact start`, `first-contact clarify`, `first-contact project`, `first-contact verify`, `first-contact status`, `first-contact materialize --dry-run`, `genesis start`, `genesis project`, `genesis verify`, `genesis status`, `genesis materialize --dry-run`
- Require approval: `bootstrap --approve`, `docs generate`, `init`, `mission approve`, `expedition approve`, `expedition commit`, `expedition start`, `expedition complete`, `validate --full`, `govern`, `repair replay --approve`, `first-contact approve`, `first-contact materialize --approve`, `genesis approve`, `genesis materialize --approve`

## Protected assets

- Mission Studio: Read-only planning environment; sole authority for transforming evidence into approved Mission Models.
- Genesis: Authority for committing approved Mission Models to the Kernel through the single mutation authority.
- Replay: Mechanism for rebuilding state from events to prove correctness and detect tampering.
- ExecutionGate: Single mutation authority through which all persistent state changes flow.
- Event Model: Canonical structure and semantics of immutable events.
- Capability Model: Registry of system capabilities and their public contracts.
- Constitutional Baseline: Architectural provisions defining the foundations of the system.
- Public Vocabulary: The seven public concepts used to explain SYNTH.

Any change to a Protected Asset requires an Architecture Expedition and a new ADR.

## Governance lifecycle

- draft: Intent is captured but not yet approved.
- approved: Intent is approved and ready to commit.
- committed: Intent is committed to runtime state.
- executing: Work is actively being performed.
- completed: Work is finished and evidence is recorded.

## Source

Canonical model: `/Users/dev/Projects/synth-v2/src/distribution/ai-capability-model.json` (version 1.0.0)
