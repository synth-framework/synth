# Synth Example: Legacy Node Migration

A brownfield example that demonstrates migration-style missions in Synth.

## Mission

Modernize a legacy Node.js application incrementally.

## Expedition

**Adapter Layer** — Introduce an adapter layer around legacy code without changing it.

## Objectives

- Document current legacy API surface
- Wrap the core legacy module with a stable adapter

## Run

```bash
npm run govern
```

## Expected Results

- Replay-consistent event log.
- Proof artifact in `proof/`.
- Generated documentation in `docs-generated/`.
