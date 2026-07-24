# EXP-DOC-003 — Merge Program 027 Incident Review into Charter

**Status:** Completed  
**Kind:** Documentation Remediation Expedition  
**Priority:** Medium  
**Program:** EXP-PROGRAM-039 — Documentation Remediation Program  
**Authority:** Synth Architectural Constitution

---

## Goal

Eliminate the duplicate program record for EXP-PROGRAM-027 by merging `docs/expeditions/EXP-PROGRAM-027-incident-review.md` into the authoritative program charter `docs/expeditions/EXP-PROGRAM-027.md`.

---

## Purpose

The incident review was created as a separate file while the governance failure was being analyzed. The failure is now understood, the corrective governance layer is implemented, and full-lifecycle certification is complete. Keeping the incident review as a standalone file with the same program ID causes:

- Duplicate active program records in status reports.
- Fragmented historical record.
- Risk of stale or contradictory information.

Merging it into the main charter preserves the historical record in one authoritative location.

---

## Deliverables

1. **Updated `docs/expeditions/EXP-PROGRAM-027.md`** containing an "Incident Review" or "Governability Closure" section that preserves:
   - Executive summary of the homepage drift.
   - Timeline of the failure and corrective actions.
   - Failure mode and root cause.
   - Failure-to-fix traceability matrix.
   - What remains unproven (updated to reflect current certification state).
   - Related artifacts.

2. **Removal of `docs/expeditions/EXP-PROGRAM-027-incident-review.md`.**

3. **Reference update note** in affected files explaining why the path changed.

---

## Acceptance Criteria

- [ ] Incident review content is preserved in the main program charter.
- [ ] The standalone incident-review file is removed.
- [ ] No program ID collision remains.
- [ ] All references to the old file path are updated.
- [ ] The merge rationale is recorded in the program charter and in the commit message.

---

## Out of Scope

- Changing the technical content of the incident analysis.
- Modifying runtime or governance implementation.
- Updating certification results (those are handled by EXP-DOC-004).

---

## Related

- `docs/expeditions/EXP-PROGRAM-027.md`
- `docs/expeditions/EXP-PROGRAM-027-incident-review.md`
- `docs/strategy/governability-closure-roadmap.md`
- `docs/governance/program-027/governability-benchmark.json`
- `docs/governance/program-027/governability-regression-certification.json`
