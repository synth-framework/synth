# Prompt: Recover the interrupted Mission

Use this prompt when a previous Mission or Expedition was interrupted.

## Prompt

> Recover the interrupted Synth Mission. Read `.synth/manifest.json`, check the current project status with `synth status`, inspect the latest snapshot or event log, and tell me what state the Mission is in. Propose the next safe step.

## Expected agent behavior

1. Read `.synth/manifest.json`.
2. Run `synth status`.
3. Inspect `data/event-log.jsonl` if needed.
4. Identify the last completed state (e.g., mission created, expedition started).
5. Propose the next action:
   - Continue an in-progress Expedition.
   - Complete an Objective.
   - Run `npm run govern` to verify state.

## Safety

- Do not guess intent. Ask the human if the next step is unclear.
- Do not modify the event log directly.
- Prefer continuing from the last known good state over restarting.
