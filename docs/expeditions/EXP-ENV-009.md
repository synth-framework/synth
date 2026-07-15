# EXP-ENV-009 — Secrets & Identity Capability

**Status:** Completed  
**Kind:** Constitutional Expedition  
**Priority:** Medium  
**Program:** EXP-PROGRAM-007 — Environment Independence Program  
**Depends On:** EXP-ENV-002  
**Blocks:** EXP-ENV-010

---

```yaml
Impact:
  Constitutional: Yes
  Product: No
  User Facing: No
  Architecture Freeze: Requires ADR
  Requires ADR: Yes
```

---

## Purpose

Abstract secrets and identity access so SYNTH does not depend directly on environment-specific credential stores.

---

## Motivation

Credentials and identity are environmental. The Core should request secrets through a capability interface.

---

## Deliverables

1. **Secrets capability interface**
2. **Identity capability interface**
3. **Environment-variable provider**

---

## Acceptance

SYNTH can request secrets and identity context through the capability interface without direct access to credential stores in the Core.

---

## Definition of Done

- [x] Secrets capability interface defined.
- [x] Identity capability interface defined.
- [x] Environment-variable provider implemented.
- [x] Tests pass.
- [x] ADR approved.
- [x] Expedition is accepted.

---

## Completion Notes

- **ADR:** [ADR-014 — Secrets & Identity Capability](../adr/ADR-014-secrets-identity-capability.md) (Accepted), including the constitutional **Non-Disclosure Rule**: secret values are never bulk-listed, logged, or included in evidence/replay/proof — only names are discoverable.
- **Implementation:** `src/environment/secrets-capability.ts` defines `SecretsProvider` and `IdentityProvider` interfaces with `IdentityInfo`/`EnvMap` data types, and the `EnvVarProvider` reference implementation (injectable env map, defaults to `process.env`; identity resolved by `GIT_AUTHOR_*` convention with `USER`/`GITHUB_ACTOR` fallbacks; CI detection; name-only secret discovery via documented naming heuristic). Exported via `src/environment/index.ts`.
- **Test coverage:** `tests/environment-secrets-capability.test.js` — 10 tests covering secret retrieval, missing secrets, existence checks, name-only listing (with explicit no-value-leak assertions), identity resolution and fallback precedence, CI detection, and empty environments.
- **npm script:** `test:environment-secrets`, included in `test:all`.
- Core `process.env` credential reads are unchanged; migration behind the capability is deferred to EXP-ENV-012 per program sequencing.
- Expedition accepted via PR #63.
