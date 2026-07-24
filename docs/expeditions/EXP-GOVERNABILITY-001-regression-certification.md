# EXP-GOVERNABILITY-001 — Governability Regression Certification

**Status:** Accepted — Certification result: PASS  
**Kind:** Certification Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-036 — Intent Refinement & Alignment Governance  
**Authority:** Synth Architectural Constitution  
**Depends on:** ADR-047, ADR-048, EXP-HOME-026, EXP-HOME-027, EXP-GOVERNABILITY-006B  
**Classification:** Application  
**Kernel:** Protected

---

## Objective

Execute the Program 027 Replay Graph and certify that today's SYNTH governance collapses the interpretation space to acceptable outcomes.

The benchmark failure is:

```text
Implementation conforms to expedition specifications
        but
Implementation diverges from the originating human intent
```

This expedition is part of the **Governability Closure Roadmap** (`docs/strategy/governability-closure-roadmap.md`). It does not add new governance concepts. It certifies that the concepts introduced by ADR-047 and ADR-048 actually prevent the failure they were designed to prevent.

## Scope boundary

**EXP-GOVERNABILITY-001 is strictly a certification expedition.** It may only:

1. Build the benchmark, replay specification, and replay execution artifacts.
2. Execute the replay graph.
3. Record results.
4. Identify gaps.
5. Recommend — but not implement — additional corrective actions.

If missing mechanisms are discovered (for example, in Review Gate, Acceptance Gate, or Convergence Certification), they are recorded as findings and resolved by follow-on corrective expeditions. This preserves the evidentiary value of the replay and prevents scope creep.

```text
Replay
    ↓
Evidence
    ↓
Gap
    ↓
Corrective Expedition
    ↓
Replay again
```

---

## Certification result

**Result: PASS — Full-lifecycle deterministic replay certified by EXP-GOVERNABILITY-006B.**

The Program 027 Replay Graph now executes automatically through the complete governance lifecycle:

- **Recall:** 8/8 drift-class branches are rejected.
- **Precision:** 4/4 valid branches remain admissible.
- **Determinism:** Three consecutive full-lifecycle replays produce semantically identical event logs and semantic state hashes.
- **Coverage:** Every identified drift class has at least one replay, including post-implementation convergence failure.

The full chain is certified:

```text
Intent Model → Alignment Contract → Divergence Gate → Mission → Expedition
    → Refined Intent → Review Gate → Acceptance Gate → Convergence Certification → Mission Completion
```

EXP-GOVERNABILITY-003 supplied the deterministic Proposal Evaluation Capability. EXP-GOVERNABILITY-006B certified that the complete lifecycle composes deterministically through public capabilities.

### Architectural layering insight

The replay validates the full governance stack:

```text
Proposal → Proposal Evaluation → Divergence Gate → Review Gate → Acceptance Gate → Convergence Certification
```

No remaining architectural gap is identified for Program 027.

### Certification report

Full evidence: `docs/governance/program-027/governability-regression-certification.json`  
Lifecycle replay evidence: `docs/governance/program-027/lifecycle-replay-evidence.json`

---

## Background

Program 027 was chartered to make Mission Studio the SYNTH homepage. It had strong specifications, design tokens, component catalogs, and explicit anti-goals. Despite this, the implementation drifted toward a generic SaaS dashboard aesthetic.

The failure was not one bad decision chain. It was an **interpretation space** containing many outcomes — dashboards, marketing pages, chat interfaces, persistent workspaces — all consistent with the same Mission. Governance failed because it did not collapse that space to acceptable interpretations.

ADR-047 and ADR-048 introduced the Genesis Layer to close this gap. This expedition tests whether the layer works by exercising the Replay Graph.

---

## Permanent artifacts produced

| Artifact | Path | Purpose |
|---|---|---|
| Benchmark | `docs/governance/program-027/governability-benchmark.json` | Immutable failure-mode statement |
| Replay Specification | `docs/governance/program-027/replay-specification.json` | Interpretation graph and drift classes |
| Replay Execution | `docs/governance/program-027/governability-regression-certification.json` | Evidence of what today's governance did |
| Convergence Criteria | `docs/governance/program-027/convergence-certification-criteria.md` | Post-implementation intent check |

---

## Replay Graph

The Replay Graph is a set of interpretation branches from the Program 027 Mission to possible outcomes.

### Drift classes (must be rejected)

| ID | Drift class | Example proposal |
|---|---|---|
| D01 | Generic dashboard | Metric cards, promotional banners, disconnected widgets |
| D02 | Marketing-first landing | Mission Studio as one section among many marketing sections |
| D03 | Chat-primary interface | Chat bubbles as dominant interaction |
| D04 | Page-jump navigation | Lifecycle phases as separate pages |
| D05 | Storybook aesthetic | Components displayed as isolated specimens |
| D06 | Placeholder artifacts | Fake terminal output unrelated to runtime |
| D07 | Hardcoded values | Visual values outside LDS-002 token system |
| D08 | Workspace dilution | Mission Studio shell present but not dominant |

### Valid branches (must remain admissible)

| ID | Valid branch | Example proposal |
|---|---|---|
| V01 | Persistent workspace | Mission Studio as homepage with scroll-driven phases |
| V02 | Hero invitation | Short hero transitioning into Mission Studio |
| V03 | Deterministic demo | Simulated operator execution without live agent |
| V04 | Light-theme default | Light workspace theme, dark mode optional |

---

## Certification principles

Certification measures both **recall** and **precision**.

| Principle | Requirement |
|---|---|
| **Recall** | Every drift-class branch is intercepted before implementation. |
| **Precision** | Every valid branch remains admissible. |
| **Determinism** | Repeating the same replay produces the same outcome. |
| **Coverage** | Every identified drift class has at least one replay. |

A system that rejects everything fails precision. A system that accepts everything fails recall.

---

## Scope

### In scope

1. Produce the Benchmark artifact.
2. Produce the Replay Specification artifact.
3. Execute replays for every drift class.
4. Execute replays for every valid branch.
5. Verify the Divergence Gate resolves correctly for each drift class.
6. Verify valid branches are not rejected.
7. Define Convergence Certification criteria for Program 027.
8. Produce the Replay Execution / certification report.

### Out of scope

- New homepage implementation.
- Changes to the kernel, EventStore, StateStore, Replay, or ExecutionGate.
- Changes to ADR-047 or ADR-048.
- Generalization beyond the Program 027 failure mode.

---

## Replay execution worksheet

This worksheet is the evidence record. Each row is a replay branch.

| Branch ID | Type | Input | Expected Outcome | Actual Outcome | Pass | Intercept Point |
|---|---|---|---|---|---|---|
| D01 | Drift | Generic dashboard proposal | Rejected / revision required | Rejected | ✅ | Divergence Gate |
| D02 | Drift | Marketing-first landing page | Rejected | Rejected | ✅ | Divergence Gate |
| D03 | Drift | Chat-primary interface | Rejected | Rejected | ✅ | Divergence Gate |
| D04 | Drift | Page-jump navigation | Rejected | Rejected | ✅ | Divergence Gate |
| D05 | Drift | Storybook aesthetic | Rejected / revision required | Rejected | ✅ | Divergence Gate |
| D06 | Drift | Placeholder artifacts | Rejected / revision required | Rejected | ✅ | Divergence Gate |
| D07 | Drift | Hardcoded visual values | Rejected / revision required | Rejected | ✅ | Divergence Gate |
| D08 | Drift | Workspace dilution | Rejected / revision required | Rejected | ✅ | Divergence Gate |
| V01 | Valid | Persistent workspace | Admitted / aligned | Aligned | ✅ | Divergence Gate |
| V02 | Valid | Hero invitation | Admitted / aligned | Aligned | ✅ | Divergence Gate |
| V03 | Valid | Deterministic demo | Admitted / aligned | Aligned | ✅ | Divergence Gate |
| V04 | Valid | Light-theme default | Admitted / aligned | Aligned | ✅ | Divergence Gate |

A row passes when actual matches expected. Rows blocked by missing mechanisms are recorded as blocked, not failed, and feed the gap analysis.

---

## Acceptance criteria

The expedition is complete only when:

1. **Benchmark** artifact is produced.
2. **Replay Specification** artifact is produced and covers all drift classes and valid branches.
3. **Recall:** All drift-class replays (D01–D08) are intercepted.
4. **Precision:** All valid-branch replays (V01–V04) remain admissible.
5. **Determinism:** Repeating any replay produces the same outcome.
6. **Convergence Certification criteria** for Program 027 are documented.
7. **Certification report** is captured in `docs/governance/program-027/governability-regression-certification.json`.
8. Build and tests remain green.

---

## Dependencies

| Dependency | Status | Why it blocks |
|---|---|---|
| ADR-047 — Intent Refinement and Alignment Governance | ✅ Accepted | Defines Intent Model, Refined Intent, Alignment Contract, Divergence Gate |
| ADR-048 — Genesis Lifecycle and Alignment Contracts | ✅ Accepted | Defines Genesis Layer lifecycle and Reference Evidence Binding |
| EXP-HOME-026 — Homepage Intent Model | ✅ Complete | Provides the intent against which drift is measured |
| EXP-HOME-027 — Homepage Alignment Contract | ✅ Approved | Provides the contract against which proposals are evaluated |
| EXP-PROGRAM-035 — Intent Refinement & Review Governance | 📋 Proposed | Provides execution-correctness gates; not required for this certification |
| EXP-GOVERNABILITY-003 — Proposal Evaluation Capability Implementation | ✅ Complete | Supplies the deterministic evaluation layer consumed by the Divergence Gate |

---

## Relationship to other work

- **docs/strategy/governability-closure-roadmap.md:** This expedition executes the replay phases of the closure roadmap.
- **EXP-PROGRAM-027 — Mission Studio Homepage:** The homepage remains paused until this certification passes.
- **EXP-PROGRAM-036 — Intent Refinement & Alignment Governance:** Corrective action; this certification is the pilot proof for the Genesis Layer.
- **EXP-PROGRAM-035 — Intent Refinement & Review Governance:** Corrective action; not required for this certification but part of full closure.
- **EXP-REFINE-008 — Program 027 Retrofit:** This certification is the exit gate for the retrofit phase.
- **EXP-PLATFORM-004 — Utility Extraction:** Independent; can proceed in parallel.
- **EXP-SIMPLIFICATION-004 — Filesystem Contract Unification:** Independent; can proceed in parallel.

---

## Success metrics

| Metric | Target | Actual |
|---|---|---|
| Drift-class replays intercepted | 8/8 (D01–D08) | 8/8 ✅ |
| Valid-branch replays admitted | 4/4 (V01–V04) | 4/4 ✅ |
| Full-lifecycle replay determinism | 3/3 runs identical | Demonstrated ✅ |
| Missing mechanisms identified | All recorded | None remaining |
| Kernel files touched | 0 | 0 |
| New concepts introduced | 0 | 0 |
| Build/test failures | 0 | 0 |

---

## Decision criteria after certification

| Certification result | Recommended next step |
|---|---|
| **Pass** | Program 027 implementation may resume; governance lifecycle is certified deterministic. |
| **Partial pass** | Address gaps, then re-run certification before resuming implementation. |
| **Fail** | Programs 035 and 036 are not future work; they are blockers that must be implemented before any intent-sensitive program proceeds. |

---

## Non-goals

- Do not implement the homepage.
- Do not change the SYNTH kernel.
- Do not modify ADR-047 or ADR-048.
- Do not generalize the certification beyond the Program 027 failure mode.
- Do not perform a full `npm run govern`; agents run only targeted validations per ADR-043.
