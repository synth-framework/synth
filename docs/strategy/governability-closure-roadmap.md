# Governability Closure Roadmap

**Status:** Strategic roadmap  
**Date:** 2026-07-22  
**Incident:** Program 027 Homepage Governability Certification Failure  
**Incident review:** `docs/expeditions/EXP-PROGRAM-027-incident-review.md`  
**Benchmark:** `docs/governance/program-027/governability-benchmark.json` ✅  
**Replay specification:** `docs/governance/program-027/replay-specification.json` ✅  
**Lifecycle replay specification:** `docs/governance/program-027/lifecycle-replay-specification.json` ✅  
**Certification expedition:** `docs/expeditions/EXP-GOVERNABILITY-001-regression-certification.md` ✅

---

## Purpose

This roadmap defines a reusable, evidence-based methodology for proving that SYNTH's governance eliminates a previously observed governance failure. The methodology is built around a **Replay Graph**, not a single linear replay.

The core objective:

> A governance failure is closed only when every identified drift class in the Replay Graph is intercepted before implementation, while every valid interpretation remains admissible.

---

## Reframing the failure

The Program 027 homepage incident was a **governability certification failure**. SYNTH had governance concepts, but it lacked a repeatable way to prove they prevented a known failure.

The failure was not a single bad decision chain. It was an **interpretation space** containing many admissible outcomes — including generic dashboards, marketing pages, chat interfaces, and persistent workspaces — all consistent with the same Mission. Governance failed because it did not collapse that space to only acceptable interpretations.

---

## Reusable methodology

```text
1. Capture the incident as an immutable artifact.
2. Define the benchmark: what happened and why it failed.
3. Specify the Replay Graph: every admissible interpretation branch.
4. Identify drift classes: branches that must be rejected.
5. Execute replays across the graph.
6. Observe where governance intervenes.
7. Classify gaps: solved, specified-but-uncertified, missing.
8. Apply only corrective actions required by demonstrated gaps.
9. Certify: every drift class intercepted, every valid branch admitted.
10. Declare closure.
```

Controls are not the destination. They are the explanation for why a replay branch stops where it does.

---

## Permanent artifacts

Four artifacts must remain distinct and versioned.

| Artifact | Purpose | Status |
|---|---|---|
| **Incident** | Historical record of what occurred | ✅ `docs/expeditions/EXP-PROGRAM-027-incident-review.md` |
| **Benchmark** | Immutable statement of the failure mode and its root cause | ✅ `docs/governance/program-027/governability-benchmark.json` |
| **Replay Specification** | Machine-executable definition of the interpretation graph and drift classes | ✅ `docs/governance/program-027/replay-specification.json` |
| **Lifecycle Replay Specification** | Machine-executable definition of the full governance lifecycle replay | ✅ `docs/governance/program-027/lifecycle-replay-specification.json` |
| **Replay Execution** | Record of what today's governance did for each replay branch | ✅ Produced by EXP-GOVERNABILITY-001 and EXP-GOVERNABILITY-006B |

### Artifact relationships

```text
Incident
    │
    ▼
Benchmark  ←  immutable
    │
    ▼
Replay Specification  ←  evolves as drift classes are discovered
    │
    ▼
Replay Execution  ←  evidence for certification
```

---

## Replay Graph

The Replay Graph models the space of admissible interpretations, not one historical path.

```text
                    Raw Intent
                        │
                        ▼
                    Mission
                        │
                        ▼
              Interpretation Space
                   /    │    \
                  /     │     \
                 /      │      \
         Dashboard   Marketing   Chat
                        │
                        │
                  Workspace
                        │
                        ▼
                 Acceptable
```

Each edge represents an interpretation choice. Governability certification verifies that every edge leading to a drift class is blocked, while every edge leading to an acceptable outcome remains open.

---

## Identified drift classes for Program 027

A drift class is a category of interpretation that violates intent. Closure is measured by coverage of these classes.

| ID | Drift class | Description | Example |
|---|---|---|---|
| D01 | Generic dashboard | Metric cards, promotional banners, disconnected widgets | Generic SaaS developer dashboard |
| D02 | Marketing-first landing | Mission Studio as one section among many marketing sections | Conventional product homepage |
| D03 | Chat-primary interface | Chat bubbles or decorative AI imagery as dominant interaction | AI assistant landing page |
| D04 | Page-jump navigation | Lifecycle phases rendered as separate pages instead of persistent workspace | Multi-page marketing site |
| D05 | Storybook aesthetic | Components displayed as isolated specimens rather than integrated workspace | Component documentation page |
| D06 | Placeholder artifacts | Fake terminal output or mock data unrelated to runtime | Demo content without runtime binding |
| D07 | Hardcoded values | Visual values outside LDS-002 token system | One-off colors, spacing, typography |
| D08 | Workspace dilution | Mission Studio shell present but not dominant | Decorative workspace framing |

### Valid interpretation branches

| ID | Branch | Description |
|---|---|---|
| V01 | Persistent workspace | Mission Studio as the homepage; scroll-driven phases |
| V02 | Hero invitation | Short hero that transitions into Mission Studio |
| V03 | Deterministic demo | Simulated operator execution without live agent |
| V04 | Light-theme default | Light workspace theme, dark mode optional |

---

## Certification principles

Governability certification measures both **effectiveness** and **discrimination**.

| Principle | Question | Failure mode if absent |
|---|---|---|
| **Recall** — reject known-bad | Does governance block every drift class? | Drift reaches implementation |
| **Precision** — admit known-good | Does governance allow every valid branch? | Governance becomes unusable |
| **Determinism** | Is the outcome the same on every replay? | Certification is not repeatable |
| **Coverage** | Is every identified drift class represented by at least one replay? | Unknown gaps remain |

A governable system must have high recall and high precision. Blocking everything is not sufficient.

---

## Roadmap phases

### Phase 0 — Capture the incident

**Artifact:** Incident review  
**Status:** ✅ Complete  
**Path:** `docs/expeditions/EXP-PROGRAM-027-incident-review.md`

Historical record of the Program 027 homepage drift: timeline, root cause, decision chain, failure matrix.

---

### Phase 1 — Define the benchmark

**Artifact:** `docs/governance/program-027/governability-benchmark.json`  
**Status:** ✅ Complete

The benchmark is an immutable statement of the failure mode:

```json
{
  "incident": "Program 027 homepage drift",
  "failureClass": "compliant but not converged",
  "rootCause": "validated understanding missing before Mission creation",
  "driftClasses": ["D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08"],
  "validBranches": ["V01", "V02", "V03", "V04"]
}
```

---

### Phase 2 — Specify the Replay Graph

**Artifact:** `docs/governance/program-027/replay-specification.json`  
**Status:** ✅ Complete

The Replay Specification defines:

- every interpretation branch
- which branches are drift classes
- which branches are valid
- the expected intervention point for each drift class
- the inputs required to exercise each branch

---

### Phase 3 — Execute replays

**Artifact:** Replay execution log  
**Produced by:** EXP-GOVERNABILITY-001

Run the Replay Graph against today's governance. Record the actual outcome for each branch.

---

### Phase 4 — Observe interventions

Record where governance intervenes for each branch. Compare actual vs. expected.

### Phase 5 — Classify gaps

| Category | Meaning | Example |
|---|---|---|
| **Solved** | Replay branch is intercepted deterministically | Platform ambiguity |
| **Specified but uncertified** | Mechanism exists but not proven to fire | Divergence Gate rejecting drift |
| **Missing** | No mechanism exists | Convergence Certification |

---

### Phase 6 — Apply corrective actions

Corrective actions are derived only from demonstrated gaps.

```text
Program 027 Governability Certification Failure
        │
        ▼
Root Cause: interpretation space not collapsed before Mission creation
        │
        ▼
Corrective Actions
        │
        ├── EXP-PROGRAM-036 — Intent Refinement & Alignment Governance
        │       Fixes: intent capture, refinement, alignment contract, divergence gate
        │
        ├── EXP-PROGRAM-035 — Intent Refinement & Review Governance
        │       Fixes: review gate, acceptance gate, execution-correctness enforcement
        │
        └── EXP-GOVERNABILITY-001 — Governability Regression Certification
                Verifies: replay graph is covered, precision and recall are high
```

---

### Phase 7 — Certify

Certification verifies coverage, precision, and recall across the Replay Graph.

| Requirement | Evidence |
|---|---|
| Every drift class has at least one replay | Replay Specification coverage matrix |
| Every drift-class replay is intercepted | Replay Execution log |
| Every valid branch remains admissible | Replay Execution log |
| Results are deterministic | Multiple replay runs produce identical outcomes |
| Missing mechanisms are recorded | Gap classification table |

---

### Phase 8 — Declare closure

**Status:** CLOSED — Full-lifecycle deterministic replay certified by EXP-GOVERNABILITY-006B.

Closure criteria:

1. ✅ Incident, Benchmark, Replay Specification, and Replay Execution artifacts exist.
2. ✅ Every identified drift class has at least one replay that is intercepted before implementation.
3. ✅ Every valid interpretation branch remains admissible.
4. ✅ Replay results are deterministic across three consecutive executions.
5. ✅ Every missing mechanism is implemented and re-certified.
6. Closure report is archived at `docs/governance/program-027/governability-closure-report.md`.

Possible outcomes:

| Outcome | Definition |
|---|---|
| **CLOSED** | All drift classes intercepted; all valid branches admissible; deterministic replays. |
| **PARTIALLY CLOSED** | All architectural drift classes intercepted; governance lifecycle not fully certified. |
| **OPEN** | At least one drift-class replay reaches implementation, or at least one valid branch is wrongly rejected. |

**Current assessment: CLOSED**

- Divergence Gate rejects all 8 drift classes deterministically.
- Review Gate and Acceptance Gate enforcement is implemented and certified.
- Convergence Certification is implemented and certified.
- Precision, recall, determinism, and coverage are demonstrated for the Program 027 Replay Graph.
- Full governance lifecycle replay (Intent → Alignment Contract → Divergence Gate → Mission → Expedition → Review Gate → Acceptance Gate → Convergence Certification → Mission Completion) is deterministic.

---

## Relationship to other work

- **docs/strategy/simplification-program.md** — Platform simplification continues in parallel.
- **EXP-PLATFORM-004 — Utility Extraction** — Independent; can proceed.
- **EXP-SIMPLIFICATION-004 — Filesystem Contract Unification** — Independent; can proceed.
- **EXP-PROGRAM-027 — Mission Studio Homepage** — Governability closure achieved; implementation may resume under the certified governance model.
- **EXP-PROGRAM-035 / 036** — Corrective actions, not standalone roadmap items.

---

## Conclusion

The Program 027 homepage incident was a governability certification failure. SYNTH had governance concepts but no way to prove they collapsed the interpretation space to acceptable outcomes. This roadmap closes that gap by making the Replay Graph the primary artifact, defining drift classes for coverage-based closure, and certifying both recall and precision. The methodology is reusable for any future governance incident.
