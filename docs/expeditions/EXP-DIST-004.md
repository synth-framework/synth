# EXP-DIST-004 — npm Package Distribution

> Make SYNTH packages publish-ready on npm so developers and package-aware agents can discover and install them through the registry.

**Status:** Completed and accepted  
**Kind:** Engineering Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-029 — AI Ecosystem Distribution  
**Authority:** Synth Architectural Constitution, EXP-PROGRAM-029 charter  
**Depends On:** EXP-DIST-001 — Canonical AI Capability Model, EXP-DIST-003 — SYNTH MCP Server  
**Adoption metric:** Number of SYNTH packages that are publish-ready and verifiable by `npm pack`  
**Target:** ≥ 2 packages (`@synth-framework/synth`, `@synth-framework/agent-sdk`) plus MCP server entry point

---

## Goal

Prepare SYNTH packages for npm distribution without actually publishing from this session. The work focuses on package metadata, build verification, local pack validation, and exposing the MCP server through the main package so it can be invoked via `npx`.

---

## Scope

### In scope

- Update `@synth-framework/agent-sdk` package metadata (homepage, repository, engines, license, publishConfig).
- Add tests for `@synth-framework/agent-sdk` exports.
- Add a root-level script to build the agent-sdk package.
- Add `synth-mcp` binary to the main package so `npx @synth-framework/synth mcp` starts the MCP server.
- Add a test that verifies `npm pack --dry-run` for the agent-sdk package produces no warnings.
- Update `docs/reference/capability-validation-map.json` with a PackageDistribution capability.

### Out of scope

- Actual npm publish (requires operator credentials and release governance).
- PyPI / crates.io distribution.
- New package implementations beyond existing packages.

---

## Core abstraction

```text
Main package (@synth-framework/synth)
  ├── CLI binary: synth
  └── MCP binary: synth-mcp

Agent SDK package (@synth-framework/agent-sdk)
  ├── protocol module
  ├── metadata module
  └── index module
```

---

## Acceptance criteria

1. `@synth-framework/agent-sdk/package.json` has complete metadata.
2. `npm run build:agent-sdk` builds the agent-sdk package from root.
3. `npm run test:agent-sdk` passes.
4. `npx @synth-framework/synth mcp` starts the MCP server (via bin entry).
5. `npm pack --dry-run` in `packages/synth-agent-sdk/` produces no warnings.
6. Contract tests verify the bin entry and agent-sdk exports.
7. `docs:verify-freshness` passes.

---

## Work plan

### Phase 1 — Agent SDK package hardening

- Update `packages/synth-agent-sdk/package.json` metadata.
- Add `tests/agent-sdk.test.js` covering protocol and metadata exports.

### Phase 2 — Main package MCP binary

- Add `synth-mcp` to main `package.json` bin entries.
- Add npm script to start MCP server via bin.

### Phase 3 — Build and pack verification

- Add root npm scripts for agent-sdk build and test.
- Add test verifying `npm pack --dry-run` produces no warnings.

### Phase 4 — Documentation and closure

- Update capability-validation-map.json.
- Update Era-IV-Roadmap.md.
- Regenerate docs.
- Mark expedition completed.

---

## Evidence

- [x] Agent SDK package metadata updated.
- [x] Agent SDK tests passing.
- [x] MCP server exposed via main package bin entry.
- [x] npm pack dry-run produces no warnings.
- [x] Capability map updated.
- [x] Documentation freshness passing.

---

## Notes

- Actual publication is a governed release event under EXP-PROGRAM-028 and should be performed by the operator with appropriate credentials.
- This expedition makes publication possible and verifiable; it does not perform the publication itself.
