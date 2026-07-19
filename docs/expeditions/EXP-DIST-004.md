# EXP-DIST-004 — npm Package Distribution

> **Engineering expedition.** Publish SYNTH SDKs and protocol packages on npm so developers and package-aware agents can discover and install them.

**Status:** Proposed  
**Kind:** Engineering Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-029 — AI Ecosystem Distribution  
**Depends On:** EXP-AI-005 (Interoperability SDK), EXP-PROGRAM-028 (Repository & Release Governance)  
**Blocks:** To be defined as downstream package integrations are chartered

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Objective

Establish npm as a first-class distribution channel for SYNTH. Publish scoped packages with clear metadata, versioning, and installation instructions. Align package releases with SYNTH's governed release pipeline.

---

## Origin Evidence

The `@synth-framework/agent-sdk` package was created in EXP-AI-005 but has not been published. Without publication, developers cannot install it and package-aware agents cannot discover SYNTH through npm metadata.

---

## Required Change

### 1.1 Package inventory

Publish or prepare:

```text
@synth-framework/agent-sdk
@synth-framework/protocol
@synth-framework/genesis
@synth-framework/discovery
```

### 1.2 Package metadata

Each package must include:

- `name`, `version`, `description`
- `homepage` pointing to synth.run or docs
- `repository` URL
- `keywords` including `synth`, `ai-agent`, `genesis-protocol`, `governance`
- `engines` compatibility
- `license`

### 1.3 Release alignment

Package publication is a governed release event under EXP-PROGRAM-028. Version bumps are inferred from canonical state and published only after governance passes.

---

## Deliverables

1. Publish-ready package configurations.
2. npm publication workflow aligned with release governance.
3. Installation documentation.
4. Automated tests verifying package contents and exports.

---

## Acceptance Criteria

- Packages are installable via npm.
- Metadata advertises SYNTH protocols and skills.
- Publication follows the governed release pipeline.
- No secrets or unbuilt artifacts are published.

---

## Out of Scope

- SDK implementation (EXP-AI-005).
- Release governance semantics (EXP-PROGRAM-028, EXP-REPO-007).
- Other registries like PyPI or crates.io.

---

## Success Criteria

The expedition succeeds when `npm install @synth-framework/agent-sdk` works and the package metadata correctly describes SYNTH capabilities.
