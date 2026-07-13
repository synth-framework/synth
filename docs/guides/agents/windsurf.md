---
Title: Windsurf Integration
Domain: guides
Audience: agents
Prerequisites: docs/guides/agents/index.md
Knowledge Establishes: How to operate Synth from Windsurf
Depends On: docs/guides/agents/index.md
Builds Toward: agent-bootstrap
Version: 1.0.0
Status: stable
---

# Windsurf Integration

## Setup

1. Install Synth in the integrated terminal:

   ```bash
   npm install -g synth-v2
   ```

2. Verify:

   ```bash
   synth --version
   ```

## Recommended context

- `.synth/manifest.json`
- `docs/reference/public-vocabulary.md`

## Example prompts

> Initialize this project with Synth.

> Create a Mission and generate Expeditions.

> Run `npm run govern`.

> Explain the proof and Replay.

## Best practices

- Windsurf's agentic flows can run terminal commands directly.
- Always inspect command output before accepting suggested edits.
- Use the manifest to keep the agent grounded in the project's Synth configuration.
