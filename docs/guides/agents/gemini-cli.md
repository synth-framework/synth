---
Title: Gemini CLI Integration
Domain: guides
Audience: agents
Prerequisites: docs/guides/agents/index.md
Knowledge Establishes: How to operate Synth from Gemini CLI
Depends On: docs/guides/agents/index.md
Builds Toward: agent-bootstrap
Version: 1.0.0
Status: stable
---

# Gemini CLI Integration

## Setup

1. Install Synth globally:

   ```bash
   npm install -g @synth-framework/synth
   ```

2. Verify:

   ```bash
   synth --version
   ```

3. Open the project directory in Gemini CLI.

## Recommended context

- `.synth/manifest.json`
- `docs/reference/public-vocabulary.md`
- `docs/operator/mission-studio-guide.md`

## Example prompts

> Initialize this repository with Synth and read the manifest.

> Create a Mission based on the current repository analysis.

> Generate Expeditions and run governance.

> Explain the Replay result.

## Best practices

- Gemini CLI may have limited filesystem awareness. Use explicit file paths.
- Run one command at a time and confirm output.
- Reference the public vocabulary in explanations.
