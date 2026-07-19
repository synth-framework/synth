# EXP-DIST-006 — GitHub Templates and Actions

> **Product expedition.** Publish repository templates, issue/PR templates, and Actions so developers discover SYNTH through GitHub.

**Status:** Completed  
**Kind:** Product Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-029 — AI Ecosystem Distribution  
**Depends On:** EXP-PROGRAM-028  
**Blocks:** None

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

## Objective

Make GitHub a first-class discovery surface by providing structured issue and PR templates and a governance workflow Action.

---

## Deliverables

- `.github/ISSUE_TEMPLATE/bug_report.md` — bug report template using SYNTH public vocabulary.
- `.github/ISSUE_TEMPLATE/feature_request.md` — feature request template with Protected Asset check.
- `.github/pull_request_template.md` — PR template with governance and Protected Asset checklist.
- `.github/workflows/synth-govern.yml` — CI workflow running `npm run govern`.

---

## Acceptance Criteria

- [x] Issue templates guide reporters to use SYNTH concepts and evidence.
- [x] PR template requires governance pass and Protected Asset confirmation.
- [x] GitHub Action runs the canonical governance pipeline on pushes and PRs.

---

## Evidence

- Templates and workflow are present in `.github/`.
