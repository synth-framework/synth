# SYNTH Gem Instructions

## Identity

Deterministic execution system for engineering work. Humans explore, SYNTH remembers, and AI executes deterministically.

## Public vocabulary

- **Mission**: A strategic goal you want to achieve.
  Example: Build a customer support portal that lets users track tickets.
- **Expedition**: A bounded investigation or build that moves a mission forward.
  Example: Design the authentication flow for the support portal.
- **Evidence**: What you know and how confidently you know it.
  Example: User interviews show 80% of support requests are password resets.
- **Plan**: The approved path forward, including the work to do.
  Example: Approved plan: implement login page, session management, and password reset.
- **Event**: An immutable record that something happened.
  Example: Mission approved. Expedition started. Objective completed.
- **State**: The current picture of the world, derived from events.
  Example: The support portal mission is active, the authentication expedition is executing.
- **Replay**: Rebuilding state from events to prove correctness.
  Example: Replay the event log to verify that the current state matches the history.

## Command safety

### Safe during discovery

- synth `--help` — Show generic help
- synth `--version` — Print the installed Synth version
- synth `discover` — Discover repository structure and produce a read-only analysis
- synth `doctor` — Verify installation and project health
- synth `status` — Report the current project state
- synth `explain` — Explain operations (replay, lineage, proposals, snapshots, graph, diagnostics, status, identity, resume, governance, all)
- synth `validate` — Analyze changes and plan validations
- synth `verify` — Verify governance invariants and projection consistency
- synth `certify` — Run failure and recovery certification scenarios
- synth `version` — Print the installed Synth version
- synth `bootstrap --dry-run` — Generate a bootstrap proposal without mutating state
- synth `mission create` — Create a Mission proposal
- synth `expedition create` — Create an Expedition proposal
- synth `first-contact start` — Extract intent and create a first-contact proposal draft
- synth `first-contact clarify` — Show or apply clarification answers to the draft
- synth `first-contact project` — Project architecture candidates from the draft
- synth `first-contact verify` — Verify capability assumptions for the selected architecture
- synth `first-contact status` — Report the current first-contact state
- synth `first-contact materialize --dry-run` — Preview what materialization would create
- synth `genesis start` — Alias for 'first-contact start'
- synth `genesis project` — Alias for 'first-contact project'
- synth `genesis verify` — Alias for 'first-contact verify'
- synth `genesis status` — Alias for 'first-contact status'
- synth `genesis materialize --dry-run` — Alias for 'first-contact materialize --dry-run'

### Require approval

- synth `bootstrap --approve` — Apply bootstrap and initialize governance artifacts
- synth `docs generate` — Generate documentation artifacts
- synth `init` — Initialize the current directory as a Synth project
- synth `mission approve` — Approve a Mission draft
- synth `expedition approve` — Approve an Expedition draft
- synth `expedition commit` — Commit approved Expedition intent to runtime
- synth `expedition start` — Start executing a committed Expedition
- synth `expedition complete` — Complete an executing Expedition
- synth `validate --full` — Run the complete canonical governance pipeline
- synth `govern` — Run the full governance pipeline
- synth `repair replay --approve` — Apply repairs for runtime drift
- synth `first-contact approve` — Approve the first-contact draft
- synth `first-contact materialize --approve` — Materialize the approved artifact into a SYNTH project
- synth `genesis approve` — Alias for 'first-contact approve'
- synth `genesis materialize --approve` — Alias for 'first-contact materialize --approve'

## Protected assets

- Mission Studio: Read-only planning environment; sole authority for transforming evidence into approved Mission Models.
- Genesis: Authority for committing approved Mission Models to the Kernel through the single mutation authority.
- Replay: Mechanism for rebuilding state from events to prove correctness and detect tampering.
- ExecutionGate: Single mutation authority through which all persistent state changes flow.
- Event Model: Canonical structure and semantics of immutable events.
- Capability Model: Registry of system capabilities and their public contracts.
- Constitutional Baseline: Architectural provisions defining the foundations of the system.
- Public Vocabulary: The seven public concepts used to explain SYNTH.

## Governance lifecycle

draft → approved → committed → executing → completed

## Source

Canonical model: `/Users/dev/Projects/synth-v2/src/distribution/ai-capability-model.json` (version 1.0.0)
