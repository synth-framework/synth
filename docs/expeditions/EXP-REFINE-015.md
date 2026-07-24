# EXP-REFINE-015 — Evidence-Grounded Mission Drafting

> **Genesis expedition.** Require evidence attachment at Mission creation, verify charter claims against source code, and close the gap between documented intent and implemented reality.

**Status:** Proposed  
**Kind:** Genesis Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-036 — Intent Refinement & Alignment Governance  
**Phase:** 0 — Governance Lifecycle Specification  
**Authority:** Synth Architectural Constitution  
**Depends On:** EXP-REFINE-013, EXP-GOVERNABILITY-005  
**Blocks:** EXP-HOME-028

---

```yaml
Impact:
  Constitutional: No
  Product: No
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Gap Identified

During the Program 027 governability gap analysis, two framework gaps were identified in how Missions and expeditions are created:

### Gap 1: Mission drafts have no evidence requirement

When a Mission draft is created via `synth mission create`, the resulting draft contains only the subject and purpose strings. There is no mechanism to:
- Attach existing evidence files (incident reviews, regression certifications, code analysis reports)
- Link the draft to source artifacts that substantiate its claims
- Record the confidence basis (why was confidence 0.67? which evidence was missing?)

**Evidence:** The Mission draft created for the governability gap analysis (`draftId: 7f9a5a454647f013`) had `observationCoverage: 0.1` and zero evidence attachments. The low score was correct — the draft had no grounding — but there was no path to remediate it.

### Gap 2: Charter claims are not verified against code

Expedition charters frequently make claims about implementation status (`✅ Complete`, `Implemented`, `Wired`). These claims are maintained manually and can drift from the actual codebase state. There is no mechanism to:
- Verify that a claimed implementation actually exists at the referenced path
- Detect when code changes invalidate charter claims
- Alert when a charter status update is inconsistent with the source

**Evidence:** The EXP-GOVERNABILITY-001 charter referenced `EXP-HOME-026` and `EXP-HOME-027` as dependencies — these were Proposed/Genesis Complete at the time. The dependency chain in EXP-GATE-012 listed 11 GATE expeditions as dependencies even though none had been executed. These inconsistencies persisted for months.

---

## Objective

Make evidence grounding mandatory at Mission creation and charter-status verification automatic:

1. **Evidence-attached Mission drafts** — The `synth mission create` command accepts `--evidence` flags and embeds file fingerprints in the draft.
2. **Confidence basis recording** — The draft records *why* the confidence score is what it is, including which evidence categories are missing.
3. **Charter-to-code verification** — A verification command that checks charter `✅ Complete` claims against actual file paths and exports.
4. **Drift detection** — A periodic check that charter statuses remain consistent with the codebase.

---

## Design

### Evidence-attached Mission drafts

```text
synth mission create \
  --subject "..." \
  --purpose "..." \
  --evidence docs/governance/program-027/governability-benchmark.json \
  --evidence tests/convergence-certification.test.js
```

The draft stores evidence references as immutable fingerprints:

```text
MissionDraft {
  ...
  evidence: [
    { path: "docs/governance/program-027/governability-benchmark.json",
      fingerprint: "sha256:<hash>",
      description: "Benchmark failure mode statement" }
  ]
}
```

### Charter verification

```text
synth verify expedition EXP-GATE-012
```

Checks:
- Each `✅ Complete` claim maps to a file that exists at the referenced path.
- Each `Depends On` expedition exists and has a recognized status.
- Each referenced capability in execution claims actually exists in `execution.ts`.

### Drift detection

```text
synth verify charters
```

Scans all expedition charters and reports:
- Claims referencing non-existent files
- Status inconsistencies (e.g., `✅ Complete` but referenced file hasn't changed in 30 days)
- Dependency references to expeditions whose status has changed since the charter was last updated

---

## Deliverables

1. **Evidence attachment** in `synth mission create` — `--evidence` flag, fingerprint storage in draft.
2. **Confidence basis recording** — Draft schema extended with `confidenceBasis` field explaining the score.
3. **`synth verify expedition <id>` command** — Checks charter claims against codebase reality.
4. **`synth verify charters` command** — Batch scan of all expeditions for drift.
5. **Integration tests** proving:
   - A Mission with zero evidence attachments produces low confidence.
   - Adding evidence increases confidence.
   - `synth verify` correctly detects a stale `✅ Complete` claim.
6. **Documentation** of the evidence-grounding and verification model.

---

## Acceptance Criteria

1. `synth mission create --evidence <path>` stores the evidence fingerprint in the draft.
2. Mission Studio confidence scoring incorporates evidence count and coverage.
3. `synth verify expedition <id>` reports mismatches between charter claims and source code.
4. `synth verify charters` reports all expeditions with stale or inconsistent claims.
5. Existing tests pass; new evidence-grounding and verification tests pass.
6. No changes to Protected Assets.

---

## Out of Scope

- Automatic charter rewriting — verification reports issues but does not fix them.
- Real-time codebase monitoring — verification is command-driven, not event-driven.
- Visual dependency graph rendering.

---

## Relationship to Other Work

- **EXP-REFINE-013** — Mission Projection & Derivation; this expedition extends the Mission creation flow with evidence requirements.
- **EXP-GOVERNABILITY-005** — Convergence Certification; this expedition closes the symmetric gap at the *creation* end of the lifecycle.
- **EXP-GATE-013** — Dependency Graph Enforcement; this expedition provides the evidence grounding; GATE-013 provides the runtime dependency enforcement.
- **ADR-047 / ADR-048** — Intent Refinement and Alignment; this expedition operationalizes the evidence binding concepts from these ADRs.

---

## After EXP-REFINE-015

- Every Mission draft carries evidence fingerprints and a confidence basis.
- Charter drift is detectable and reportable before it causes governance failures.
- The framework has symmetric guardrails: evidence grounding at creation (this expedition) and convergence certification at completion (EXP-GOVERNABILITY-005).
