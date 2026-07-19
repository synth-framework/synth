> This document is governed by **EXP-BROWNFIELD-002 — Brownfield Discovery Completion**.

# Brownfield Baseline Artifact

The Brownfield Baseline Artifact is the durable output of the **Discover** phase. It captures a deterministic, replayable understanding of an existing repository before any governance state is created.

## Purpose

- Preserve the repository understanding produced by `synth discover`.
- Allow two independent agents to arrive at substantially the same baseline from the same evidence.
- Provide the foundation for the **Classify** and **Propose** phases of brownfield onboarding.

## Schema

```text
synth-discovery-baseline-v1
```

## Artifact Location

Produced only when discovery is explicitly exported:

```bash
synth discover /path/to/repo --export
```

Default output path:

```text
.synth/discovery/baseline-<timestamp>-<signature>.json
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `schema` | string | Always `"synth-discovery-baseline-v1"`. |
| `generatedAt` | ISO timestamp | When the baseline was produced. |
| `targetDir` | string | Absolute path to the discovered repository. |
| `discoverySessionId` | string | Id of the DiscoverySession that produced the baseline. |
| `discoverySessionHash` | string | Cryptographic hash of the canonical DiscoverySession content. |
| `analysis` | object | Summarized repository understanding. |
| `analysis.languages` | string[] | Detected programming languages. |
| `analysis.frameworks` | string[] | Detected frameworks. |
| `analysis.hasTests` | boolean | Whether a testing capability was detected. |
| `analysis.fileCount` | number | Number of files observed. |
| `analysis.observationCount` | number | Number of raw observations collected. |
| `signature` | string | Deterministic hash of the baseline content. |

## Determinism

The baseline artifact is deterministic for a given repository state:

- The `discoverySessionHash` must match the hash of the DiscoverySession.
- The `signature` must be stable across repeated `synth discover --export` runs against the same repository state.
- Volatile data (timestamps, absolute paths of transient files) must not affect the `signature`.

## Mutation Guarantee

Generating a baseline artifact does **not**:

- Modify application source files.
- Create `.synth/data/` or the event log.
- Initialize governance state.
- Generate documentation.

It only writes to `.synth/discovery/`.

## Relationship to Agent Context

The **Agent Context Contract** (`.synth/context.json`) is derived from the baseline artifact during the **Classify** phase. The context records:

- `repositoryType` (e.g., `brownfield-node`, `brownfield-polyglot`)
- `phase` (e.g., `architecture-discovery`)
- `implementationState` (`complete`, `partial`, `missing`)
- `intent` (transformation goal)
- `sourceHistory` (`AVAILABLE`, `MISSING`, `EXTERNAL`, `UNKNOWN`)

## Certification

A brownfield baseline is certified when:

1. `synth discover /path/to/repo --export` produces a valid baseline artifact.
2. The artifact schema is `synth-discovery-baseline-v1`.
3. The signature is stable across repeated exports of the same repository state.
4. The baseline is derived from a DiscoverySession whose replay status is valid.
