# EXP-AI-005 — Interoperability SDK

> **Engineering expedition.** Publish language-agnostic SDKs that agents use to parse the Genesis Protocol, execute discovery, exchange artifacts, consume replay, and validate governance.

**Status:** Completed  
**Kind:** Engineering Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-026 — AI Agent Interoperability  
**Depends On:** EXP-AI-001 (Genesis Protocol), EXP-AI-003 (Repository Semantic Metadata)  
**Blocks:** EXP-AI-007

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Objective

Provide SDKs that reduce the cost of building a SYNTH-compliant agent. The SDKs are thin wrappers around the Genesis Protocol and repository metadata; they do not embed SYNTH implementation logic.

---

## Origin Evidence

Without an SDK, every agent integration must reimplement protocol parsing, artifact validation, and replay consumption. This duplication is error-prone and slows ecosystem adoption.

---

## Required Change

### 1.1 SDK modules

```text
Protocol Parser
    ↓
Discovery Executor
    ↓
Artifact Exchange
    ↓
Replay Consumer
    ↓
Governance Validator
```

### 1.2 Supported capabilities

- Parse Genesis Protocol messages.
- Read and validate `.synth/ai/` metadata.
- Execute Discovery workflows through public CLI commands.
- Produce and validate Discovery artifacts.
- Consume replay output for decision inspection.
- Validate proposed actions against governance contracts.

### 1.3 Language coverage

- Reference implementation in TypeScript/JavaScript (matches SYNTH's primary runtime).
- Protocol definitions in a language-neutral format (OpenAPI, JSON Schema, or similar).
- Clear extension points for other languages.

---

## Deliverables

1. **TypeScript/JavaScript SDK** under `packages/synth-agent-sdk/` or equivalent.
2. **Protocol bindings** in a language-neutral format.
3. **SDK documentation** with examples.
4. **Unit tests** for each SDK module.

---

## Acceptance Criteria

- An agent can be built using the SDK without importing SYNTH internals.
- All SDK operations use public CLI commands and documented artifacts.
- The SDK validates inputs and outputs against published schemas.

---

## Out of Scope

- Agent skills (EXP-AI-002).
- Multi-agent coordination (EXP-AI-006).
- Certification suite (EXP-AI-007).

---

## Success Criteria

The expedition succeeds when a third-party developer can build a SYNTH-compliant agent in a day using the SDK and public documentation.
