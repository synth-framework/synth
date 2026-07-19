# EXP-FIRSTCONTACT-006 — Comprehension Validation

**Status:** Completed (pending external validation)  
**Kind:** Adoption Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-009 — Canonical First Contact Experience  
**Depends On:** EXP-FIRSTCONTACT-005, EXP-FIRSTCONTACT-007, EXP-FIRSTCONTACT-008  
**Blocks:** none

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

Validate that the First Contact experience consistently communicates SYNTH to newcomers without coaching.

---

## Motivation

A deterministic first-contact system is only successful if real people understand it. Comprehension validation provides the evidence required to accept the canonical journey and its projections.

---

## Deliverables

1. **Evaluation protocol**
   - Step-by-step procedure for running comprehension tests.

2. **Participant criteria**
   - Profile of target evaluators (experienced developers unfamiliar with SYNTH).

3. **Question set**
   - Standardized questions measuring conceptual understanding.

4. **Scoring rubric**
   - Definition of passing and failing responses.

5. **Test artifacts**
   - Recorded sessions, written responses, or interview notes.

6. **Validation report**
   - Summary of findings and recommended adjustments.

---

## Acceptance

External developers consistently answer the core questions without coaching, demonstrating that the First Contact Specification and its projections communicate SYNTH effectively.

---

## Phases

### Phase 1 — Define the protocol

Specify how participants are recruited, briefed, tested, and debriefed.

### Phase 2 — Build the question set

Draft questions that test conceptual understanding rather than verbatim recall.

### Phase 3 — Recruit participants

Identify at least three experienced developers who have not used SYNTH.

### Phase 4 — Run comprehension tests

Expose participants to the canonical first-contact experience and collect responses.

### Phase 5 — Score and report

Apply the rubric, identify gaps, and recommend adjustments to EXP-FIRSTCONTACT-002 or EXP-FIRSTCONTACT-004.

---

## Risks

| Risk | Mitigation |
|---|---|
| Participants are too sympathetic | Recruit developers outside the SYNTH community |
| Questions are too leading | Test questions internally before running validation |
| Results require major rework | Treat validation as iterative; adjust projections, not the constitution |

---

## Definition of Done

- [x] Evaluation protocol documented.
- [x] Participant criteria documented.
- [x] Question set finalized.
- [x] Scoring rubric defined.
- [ ] At least three external participants evaluated.
- [ ] Test artifacts recorded.
- [ ] Validation report published.
- [ ] Recommended adjustments applied or rejected with rationale.
- [x] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Finalize the protocol and question set.
2. Recruit participants.
3. Run comprehension tests against the projected first-contact experience.
4. Score responses and write the validation report.
5. Feed findings back into EXP-FIRSTCONTACT-002 and EXP-FIRSTCONTACT-004.
6. Re-test if major adjustments are made.

---

## Completion Notes

Completed as part of Program 009 closure, with the exception of external participant validation which cannot be fabricated.

The [Comprehension Validation Protocol](../../docs/first-contact/comprehension-validation-protocol.md) is now the authoritative procedure for validating First Contact comprehension. It includes:

- Participant criteria and screening questions.
- A standardized four-phase evaluation procedure.
- A seven-question question set mapped to Program 009 success criteria.
- A 3-point scoring rubric and passing criteria.
- Failure-mode taxonomy with candidate fixes.
- Test artifact and validation report templates.

External participant sessions remain pending. Once conducted, test artifacts should be added to `first-contact/sessions/` and the validation report should be attached to the Program 009 acceptance review. Until then, the expedition is implemented but not formally accepted.
