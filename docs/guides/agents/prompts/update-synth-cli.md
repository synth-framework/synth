---
Title: Update the global Synth CLI
Domain: guides
Audience: agents
Prerequisites: docs/guides/agents/index.md
Knowledge Establishes: Safe, verified global update of the Synth CLI
Depends On: docs/guides/agents/index.md
Builds Toward: agent-bootstrap
Version: 1.0.0
Status: stable
---

# Update the global Synth CLI

Use this prompt when an agent needs to update the globally installed `@synth-framework/synth` CLI and verify it works.

## Prompt

> Update the global Synth CLI to the latest published version and verify the update. Follow these steps exactly and stop if any verification fails.
>
> 1. Check the currently installed global version:
>    ```bash
>    synth --version
>    ```
>    If Synth is not installed, also report:
>    ```bash
>    npm list -g @synth-framework/synth --depth=0
>    ```
> 2. Install or update to the latest version globally:
>    ```bash
>    npm install -g @synth-framework/synth@latest
>    ```
> 3. Verify the global binary reports the new version:
>    ```bash
>    synth --version
>    ```
> 4. Run the Synth health check:
>    ```bash
>    synth doctor
>    ```
> 5. If you are inside a Synth-governed project, validate that the new CLI still understands the project state:
>    ```bash
>    synth explain replay
>    ```
>    If the project supports `synth validate`, run that instead or in addition.
>
> Stop and report if any of the following happen:
> - `synth --version` does not show the expected new version after the global install.
> - `synth doctor` fails.
> - `synth explain replay` (or `synth validate`) fails when run inside a governed project.
>
> Do not modify project files unless a separate task asks for it. Report the final version and the outcome of each check.

## Expected behavior

The agent updates the global CLI, confirms the binary version, runs the built-in health check, and exercises project-level replay if a Synth project is present.

## Safety rules

- Use `npm install -g`, not a local project install.
- Do not skip `synth doctor`.
- Do not modify `package.json` or `package-lock.json` in the current project unless explicitly instructed.
- If `synth doctor` fails, stop and report the error output.
