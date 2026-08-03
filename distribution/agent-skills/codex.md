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

Canonical model: `/Users/dev/Projects/synth-v2/src/distribution/ai-capability-model.json` (version 1.0.0)
