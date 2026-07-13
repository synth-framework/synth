---
Title: MCP-Compatible Agents
Domain: guides
Audience: agents
Prerequisites: docs/guides/agents/index.md
Knowledge Establishes: Future integration path for MCP-compatible agents
Depends On: docs/guides/agents/index.md
Builds Toward: agent-bootstrap
Version: 1.0.0
Status: draft
---

# MCP-Compatible Agents

## Status

Draft — planned for a future release after the Validation Program is complete.

## Vision

Synth will expose an MCP (Model Context Protocol) server that provides agents with:

- Read access to `.synth/manifest.json`.
- Execution of `synth` CLI commands.
- Retrieval of Mission Studio state.
- Querying of replay results and proof artifacts.

## Expected tools

- `synth_init` — initialize a project.
- `synth_mission_create` — create a Mission.
- `synth_expedition_create` — create an Expedition.
- `synth_govern` — run governance.
- `synth_explain_replay` — explain replay.
- `synth_status` — read project state.

## Rationale

MCP allows any compatible agent to operate Synth without custom integration code. This aligns with the Validation Program goal: AI agents should converge on the same deterministic process regardless of model or platform.

## When

This guide will be promoted from draft to stable when:

- EXP-VAL-001 through EXP-VAL-006 are complete.
- The public API surface is frozen for v2.x.
- A prototype MCP server has been validated against at least two MCP clients.
