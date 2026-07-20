# EXP-HOME-020 — Curated Demonstration Library

> **Product expedition.** Ship deterministic demo missions that visitors can explore and that serve as regression tests.

**Status:** Completed (pending acceptance)  
**Kind:** Product Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-017 (Homepage Genesis Projection)  
**Blocks:** EXP-HOME-015 (Production Certification)

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

Provide a library of curated example intents that produce predictable, reviewable Genesis outcomes. These demonstrations double as regression tests and as starting points for first-time visitors.

---

## Origin Evidence

A live demo with only free-form input is hard to verify and hard to understand. Curated examples let visitors see SYNTH's behavior immediately and give the team deterministic fixtures for testing.

---

## Required Change

### 1.1 Example missions

Include at least:

- Markdown Editor
- Space Mission Tracker
- Recipe Organizer
- CRM
- Inventory System
- Portfolio Website

### 1.2 Expected artifacts

For each example, document the expected artifact progression:

```text
Intent → Discovery → Unknowns → Domain → Mission → Expeditions
```

### 1.3 Regression tests

Each example becomes a test fixture. Changing the extraction or projection logic must not change the expected output unless the change is intentional and the fixture is updated.

---

## Deliverables

1. **Demonstration library** data file.
2. **Expected artifact snapshots** for each example.
3. **UI selector** allowing visitors to pick an example or type freely.
4. **Regression tests** verifying deterministic output.

---

## Acceptance Criteria

- At least six curated examples ship with the homepage.
- Each example produces deterministic artifacts.
- Examples are exercised by automated tests.
- Visitors can switch between examples without page reload.

---

## Out of Scope

- Dynamic example generation.
- AI-generated examples.
- Backend-hosted example repository.

---

## Success Criteria

The expedition succeeds when a first-time visitor can pick a curated example and see a complete Genesis → Mission → Expedition flow in seconds.

---

## Related documents

- [EXP-PROGRAM-027 — Mission Studio Homepage](EXP-PROGRAM-027.md)
- [EXP-HOME-003 — Genesis Experience](EXP-HOME-003.md)
- [EXP-HOME-017 — Homepage Genesis Projection](EXP-HOME-017.md)
- [EXP-HOME-015 — Production Certification](EXP-HOME-015.md)
