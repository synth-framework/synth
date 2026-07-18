---
Title: Agent Integration Guides
Domain: guides
Audience: agents
Prerequisites: docs/getting-started/01-getting-started.md
Knowledge Establishes: How AI assistants operate Synth
Depends On: docs/reference/public-vocabulary.md
Builds Toward: agent-bootstrap
Version: 1.1.0
Status: stable
---

# Agent Integration Guides

Synth is designed to be operated by AI agents. These guides help AI coding assistants understand how to initialize, operate, and validate a Synth project.

## Core principle

> **Humans explore. SYNTH remembers. AI executes deterministically.**

Your job as an agent is to:

1. Capture human intent as a **Mission**.
2. Break the Mission into **Expeditions**.
3. Record every action as an **Event**.
4. Let **Replay** prove the state is correct.

## Quick start for agents

1. Install Synth:

   ```bash
   npm install -g @synth-framework/synth
   # or run without installing:
   npx @synth-framework/synth --version
   ```

2. Read the bootstrap manifest:

   ```bash
   cat .synth/manifest.json
   ```

3. Initialize if not already present:

   ```bash
   synth init --name "Project Name"
   ```

4. Generate documentation:

   ```bash
   synth docs generate
   ```

5. Run environment discovery and read the Capability Report. Plan against discovered capabilities — never assume Git, npm, GitHub, or any specific tool unless the report lists it as supported (ADR-016):

   ```bash
   node scripts/generate-capability-report.js
   ```

6. Create a Mission Draft:

   ```bash
   synth mission create --subject "Mission Name" --purpose "What we want to achieve"
   ```

7. Approve the Mission (after human review):

   ```bash
   synth mission approve --draft-id <draft-id>
   ```

8. Validate changes locally:

   ```bash
   synth validate
   ```

9. Run the full governance pipeline before requesting a merge:

   ```bash
   npm run govern
   ```

## Available guides

Core guides:

- [Agent Handbook](handbook.md) — comprehensive reference for agent operation
- [Planning](planning.md) — the planning pipeline, starting with Stage 0 environment discovery
- [Constitution](constitution.md) — immutable behavioral rules

Environment-specific guides:

- [Claude Code](claude-code.md)
- [Cursor](cursor.md)
- [OpenAI Codex](codex.md)
- [Gemini CLI](gemini-cli.md)
- [Windsurf](windsurf.md)
- [MCP-compatible agents](mcp.md) — future

See also:

- [Agent Prompt Book](prompts/prompt-book.md) for ready-to-use prompts
- [Agent Update Checklist — v2.1.0 Runtime Data Boundary](update-checklist-v2-1-0.md)
- [Migrating Runtime Data to `.synth/data/`](migrating-runtime-data-to-synth.md)

## Public vocabulary

Only these seven concepts should appear in user-facing explanations:

Mission, Expedition, Evidence, Plan, Event, State, Replay.

Everything else is implementation detail.
