# Prompt: Initialize this repository with Synth

Use this prompt when starting work on a repository that should become a Synth project.

## Prompt

> Initialize this repository with Synth. Run `synth init --name "<Project Name>"`, then read `.synth/manifest.json` and summarize the available commands, layout, and public vocabulary. Do not modify source code yet.

## Expected agent behavior

1. Run `synth init --name "..."`.
2. Read `.synth/manifest.json`.
3. Report the project name, Synth version, available commands, and public vocabulary.
4. Ask the human for the first Mission.

## Safety

- Do not run `npm run govern` unless explicitly asked.
- Do not modify existing source files.
- If `synth` is not installed, report it and stop.
