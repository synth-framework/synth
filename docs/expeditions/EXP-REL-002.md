# EXP-REL-002 — Public Documentation

**Status:** Completed  
**Kind:** Release Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-002 — SYNTH Public Release Program  
**Depends On:** EXP-REL-001  
**Blocks:** EXP-REL-004

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

Produce the public-facing documentation experience.

---

## Deliverables

1. **README**
   - One-paragraph product description.
   - Install command.
   - Quick start command.
   - Link to full docs.

2. **Quick Start**
   - Five-minute path from install to first `npm run govern`.
   - Assumes no prior knowledge of Synth internals.

3. **Mission Studio Guide**
   - How to chart a mission.
   - How to approve a mission.
   - How to review snapshot lineage.

4. **Examples Guide**
   - List of canonical examples.
   - How to run each example.
   - What each example demonstrates.

5. **Architecture Overview**
   - Public-facing explanation using only the seven public concepts.
   - No internal component names (Mission Studio, Genesis, etc.) unless explicitly labeled as implementation detail.

6. **FAQ**
   - Common questions from new operators.
   - Answers that reinforce the public mental model.

7. **Reference**
   - Public vocabulary.
   - Command reference.
   - Proof schema summary.

---

## Acceptance

A new operator can complete the Quick Start in under five minutes.

Specifically:

- README makes the value proposition clear in one reading.
- Quick Start runs without errors on a clean machine.
- Every public concept is explainable without referencing internals.
- Documentation builds or renders correctly.

---

## Phases

### Phase 1 — Draft

Write first drafts of README, Quick Start, and Mission Studio Guide.

### Phase 2 — Review

Review against ADR-002 public vocabulary boundary.

### Phase 3 — Expand

Add Examples Guide, Architecture Overview, FAQ, and Reference.

### Phase 4 — Validate

Run documentation with a user unfamiliar with Synth. Fix friction points.

---

## Risks

| Risk | Mitigation |
|---|---|
| Internal names leak | Run public-vocabulary audit |
| Docs drift from code | Link examples to tested code |
| Too much detail early | Keep Quick Start minimal |

---

## Definition of Done

- [x] README is complete and reviewed.
- [x] Quick Start completes in under five minutes on a clean machine.
- [x] Mission Studio Guide is published.
- [x] Examples Guide is published.
- [x] Architecture Overview uses only public concepts.
- [x] FAQ and Reference are published.
- [x] Public-vocabulary audit passes.
- [x] Expedition is accepted.

---

## Completion Notes

Delivered public-facing documentation:

- `README.md` — root landing with install, quick start, and links.
- `docs/getting-started/README.md` — canonical Quick Start (install + `npm run govern` in under five minutes).
- `docs/README.md` — documentation index and reading paths.
- `docs/operator/01-getting-started.md` — operator-oriented getting started guide.
- `docs/operator/mission-studio-guide.md` — how to chart, evidence, plan, and approve missions.
- `docs/operator/examples-guide.md` — catalog of certified examples and how to run them.
- `docs/operator/12-faq.md` — updated to remove internal component names and use public vocabulary.
- `docs/reference/public-architecture.md` — public architecture overview using only the seven public concepts.
- `docs/reference/public-vocabulary.md` — public vocabulary reference.

After the `docs/` reorganization in EXP-REL-001, the Quick Start was moved from `docs/operator/01-getting-started.md` to `docs/getting-started/README.md` to match the public-release layout. All cross-references were updated and verified with `scripts/check-links.js`.

Additional fixes applied during this review:

- Repaired relative links broken by the `docs/` reorganization (e.g., `docs/philosophy/` → `docs/guides/philosophy/`, `../examples/` → `../../examples/` from `docs/operator/`).
- Fixed the documentation generator (`src/documentation/documentation-expedition.ts`) so generated docs in `docs/generated/` and `examples/*/docs-generated/` link back to source docs with correct relative paths.
- Created minimal stubs for missing agent pattern files so the Agent Patterns index no longer has broken links.

Reviewed against ADR-002 public vocabulary boundary. Internal component names removed from operator-facing answers.

Verification:

- `scripts/check-links.js` reports zero broken internal Markdown links.
- `npm run test:public-vocabulary-audit` passes.
- `npm run test:freeze-certification` passes.
- `npm run audit:repository` passes.
- `npm run govern` passes with proof `proof/proof-2026-07-12T13-15-45-988Z.json`.
