# EXP-ADOPT-005 — Installation Experience

**Status:** Proposed  
**Kind:** Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-037 — Ecosystem Adoption & Community Growth  
**Phase:** I — Platform Foundations  
**Authority:** Synth Architectural Constitution

---

## Goal

Make SYNTH installation deterministic, fast, and well-supported across supported environments.

---

## Purpose

Successful installation is the first evidence of product quality. This expedition covers the bootstrap script, npm global install, npx, and SDK installation paths.

---

## Deliverables

1. **Bootstrap install script** (`install.sh`) tested on macOS and Linux.
2. **npm global install path**: `npm install -g @synth-framework/synth`.
3. **npx path**: `npx @synth-framework/synth --version`.
4. **SDK install path**: `npm install @synth-framework/synth-agent-sdk`.
5. **Installation telemetry schema** and opt-in success reporting.
6. **Troubleshooting guide** and common-error matrix.
7. **CI job** that installs via each path on every release.

---

## Acceptance Criteria

- Each install path succeeds on a clean environment in under 60 seconds.
- `synth --version` returns the expected version after install.
- The SDK can be imported after `npm install` without undocumented peer dependencies.
- Telemetry reports installation success/failure without collecting PII.
- The troubleshooting guide covers the top 10 install failures.

---

## Out of Scope

- Supporting operating systems outside the documented matrix.
- Package distribution beyond npm.
- Changing core package behavior.

---

## Related

- EXP-PROGRAM-037 — Ecosystem Adoption & Community Growth
- EXP-ADOPT-002 — Repository Readiness
- EXP-ADOPT-004 — Homepage Launch
- EXP-ADOPT-019 — Metrics
