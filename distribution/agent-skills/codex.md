# SYNTH Repository Instructions

## Identity

Deterministic execution system for engineering work. Humans explore, SYNTH remembers, and AI executes deterministically.

npm: `@synth-framework/synth`
CLI: `synth`

## Public vocabulary (seven concepts)

- Mission: A strategic goal you want to achieve.
- Expedition: A bounded investigation or build that moves a mission forward.
- Evidence: What you know and how confidently you know it.
- Plan: The approved path forward, including the work to do.
- Event: An immutable record that something happened.
- State: The current picture of the world, derived from events.
- Replay: Rebuilding state from events to prove correctness.

## Rules

1. During discovery, use only these read-only commands: `--help`, `--version`, `discover`, `doctor`, `status`, `explain`, `validate`, `verify`, `certify`, `version`, `first-contact project`, `first-contact verify`, `first-contact status`, `genesis project`, `genesis verify`, `genesis status`
2. Proposals are safe to generate: `bootstrap --dry-run`, `mission create`, `expedition create`, `first-contact start`, `first-contact clarify`, `first-contact materialize --dry-run`, `genesis start`, `genesis materialize --dry-run`
3. These commands require explicit approval before use: `bootstrap --approve`, `docs generate`, `init`, `mission approve`, `expedition approve`, `expedition commit`, `expedition start`, `expedition complete`, `validate --full`, `govern`, `repair replay --approve`, `first-contact approve`, `first-contact materialize --approve`, `genesis approve`, `genesis materialize --approve`
4. Never modify protected assets without an Architecture Expedition and ADR.
5. Prefer the seven public concepts when explaining SYNTH to operators.

## Protected assets

- Mission Studio
- Genesis
- Replay
- ExecutionGate
- Event Model
- Capability Model
- Constitutional Baseline
- Public Vocabulary

## Governance lifecycle

draft → approved → committed → executing → completed

## Source

Canonical model: `/Users/dev/Projects/synth-v2/src/distribution/ai-capability-model.json` (version 1.0.0)
