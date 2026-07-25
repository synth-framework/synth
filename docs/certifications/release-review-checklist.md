# SYNTH Platform v1.0 Release Review Checklist

> Use this checklist during the final Release Review for Program 042.

**Program:** EXP-PROGRAM-042 — Release Certification  
**Target Release:** SYNTH Platform v1.0  
**Review Question:** *Would I confidently recommend an external engineering organization adopt SYNTH tomorrow?*

---

## Instructions

For each item, record:

- **Pass** — evidence reviewed and accepted
- **Fail** — blocks release; requires correction
- **N/A** — not applicable to v1.0
- **Deferred** — explicitly out of scope for v1.0

The release may proceed only when every required item is **Pass** or **Deferred**.

---

## Track A — Reproducibility

| # | Item | Evidence | Status | Notes |
|---|---|---|---|---|
| A1 | Clean clone succeeds | `proof/certifications/reproducibility-certificate.json` | | |
| A2 | `npm install` succeeds on clean clone | `proof/certifications/reproducibility-certificate.json` | | |
| A3 | `npm run build` succeeds on clean clone | `proof/certifications/reproducibility-certificate.json` | | |
| A4 | Governance pipeline passes on clean clone | `proof/certifications/reproducibility-certificate.json` | | |
| A5 | Determinism verified across two clean clones | `proof/certifications/reproducibility-certificate.json` | | |

---

## Track B — Operator Experience

| # | Item | Evidence | Status | Notes |
|---|---|---|---|---|
| B1 | First Operator Experience test passes | `tests/first-operator-experience.test.js` | | |
| B2 | Installer contract tests pass | `tests/installer-contract.test.js` | | |
| B3 | Installer verification tests pass | `tests/installer-verify.test.js` | | |
| B4 | Onboarding guide published | `docs/getting-started/first-five-minutes.md` | | |
| B5 | `synth doctor` returns structured JSON | CLI output / test transcript | | |

---

## Track C — Governance

| # | Item | Evidence | Status | Notes |
|---|---|---|---|---|
| C1 | Replay graph integrity passes | `proof/certifications/governance-certificate.json` | | |
| C2 | Convergence certification passes | `proof/certifications/governance-certificate.json` | | |
| C3 | Bypass audit is clean | `proof/certifications/governance-certificate.json` | | |
| C4 | Governance evaluation enforcement passes | `proof/certifications/governance-certificate.json` | | |
| C5 | Identity / expedition governance validator clean | `proof/certifications/governance-certificate.json` | | |
| C6 | Documentation projections are fresh | `proof/certifications/governance-certificate.json` | | |

---

## Track D — Architecture

| # | Item | Evidence | Status | Notes |
|---|---|---|---|---|
| D1 | Kernel surface is frozen | `src/core/`, `src/control/`, `src/runtime/`, `src/domain/` | | |
| D2 | SDK public surface is frozen | `src/sdk/` | | |
| D3 | Event model is frozen | `src/types/event.ts` | | |
| D4 | Capability registry is frozen | `src/capability/registry.ts` | | |
| D5 | Architecture projection is generated | `docs/generated/ARCHITECTURE.md` | | |
| D6 | API projection is generated | `docs/generated/API.md` | | |
| D7 | TypeScript build is clean | `npm run build` | | |

---

## Track E — Release Readiness

| # | Item | Evidence | Status | Notes |
|---|---|---|---|---|
| E1 | Changelog exists | `CHANGELOG.md` | | |
| E2 | License exists | `LICENSE` | | |
| E3 | Version is set | `package.json` | | |
| E4 | npm bin entry is defined | `package.json` | | |
| E5 | npm pack dry-run succeeds | `proof/certifications/release-readiness-certificate.json` | | |
| E6 | npm audit is clean | `proof/certifications/release-readiness-certificate.json` | | |
| E7 | Release notes drafted | `docs/certifications/synth-platform-v1-0-certification-report.md` | | |

---

## Cross-Cutting Concerns

| # | Item | Evidence | Status | Notes |
|---|---|---|---|---|
| X1 | No known security vulnerabilities | `npm audit` | | |
| X2 | No uncommitted changes in release candidate | `git status` | | |
| X3 | Identity governance validator reports 0 errors / 0 warnings | `npm run test:expedition-governance` | | |
| X4 | No TODO/FIXME/HACK markers in v1.0 surface | `rtk grep "TODO\|FIXME\|HACK\|XXX" src/` | | |
| X5 | Protected Assets unchanged | Architecture review | | |
| X6 | RC policy is recorded | `docs/expeditions/EXP-PROGRAM-042.md` | | |

---

## Known Limitations Review

| # | Limitation | Accepted? | Notes |
|---|---|---|---|
| L1 | `synth mission approve` requires an Alignment Contract | | |
| L2 | Generated docs are gitignored and regenerated on demand | | |
| L3 | Numeric quorum not implemented | | |
| L4 | Dependency headers are documentary, not runtime-enforced | | |

---

## Sign-Off

By signing below, each reviewer confirms that the release candidate meets the acceptance criteria for their domain and that they would recommend external adoption.

| Role | Name | Date | Verdict |
|---|---|---|---|
| Architecture Owner | | | ☐ Approve ☐ Reject |
| Release Engineer | | | ☐ Approve ☐ Reject |
| Operator Representative | | | ☐ Approve ☐ Reject |
| Security Reviewer | | | ☐ Approve ☐ Reject |

---

## Final Decision

| Decision | Date | Notes |
|---|---|---|
| ☐ Ship SYNTH Platform v1.0 | | |
| ☐ Hold for correction | | |
| ☐ Reject and replan | | |
