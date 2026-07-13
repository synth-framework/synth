# EXP-ADP-000 — Adapter Architecture Specification

**Status:** Accepted  
**Kind:** Constitutional Specification  
**Authority:** Synth Architectural Constitution  
**Scope:** All Synth adapters, present and future

---

## Purpose

Define the canonical architecture, lifecycle, and governance model for all Synth adapters.

This specification is implementation-independent and serves as the constitutional contract between the Synth Kernel and every external integration.

Individual adapters (Repository, GitHub, Docker, Kubernetes, Slack, etc.) are implementations of this specification and must not redefine it.

---

## Architectural Position

```
Layer 0 — Constitution
    Principles, ADRs, ATLs, Governance, Proof

Layer 1 — Kernel
    ExecutionGate
    Runtime
    EventStore
    Replay
    Capability Registry
    Adapter Registry

Layer 2 — Adapters
    Repository
    GitHub
    Docker
    Kubernetes
    Filesystem
    LLM
    Cloud
    ...
```

```
                Synth Kernel
                     │
             Adapter Registry
                     │
          Adapter Interface Layer
                     │
        ┌────────────┼────────────┐
        │            │            │
 Repository     GitHub      Docker
  Adapter       Adapter      Adapter
        │            │            │
 External Systems / Services / Platforms
```

The Kernel communicates exclusively through adapter interfaces. No Kernel component may directly invoke external systems.

---

## Principles

Every adapter SHALL be:

- **Optional** — the Kernel must function without any specific adapter.
- **Isolated** — external-system logic lives only inside the adapter.
- **Replaceable** — swapping one adapter for another must not require Kernel changes.
- **Observable** — status, health, capabilities, and diagnostics are always available.
- **Governed** — adapters participate in governance but never bypass it.
- **Deterministic** — lifecycle transitions and capability behavior are reproducible.
- **Capability-driven** — the Kernel invokes capabilities, never adapter-specific functions.

Adapters extend Synth. They never become part of the Kernel.

---

## Adapter Lifecycle

Every adapter SHALL implement the same lifecycle.

```
Discover
    ↓
Configure
    ↓
Validate
    ↓
Enable
    ↓
Healthy
    ↓
Operational
    ↓
Disable
```

Lifecycle transitions are deterministic and observable.

An adapter may not enter `operational` unless validation succeeds.

Failure transitions return the adapter to `configured` or `disabled`, never to an ambiguous state.

---

## Adapter Responsibilities

Every adapter is responsible for:

- Configuration
- Capability implementation
- Health reporting
- External communication
- Error translation
- Resource cleanup
- Governance participation

Adapters are responsible for implementation details. The Kernel is responsible for orchestration.

---

## Capability Model

The Kernel never invokes adapter-specific functions. Instead, adapters expose capabilities.

Examples:

```
InitializeRepository
CommitChanges
PushRepository
PullRepository

StartContainer
StopContainer

CreateIssue
MergePullRequest
```

Capabilities are the only public contract.

---

## Adapter Registry

All adapters SHALL register with the Adapter Registry.

The registry is responsible for:

- Discovery
- Registration
- Enable/disable
- Status
- Health
- Capability lookup

Kernel components depend only on the registry.

---

## Configuration

Every adapter owns its own configuration.

Configuration SHALL include:

- identity
- version
- enabled state
- capabilities
- settings
- health

The Kernel never manipulates adapter-specific configuration.

---

## Health Model

Every adapter reports health using the same model.

Minimum states:

- `unknown`
- `healthy`
- `degraded`
- `unhealthy`
- `disabled`

Health reporting is read-only. The Kernel never infers adapter health.

---

## Governance

Adapters participate in governance. They may:

- provide evidence
- consume proof
- validate operations

They may not bypass governance. No adapter may authorize itself.

---

## Security

Adapters execute with least privilege. They SHALL:

- isolate credentials
- validate inputs
- report failures
- reject unauthorized operations

Secrets never become Kernel state.

---

## Observability

Every adapter SHALL expose:

- status
- health
- capabilities
- version
- diagnostics

Observation never mutates adapter state.

---

## Error Model

Adapters translate implementation-specific failures into canonical Synth errors.

The Kernel must never depend on platform-specific exceptions.

---

## Enable / Disable

Every adapter supports deterministic activation:

```
Enable
Disable
Configure
Validate
Status
Health
```

Enablement must be reversible. Disabling an adapter must not affect Kernel integrity.

---

## Proof Participation

Adapters contribute evidence but do not generate proofs. Proof generation remains a Kernel responsibility.

Adapter evidence may include:

- health
- diagnostics
- configuration validation
- operational verification

---

## Constitutional Rules

Every adapter SHALL satisfy the following invariants:

1. No adapter modifies Kernel architecture.
2. No adapter bypasses governance.
3. No adapter bypasses ExecutionGate.
4. No adapter performs hidden state mutation.
5. No adapter exposes platform-specific behavior to the Kernel.
6. Every adapter is replaceable.
7. Every adapter is independently testable.
8. Every adapter participates in the proof pipeline.
9. Every adapter exposes deterministic lifecycle transitions.
10. Every adapter is observable without mutation.

Violation of any invariant constitutes architectural non-compliance.

---

## Kernel Contract

The Kernel guarantees:

- lifecycle orchestration
- capability routing
- governance
- proof generation
- execution authority

Adapters guarantee:

- implementation
- translation
- observability
- external integration

Responsibilities never overlap.

---

## Adapter Taxonomy

Adapters are classified by what they extend. The taxonomy does not alter the lifecycle or invariants defined in this specification.

```
Adapter
│
├── Integration Adapter
│      Repository       (EXP-ADP-001)
│      GitHub           (EXP-ADP-002)
│      Docker
│      Kubernetes
│      Slack
│
├── Methodology Adapter
│      TDD              (EXP-ADP-003)
│      BDD              (EXP-ADP-004)
│      DDD
│      Security
│      Performance
│
└── Runtime Adapter
       LLM
       Filesystem
       Database
       HTTP
```

| Kind | External System | Purpose |
|------|-----------------|---------|
| Integration Adapter | Yes | Connect Synth to external platforms |
| Methodology Adapter | No | Inject engineering discipline into the workflow |
| Runtime Adapter | Maybe | Provide runtime capabilities without kernel coupling |

Every adapter, regardless of kind, implements the same lifecycle, exposes capabilities, participates in governance, and satisfies the constitutional invariants.

---

## Reference Implementations

| Expedition | Adapter | Kind | Status |
|------------|---------|------|--------|
| EXP-ADP-001 | Repository | Integration | Complete |
| EXP-ADP-002 | GitHub | Integration | Complete |
| EXP-ADP-003 | TDD | Methodology | Complete |
| EXP-ADP-004 | BDD | Methodology | Proposed |

Each implementation extends this specification without modifying it.

---

## Success Criteria

The Adapter Architecture is considered complete when:

- Every adapter conforms to the canonical lifecycle.
- The Kernel depends only on adapter interfaces.
- External systems remain fully isolated.
- Adapters are independently replaceable.
- Governance applies uniformly across all adapters.
- Adapter health is observable.
- Adapter capabilities are discoverable.
- New adapters can be introduced without modifying the Kernel.

---

## Change Process

This specification is part of the Synth Constitutional Baseline and is considered a frozen Kernel interface. Future changes require:

1. An ADR under `docs/adr/`.
2. Updated proofs demonstrating that the change preserves all invariants.
3. Governance approval.
4. A new Constitutional Baseline version if the change affects Layer 0.
