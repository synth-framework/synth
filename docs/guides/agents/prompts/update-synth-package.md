---
Title: Update the Synth npm package
Domain: guides
Audience: agents
Prerequisites: docs/guides/agents/index.md
Knowledge Establishes: Safe, verified update of the @synth-framework/synth dependency
Depends On: docs/guides/agents/index.md
Builds Toward: agent-bootstrap
Version: 1.0.0
Status: stable
---

# Update the Synth npm package

Use this prompt when an agent needs to update `@synth-framework/synth` and verify the project still works.

## Prompt

> Update the `@synth-framework/synth` package to the latest published version and verify the update. Follow these steps exactly and stop if any verification fails.
>
> 1. Check the currently installed version:
>    ```bash
>    npm list @synth-framework/synth
>    ```
> 2. Install the latest version:
>    ```bash
>    npm install @synth-framework/synth@latest
>    ```
> 3. Confirm `package.json` and `package-lock.json` were updated:
>    ```bash
>    git diff --stat -- package.json package-lock.json
>    ```
> 4. Verify the installed binary reports the new version:
>    ```bash
>    npx synth --version
>    ```
> 5. Run the Synth health check:
>    ```bash
>    npx synth doctor
>    ```
> 6. Run project-level validation:
>    - If the project has `npm run govern`, run it.
>    - Otherwise, if the project is Synth-governed, run `npx synth explain replay`.
>    - Otherwise, run the project's standard test command (`npm test`).
> 7. If the project is Synth-initialized, record the update as an event:
>    ```bash
>    npx synth event create --type PACKAGE_UPDATED \
>      --subject "@synth-framework/synth" \
>      --evidence "version=$(npx synth --version)"
>    ```
>
> Stop and report if any of the following happen:
> - `npx synth --version` does not show the expected new version.
> - `npx synth doctor` fails.
> - `npm run govern`, `npx synth explain replay`, or `npm test` fails.
>
> Do not commit until all verification steps pass. Report the final version and the outcome of each check.

## Expected behavior

The agent updates the dependency, confirms the lockfile changed, validates the binary, runs a health check, and exercises the project's governance or test pipeline before treating the update as complete.

## Safety rules

- Do not skip `synth doctor`.
- Do not commit on verification failure.
- If the project has no tests and no Synth governance, stop and ask the operator how to validate.
