---
Title: OpenAI Codex Integration
Domain: guides
Audience: agents
Prerequisites: docs/guides/agents/index.md
Knowledge Establishes: How to operate Synth from OpenAI Codex
Depends On: docs/guides/agents/index.md
Builds Toward: agent-bootstrap
Version: 1.0.0
Status: stable
---

# OpenAI Codex Integration

## Setup

1. Install Synth in your environment:

   ```bash
   npm install -g @synth-framework/synth
   ```

2. Verify:

   ```bash
   synth --version
   ```

3. In the Codex CLI, navigate to the project root.

## Recommended context

Codex works best with explicit, concise instructions. Start every Synth session by reading:

- `.synth/manifest.json`
- `docs/reference/public-vocabulary.md`

## Example prompts

> Run `synth init` for this project.

> Read `.synth/manifest.json` and summarize the available commands.

> Create a Mission with subject "Add user authentication" and purpose "Allow users to sign in securely".

> Generate Expeditions for that Mission.

> Run `npm run govern` and report whether it passed.

## Best practices

- Codex may not retain context across turns. Re-read the manifest when needed.
- Use absolute or clearly relative paths.
- Confirm command output before proceeding to the next step.
