# EXP-HOME-014 — Documentation Integration

> **Product expedition.** Link homepage artifacts and concepts to canonical SYNTH documentation.

**Status:** Completed (pending acceptance)  
**Started:** 2026-07-20  
**Completed:** 2026-07-20  
**Kind:** Product Expedition  
**Priority:** Medium  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-004 (Artifact System), EXP-HOME-008 (Architecture Explorer), EXP-HOME-009 (Capabilities Explorer)  
**Blocks:** EXP-HOME-015

> **Specification:** See [`docs/design/documentation-integration.md`](../design/documentation-integration.md).

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

Ensure that every homepage concept is backed by canonical documentation. Visitors who want to go deeper can click from any artifact, capability, or architecture layer to the relevant doc.

---

## Origin Evidence

The homepage teaches SYNTH by experience, but visitors will still need reference material. Links must be explicit and stable so the homepage does not become a dead-end.

---

## Required Change

### 1.1 Link targets

- Intent → `docs/reference/public-vocabulary.md` / Genesis docs.
- Discovery → `docs/guides/greenfield-discovery-lifecycle.md`.
- Mission → `docs/operator/01-getting-started.md`.
- Expedition → `docs/operator/04-working-with-expeditions.md`.
- Governance → `docs/governance.md`.
- Replay → `docs/operator/09-replay.md`.
- Architecture layers → `docs/architecture/`.
- Capabilities → corresponding reference pages.

### 1.2 Link behavior

- Open in a new tab for external reference docs.
- Open in the same tab for in-site operator guides.
- Use stable paths; avoid deep anchors that drift.

### 1.3 Maintenance

- Document the link inventory.
- Add a CI check that fails if a linked doc is removed or moved.

---

## Deliverables

1. **Documentation Integration Map** under `docs/design/documentation-integration.md`.
2. **Link implementation** across artifacts, capabilities, and architecture layers.
3. **CI check** for broken homepage-to-doc links.

---

## Acceptance Criteria

- Every major homepage concept links to canonical documentation.
- Links are stable and validated in CI.
- The link inventory is documented and reviewable.

---

## Out of Scope

- Homepage content itself (other HOME expeditions).
- Search or navigation redesign.

---

## Success Criteria

The expedition succeeds when a visitor can reach canonical documentation for any SYNTH concept shown on the homepage.
