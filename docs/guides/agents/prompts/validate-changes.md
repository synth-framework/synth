# Prompt: Validate changes with Synth

Use this prompt before requesting a merge or after finishing a work item.

## Prompt

> Validate the current changes with Synth. Run `synth validate` to analyze the change set and execute the minimum sound validation plan. If any validation fails, fix the issue and run it again. Before requesting a merge, run `synth validate --full` (or `npm run govern`) and report the result.

## Expected agent behavior

1. Run `synth validate`.
2. Report the affected capabilities, risk, and planned validations.
3. Execute the plan and report the result of each script.
4. If failures occur, diagnose and fix them or ask the human for direction.
5. Before a merge request, run the full governance pipeline:

   ```bash
   synth validate --full
   ```

   or

   ```bash
   npm run govern
   ```

## Safety

- `synth validate` is an optimization for local iteration, not a replacement for the full governance gate.
- Never skip `npm run govern` before merging to `main`.
- Do not lower validation thresholds or bypass failing checks.
