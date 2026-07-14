# EXP-INSTALL-007 — Version Manifest

**Status:** Active  
**Kind:** Installation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-006 — Installation & Distribution  
**Depends On:** EXP-INSTALL-003  
**Blocks:** EXP-INSTALL-008

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

Generate the canonical installer manifest during release.

---

## Motivation

The installer should not hardcode versions or channels. A version manifest lets the installer discover the correct package version and backend without being rebuilt.

---

## Deliverables

1. **Manifest schema**
   - Versioned JSON schema for installer metadata.

2. **Manifest generation**
   - Generated during the release workflow from `package.json` and channel configuration.

3. **Channel metadata**
   - Maps `latest`, `stable`, `beta`, etc. to versions and backends.

Example manifest:

```json
{
  "schema": 1,
  "channels": {
    "latest": {
      "version": "2.0.0",
      "npm": "@synth-framework/synth"
    }
  }
}
```

---

## Acceptance

The installer can resolve any supported channel using the manifest.

Specifically:

- Manifest is generated and published with every release.
- Manifest schema is validated in CI.
- Installer reads the manifest at runtime.

---

## Phases

### Phase 1 — Schema design

Define the manifest JSON schema.

### Phase 2 — Generation script

Create a script that produces the manifest from repository state.

### Phase 3 — Publication

Attach the manifest to releases and/or publish it to the website.

---

## Risks

| Risk | Mitigation |
|---|---|
| Manifest becomes stale | Generate it automatically on every release |
| Schema churn | Version the schema field |

---

## Definition of Done

- [ ] Manifest schema defined.
- [ ] Manifest generation script implemented.
- [ ] Release workflow generates and publishes the manifest.
- [ ] Manifest schema is validated in CI.
- [ ] Installer reads the manifest.
- [ ] Tests cover manifest generation and parsing.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Design manifest schema.
2. Implement generation script.
3. Integrate into release workflow.
4. Add schema validation.
5. Update installer to consume manifest.
6. Build and verify.

---

## Completion Notes

Pending.
