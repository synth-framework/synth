# EXP-DIST-003 — SYNTH MCP Server

> **Engineering expedition.** Expose SYNTH capabilities through the Model Context Protocol so every MCP-capable client can discover and invoke SYNTH without platform-specific integration.

**Status:** Completed  
**Kind:** Engineering Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-029 — AI Ecosystem Distribution  
**Depends On:** EXP-DIST-001 (Canonical AI Capability Model), EXP-AI-003 (Repository Semantic Metadata)  
**Blocks:** To be defined as downstream MCP integrations are chartered

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

Build and publish a SYNTH MCP server that exposes core capabilities as MCP tools. The server consumes repository metadata and follows governance constraints; it does not bypass Mission Studio, Genesis, or ExecutionGate.

---

## Origin Evidence

MCP is becoming the standard way for AI clients to connect to external capabilities. Without an MCP server, SYNTH requires every client to implement custom integration. An MCP server makes SYNTH immediately available to Claude Desktop, Cursor, Cline, Windsurf, and any other MCP-capable tool.

---

## Required Change

### 1.1 Exposed capabilities

The MCP server should expose tools for:

```text
Repository Discovery
Status Inspection
Genesis / First-Contact Start
Mission Creation
Mission Approval
Expedition Creation
Expedition Approval
Governance Verification
Replay Inspection
Knowledge Query
Documentation Generation
```

### 1.2 Capability contract

Each tool:

- Reads `.synth/ai/` metadata to determine current phase and mutation policy.
- Refuses mutations when policy is `READ_ONLY`.
- Proposes only when policy is `PROPOSAL_ONLY`.
- Records every mutation through the SYNTH CLI or API, never by editing files directly.

### 1.3 Implementation

Create a new package or module:

```text
packages/synth-mcp-server/
  src/server.ts
  src/tools/
  package.json
  README.md
```

---

## Deliverables

1. MCP server implementation.
2. Tool manifest generated from the Canonical AI Capability Model.
3. Installation and configuration documentation.
4. Certification tests verifying tool behavior against governance constraints.

---

## Acceptance Criteria

- The server starts and advertises all SYNTH tools.
- Read-only tools work without approval.
- Mutating tools require appropriate governance state.
- The server respects `READ_ONLY` and `PROPOSAL_ONLY` mutation policies.

---

## Out of Scope

- Canonical AI Capability Model definition (EXP-DIST-001).
- Other distribution surfaces (EXP-DIST-002, EXP-DIST-004, EXP-DIST-005).

---

## Success Criteria

The expedition succeeds when an MCP client can connect to the server, list SYNTH tools, and execute a read-only workflow like `synth status` without custom integration.
