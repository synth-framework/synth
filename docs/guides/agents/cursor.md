---
Title: Cursor Integration
Domain: guides
Audience: agents
Prerequisites: docs/guides/agents/index.md
Knowledge Establishes: How to operate Synth from Cursor
Depends On: docs/guides/agents/index.md
Builds Toward: agent-bootstrap
Version: 1.0.0
Status: stable
---

# Cursor Integration

## Setup

1. Install Synth in the project terminal:

   ```bash
   npm install -g @synth-framework/synth
   ```

2. Verify installation:

   ```bash
   synth --version
   ```

3. Add `.synth/manifest.json` to Cursor's context or project rules if possible.

## Recommended context

- `.synth/manifest.json`
- `docs/reference/public-vocabulary.md`
- `docs/operator/mission-studio-guide.md`

## Example prompts

> Initialize this project with Synth.

> Create a Mission for the feature we are building.

> Generate Expeditions and objectives for this Mission.

> Run the governance pipeline and show me the proof artifact.

> Explain why Replay is consistent.

## Best practices

- Use Cursor's terminal to run `synth` commands directly.
- Keep responses grounded in the seven public concepts.
- Before editing source code, confirm the change is covered by an approved Expedition if governance is strict.
