# EXP-BOOTSTRAP-002 — Framework Self-Hosting

> **Operational readiness expedition.** Initialize the `synth-v2` repository itself as a SYNTH project so `synth status`, `synth doctor`, and `synth checkpoint` report truthfully inside the framework repository.

**Status:** Completed  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-044 — Operational Readiness & Self-Hosting  
**Authority:** Synth Architectural Constitution  
**Depends On:** EXP-PROGRAM-044 (Operational Readiness & Self-Hosting)  
**Blocks:** EXP-GOV-025 (Safe State Repair & Divergence Recovery)

---

```yaml
Impact:
  Constitutional: No
  Product: No
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

The SYNTH framework repository currently reports:

```text
No SYNTH project found in this directory.
```

when `synth status` or `synth doctor` is run from the repository root. This makes dogfooding impossible and forces contributors to guess whether the CLI is working correctly. This expedition initializes the repository as a governed SYNTH project, creating the minimal durable state required for the CLI to operate on itself without running the full governance pipeline automatically.

---

## Findings Addressed

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| S1 | `synth status` reports "No SYNTH project found" inside `synth-v2` | High | Fix planned |
| S2 | `synth checkpoint` cannot run a pre-flight checkpoint in the framework repo | High | Fix planned |
| S3 | The framework cannot eat its own dog food | Medium | Fix planned |

---

## Deliverables

### 1. Initialize the project with `synth init`

Run:

```bash
synth init --name "Synth Framework"
```

This creates:

- `.synth/manifest.json` — project manifest (committed).
- `.synth/data/event-log.jsonl` — authoritative event log (ignored by git).
- `.synth/data/canonical-state.json` — replay-derived state (ignored by git).
- `.synth/AGENT_CONTRACT.md` — operator contract for agents.
- `.synth/context.json` — repository orientation metadata.
- `.synth/ai/` — agent orientation snapshots.

`npm run govern` is deliberately **not** invoked automatically; the full governance pipeline is run by the operator per ADR-043.

### 2. Verify CLI observability works in-repo

After initialization, the following commands must succeed and emit structured JSON:

- `synth status`
- `synth doctor`
- `synth checkpoint`
- `synth explain replay`

### 3. Ensure CI and local validation remain green

- `synth validate` must pass.
- Existing tests must not regress.
- `.synth/data/` must remain gitignored.

---

## Acceptance Criteria

1. `.synth/manifest.json` exists and `synth status` reports `phase: initialized`.
2. `synth doctor` reports the project as healthy (or warning only for optional checks).
3. `synth checkpoint` returns an `AgentCheckpoint` with no fatal blockers.
4. `synth explain replay` reports `consistent: true`.
5. `synth validate` passes before merge.
6. Only non-derived `.synth/` files are committed; `.synth/data/` remains ignored.

---

## Out of Scope

- Running `npm run govern` automatically.
- Creating Missions or Expeditions through the runtime (done after the project exists).
- Cleaning up legacy `data/` artifacts from the pre-governance installation.
- Changing bootstrap or init semantics.

---

## Governance

### Protected

- Event model semantics.
- Replay semantics.
- ExecutionGate mutation authority.
- Public vocabulary.
- Constitutional Baseline.

### Not included

- New runtime concepts.
- Changes to Mission/Expedition lifecycle semantics.

---

## Related Documents

- `docs/expeditions/EXP-PROGRAM-044.md`
- `docs/expeditions/EXP-BOOTSTRAP-001.md`
- `src/cli/synth.ts`
- `src/cli/bootstrap-apply.ts`
