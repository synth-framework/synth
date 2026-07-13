# Prompt: Explain the Replay

Use this prompt to verify and explain replay consistency.

## Prompt

> Explain the Replay for this Synth project. Run `synth explain replay` and translate the result into plain language: Is the state consistent? How many events were replayed? What is the state hash? If it is not consistent, explain what might be wrong.

## Expected agent behavior

1. Run `synth explain replay`.
2. Report consistency, event count, and state hash.
3. If inconsistent, diagnose possible causes:
   - Corrupted event log
   - Manual state mutation
   - Hash chain break
4. Suggest recovery steps.

## Safety

- Do not attempt to repair the event log without explicit approval.
- Recommend running `npm run govern` to regenerate proof if needed.
