# Brownfield Analysis

## Purpose

Guide agents in analyzing an existing codebase before proposing changes under SYNTH governance.

## When to use this pattern

Use this pattern when:

- The operator asks you to work on a project that already has code, docs, or configuration.
- `AGENTS.md` indicates a `brownfield-*` repository type.
- You need to understand the current system before planning a transformation.

## Pre-analysis: confirm governance state

Before reading code, establish whether SYNTH governance is active:

```bash
synth status
synth explain replay
```

If the project is not yet governed, stop and run the onboarding flow first:

```bash
synth first-contact --dry-run
synth first-contact --approve
```

## Step 1: Read the agent contract and context

Read:

- `AGENTS.md` — active expedition, rules, protected assets
- `.synth/context.json` — repository type, phase, implementation state, intent
- `.synth/manifest.json` — capabilities, recommended adapters, layout

Use this information to orient yourself. Do not ignore the declared phase or intent.

## Step 2: Run a read-only discovery

Generate an evidence-backed baseline without modifying anything:

```bash
synth discover
# or, to persist the baseline:
synth discover --export
```

Review the output for:

- Languages and frameworks
- Build system and package manager
- Test coverage
- Existing capabilities and gaps
- Findings and unknowns

## Step 3: Map repository structure

Identify:

- Directory layout and module boundaries
- Entry points and public APIs
- Data stores and external integrations
- Configuration and environment handling
- CI/CD setup

## Step 4: Identify patterns and conventions

Look for:

- Architectural patterns (e.g., MVC, hexagonal, microservices)
- Coding conventions (naming, formatting, lint rules)
- Testing patterns (unit, integration, e2e)
- Error handling and logging conventions
- Dependency injection or service location patterns

## Step 5: Record findings as evidence

Do not keep analysis in your head. Record discoveries as evidence that can be attached to expeditions:

- Technology choices and versions
- Architectural patterns
- Integration points
- Technical debt or known issues
- Team conventions that must be respected

Use `synth evidence` or attach findings to the active expedition.

## Step 6: Propose expeditions, do not edit directly

After analysis, your next action should be one of:

- Create an Expedition scoped to a specific, bounded change.
- Ask the operator for clarification if scope is unclear.
- Update `knowledge/` if the analysis reveals missing canonical decisions.

Do not start editing application code until an expedition is executing.

## Anti-patterns

- **Rewriting first:** Proposing to replace working code before understanding it.
- **Skipping discovery:** Making assumptions without running `synth discover`.
- **Ignoring conventions:** Introducing new patterns that conflict with existing ones.
- **Unrecorded knowledge:** Learning things about the codebase but not recording them.
- **Scope creep:** Turning a bounded expedition into a broad refactor.

## Related documents

- [Brownfield Adoption](../brownfield-adoption.md)
- [Brownfield Bootstrap Specification](../../brownfield-bootstrap-specification.md)
- [Constitution](../../../architecture/constitution.md)
