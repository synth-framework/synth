# EXP-DOCS-001 — Documentation Projection System

**Status:** Completed  
**Kind:** Adoption Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-008 — Documentation & Projections  
**Depends On:** none  
**Blocks:** EXP-INSTALL-011

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

Establish deterministic documentation projections that transform committed constitutional sources into derived artifacts such as README, API reference, operator guides, architecture overviews, AI context, and website-ready content.

---

## Motivation

Today the Publish workflow mixes documentation generation with website deployment. Generated documentation is also entangled with version control through `docs:verify-projection`, which compares fresh output against committed files. This creates a circular dependency: the installer pipeline depends on documentation state, and documentation verification depends on Git state.

The Documentation Projection System resolves this by making projections explicit, deterministic, and independent of any specific consumer or execution environment.

---

## Deliverables

1. **Projection Rule**
   - Document the constitutional rule: every derived artifact is reproducible from constitutional sources through deterministic projections; projection outputs are build artifacts, not authoritative state.

2. **Projection engine**
   - `synth docs generate` produces all required documentation artifacts from `docs/`.
   - Output is deterministic: identical sources produce identical outputs.

3. **Projection graph validation**
   - A validation script verifies that every required projection ran successfully.
   - It checks that declared outputs exist and that no orphan outputs remain.
   - It does not compare outputs against committed files.

4. **Clean separation from version control**
   - `docs/generated/` is excluded from version control.
   - No generated artifact is committed as authoritative state.

5. **Consumer contract**
   - Downstream consumers (Publish workflow, release pipeline, website build) consume projection artifacts from a well-known output path.
   - Consumers do not regenerate projections themselves.

---

## Acceptance

- `npm run docs:generate` produces deterministic output in `docs/generated/`.
- `npm run docs:validate-projections` (or equivalent) passes without comparing to Git.
- `docs/generated/` is listed in `.gitignore` and not tracked.
- The Publish workflow consumes projection artifacts rather than generating or verifying them against Git.

---

## Phases

### Phase 1 — Define the Projection Rule

Add the Projection Rule to the expedition and program documents.

### Phase 2 — Remove Git-comparison semantics

Update `scripts/verify-documentation-projection.js` to validate the projection system instead of comparing against committed files. Rename the script or npm script to reflect the new semantics.

### Phase 3 — Establish consumer contract

Document the expected projection output path and required outputs.

### Phase 4 — Update the Publish workflow

Restructure the Publish workflow to generate projections once and consume them in subsequent steps.

### Phase 5 — Verify determinism

Run projections locally and in CI and confirm identical outputs.

---

## Risks

| Risk | Mitigation |
|---|---|
| Existing consumers depend on committed generated docs | Update consumers to run projections or consume CI artifacts |
| Projection validation becomes a no-op | Define explicit required-output list and graph checks |
| Non-deterministic output | Add determinism tests and pin dependencies |

---

## Definition of Done

- [x] Projection Rule is documented in EXP-PROGRAM-008 and this expedition.
- [x] `docs/generated/` is not tracked in version control.
- [x] Projection engine runs deterministically from committed sources.
- [x] Projection graph validation passes and does not compare against Git.
- [x] Publish workflow consumes projection artifacts.
- [x] `npm run govern` passes.
- [x] Expedition is accepted.

---

## Implementation Plan

1. Document the Projection Rule.
2. Update projection validation script semantics.
3. Ensure `docs/generated/` is gitignored.
4. Update Publish workflow to generate and consume projections.
5. Run local and CI verification.
6. Update dependent expedition (EXP-INSTALL-011) to reflect the consumer contract.

---

## Completion Notes

- Documented the Projection Rule in EXP-PROGRAM-008 and this expedition.
- Repurposed `scripts/verify-documentation-projection.js` to validate the projection graph and determinism instead of comparing against committed files.
- Added `docs:validate-projections` npm script.
- Updated `tests/documentation-integrity.test.js` for the new validation semantics.
- Restructured `.github/workflows/publish.yml` to generate projections in CI and consume them as build artifacts.
- Confirmed `docs/generated/` is gitignored and not tracked.
- Verified the Publish workflow succeeds end-to-end after GitHub Pages was enabled.
- Expedition accepted and implemented via PR #40.
