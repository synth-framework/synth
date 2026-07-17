# EXP-CONT-002 — Interruption Benchmark

**Status:** Draft  
**Kind:** Certification Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-013 — Cognitive Continuity  
**Depends On:** EXP-CONT-001 (Resume Briefing)  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (finding N8)

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

Measure — rather than assert — the continuity of a SYNTH repository across interruptions. Define a **Repository Authority Index (RAI)** that quantifies how much of the operator's intent the repository alone can reconstruct after a session is killed at a defined checkpoint.

This expedition turns "the repository must survive the conversation" from a principle into an observable, comparable metric.

---

## Motivation

The TaskPRO field experiment showed what happens when continuity is not measured:

- Session 1 ended after a mission was approved.
- Session 2 began with only a summary. The agent could not determine whether the mission was approved, rejected, lost, or still pending.
- The agent resorted to source-code archaeology and eventually forged confidence because the repository's authority was incomplete.

Without a benchmark, every claim of continuity is anecdotal. This expedition establishes a reproducible kill-at-checkpoint matrix and a single score that tells the team whether continuity is improving or regressing.

---

## Scope

```text
Canonical SYNTH project
        │
        ├──► Checkpoint A: after synth init
        ├──► Checkpoint B: after mission created
        ├──► Checkpoint C: after mission approved
        ├──► Checkpoint D: after expedition created
        ├──► Checkpoint E: after expedition completed
        └──► Checkpoint F: after proof generated

At each checkpoint:
  1. Record expected operator intent.
  2. Kill the session (drop process + drop conversation history).
  3. Start a fresh agent with zero history.
  4. Allow the agent to use only:
       synth explain resume
       synth status
       synth explain identity
       synth explain all
  5. Compare reconstructed intent to expected intent.
  6. Score each dimension.

Output:
  Repository Authority Index (RAI) per checkpoint
  and an aggregate RAI for the project.
```

In scope:

- Define the RAI dimensions and scoring rubric.
- Build a fixture harness that drives a SYNTH project through checkpoints A–F.
- Implement the interruption and fresh-agent simulation.
- Record RAI scores in a machine-readable report.
- Add the benchmark to CI as a non-blocking or informational certification job.

Out of scope:

- Modifying the core event model, replay, or Genesis.
- Testing human operators; this is an automated benchmark of repository authority.
- Requiring a real language model; the "fresh agent" is a deterministic scorer that knows only the public CLI vocabulary.

---

## Deliverables

1. **RAI Definition Document** (`docs/reference/repository-authority-index.md`)
   - Dimensions:
     - **Identity** — can the agent determine repository kind, phase, and transformation direction?
     - **Mission** — can the agent identify the active mission and its status?
     - **Decisions** — can the agent reconstruct approvals, rejections, and pending decisions?
     - **Next Action** — can the agent determine the correct next command without source reading?
     - **Confidence** — does the briefing expose uncertainty rather than invent certainty?
   - Scoring: 0 (not reconstructable), 0.5 (partially reconstructable), 1.0 (fully reconstructable) per dimension.
   - Aggregate RAI = average across dimensions.

2. **Benchmark Harness** (`scripts/interruption-benchmark.js`)
   - Creates a disposable SYNTH project.
   - Advances the project to each checkpoint.
   - Drops process state and conversation context.
   - Re-invokes only public read-only CLI commands.
   - Scores the reconstructed intent against the expected intent.
   - Writes a JSON report.

3. **Fixture project shape**
   - A minimal project with one Mission, one Expedition, one Objective, and one Work Item.
   - The exact shape is recorded so the benchmark is reproducible.

4. **CI integration**
   - New npm script: `bench:interruption`.
   - Runs on pull requests as an informational check (not a hard gate until the baseline stabilizes).
   - Fails only when the benchmark itself cannot run, not when RAI fluctuates.

---

## Acceptance

```text
Fresh agent, zero history, kill at Checkpoint C (mission approved)
        ↓
   synth explain resume
   synth status
   synth explain identity
        ↓
   Agent correctly reports:
     - repository kind and phase
     - the approved mission name and purpose
     - the approval decision and its timestamp
     - the next action: create an expedition
```

Specifically:

- Benchmark runs end to end without manual intervention.
- RAI is reported for checkpoints A through F.
- Aggregate RAI is recorded and versioned with each release.
- The benchmark detects the exact failure mode from N8 (approved mission lost to memory) as a 0.0 score on the Mission and Decisions dimensions at the corresponding checkpoint.
- The benchmark passes in CI without destabilizing the governance pipeline.

---

## Phases

### Phase 1 — Define RAI

Finalize dimensions, scoring rubric, and the canonical fixture project.

### Phase 2 — Build harness

Implement `scripts/interruption-benchmark.js` with checkpoint advancement and scoring.

### Phase 3 — Calibrate baseline

Run the benchmark against the current codebase to establish the baseline RAI. Do not optimize yet; the baseline is the deliverable.

### Phase 4 — CI wiring

Add `bench:interruption` to `package.json` and configure it as an informational CI job.

### Phase 5 — Document

Publish the RAI definition and the first benchmark report.

---

## Risks

| Risk | Mitigation |
|---|---|
| Benchmark is flaky because it depends on timing or shell behavior | Fixtures are self-contained; use `spawnSync` with deterministic timeouts |
| RAI becomes a vanity metric | Dimensions are tied to observable CLI outputs, not internal state |
| Score changes with every UI tweak | RAI measures reconstructability of intent, not message phrasing; scorer keys on structured fields |
| Benchmark adds significant CI time | Run only on PRs that touch CLI or state projection code; keep fixture minimal |
| Fresh-agent simulation is too generous | Scorer is forbidden from reading source, `data/` raw files beyond CLI output, or using prior context |

---

## Definition of Done

- [ ] RAI dimensions and scoring rubric documented.
- [ ] `scripts/interruption-benchmark.js` runs end to end.
- [ ] Baseline RAI report generated and committed.
- [ ] `bench:interruption` wired into `package.json`.
- [ ] CI runs the benchmark as an informational check.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Define RAI dimensions and scoring rubric.
2. Create the minimal fixture project shape.
3. Implement the benchmark harness with checkpoint kill-and-resume logic.
4. Run and record the baseline.
5. Wire into CI and document.

---

## Completion Notes

*To be filled after implementation and acceptance.*
