# EXP-ADP-009 — Specification Adapter

**Status:** Completed  
**Kind:** Evidence Adapter  
**External System:** No  
**Priority:** High  
**Depends On:** EXP-ADP-000, EXP-ADP-OBS-001  
**Blocks:** Mission Studio specification input

---

## Purpose

Read machine-readable specifications and emit canonical Observations for Mission Studio.

The Specification Adapter parses OpenAPI, AsyncAPI, GraphQL, Protocol Buffers, and JSON Schema files. It surfaces both the raw specification as evidence and the declared operations/capabilities as first-class observations.

---

## Classification

| Attribute | Value |
|-----------|-------|
| Adapter kind | Evidence Adapter |
| External system | None |
| Kernel dependency | Observation contract |
| Primary value | Convert API, schema, and protocol specs into Mission Studio input |

---

## Responsibilities

- Scan a configured directory or explicit file list.
- Parse JSON and YAML OpenAPI / AsyncAPI specifications.
- Read GraphQL schema files.
- Read Protocol Buffers `.proto` files.
- Read JSON Schema files.
- Emit `evidence` Observations for each specification document.
- Emit `capability` Observations for declared operations, channels, services, and RPCs.
- Never mutate filesystem state.
- Never infer beyond what the specification explicitly declares.

---

## Supported Formats

| Format | File extensions | Parsing |
|--------|-----------------|---------|
| OpenAPI | `.openapi.json`, `.openapi.yaml`, `.openapi.yml` | JSON / YAML |
| AsyncAPI | `.asyncapi.json`, `.asyncapi.yaml`, `.asyncapi.yml` | JSON / YAML |
| GraphQL | `.graphql`, `.gql` | Text + regex |
| Protocol Buffers | `.proto` | Text + regex |
| JSON Schema | `.schema.json`, `.json` | JSON |

---

## Output

Document observation:

```typescript
Observation {
  category: "evidence"
  subject: "api.openapi.yaml"
  confidence: "high"
  metadata: { format: "openapi", version: "3.0.0" }
}
```

Capability observation:

```typescript
Observation {
  category: "capability"
  subject: "GET /users"
  confidence: "high"
  metadata: { operationId: "listUsers", method: "get", path: "/users" }
}
```

---

## Lifecycle

Uses the canonical adapter lifecycle from EXP-ADP-000:

```
Discover → Configure → Validate → Enable → Healthy → Operational → Disable
```

`observe()` is available once enabled.

---

## Invariants

- `observe()` is read-only.
- Every observation references the file that produced it.
- Parsing errors are collected in `errors` and do not crash the adapter.
- Capabilities are emitted only when explicitly declared in the specification.

---

## Success Criteria

- OpenAPI files produce evidence and capability observations.
- AsyncAPI files produce evidence and capability observations.
- GraphQL files produce evidence and capability observations.
- Protocol Buffer files produce evidence and capability observations.
- JSON Schema files produce evidence observations.
- Adapter passes lifecycle and health checks.

---

## Completion Criteria

Specification Adapter is complete when:

- `src/adapters/specification/adapter.ts` implements `ObservableAdapter`.
- `src/adapters/specification/types.ts` defines the input/output contracts.
- The adapter is registered in `AdapterRegistry`.
- Tests cover all five supported specification formats plus lifecycle.
