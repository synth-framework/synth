# EXP-DISCOVERY-007 — IDE / MCP / Web Consumers

> **Discovery expedition.** Establish the Discovery Consumption Layer: a stable, pluggable boundary through which CLI, IDE, MCP, Web, Genesis, Governance, and future systems consume `DiscoverySession` without coupling to compiler internals.

**Status:** Completed  
**Started:** 2026-07-18  
**Completed:** 2026-07-18  
**Kind:** Product Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-006 — Discovery Platform  
**Depends On:** EXP-DISCOVERY-002, EXP-DISCOVERY-003, EXP-DISCOVERY-004, EXP-DISCOVERY-005, EXP-DISCOVERY-006

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Objective

Define and implement the **Discovery Consumption Layer**: the stable boundary between the Discovery compiler and every external consumer.

The compiler pipeline ends with a `DiscoverySession`. This expedition establishes how external systems turn a `DiscoverySession` into useful representations:

```text
DiscoverySession
        │
        ▼
DiscoveryConsumer
        │
        ▼
External Representation
```

Examples of consumers:

```text
CLI Consumer        → command-line output
JSON Consumer       → serialized session artifact
Replay Consumer     → ReplayReport / ReplayCertificate
Drift Consumer      → DriftReport
IDE Consumer        → language-server diagnostics (contract only)
MCP Consumer        → MCP resources/tools/prompts (contract only)
Web Consumer        → HTTP API payload (contract only)
Genesis Consumer    → governed baseline input
```

The compiler never knows these consumers exist. Transport, format, and policy live entirely in the Consumption Layer.

---

## Problem Statement

DISCOVERY-001 through DISCOVERY-006 built a complete compiler:

```text
Acquire → Normalize → Correlate → Project → Replay
```

But there is no stable boundary for using the compiler's output. Today, `bootstrap-analyzer.ts` directly consumes `DiscoverySession.projections["project-model"]`. Future consumers—CLI, IDE, MCP, Web, drift detection—will each embed their own ad-hoc mapping logic unless a common consumption model is established.

Without a Consumption Layer:

- Compiler internals leak into every consumer.
- CLI, IDE, and Web code re-implement similar transformations.
- Drift detection couples to projection shapes.
- Session serialization is inconsistent across tools.
- Governance and Genesis cannot reliably reference Discovery output.

---

## Motivation

A compiler without a consumption model is incomplete. The Discovery compiler must expose a single, stable interface that all downstream systems use.

The Consumption Layer turns `DiscoverySession` from an internal artifact into a platform capability. It enables the same session to be consumed by a terminal, an IDE plugin, an MCP server, a web dashboard, a governance pipeline, or a CI runner without any of them depending on compiler internals.

---

## Goals

This expedition shall:

- Define a generic `DiscoveryConsumer` contract.
- Implement a consumer registry and execution pipeline.
- Establish a deterministic session serialization contract.
- Implement reference consumers:
  - `JsonConsumer` — serialize a session to a stable JSON artifact.
  - `CliConsumer` — produce the structured output consumed by `synth bootstrap` and future `synth discover` commands.
  - `ReplayConsumer` — produce a `ReplayReport` (and optionally a `ReplayCertificate`) from a session.
  - `DriftConsumer` — compare two sessions and produce a deterministic `DriftReport`.
- Prove IDE, MCP, and Web integration points through contract tests, not full implementations.
- Migrate existing CLI usage (`synth bootstrap --dry-run`) to consume the session through the Consumption Layer.
- Ensure `npm run govern` passes.

---

## Non-Goals

This expedition shall not:

- Implement full IDE, MCP, or Web clients.
- Build session persistence infrastructure beyond deterministic serialization.
- Implement remediation, approval, or governance workflows.
- Modify the Discovery compiler pipeline.
- Modify Protected Assets.
- Change the Genesis event model.

---

## DiscoveryConsumer Contract

A consumer is a pure function over a `DiscoverySession` (and optional context) that produces a typed output:

```ts
interface DiscoveryConsumer<TInput, TOutput> {
  id: string
  version: string
  /** Consumer classification for tooling and policy. */
  kind: "presentation" | "analytical" | "persist" | "integration"
  /** Human-readable description. */
  description: string
  /** Produce the consumer output from a DiscoverySession. */
  consume(session: DiscoverySession, context?: TInput): TOutput
}
```

Consumers:

- Must be **observational**: they read the session and produce an external representation or derived artifact. They must never mutate the `DiscoverySession`, compiler state, or observed system.
- Must not depend on compiler internals beyond the public `DiscoverySession` contract.
- Must declare their output schema or type.
- May declare required projections (e.g., `project-model`, `findings`).

Side effects such as writing a file, emitting diagnostics, or displaying UI are allowed only after the consumer has produced its output. The consumer itself remains functionally pure from the compiler's perspective.

---

## ConsumerResult Contract

Every consumer execution returns a consistent envelope:

```ts
type ConsumerResult<TOutput> = {
  consumerId: string
  consumerVersion: string
  outputType: string
  outputHash: string
  output: TOutput
  warnings: string[]
  durationMs: number
  provenance: {
    sessionId: string
    sessionHash: string
    consumedAt: number
  }
}
```

The registry wraps the raw consumer output in this envelope. The envelope enables:

- Consistent auditing across all consumers.
- Output hashing for cache invalidation and replay.
- Warning collection without coupling consumers to logging.
- Future orchestration and diagnostics.

---

## Consumer Registry

The registry collects consumers and routes sessions to them:

```ts
interface ConsumerRegistry {
  register(consumer: DiscoveryConsumer<unknown, unknown>): void
  unregister(id: string): void
  resolve<TInput, TOutput>(id: string): DiscoveryConsumer<TInput, TOutput> | undefined
  list(): DiscoveryConsumer<unknown, unknown>[]
  execute<TInput, TOutput>(id: string, session: DiscoverySession, context?: TInput): TOutput
}
```

Registry responsibilities:

- Prevent duplicate consumer IDs.
- Validate that a consumer's required projections exist in the session before execution.
- Capture execution provenance (consumer id, version, session hash, output hash).

---

## Session Serialization Contract

Every serialized `DiscoverySession` must:

- Be produced through the canonicalization infrastructure (`src/discovery/canonical.ts`).
- Be deterministic: identical canonical content produces identical bytes.
- Include schema version.
- Exclude transient runtime fields if the serialized form is intended for cross-run comparison.

The `JsonConsumer` is the reference implementation of this contract.

---

## Reference Consumers

### JsonConsumer

Produces a deterministic JSON representation of a `DiscoverySession`.

Use cases:

- Session artifacts stored alongside builds.
- Governance evidence attachments.
- Cross-system exchange.

### CliConsumer

Produces the structured CLI output currently returned by `synth bootstrap --dry-run`.

This consumer replaces direct `DiscoverySession` inspection in the bootstrap CLI path.

### ReplayConsumer

Runs `verifyDiscoveryReplay` and returns a `ReplayReport`.

Optionally produces a future `ReplayCertificate` artifact containing:

- Session id and hash.
- Replay report summary.
- Consumer provenance.
- Timestamp.

No signing or persistence is implemented in this expedition.

### DriftConsumer

Compares two `DiscoverySession` instances and produces a `DriftReport`:

```ts
type DriftReport = {
  sessionA: { id: string; hash: string }
  sessionB: { id: string; hash: string }
  findings: DriftFinding[]
  summary: {
    added: number
    removed: number
    changed: number
    unchanged: number
  }
}
```

Drift findings are derived from canonical projection comparisons, not raw observations or EvidenceGraph internals.

Scope limits:

- Detect added/removed/changed projections and findings.
- No remediation.
- No governance action.
- No approval workflow.

---

## IDE / MCP / Web Integration Points

This expedition does not implement full clients. Instead, it proves the Consumption Layer supports them through contract tests:

- An `IdeConsumer` contract test verifies the consumer can produce language-server-friendly diagnostics from a session.
- An `McpConsumer` contract test verifies the consumer can produce MCP resources/tools/prompts shapes.
- A `WebConsumer` contract test verifies the consumer can produce a JSON payload suitable for HTTP APIs.

These tests ensure the architecture can support future implementations without designing those implementations now.

---

## CLI Migration

`src/cli/bootstrap-analyzer.ts` currently consumes `DiscoverySession.projections["project-model"]` directly. This expedition migrates it to use the Consumption Layer:

```text
Before:
  bootstrap-analyzer → DiscoverySession.projections

After:
  bootstrap-analyzer → CliConsumer → structured CLI output
```

The CLI output contract remains unchanged.

---

## Acceptance Criteria

A successful expedition:

- [x] `DiscoveryConsumer` contract is defined.
- [x] Consumer registry and execution pipeline are implemented.
- [x] Deterministic session serialization contract is established.
- [x] `JsonConsumer` is implemented and tested.
- [x] `CliConsumer` is implemented and tested.
- [x] `ReplayConsumer` is implemented and tested.
- [x] `DriftConsumer` is implemented and produces deterministic `DriftReport`.
- [x] IDE, MCP, and Web integration points are proven through contract tests.
- [x] Existing bootstrap CLI contract is preserved after migration to the Consumption Layer.
- [x] Existing `tests/brownfield-validation.test.js` passes without changes.
- [x] `npm run build` passes.
- [x] `npm run govern` passes.

---

## Architectural Principles

This expedition reinforces:

> **The compiler produces sessions; the Consumption Layer produces representations.**

> **Consumers depend only on the public `DiscoverySession` contract.**

> **Transport and format are consumer concerns, not compiler concerns.**

> **Serialization is deterministic and canonical.**

> **Drift detection is analytical, not remedial.**

---

## Expected Outcome

After completion:

- External systems consume Discovery output through a single, stable contract.
- New consumers can be added without changing the compiler.
- CLI, Genesis, drift detection, and future IDE/MCP/Web tools share the same consumption model.
- Session artifacts are deterministic and exchangeable.
- The Discovery compiler becomes a complete platform: acquisition, correlation, projection, replay, and consumption.

---

## Governance

### Protected

- `DiscoveryConsumer` contract
- Consumer registry interface
- Session serialization contract
- `DriftReport` shape

### Not included

- Full IDE/MCP/Web client implementations
- Session persistence backends
- Signed Replay Certificates
- Governance workflows
- Remediation logic

---

## Related Documents

- [EXP-PROGRAM-006 — Discovery Platform](EXP-PROGRAM-006.md)
- [EXP-DISCOVERY-002 — Discovery Engine](EXP-DISCOVERY-002.md)
- [EXP-DISCOVERY-003 — First Observation Capabilities](EXP-DISCOVERY-003.md)
- [EXP-DISCOVERY-004 — Projection Capability Mechanism](EXP-DISCOVERY-004.md)
- [EXP-DISCOVERY-005 — Brownfield Genesis Integration](EXP-DISCOVERY-005.md)
- [EXP-DISCOVERY-006 — Replay Verification](EXP-DISCOVERY-006.md)
