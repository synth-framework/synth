> **Note:** Capabilities listed below operate on execution artifacts (Work Items). These are projections of planning intent, not planning entities. The canonical planning model uses Mission → Expedition → Objective → Work Item. See [Artifact Independence](../guides/philosophy/01-engineering-philosophy.md).

# Capability Reference

## Capability Layers

SYNTH has two distinct capability layers:

- **Domain capabilities** mutate canonical state through the ExecutionGate and produce events. They are registered in the domain Capability Registry during bootstrap and frozen at seal. The tables below list the built-in domain capabilities.
- **Environment capabilities** describe and interact with the execution environment itself — workspace, filesystem, revision control, processes, tools, runtimes, packages, network, forge hosting, secrets, and identity. They are defined by the Environment Layer and never mutate canonical state. See [Environment Capability Families](#environment-capability-families) below.

## Built-in Capabilities

### Ticket Capabilities

| Capability | Input | Output Events | Preconditions |
|------------|-------|---------------|---------------|
| CreateTicket | `id`, `name`, `[status]` | TICKET_CREATED | None |
| StartTicket | `id` | TICKET_STARTED | Ticket exists, status is idle |
| CompleteTicket | `id` | TICKET_COMPLETED | Ticket exists, status is active |
| BlockTicket | `id`, `reason` | TICKET_BLOCKED | Ticket exists |

### Plan Capabilities

| Capability | Input | Output Events | Preconditions |
|------------|-------|---------------|---------------|
| CreatePlan | `id`, `name` | PLAN_CREATED | None |
| ActivatePlan | `id` | PLAN_ACTIVATED | Plan exists, status is draft |
| CompletePlan | `id` | PLAN_COMPLETED | Plan exists, status is active |

### Milestone Capabilities

| Capability | Input | Output Events | Preconditions |
|------------|-------|---------------|---------------|
| CreateMilestone | `id`, `planId`, `name` | MILESTONE_CREATED | Plan exists |
| StartMilestone | `id` | MILESTONE_STARTED | Milestone exists, status is pending |
| CompleteMilestone | `id` | MILESTONE_COMPLETED | Milestone exists, status is in_progress |

### Project Capabilities

| Capability | Input | Output Events | Preconditions |
|------------|-------|---------------|---------------|
| CreateProject | `id`, `name`, `goal` | PROJECT_CREATED | None |

## Capability Details

### CreateTicket

Creates a new ticket in the system.

**Input:**
- `id` (string, required): Unique ticket identifier
- `name` (string, required): Ticket name
- `status` (string, optional): Initial status (default: "idle")

**Output Events:**
- TICKET_CREATED

**Example:**
```
{
    actor: "user-1",
    capability: "CreateTicket",
    payload: { id: "T-1", name: "Implement feature" }
}
```

### StartTicket

Transitions a ticket from idle to active.

**Input:**
- `id` (string, required): Ticket identifier

**Output Events:**
- TICKET_STARTED

**Preconditions:**
- Ticket must exist
- Ticket status must be "idle"

**Example:**
```
{
    actor: "user-1",
    capability: "StartTicket",
    payload: { id: "T-1" }
}
```

### CompleteTicket

Transitions a ticket from active to complete.

**Input:**
- `id` (string, required): Ticket identifier

**Output Events:**
- TICKET_COMPLETED

**Preconditions:**
- Ticket must exist
- Ticket status must be "active"

**Example:**
```
{
    actor: "user-1",
    capability: "CompleteTicket",
    payload: { id: "T-1" }
}
```

### BlockTicket

Transitions a ticket to blocked status.

**Input:**
- `id` (string, required): Ticket identifier
- `reason` (string, required): Block reason

**Output Events:**
- TICKET_BLOCKED

**Preconditions:**
- Ticket must exist

**Example:**
```
{
    actor: "user-1",
    capability: "BlockTicket",
    payload: { id: "T-1", reason: "Waiting for dependency" }
}
```

## Environment Capability Families

The Environment Layer defines twelve canonical capability families (see `src/environment/types.ts`). Each family is a node in the Capability Graph ([ADR-007](../adr/ADR-007-capability-graph-model.md)); providers are concrete implementations of a family contract.

| Family | Description | Required | Provider Contract | Default Provider(s) | ADR |
|--------|-------------|----------|-------------------|---------------------|-----|
| Environment | Execution environment classification | No | Discovery-observed (no provider contract) | — | [ADR-006](../adr/ADR-006-environment-discovery-framework.md) |
| Workspace | Project workspace structure | No | `WorkspaceProvider` | `FilesystemWorkspaceProvider` | [ADR-008](../adr/ADR-008-workspace-capability.md) |
| Filesystem | File reading, writing, and path operations | **Yes** | `FilesystemProvider` | `PosixFilesystemProvider`, `InMemoryFilesystemProvider` | [ADR-010](../adr/ADR-010-filesystem-capability.md) |
| Revision | Revision control system interaction | No | `RevisionProvider` | `GitRevisionProvider` | [ADR-009](../adr/ADR-009-revision-capability.md) |
| Process | Subprocess execution | No | `ProcessProvider` | `LocalShellProvider` | [ADR-011](../adr/ADR-011-process-tool-capability.md) |
| Tool | External tool availability | No | `ToolProvider` | `LocalShellProvider` | [ADR-011](../adr/ADR-011-process-tool-capability.md) |
| Runtime | Language runtime availability | No | `RuntimeProvider` | `NodeRuntimeProvider` | [ADR-012](../adr/ADR-012-runtime-package-capability.md) |
| Package | Package manager interaction | No | `PackageProvider` | `NpmPackageProvider` | [ADR-012](../adr/ADR-012-runtime-package-capability.md) |
| Network | Network reachability and transport | No | Graph node only (no provider contract yet) | — | [ADR-007](../adr/ADR-007-capability-graph-model.md) |
| Forge | Hosting platform interaction | No | `ForgeProvider` | `GitHubForgeProvider` | [ADR-013](../adr/ADR-013-forge-capability.md) |
| Secrets | Secret storage and retrieval | No | `SecretsProvider` | `EnvVarProvider` | [ADR-014](../adr/ADR-014-secrets-identity-capability.md) |
| Identity | Authentication and authorization context | No | `IdentityProvider` | `EnvVarProvider` | [ADR-014](../adr/ADR-014-secrets-identity-capability.md) |

### Capability Dependencies

The Capability Graph records `requires` edges between families:

- Revision → Filesystem
- Package → Filesystem, Runtime
- Process → Runtime
- Tool → Process
- Forge → Revision, Network
- Secrets → Identity

### Provider Model

Environment capability providers advertise the families they satisfy, evaluate their own suitability against discovery evidence, and are selected deterministically: identical discovery evidence always selects the same providers. Reference providers bridging the discovery model live in `src/environment/providers/reference.ts` (`git-revision`, `node-filesystem`, `npm-package`, `node-runtime`, `github-forge`).

Environment capabilities are discovered, not dispatched: the Environment Layer observes the environment and produces replayable `DiscoveryEvidence` ([ADR-006](../adr/ADR-006-environment-discovery-framework.md), [ADR-015](../adr/ADR-015-discovery-evidence-replay.md)) rather than emitting domain events.

## Related Documents

- [07 - Capability Model](../architecture/07-capability-model.md) -- How capabilities work
- [16 - Extension Model](../architecture/16-extension-model.md) -- Adding capabilities
- [ADR-006](../adr/ADR-006-environment-discovery-framework.md) -- Environment Discovery Framework
- [ADR-007](../adr/ADR-007-capability-graph-model.md) -- Capability Graph Model
