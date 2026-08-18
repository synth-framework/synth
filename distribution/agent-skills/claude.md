# SYNTH Skill

> Deterministic execution system for engineering work. Humans explore, SYNTH remembers, and AI executes deterministically.

## Public vocabulary

**Mission** — A strategic goal you want to achieve.
> Build a customer support portal that lets users track tickets.

**Expedition** — A bounded investigation or build that moves a mission forward.
> Design the authentication flow for the support portal.

**Evidence** — What you know and how confidently you know it.
> User interviews show 80% of support requests are password resets.

**Plan** — The approved path forward, including the work to do.
> Approved plan: implement login page, session management, and password reset.

**Event** — An immutable record that something happened.
> Mission approved. Expedition started. Objective completed.

**State** — The current picture of the world, derived from events.
> The support portal mission is active, the authentication expedition is executing.

**Replay** — Rebuilding state from events to prove correctness.
> Replay the event log to verify that the current state matches the history.

Use exactly these seven concepts in public-facing explanations. Everything else is implementation detail.

## Command safety

### Discovery-safe commands

- `--help` — Show generic help
- `--version` — Print the installed Synth version
- `discover` — Discover repository structure and produce a read-only analysis
- `doctor` — Verify installation and project health
- `status` — Report the current project state
- `explain` — Explain operations (replay, lineage, proposals, snapshots, graph, diagnostics, status, identity, resume, governance, all)
- `validate` — Analyze changes and plan validations
- `verify` — Verify governance invariants and projection consistency
- `certify` — Run failure and recovery certification scenarios
- `version` — Print the installed Synth version
- `bootstrap --dry-run` — Generate a bootstrap proposal without mutating state
- `mission create` — Create a Mission proposal
- `expedition create` — Create an Expedition proposal
- `first-contact start` — Extract intent and create a first-contact proposal draft
- `first-contact clarify` — Show or apply clarification answers to the draft
- `first-contact project` — Project architecture candidates from the draft
- `first-contact verify` — Verify capability assumptions for the selected architecture
- `first-contact status` — Report the current first-contact state
- `first-contact materialize --dry-run` — Preview what materialization would create
- `genesis start` — Alias for 'first-contact start'
- `genesis project` — Alias for 'first-contact project'
- `genesis verify` — Alias for 'first-contact verify'
- `genesis status` — Alias for 'first-contact status'
- `genesis materialize --dry-run` — Alias for 'first-contact materialize --dry-run'

### Mutating commands

- `bootstrap` — Transform a repository into a Synth project (mutating only with --approve)
- `bootstrap --approve` — Apply bootstrap and initialize governance artifacts
- `docs generate` — Generate documentation artifacts
- `init` — Initialize the current directory as a Synth project
- `mission approve` — Approve a Mission draft
- `expedition approve` — Approve an Expedition draft
- `expedition commit` — Commit approved Expedition intent to runtime
- `expedition start` — Start executing a committed Expedition
- `expedition complete` — Complete an executing Expedition
- `validate --full` — Run the complete canonical governance pipeline
- `govern` — Run the full governance pipeline
- `repair replay --approve` — Apply repairs for runtime drift
- `first-contact approve` — Approve the first-contact draft
- `first-contact materialize --approve` — Materialize the approved artifact into a SYNTH project
- `genesis approve` — Alias for 'first-contact approve'
- `genesis materialize --approve` — Alias for 'first-contact materialize --approve'

## Protected assets

- **Mission Studio** — Read-only planning environment; sole authority for transforming evidence into approved Mission Models.
- **Genesis** — Authority for committing approved Mission Models to the Kernel through the single mutation authority.
- **Replay** — Mechanism for rebuilding state from events to prove correctness and detect tampering.
- **ExecutionGate** — Single mutation authority through which all persistent state changes flow.
- **Event Model** — Canonical structure and semantics of immutable events.
- **Capability Model** — Registry of system capabilities and their public contracts.
- **Constitutional Baseline** — Architectural provisions defining the foundations of the system.
- **Public Vocabulary** — The seven public concepts used to explain SYNTH.

Any change to a Protected Asset requires an Architecture Expedition and a new ADR.

## Governance lifecycle

- **draft** — Intent is captured but not yet approved.
- **approved** — Intent is approved and ready to commit.
- **committed** — Intent is committed to runtime state.
- **executing** — Work is actively being performed.
- **completed** — Work is finished and evidence is recorded.

## Common workflows

### Discovery

Produce a read-only analysis of a repository without mutating state.

Commands: `discover`, `doctor`, `status`, `explain`

> Invariant: Discovery never mutates the repository.

### Bootstrap

Transform a repository into a SYNTH-governed project.

- Run 'synth bootstrap --dry-run' to generate a proposal.
- Review the proposal.
- Run 'synth bootstrap --approve' to apply it.

> Invariant: Bootstrap requires explicit approval.

### Mission Lifecycle

Create, approve, and track a strategic goal.

- Run 'synth mission create --subject ... --purpose ...' to draft.
- Run 'synth mission approve --draft-id ...' to approve.

> Invariant: Mission approval requires explicit review evidence.

### Expedition Lifecycle

Execute bounded architectural work within a Mission.

- Run 'synth expedition create --mission ... --subject ... --goal ...' to draft.
- Run 'synth expedition approve --draft-id ...' to approve.
- Run 'synth expedition commit --expedition-id ...' to commit.
- Run 'synth expedition start --expedition-id ...' to start.
- Run 'synth expedition complete --expedition-id ...' to complete.

> Invariant: Expedition state transitions through the ExecutionGate.

### Governance Pipeline

Run the full canonical validation and proof pipeline.

Commands: `synth validate --full`, `npm run govern`

> Invariant: The governance pipeline is deterministic and reproducible.

### First Contact / Genesis

Greenfield onboarding workflow for new projects.

- Run 'synth genesis start' to capture intent.
- Run 'synth genesis clarify' to refine understanding.
- Run 'synth genesis project' to review architecture candidates.
- Run 'synth genesis verify' to validate assumptions.
- Run 'synth genesis approve' and 'synth genesis materialize --approve' to create the project.

> Invariant: Materialization requires explicit approval.

## Capabilities

- **AcceptDecision** — Accept a proposed decision
- **ActivatePlan** — Activate a plan
- **AddObjective** — Add an objective to an expedition
- **ApproveExpedition** — Approve an expedition
- **ApproveMission** — Approve a mission
- **ApprovePromotion** — Approve a proposed promotion
- **ArchiveMission** — Archive a mission
- **BlockWorkItem** — Block a work item
- **CertifyConvergence** — Certify that a mission outcome remains converged with approved intent
- **CommitExpedition** — Commit an approved expedition to runtime
- **CompleteExpedition** — Complete an expedition
- **CompleteMilestone** — Complete a milestone
- **CompleteMission** — Complete a mission
- **CompleteObjective** — Complete an objective
- **CompletePlan** — Complete a plan
- **CompleteWorkItem** — Complete a work item
- **CreateBranch** — Create a governed branch
- **CreateExpedition** — Create a new expedition
- **CreateMilestone** — Create a new milestone
- **CreateMission** — Create a new mission
- **CreatePlan** — Create a new plan
- **CreateProject** — Create a new project
- **CreateRelease** — Create a governed release
- **CreateWorkItem** — Create a new work item
- **FilesystemWrite** — Write a file through the ExecutionGate mutation boundary
- **InitializeProject** — Initialize the current directory as a SYNTH project
- **InitializeRepository** — Initialize repository governance state
- **MergePullRequest** — Merge an approved pull request
- **OpenPullRequest** — Open a pull request as a promotion proposal
- **RecordDecision** — Record and accept a new architectural decision
- **RecordDiscovery** — Record a discovery
- **RecordRepair** — Record that a replay repair was accepted and applied
- **RejectDecision** — Reject a decision
- **StartExpedition** — Start an expedition
- **StartMilestone** — Start a milestone
- **StartWorkItem** — Start work on a work item

## Source

- Canonical model: `src/distribution/ai-capability-model.json`
- Capability list: `docs/reference/capability-list.json`
- Model version: `1.0.0`
- Model hash: `1efbcbfadc0689db6516702167859febb9eabcca70a73ba659fc10e9bf781aa3`
