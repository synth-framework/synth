:---
Title: SYNTH Onboarding
Domain: agents
Audience: agents
Prerequisites: agents/constitution.md, agents/planning.md
Knowledge Establishes: How agents onboard projects into SYNTH governance
Depends On: agents/constitution.md, agents/planning.md
Builds Toward: agents/patterns/brownfield-analysis.md
Version: 1.0.0
Status: stable
---

# SYNTH Onboarding

## Purpose

Guide agents in bringing projects under SYNTH governance through the correct onboarding path.

## When to onboard

Onboard a project when:

- The operator says *“govern this project,”* *“put this under SYNTH,”* or similar.
- The directory has no `.synth/` directory.
- The operator wants to start a new project with SYNTH.
- The operator provides a product idea or spec and asks for a governed plan.

## Trigger phrases

Common operator prompts that should start onboarding:

- “Use SYNTH to govern this project.”
- “Initialize a new SYNTH project.”
- “I want to build [X]. Plan it with SYNTH.”
- “Here is my spec. Create a SYNTH plan.”

## Step 1: Detect project state

Always start with detection:

```bash
synth first-contact --dry-run
```

This tells you whether the directory is:

- empty
- brownfield (existing files, no `.synth/`)
- legacy (old SYNTH state)
- already governed (`initialized-v2`)

## Step 2: Choose the onboarding path

| Detected state | Operator intent | Action |
|---|---|---|
| Empty | None | `synth init --name "..."` or `synth first-contact --approve` |
| Empty | Has idea | Run full `synth first-contact start "..."` flow |
| Brownfield | None | `synth bootstrap --approve` with generic baseline Mission |
| Brownfield | Has transformation goal | Capture intent, then `synth bootstrap --approve` |
| Legacy | Any | Archive legacy state, then bootstrap |
| Already governed | New intent | Classify intent against active Mission scope; propose Expedition or new Mission |

## Step 3: Brownfield onboarding

For existing codebases:

```bash
# Inspect only
synth discover

# Generate and review proposal
synth bootstrap --dry-run

# Apply governance
synth bootstrap --approve
```

If the operator has a specific transformation goal, capture it before bootstrap. Use it as the Mission subject/purpose if appropriate.

## Step 4: Greenfield onboarding

For new ideas:

```bash
synth first-contact start "I want to build a space mission tracker"
synth first-contact clarify
synth first-contact project
synth first-contact verify
synth first-contact approve
synth first-contact materialize --dry-run
synth first-contact materialize --approve
```

Do not skip clarification or verification. Do not materialize before approval.

## Step 5: Verify governance

After onboarding, always verify:

```bash
synth status
synth explain replay
synth validate
```

## Knowledge-fed onboarding

If the operator provides documents or specs:

1. Place them in `knowledge/` or `docs/` as Markdown.
2. Run `synth docs generate` to produce projections.
3. Synthesize a concise intent from the knowledge.
4. Run the appropriate first-contact or mission flow with that intent.

## Common mistakes

- **Choosing the wrong command:** Use `synth first-contact` for detection and routing; avoid guessing between `init`, `bootstrap`, and `first-contact`.
- **Skipping dry-run:** Never apply governance without reviewing the proposal first.
- **Ignoring detected state:** If `synth first-contact` says the project is already governed, do not re-bootstrap.
- **Creating orphan missions:** In governed projects, check scope alignment before creating a new Mission.

## Related documents

- [Brownfield Bootstrap Specification](../brownfield-bootstrap-specification.md)
- [Greenfield Discovery Lifecycle Specification](../greenfield-discovery-lifecycle.md)
- [Brownfield Analysis](patterns/brownfield-analysis.md)
- [Public Vocabulary](../../reference/public-vocabulary.md)
