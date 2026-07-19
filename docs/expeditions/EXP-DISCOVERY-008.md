# EXP-DISCOVERY-008 — Operational Discovery

> **Discovery expedition.** Extend the SYNTH Discovery Capability to observe operational artifacts—deployments, databases, cloud, and containers—through a read-only, source-agnostic adapter that produces deterministic evidence.

**Status:** Completed  
**Started:** 2026-07-19  
**Completed:** 2026-07-19  
**Kind:** Architecture Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-006 — Discovery Platform  
**Depends On:** EXP-DISCOVERY-001 through EXP-DISCOVERY-007  
**Blocks:** Closure of EXP-PROGRAM-006

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

Extend SYNTH Discovery to understand how a project is deployed, where it stores state, how it is containerized, and how it is released. This expedition delivers an operational artifact observation capability that is read-only, deterministic, and integrated into the existing Discovery pipeline.

## Scope

### In scope

- Operational artifact observation adapter.
- Observation capability, contract, and correlation rules.
- Integration with the default Discovery engine and session provider.
- ProjectModel rules that surface operational capabilities.
- Certification tests proving determinism and read-only behavior.

### Out of scope

- Live interaction with cloud APIs, container runtimes, or database servers.
- Mutating or health-checking operational systems.
- New execution semantics or Protected Asset changes.

## Approach

Operational discovery begins with the artifacts operators already check into the repository. These artifacts encode operational intent without requiring live system access:

| Artifact family | Example files | Observed as |
| --- | --- | --- |
| Container | `Dockerfile`, `docker-compose.yml`, `Containerfile` | container configuration |
| Deployment | Kubernetes manifests, Helm charts, `deploy/` | deployment configuration |
| Database | migration directories, schema files, ORM configs | database configuration |
| CI/CD | `.github/workflows/`, `.gitlab-ci.yml` | continuous integration configuration |
| Infrastructure | Terraform `*.tf`, `serverless.yml`, Pulumi files | infrastructure-as-code |

The adapter emits immutable observations such as:

```text
operational artifact detected
  artifactType: container
  path: Dockerfile
```

Correlation rules turn these observations into evidence claims:

```text
Container configuration present
Deployment configuration present
Database configuration present
CI/CD configuration present
Infrastructure-as-code present
```

The ProjectModel projection then exposes these as capabilities:

```text
capability: containerization
capability: deployment
capability: database
capability: continuous-integration
capability: infrastructure-as-code
```

## Acceptance Criteria

- [ ] Operational artifact adapter is read-only and deterministic.
- [ ] Adapter handles filesystem sources and emits observations for container, deployment, database, CI/CD, and infrastructure artifacts.
- [ ] Observation capability and contract are registered.
- [ ] Correlation rules produce evidence claims for each operational family.
- [ ] ProjectModel projection exposes operational capabilities.
- [ ] Default Discovery engine and session provider include the operational capability.
- [ ] Certification tests cover artifact detection, determinism, and read-only behavior.
- [ ] `npm run test:discovery` passes.
- [ ] `npm run test:brownfield` passes without regression.
- [ ] `npm run build` passes.

## Protected Assets

This expedition does not modify:

- Mission Studio
- Genesis
- Replay
- ExecutionGate
- Event Model
- Capability Model
- Constitutional Baseline
- Public Vocabulary

## Related Documents

- `docs/expeditions/EXP-PROGRAM-006.md`
- `docs/expeditions/EXP-DISCOVERY-001.md`
- `src/discovery/adapters/filesystem-adapter.ts`
- `src/discovery/capabilities/filesystem-correlation.ts`

