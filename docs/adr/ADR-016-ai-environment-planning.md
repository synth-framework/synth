# ADR-016 — AI Environment Planning

**Status:** Accepted  
**Date:** 2026-07-15  
**Author:** Synth Architecture  
**Deciders:** Synth Architecture

---

## Context

ADR-006 established the Environment Layer and autonomous discovery. ADR-015 made discovery evidence replayable constitutional evidence. The remaining gap is consumption: AI agents plan Missions and Expeditions against *implicit assumptions* ("git exists", "npm exists", "GitHub is the forge") rather than against discovered capability evidence.

The acceptance criterion of EXP-ENV-011 is that an AI agent can plan a Mission without assuming Git, npm, GitHub, or any specific environment. This requires an agent-consumable projection of discovery evidence and a constitutional rule binding planning to it.

## Decision

### 1. Capability Report Format

The **Capability Report** is the agent-facing projection of discovery evidence:

```text
CapabilityReport {
  schema: "synth-capability-report-v1"
  generatedAt: number              // volatile — when the report was produced
  environment: { platform, classification }
  capabilities: CapabilityReportEntry[]
  unavailable: CapabilityFamily[]
  assumptions: string[]
  guidance: string[]
}

CapabilityReportEntry {
  family: CapabilityFamily
  status: "supported" | "degraded" | "unsupported"
  provider?: string
  confidence: DiscoveryConfidence
  reason: string
}
```

### 2. Completeness Rule

The report shall contain **every constitutional capability family** (ADR-006 §2). A family with no discovery evidence or no available provider appears explicitly as `unsupported` — never omitted. An agent must be able to distinguish "this environment cannot do X" from "the report forgot to mention X". Absence of assumption is the point of the report.

### 3. Planning Binding Rule

**AI agents shall plan against the Capability Report, not against environmental assumptions.** Before planning a Mission or Expedition, the agent runs environment discovery and reads the report. Any plan step requiring a capability marked `unsupported` or `degraded` shall select an alternative approach or provider before planning proceeds. The report is a projection of discovery evidence; it inherits the evidence's provenance and is regenerable at any time.

### 4. Agent-Consumable Surface

The report is produced by `scripts/generate-capability-report.js` (markdown to stdout, `--json` for the machine format) and implemented in `src/environment/capability-report.ts`. Planning prompts (`docs/guides/agents/prompts/`), the planning guide (`docs/guides/agents/planning.md`), and `AGENTS.md` reference capability-based planning.

### 5. Core Boundary Rule

No Core component is modified. The report is a read-only projection of discovery evidence within the Environment Layer.

## Consequences

- **Easier:** Agents can plan portably — the same Mission plan adapts to environments with different providers.
- **Easier:** Unsupported capabilities fail at planning time with explicit reasons, not at execution time with confusing errors.
- **Easier:** The report doubles as onboarding evidence for what an environment can do.
- **Harder:** Prompt and guide documentation must stay consistent with the report format as families evolve.

## Proof Impact

- **P1 Structural:** Unchanged — read-only projection.
- **P2 Behavioral:** Strengthened — planning consumes evidence rather than assumptions.
- **P3 Historical:** Unchanged.
- **P4 Adversarial:** Unchanged.
- **P5 Reproducibility:** Strengthened — the report is a deterministic projection of replayable evidence (ADR-015).

## Kernel Impact

No frozen kernel components are modified. The Capability Report is an Environment Layer projection.

## Constitutional Baseline Impact

No version numbers change. This ADR is added to the active ADR list in `docs/adr/README.md` and referenced from `docs/architecture/constitutional-baseline.md`.

## Related

- `docs/adr/ADR-006-environment-discovery-framework.md`
- `docs/adr/ADR-015-discovery-evidence-replay.md`
- `docs/expeditions/EXP-PROGRAM-007.md`
- `docs/expeditions/EXP-ENV-011.md`
