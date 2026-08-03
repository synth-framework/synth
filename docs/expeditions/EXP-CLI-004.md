# EXP-CLI-004 — Weighted Governance Inventory & Next-Action Recommendation

> Add deterministic scoring and ranking to `synth program list` and `synth expedition list` so operators and agents can answer: *"What should I work on next?"*

**Status:** Completed  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** Synth Architectural Constitution, TaskPRO onboarding retrospective, EXP-PROGRAM-031 portfolio-health findings  
**Depends On:** EXP-CLI-003 (Governance Inventory List Commands), EXP-GRAPH-001 (Shared Dependency-Graph Primitive)  
**Blocks:** None
**Completed:** 2026-08-03

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

`synth program list` and `synth expedition list` now return every program or expedition that matches a filter, but they do not help the operator decide *which* open item is most important. Agents still fall back on heuristics or grep to pick the "most logical" next step. This expedition adds a deterministic weight function and a `--next` recommendation so the CLI itself can guide prioritization.

The same scoring function can also surface status-hygiene problems (e.g., a charter marked `Draft` while its program tracker claims it is completed).

---

## Findings Addressed

| ID | Finding | Severity | Status |
|---|---|---|---|
| R1 | No CLI command ranks open expeditions by combined priority, dependencies, and strategic weight | High | Proposed |
| R2 | Agents pick the next expedition using ad hoc rules instead of a reproducible score | Medium | Proposed |
| R3 | Charter statuses can drift out of sync with their program trackers (e.g., `EXP-TASK-001..006` still `Draft` while Program 034 tracker says implemented) | Medium | Proposed |

---

## Deliverables

### 1. Deterministic scoring function

Introduce a `scoreExpedition` function in `src/governance/inventory.ts` (or a new `src/governance/rank.ts`) that computes a numeric weight from:

- **Priority weight** — Critical > High > Medium > Low.
- **Status weight** — Executing > Proposed/Draft > (Completed is excluded from "open" ranking).
- **Dependency pressure** — expeditions that unblock many downstream items score higher.
- **Program strategic priority** — Critical programs contribute more weight to their expeditions.
- **Convergence state** — expeditions under an active Convergence Review gate get a bonus or penalty based on their review outcome.
- **Hygiene penalty** — charters whose status disagrees with their program tracker reduce the program's hygiene score and emit a warning.

The function must be pure: same charter set + same graph = same score.

### 2. `synth expedition rank`

```bash
synth expedition rank
synth expedition rank --status Proposed,Draft --program EXP-PROGRAM-043
synth expedition rank --next
synth expedition rank --next --human
```

Output (structured):

```json
{
  "status": "ok",
  "kind": "ExpeditionRank",
  "count": 3,
  "expeditions": [
    { "id": "EXP-GUARD-002", "score": 92, "rationale": "Critical, unblocks all future PRs, depends on completed GUARD-001" },
    { "id": "EXP-WARN-001", "score": 74, "rationale": "Executing, High priority, no outstanding dependencies" },
    { "id": "EXP-ADP-001", "score": 51, "rationale": "High priority, small scope, tracker says completed but charter is Proposed" }
  ],
  "next": "EXP-GUARD-002"
}
```

### 3. `synth program rank`

```bash
synth program rank
synth program rank --status Active
synth program rank --next
```

Ranks active programs by open-weighted score, open-expedition count, and convergence health.

### 4. Status-hygiene warnings

When a charter's `**Status:**` line disagrees with the program tracker's composition section, emit a stable warning:

```json
{
  "status": "warning",
  "code": "WARN-GOV-001",
  "message": "EXP-TASK-001 is Draft in its charter but marked implemented in EXP-PROGRAM-034 tracker.",
  "fixCommand": "synth expedition reconcile --id EXP-TASK-001"
}
```

For this expedition, the fix command can be a documented manual step; an auto-reconcile command is out of scope.

### 5. `--human` mode

When combined with EXP-CLI-002, produce prose:

```text
Next recommended expedition: EXP-GUARD-002 (score 92)
  Stop tracking generated documentation in version control.
  Reason: Critical priority, unblocks future PRs, dependency GUARD-001 is completed.
```

---

## Acceptance Criteria

1. ✅ `synth expedition rank` returns a deterministic ordered list with scores and rationales.
2. ✅ `synth expedition rank --next` returns exactly one recommended expedition plus its rationale.
3. ✅ `synth program rank` returns active programs ordered by weighted open expeditions and program priority.
4. ✅ Status-hygiene warnings are emitted for charters whose status disagrees with their program tracker.
5. ✅ Scoring re-runs produce identical output for an unchanged charter set.
6. ✅ `npm run build` succeeds and targeted tests pass.

---

## Out of Scope

- Auto-fixing status drift (the warning points to the manual fix).
- Web UI or dashboard rendering.
- Changing expedition lifecycle semantics.
- Mutating charters from the rank command.

---

## Governance

### Protected

- Public vocabulary.
- Expedition identity rules.
- Convergence Review outcomes (read-only).

### Not included

- New event types.
- Changes to the governance lifecycle.

---

## Evidence

- Source changes
  - `src/governance/rank.ts` — deterministic scoring, downstream-impact analysis via `src/graph/dependency-graph.js`, and status-hygiene warnings.
  - `src/cli/synth.ts` — `cmdProgramRank()` and `cmdExpeditionRank()` wired as read-only commands; help and dispatch updated.
  - `src/cli/command-safety.ts` — `program rank` and `expedition rank` classified as `READ_ONLY`.
- Test changes
  - `tests/governance-rank.test.js` — scoring, `--next` selection, program ranking, hygiene warnings, and composition parsing.
- Build/validation
  - `npm run build` succeeds.
  - `node tests/governance-rank.test.js` passes.
  - `synth validate` passes.
  - `synth program rank --status Active` and `synth expedition rank --next --program EXP-PROGRAM-043` produce expected structured output.

---

## Related Documents

- `docs/expeditions/EXP-PROGRAM-043.md`
- `docs/expeditions/EXP-PROGRAM-031.md`
- `docs/expeditions/EXP-CLI-003.md`
- `docs/expeditions/EXP-GRAPH-001.md`
- `docs/design/shared-dependency-graph.md`
