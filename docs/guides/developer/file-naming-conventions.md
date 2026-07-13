# File Naming Conventions

**Scope:** All files in the SYNTH repository except where explicitly exempted.

**Status:** Active as of EXP-REL-001.

---

## Default Rule

Use **kebab-case** for all filenames:

- Lowercase letters and digits only.
- Words separated by hyphens (`-`).
- No underscores (`_`) except in standard exemptions.
- No spaces.
- No camelCase or PascalCase.

**Good:**

```text
docs/architecture/constitution.md
docs/audits/audit-report-2026-06-29.md
adapter-architecture.md
```

**Bad:**

```text
ARCHITECTURAL_CONSTITUTION.md
AuditReport2026-06-29.md
adapter_architecture.md
adapterArchitecture.md
```

---

## Identifier Prefixes

Some artifacts carry an uppercase identifier prefix. The prefix is preserved; everything after the prefix is kebab-case.

| Prefix | Example | Rationale |
|---|---|---|
| `ADR-NNN` | `ADR-001-v2-freeze-certification.md` | Architectural Decision Records |
| `EXP-` | `EXP-REL-001.md` | Expeditions |
| `EXP-PROGRAM-` | `EXP-PROGRAM-002.md` | Programs |
| `AWS-` | `AWS-001-agent-workspace-specification.md` | Agent Workspace Specifications |
| `ASC-` | `docs/audits/ASC-001-report.md` | Architecture Safety Cases |
| `AIA-` | `AIA-001-planning-cognition-engine.md` | Architecture Impact Assessments |
| `SKR-` | `SKR-001.md` | Semantic Knowledge Rules |
| `INTENT-` | `INTENT-001.md` | Intent specifications |
| `WCE-` | `WCE-001.md` | Workspace Cognition Environment specs |

**Good:**

```text
ADR-004-synth-eras-and-protected-assets.md
AWS-001-workspace-context-model.md
EXP-AUD-002-zero-trust-architecture-verification.md
```

**Bad:**

```text
ADR-004-SYNTH-ERAS-AND-PROTECTED-ASSETS.md
AWS-001-WORKSPACE_CONTEXT_MODEL.md
EXP-AUD-002-ZERO-TRUST-ARCHITECTURE-VERIFICATION.md
```

---

## Standard Exemptions

The following standard files keep their conventional names:

- `README.md`
- `LICENSE`
- `CODE_OF_CONDUCT.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `CHANGELOG.md`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `.gitignore`
- `.gitattributes`
- `Makefile` (if present)
- Hidden files required by tools (e.g., `.github/`, `.githooks/`)

---

## Dates in Filenames

Use ISO-8601 date format with hyphens: `YYYY-MM-DD`.

**Good:**

```text
docs/audits/audit-report-2026-06-29.md
proof-2026-07-12T09-36-50-489Z.json
```

---

## Directory Names

Directory names follow the same kebab-case rule.

**Good:**

```text
docs/
docs/guides/developer/
docs/reference/
examples/
examples/legacy-node/
```

**Bad:**

```text
Docs/
developer_docs/
Legacy_Node/
```

---

## Migration Notes

- Legacy SCREAMING_SNAKE_CASE names are being migrated incrementally.
- When renaming a file, update all internal references in the same change.
- Generated files under `dist/` and `docs/generated/` do not need manual renaming; regenerate them from source.
- Proof artifacts under `proof/` keep their generated names.
