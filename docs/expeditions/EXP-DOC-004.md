# EXP-DOC-004 — Update Program 027 Governability References

**Status:** Completed  
**Kind:** Documentation Remediation Expedition  
**Priority:** Medium  
**Program:** EXP-PROGRAM-039 — Documentation Remediation Program  
**Authority:** Synth Architectural Constitution

---

## Goal

Update all references to `docs/expeditions/EXP-PROGRAM-027-incident-review.md` to point to the merged location inside `docs/expeditions/EXP-PROGRAM-027.md`.

---

## Purpose

When EXP-DOC-003 merges the incident review into the main program charter, existing references in strategy roadmaps and JSON certification artifacts become stale. This expedition updates those references and records the rationale for the change so that the documentation graph remains consistent.

---

## Files to Update

| File | Current Reference | Change |
|---|---|---|
| `docs/strategy/governability-closure-roadmap.md` | `docs/expeditions/EXP-PROGRAM-027-incident-review.md` | Point to `docs/expeditions/EXP-PROGRAM-027.md` and add a change note. |
| `docs/governance/program-027/governability-benchmark.json` | `incidentReviewPath` field | Update path and add a `note` field explaining the merge. |
| `docs/governance/program-027/governability-regression-certification.json` | `artifactStatus.incidentReview.path` | Update path and add a `note` field explaining the merge. |

---

## Deliverables

1. Updated `docs/strategy/governability-closure-roadmap.md` with:
   - New incident artifact path.
   - A change note explaining the merge.

2. Updated `docs/governance/program-027/governability-benchmark.json` with:
   - New `incidentReviewPath` value.
   - A `note` field documenting the merge and the preservation of content.

3. Updated `docs/governance/program-027/governability-regression-certification.json` with:
   - New `artifactStatus.incidentReview.path` value.
   - A `note` field documenting the merge.

---

## Acceptance Criteria

- [ ] No file in the repository references `EXP-PROGRAM-027-incident-review.md`.
- [ ] Every updated reference points to `docs/expeditions/EXP-PROGRAM-027.md`.
- [ ] Each updated file contains a note explaining why the path changed.
- [ ] The historical content of the incident review remains discoverable.

---

## Out of Scope

- Changing benchmark, replay, or certification semantic content.
- Modifying test code that consumes the JSON artifacts (tests use paths from the artifacts).
- Renaming or moving other governance files.

---

## Related

- EXP-DOC-003 — Merge Program 027 Incident Review into Charter
- `docs/expeditions/EXP-PROGRAM-027.md`
- `docs/strategy/governability-closure-roadmap.md`
- `docs/governance/program-027/governability-benchmark.json`
- `docs/governance/program-027/governability-regression-certification.json`
