# EXP-DIST-003 — SYNTH MCP Server

> Expose SYNTH capabilities through a lightweight Model Context Protocol server so every MCP-capable client can discover and invoke SYNTH without platform-specific integration.

**Status:** Completed and accepted  
**Kind:** Engineering Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-029 — AI Ecosystem Distribution  
**Authority:** Synth Architectural Constitution, EXP-PROGRAM-029 charter  
**Depends On:** EXP-DIST-001 — Canonical AI Capability Model, EXP-DIST-002 — Agent Skill Projection Pipeline  
**Adoption metric:** Number of MCP clients that can connect and execute a read-only SYNTH workflow  
**Target:** ≥ 1 client validated through tests

---

## Goal

Build a minimal, deterministic MCP server that advertises SYNTH tools derived from the Canonical AI Capability Model and delegates execution to the `synth` CLI. The server must respect command safety classifications and never bypass SYNTH governance.

---

## Scope

### In scope

- A stdio-based MCP server implemented at `src/distribution/mcp-server.ts`.
- Support for the MCP JSON-RPC lifecycle: `initialize`, `notifications/initialized`, `tools/list`, `tools/call`.
- Tool manifest generated from `src/distribution/ai-capability-model.json`.
- Tool annotations indicating read-only vs. destructive commands.
- Execution of read-only tools (`synth doctor`, `synth status`, etc.) in tests.
- A package script to start the server.
- Contract tests verifying handshake, tool advertisement, and read-only execution.

### Out of scope

- IDE rules (EXP-DIST-005)
- Agent skill expansion (EXP-DIST-002)
- npm package publishing (EXP-DIST-004)
- Multi-transport support (HTTP/SSE)
- Persistent server state

---

## Core abstraction

```text
Canonical AI Capability Model
        ↓
MCP Tool Manifest
        ↓
MCP Server (stdio JSON-RPC)
        ↓
synth CLI execution
```

The server is a thin adapter: it translates MCP tool calls into `synth` CLI invocations and returns structured text results.

---

## Acceptance criteria

1. `src/distribution/mcp-server.ts` exists and compiles to `dist/distribution/mcp-server.js`.
2. The server responds to `initialize` with correct protocol version and server info.
3. `tools/list` returns one tool per command in the canonical model.
4. Read-only tools are annotated with `readOnlyHint: true`.
5. Mutating tools are annotated with `destructiveHint: true`.
6. A read-only tool call (e.g., `synth doctor`) executes and returns structured output.
7. Unknown tools return `isError: true`.
8. Contract tests pass.
9. `npm run docs:verify-freshness` passes.

---

## Work plan

### Phase 1 — Server implementation

- Implement MCP JSON-RPC stdio server.
- Generate tool manifest from canonical model.
- Execute synth CLI commands for tool calls.

### Phase 2 — Packaging

- Add `mcp:start` npm script.
- Add MCP server capability to `docs/reference/capability-validation-map.json`.

### Phase 3 — Validation

- Add `tests/mcp-server.test.js`.
- Verify handshake, tools/list, and read-only tool execution.

### Phase 4 — Documentation and closure

- Regenerate documentation projections.
- Update `docs/Era-IV-Roadmap.md`.
- Mark expedition as `Completed and accepted`.

---

## Evidence

- [x] MCP server source committed.
- [x] Server compiles and starts.
- [x] Tool manifest generated from canonical model.
- [x] Contract tests passing.
- [x] Package script and capability map updated.
- [x] Documentation freshness passing.

---

## Notes

- The server intentionally delegates to the `synth` CLI rather than reimplementing logic. This ensures governance boundaries remain intact.
- Mutating tools require the MCP client to obtain operator approval; the server does not silently approve mutations.
