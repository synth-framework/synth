# EXP-REL-005 — Open Source Readiness

**Status:** Completed  
**Kind:** Release Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-002 — SYNTH Public Release Program  
**Depends On:** EXP-REL-001, EXP-REL-002, EXP-REL-003, EXP-REL-004  
**Blocks:** Public release

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

Make the repository satisfy GitHub Community Standards and prepare it for external contributors.

---

## Deliverables

1. **Apache 2 License**
   - `LICENSE` file at repository root.
   - License headers where required.

2. **Contributing Guide**
   - `CONTRIBUTING.md`.
   - How to open issues.
   - How to open pull requests.
   - How to run `npm run govern` locally.
   - Code of conduct reference.

3. **Contributor Covenant**
   - `CODE_OF_CONDUCT.md`.
   - Enforced reporting path.

4. **Security Policy**
   - `SECURITY.md`.
   - How to report vulnerabilities.
   - Supported versions.

5. **Issue Templates**
   - Bug report.
   - Feature request (with guidance to defer architecture changes to v3).
   - Documentation improvement.

6. **Pull Request Template**
   - Checklist referencing `npm run govern`.
   - Expedition reference if applicable.
   - Confirmation that no Protected Asset was modified.

7. **GitHub Actions**
   - CI workflow running `npm run govern`.
   - Lint or format checks if adopted.

8. **Release Workflow**
   - Automated semantic versioning.
   - Changelog generation.
   - Proof artifact attachment.

9. **Semantic Versioning**
   - Documented versioning policy.
   - Compatibility commitments for v2.x.

10. **Changelog**
    - `CHANGELOG.md`.
    - Entries for v2.0.0 and v2.1.0 scope.

---

## Acceptance

Repository satisfies GitHub Community Standards.

Specifically:

- License is present and correct.
- Contributing, Code of Conduct, and Security policies are present.
- Issue and PR templates are active.
- CI passes on main branch.
- Release process is documented and tested.
- Changelog is current.

---

## Phases

### Phase 1 — Policy

Write license, code of conduct, security policy, and contributing guide.

### Phase 2 — Templates

Create issue and PR templates.

### Phase 3 — Automation

Set up GitHub Actions for CI and release.

### Phase 4 — Verify

Run GitHub Community Standards checklist. Fix gaps.

---

## Risks

| Risk | Mitigation |
|---|---|
| Governance docs conflict with constitution | Review against ADR-004 |
| Templates encourage architecture changes | Add explicit defer-to-v3 guidance |
| Release automation fails | Test on a pre-release tag |

---

## Definition of Done

- [x] Apache 2 License is present.
- [x] `CONTRIBUTING.md` is published.
- [x] `CODE_OF_CONDUCT.md` is published.
- [x] `SECURITY.md` is published.
- [x] Issue templates are active.
- [x] PR template is active.
- [x] GitHub Actions CI passes.
- [x] Release workflow is documented and tested.
- [x] `CHANGELOG.md` is current.
- [x] GitHub Community Standards checklist is satisfied.
- [x] Expedition is accepted.

---

## Completion Notes

Open source readiness artifacts delivered:

- `LICENSE` — Apache 2.0
- `CONTRIBUTING.md` — contribution process and conventions
- `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1
- `SECURITY.md` — vulnerability reporting and supported versions
- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`
- `.github/ISSUE_TEMPLATE/documentation.md`
- `.github/pull_request_template.md`
- `.github/workflows/release.yml` — semantic-versioned release workflow
- `CHANGELOG.md` — current release notes
- `docs/reference/semantic-versioning.md` — versioning policy
- `package.json` — license updated to `Apache-2.0`

Verification:

- `npm run govern` passes.
- `npm run test:freeze-certification` passes.
- `npm run docs:check-links` passes.
- `npm run audit:repository` passes.
- GitHub Community Standards checklist items are present.

Post-reorganization re-verification:

- Updated `CHANGELOG.md` and `docs/operator/examples-guide.md` to reference `Monolith` instead of the obsolete `Large Repository`.
- Replaced the `[INSERT SECURITY EMAIL]` placeholder in `SECURITY.md` with a GitHub Security Advisories reporting link.
- Replaced the `[INSERT CONTACT METHOD]` placeholder in `CODE_OF_CONDUCT.md` with `conduct@synth.dev`.
