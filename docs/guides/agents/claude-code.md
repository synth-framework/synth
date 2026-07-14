---
Title: Claude Code Integration
Domain: guides
Audience: agents
Prerequisites: docs/guides/agents/index.md
Knowledge Establishes: How to operate Synth from Claude Code
Depends On: docs/guides/agents/index.md
Builds Toward: agent-bootstrap
Version: 1.0.0
Status: stable
---

# Claude Code Integration

## Setup

1. Install Synth globally:

   ```bash
   npm install -g @synth-framework/synth
   ```
2. Ensure `synth --version` works in the Claude Code terminal.
3. Read `.synth/manifest.json` at the start of every Synth-related session.

## Recommended context

When starting a Synth task, include these files in context:

- `.synth/manifest.json`
- `docs/reference/public-vocabulary.md`
- `docs/operator/mission-studio-guide.md`
- `docs/guides/agents/prompts/initialize.md`

## Example prompts

> Initialize this repository with Synth.

> Read the bootstrap manifest and explain the current Mission.

> Analyze this repository and create a Mission.

> Generate Expeditions for the current Mission.

> Run `npm run govern` and report the proof.

> Explain the Replay result.

## Best practices

- Always run `synth init` before creating missions if `.synth/manifest.json` is missing.
- Use `--json` output when you need to parse command results.
- Never modify files in `docs/generated/` by hand; regenerate with `synth docs generate`.
- Ask for human approval before `npm run govern` if it will mutate repository state.
