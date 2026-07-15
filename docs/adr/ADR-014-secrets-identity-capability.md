# ADR-014 — Secrets & Identity Capability

**Status:** Accepted  
**Date:** 2026-07-15  
**Author:** Synth Architecture  
**Deciders:** Synth Architecture

---

## Context

ADR-006 established the Environment Layer and autonomous discovery. ADR-007 established the Capability Graph Model, including `Secrets` and `Identity` as constitutional capability families. This ADR defines the `Secrets` and `Identity` capability interfaces so that the SYNTH Core never depends directly on environment-specific credential stores.

Today, any credential or identity access would happen through direct `process.env` reads scattered across the codebase. The Core should request secrets and identity context through capability interfaces.

## Decision

### 1. Secrets Capability Interface

The `Secrets` capability is satisfied by a provider implementing:

```text
SecretsProvider {
  name: string
  version: string
  getSecret(name: string): Promise<string | undefined>
  hasSecret(name: string): Promise<boolean>
  listSecretNames(): Promise<string[]>
}
```

### 2. Identity Capability Interface

The `Identity` capability is satisfied by a provider implementing:

```text
IdentityProvider {
  name: string
  version: string
  getIdentity(): Promise<IdentityInfo>
}

IdentityInfo {
  user?: string
  email?: string
  hostname?: string
  ci: boolean
}
```

### 3. Non-Disclosure Rule

**Secret values are never discoverable in bulk, never logged, and never included in evidence, replay, or proof artifacts.** Only secret *names* may be listed for discovery purposes. Values are retrieved individually, at the point of use, by the component that needs them. This rule is constitutional: it applies to every present and future secrets provider.

### 4. Default Provider: Environment-Variable Provider

The default provider reads from environment variables (injectable for testing; defaults to `process.env`). Identity is resolved by convention — `GIT_AUTHOR_NAME` / `GIT_AUTHOR_EMAIL`, falling back to `USER` / `USERNAME` / `GITHUB_ACTOR`, with CI detected via `CI` / `GITHUB_ACTIONS`. Secret-name discovery uses a naming heuristic (`TOKEN`, `SECRET`, `KEY`, `PASSWORD`, `CREDENTIAL`) over variable *names only*; the heuristic exists for evidence and never exposes values.

### 5. Core Boundary Rule

No Core component may read credential stores or `process.env` secrets directly. All secret and identity access flows through the `SecretsProvider` and `IdentityProvider` interfaces.

## Consequences

- **Easier:** Secret stores (Vault, AWS Secrets Manager, keychain) can be added as providers without Core changes.
- **Easier:** Tests inject in-memory secret maps — no real environment access.
- **Easier:** Secret *availability* becomes capability evidence without disclosing values (supports EXP-ENV-010).
- **Harder:** Existing direct `process.env` credential reads must migrate behind the interface.

## Proof Impact

- **P1 Structural:** Reinforced — credential dependency is isolated.
- **P2 Behavioral:** Unchanged.
- **P3 Historical:** Unchanged.
- **P4 Adversarial:** Strengthened — the Non-Disclosure Rule keeps secret values out of logs, evidence, replay, and proof artifacts by construction.
- **P5 Reproducibility:** Strengthened — identity context becomes explicit, capturable data (names and identity attributes, never secret values).

## Kernel Impact

No frozen kernel components are modified. The Secrets & Identity capability providers are Environment Layer artifacts.

## Constitutional Baseline Impact

No version numbers change. This ADR is added to the active ADR list in `docs/adr/README.md` and referenced from `docs/architecture/constitutional-baseline.md`.

## Related

- `docs/adr/ADR-006-environment-discovery-framework.md`
- `docs/adr/ADR-007-capability-graph-model.md`
- `docs/expeditions/EXP-PROGRAM-007.md`
- `docs/expeditions/EXP-ENV-009.md`
