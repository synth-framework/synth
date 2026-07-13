# Synth Example: Monolith

A realistic monolithic example that demonstrates scale behavior in Synth.

## Mission

Coordinate development across multiple packages in a single repository.

## Expedition

**Package Boundaries** — Define ownership, interfaces, and dependency rules for each package.

## Objectives

- Create a dependency map of all packages
- Define public interface contracts for shared packages
- Enforce package boundary rules in CI

## Run

```bash
npm run govern
```

## Expected Results

- Replay-consistent event log.
- Proof artifact in `proof/`.
- Generated documentation in `docs-generated/`.
