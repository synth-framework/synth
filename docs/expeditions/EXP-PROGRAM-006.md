# EXP-PROGRAM-006 — Installation & Distribution

**Status:** Active  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Scope:** Canonical installation experience and distribution infrastructure  
**Era:** II — Adoption  
**Architecture Impact:** None  
**Constitutional Impact:** None  
**Public Impact:** High  
**Product Impact:** High  
**Execution Impact:** None

---

## Thesis

> **A user should be able to install SYNTH in one command and verify it in the next.**

The public installation experience is the first contact point for humans and AI agents. AI coding assistants consume the same install command as humans, so the installer must be deterministic, versioned, and governed while remaining independent of the underlying distribution mechanism.

---

## Purpose

Establish the canonical installation experience for SYNTH by delivering a deterministic, versioned, and governed bootstrap installer centered around:

```bash
curl -fsSL https://synth.dev/install.sh | sh
```

The `synth.dev` URL is the aspirational canonical endpoint. Until the domain is acquired, the actual base URL is controlled by the `SYNTH_INSTALLER_BASE_URL` GitHub repository variable (for example, a GitHub Pages URL) so the installer can be published and tested without code changes.

The installer acts as a bootstrap layer responsible for environment detection, distribution resolution, installation, verification, and upgrades. The Era II implementation targets npm as the distribution backend while preserving a stable public interface for future Homebrew, binary, and package-manager support.

> **Constitutional Rule:** This Program completes without touching architecture.

---

## Mission

Build an Installation Compiler that detects the environment, resolves the appropriate distribution, installs SYNTH, verifies the result, and supports deterministic upgrades — all without changing the public one-line command.

---

## Program Composition

```
EXP-PROGRAM-006
Installation & Distribution
│
├── EXP-INSTALL-001  Bootstrap Contract
│       Adoption Expedition
│       Define the permanent public installation contract.
│
├── EXP-INSTALL-002  Environment Detection
│       Adoption Expedition
│       Create the environment discovery layer.
│
├── EXP-INSTALL-003  Distribution Resolution
│       Adoption Expedition
│       Determine which distribution backend to use.
│
├── EXP-INSTALL-004  Installation Engine
│       Adoption Expedition
│       Implement the installation workflow.
│
├── EXP-INSTALL-005  Installation Verification
│       Adoption Expedition
│       Verify that installation completed successfully.
│
├── EXP-INSTALL-006  Website Integration
│       Adoption Expedition
│       Publish the installer through the website deployment pipeline.
│
├── EXP-INSTALL-007  Version Manifest
│       Adoption Expedition
│       Generate the canonical installer manifest during release.
│
├── EXP-INSTALL-008  Upgrade Engine
│       Adoption Expedition
│       Provide deterministic upgrade behavior.
│
├── EXP-INSTALL-009  Installation Certification
│       Adoption Expedition
│       Validate installation automatically during CI.
│
├── EXP-INSTALL-010  Documentation & Onboarding
│       Adoption Expedition
│       Deliver installation documentation synchronized with the installer.
│
└── EXP-INSTALL-011  Website Deployment Verification
        Adoption Expedition
        Verify GitHub Pages deployment and installer URL availability.
```

---

## Protected Assets

The following artifacts SHALL NOT be modified by any Expedition in this Program:

- Mission Studio
- Genesis
- Replay
- ExecutionGate
- Event Model
- Capability Model
- Constitutional Baseline
- Public Vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay)

Any change to a Protected Asset requires an Architecture Expedition and a new ADR.

---

## Allowed Work

All work in this Program stays in the Allowed column:

| Allowed | Forbidden |
|---|---|
| Bootstrap installer (`install.sh`) | New architectural concepts |
| Environment detection scripts | Changes to CLI architecture |
| Distribution resolution | Runtime architecture changes |
| npm / package-manager integration | Mission Studio modifications |
| Installation verification | Execution model changes |
| Upgrade workflow | Event model semantics changes |
| Website / GitHub Pages publication | Capability model changes |
| Version manifest generation | Constitutional baseline changes |
| CI certification | Changes that invalidate replay proofs |
| Installation documentation | Changes to deterministic execution contract |

---

## Invariants

1. `npm run govern` remains the canonical final verification.
2. The installer public interface remains stable across distribution backend changes.
3. Installation must be idempotent.
4. The installer must degrade gracefully with a clear error message on unsupported platforms.
5. All installer configuration that may change over time (e.g., domain, channel endpoints) must be resolvable from GitHub repository variables or the version manifest so the installer itself does not require a rebuild.

---

## Success Criteria

- A new user installs SYNTH with one command.
- `synth doctor` confirms a healthy installation.
- The installer supports `--upgrade`, `--channel`, and `--version` without changing its public contract.
- The installer is published automatically on every release.
- CI certifies installation before a release is published.
- Documentation reflects the current installer behavior.
- No Protected Asset is modified.
- Architecture remains unchanged.

---

## Definition of Done

- [ ] EXP-INSTALL-001 completed and accepted.
- [ ] EXP-INSTALL-002 completed and accepted.
- [ ] EXP-INSTALL-003 completed and accepted.
- [ ] EXP-INSTALL-004 completed and accepted.
- [ ] EXP-INSTALL-005 completed and accepted.
- [x] EXP-INSTALL-006 completed and accepted.
- [x] EXP-INSTALL-007 completed and accepted.
- [x] EXP-INSTALL-008 completed and accepted.
- [x] EXP-INSTALL-009 completed and accepted.
- [x] EXP-INSTALL-010 completed and accepted.
- [ ] EXP-INSTALL-011 completed and accepted.
- [ ] Program accepted.

---

## Completion Notes

Program created. No expeditions have started.

---

## Related Documents

| Document | Relationship |
|---|---|
| `docs/adr/ADR-004-synth-eras-and-protected-assets.md` | Eras, Protected Assets, and Post-Freeze Rule. |
| `docs/adr/ADR-005-architecture-era-closure.md` | Architecture Era closure. |
| `docs/expeditions/EXP-PROGRAM-004.md` | Preceding First Contact Program, now closed. |
| `docs/expeditions/EXP-PROGRAM-005.md` | Preceding Adaptive Validation Program, now closed. |
| `AGENTS.md` | AI operator contract; installers must be agent-consumable. |
