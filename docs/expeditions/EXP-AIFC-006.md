# EXP-AIFC-006 — Capability Verification Framework

> **Architecture expedition.** Validate runtime, language, framework, and platform assumptions before Mission creation proceeds.

**Status:** Executing  
**Started:** 2026-07-19  
**Kind:** Architecture Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-022 — AI-Native First Contact  
**Depends On:** EXP-AIFC-005  
**Blocks:** EXP-AIFC-007

---

```yaml
Impact:
  Constitutional: No
  Product: No
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Objective

Ensure the selected architecture can be realized in the current environment before the operator approves Mission materialization. The framework must:

- Check required language runtimes.
- Check required frameworks, SDKs, and tools.
- Check platform constraints.
- Report blockers clearly.
- Prevent materialization when assumptions fail.

---

## Required Change

### 6.1 Verify capabilities from architecture candidate

Each architecture candidate declares assumptions such as:

```text
runtime: node >= 20
framework: next.js
platform: vercel
sdk: supabase
```

The verifier checks each assumption against the environment capability report.

### 6.2 Blocker reporting

When a capability is missing or degraded, produce a deterministic blocker report:

```text
MISSING     — capability not found
DEGRADED    — capability found but below required version
UNAVAILABLE — capability explicitly unsupported
```

### 6.3 Materialization gate

Mission materialization must refuse to proceed if any required capability is missing or degraded, unless the operator explicitly overrides.

---

## Deliverables

1. **Capability verification module** under `src/first-contact/verify/`.
2. **Assumption schema** for architecture candidates.
3. **Blocker report format**.
4. **Integration** with the environment capability report.

---

## Acceptance Criteria

- Required capabilities are verified before materialization.
- Missing capabilities produce clear blocker reports.
- Materialization is gated by capability verification.
- Verification is deterministic for the same environment.

---

## Out of Scope

- Installing missing dependencies.
- Changing the environment capability model.
- Mission materialization implementation (EXP-AIFC-007).

---

## Success Criteria

The expedition succeeds when a selected architecture that cannot be realized is blocked before any project state is created.
