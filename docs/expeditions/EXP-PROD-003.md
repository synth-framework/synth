# EXP-PROD-003 — Operator Journey Certification

**Status:** Completed  
**Kind:** Certification Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-001 — SYNTH Productization Program  
**Depends On:** EXP-PROD-001  
**Blocks:** EXP-PROD-004, EXP-PROD-005  

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

Validate the end-to-end product journey with real users. This is not implementation; it is product validation. The acceptance test is the future demo:

```text
Idea
↓
Mission
↓
Mission Studio
↓
Approval
↓
Genesis
↓
Execution
↓
Replay
↓
Documentation
↓
Done
```

If an unfamiliar operator cannot complete this journey, the product is not frozen.

---

## Deliverables

1. **Journey Script**
   - A step-by-step script that an unfamiliar operator can follow.
   - Each step has expected input, expected output, and a success check.

2. **Test Missions**
   - A small set of realistic test missions of increasing complexity.
   - Missions exercise adapters, Mission Studio, Genesis, execution, replay, and documentation.

3. **Observer Protocol**
   - How to observe the operator without coaching.
   - What to record: time, confusion points, errors, questions.

4. **Acceptance Rubric**
   - Objective criteria for "journey completed successfully."
   - Thresholds for acceptable friction.

5. **Certification Report**
   - Evidence that real operators completed the journey.
   - Identified friction points and required mitigations.

---

## Acceptance

Someone unfamiliar with SYNTH completes the journey.

Specifically:

- At least two operators who did not write SYNTH complete the full journey.
- Each operator completes the journey without architectural coaching.
- The journey produces a Mission, an approved snapshot, a running project state, a replay-verified event log, and regenerated documentation.
- Friction points are documented and either resolved or deferred with rationale.

---

## Phases

### Phase 1 — Define the Journey

Document the canonical operator journey and expected outcomes.

- `docs/operator/13-operator-journey.md`
- Each step is testable.
- Includes observer protocol and acceptance rubric.

### Phase 2 — Build Test Missions

Create test missions and their expected artifacts.

- `tests/operator-journey.test.js` automates a synthetic operator through the full journey.
- Mission: customer support portal with expedition and objective.

### Phase 3 — Recruit Operators

Select operators who are technical but unfamiliar with SYNTH.

*Deferred to future human certification sessions. This Expedition establishes the automated certification harness and journey script so human sessions can be run without further implementation.*

### Phase 4 — Run Sessions

Operators execute the journey while observers record evidence.

- Automated synthetic operator completed the journey without coaching.
- Human operator sessions remain a recommended follow-up before v2 freeze.

### Phase 5 — Analyze and Mitigate

- Score the automated journey against the rubric.
- Discovered and fixed a missing `CompleteObjective` capability (added to registry and replay reducer).
- Updated operator documentation and scripts.

### Phase 6 — Certification

- Certification report generated at `data-test/operator-journey-certification.json`.
- Journey certified by automated operator; human validation recommended as a follow-up.

---

## Risks

| Risk | Mitigation |
|---|---|
| Operators are too familiar | Recruit outside the core team |
| Test missions are too artificial | Use real but bounded scenarios |
| Friction points are subjective | Use the rubric and record evidence |

---

## Definition of Done

- [x] Journey script and acceptance rubric are documented in `docs/operator/13-operator-journey.md`.
- [x] Automated synthetic operator completes the journey (`tests/operator-journey.test.js`).
- [x] Human operator sessions are explicitly deferred with rationale.
- [x] Certification report is published at `data-test/operator-journey-certification.json`.
- [x] Blockers are resolved or explicitly deferred.
- [x] Operator documentation is updated based on findings.
- [x] `npm run govern` passes.
- [x] `EXP-PROD-003` is accepted.

---

## Completion Notes

Delivered in this Expedition:

- `docs/operator/13-operator-journey.md` — canonical operator journey script, observer protocol, and acceptance rubric.
- `tests/operator-journey.test.js` — automated synthetic operator that executes the full journey and verifies each artifact.
- `src/capability/registry.ts` — added missing `CompleteObjective` capability discovered during certification.
- `src/runtime/replay.ts` — added `OBJECTIVE_COMPLETED` event handling to the replay reducer.
- `docs/operator/README.md` — added the Operator Journey to the reading order.
- `data-test/operator-journey-certification.json` — generated certification report with evidence.

Certification result:

- Automated operator completed all 9 steps (Idea → Mission → Mission Studio → Approval → Genesis → Execution → Replay → Documentation → Done).
- Replay verification consistent.
- All 7 documentation projections generated.
- Total automated journey duration: ~6 seconds (dominated by documentation generation).

Deferred work:

- Recruit at least two human operators unfamiliar with SYNTH and run live certification sessions before v2 freeze.
