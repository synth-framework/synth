# Prompt: Bootstrap this repository with Synth

Use this prompt when an existing repository should be transformed into a Synth project.

## Prompt

> Bootstrap this repository with Synth. First run `synth bootstrap --dry-run` to see the proposed Mission and Expeditions. Then, if the proposals look reasonable, run `synth bootstrap --approve`. Report the repository type, the number of observations, and the generated proposals.

## Expected agent behavior

1. Run `synth bootstrap --dry-run`.
2. Parse the JSON output.
3. Summarize:
   - Repository type (empty, node, python, polyglot, brownfield)
   - Detected languages and frameworks
   - Proposed Mission subject and purpose
   - Proposed Expeditions
4. If the human confirms, run `synth bootstrap --approve`.
5. Report the applied artifacts: `.synth/manifest.json`, docs, website, example, govern result.

## Safety

- Never run `synth bootstrap --approve` without showing the dry-run output first.
- If the repository has no `package.json`, govern will be skipped; report this clearly.
- Do not delete existing source files.
