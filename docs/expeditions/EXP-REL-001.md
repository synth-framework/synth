# EXP-REL-001 — Repository Organization

**Status:** Completed  
**Kind:** Release Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-002 — SYNTH Public Release Program  
**Depends On:** EXP-PROD-005  
**Blocks:** EXP-REL-002, EXP-REL-003, EXP-REL-004, EXP-REL-005

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

Transform the repository from an internal engineering workspace into a public open-source project.

---

## Deliverables

1. **Clean root directory**
   - Remove obsolete build artifacts, scratch files, and internal-only reports.
   - Consolidate top-level files where appropriate.

2. **Standard repository layout**
   - `src/` — source code.
   - `tests/` — test suites.
   - `scripts/` — automation scripts.
   - `docs/` — documentation.
   - `examples/` — canonical example projects.
   - `data/` — local runtime data.
   - `proof/` — generated proof artifacts.

3. **Move architectural documents**
   - Ensure architecture docs live under `docs/architecture/` or `docs/adr/`.
   - Remove or archive duplicated internal design notes.

4. **Remove obsolete reports**
   - Identify reports superseded by the freeze report or ADRs.
   - Archive or delete them with rationale recorded.

5. **Create documentation hierarchy**
   - Getting started docs under `docs/getting-started/`.
   - Public operator docs under `docs/operator/`.
   - Guides under `docs/guides/` (philosophy, tutorials, agents, developer).
   - Reference docs under `docs/reference/`.
   - Architecture docs under `docs/architecture/`.
   - Example docs under `docs/examples/`.
   - Expeditions under `docs/expeditions/`.
   - ADRs under `docs/adr/`.
   - Audit reports under `docs/audits/`.
   - Generated docs under `docs/generated/`.

6. **Create examples hierarchy**
   - `examples/todo/`
   - `examples/blog/`
   - `examples/crm/`
   - `examples/legacy-node/`
   - `examples/polyglot/`
   - `examples/monolith/`

7. **Adopt file naming conventions**
   - Define and document `docs/guides/developer/file-naming-conventions.md`.
   - Rename files that violate the convention.
   - Update all internal references to renamed files.
   - Regenerate `dist/` and `docs/generated/` from source.

8. **Update `.gitignore`**
   - Exclude local runtime data, build outputs, generated docs, and secrets.
   - Treat `data/`, `data-test/`, and `proof/` as local runtime artifacts.

9. **Repository health audit**
   - Automated check that root layout and file names match the public release standard.

---

## Acceptance

A first-time visitor can understand the repository structure without guidance.

Specifically:

- Root directory contains only standard project files.
- Each top-level directory has a `README.md` explaining its purpose.
- No obsolete reports remain at the repository root without documented reason.
- `npm run govern` still passes after reorganization.

---

## Phases

### Phase 1 — Audit

Catalog every top-level file and directory. Classify as keep, move, rename, archive, or delete.

### Phase 2 — Rename

Apply `docs/guides/developer/file-naming-conventions.md` to files that violate the convention. Update all internal references in the same change.

### Phase 3 — Move

Relocate files according to the standard layout. Update internal references.

### Phase 4 — Document

Write `README.md` files for each top-level directory.

### Phase 5 — Verify

Run repository health audit and `npm run govern`.

---

## Risks

| Risk | Mitigation |
|---|---|
| Internal links break | Run link checker after moves and renames |
| Proof artifacts displaced | Keep `proof/` at repository root |
| Tests depend on fixture paths | Update test fixtures carefully |
| Source code references old filenames | Search and update `src/` and regenerate `dist/` |

---

## Definition of Done

- [x] `docs/guides/developer/file-naming-conventions.md` is published and reviewed.
- [x] Root directory is clean and standard.
- [x] Files violating the naming convention are renamed.
- [x] All internal references to renamed files are updated.
- [x] `dist/` and `docs/generated/` are regenerated from source.
- [x] All top-level directories have explanatory `README.md` files.
- [x] Obsolete reports are archived or removed with rationale.
- [x] `.gitignore` is appropriate for public contributors.
- [x] Repository health audit passes.
- [x] `npm run govern` passes.
- [x] Expedition is accepted.

---

## Completion Notes

Renamed files to follow the kebab-case convention:

- `ARCHITECTURAL_CONSTITUTION.md` → `docs/architecture/constitution.md`
- `ASC-001-REPORT.md` → `docs/audits/ASC-001-report.md`
- `AUDIT-REPORT-2026-06-29-EVIDENCE.md` → `docs/audits/audit-report-2026-06-29-evidence.md`
- `AUDIT-REPORT-2026-06-29.md` → `docs/audits/audit-report-2026-06-29.md`
- `AWS-001-IMPLEMENTATION-REPORT.md` → `docs/audits/AWS-001-implementation-report.md`
- `TERM-INVENTORY.md` → `docs/reference/term-inventory.md`
- `TERM-MIGRATION-REPORT.md` → `docs/reference/term-migration-report.md`
- `TRUST-BOUNDARY.md` → `docs/architecture/trust-boundary.md`
- `docs/ADAPTER_ARCHITECTURE.md` → `docs/adapter-architecture.md`
- `docs/ATL.md` → `docs/atl.md`
- `docs/AWS-001-AGENT_WORKSPACE_SPECIFICATION.md` → `docs/AWS-001-agent-workspace-specification.md`
- `docs/AWS-001-WORKSPACE_CONTEXT_MODEL.md` → `docs/AWS-001-workspace-context-model.md`
- `docs/CONSTITUTIONAL_BASELINE.md` → `docs/architecture/constitutional-baseline.md`
- `docs/ENGINEERING_COGNITION_PRINCIPLES.md` → `docs/engineering-cognition-principles.md`
- `docs/EXP-AUD-002-ZERO-TRUST-ARCHITECTURE-VERIFICATION.md` → `docs/EXP-AUD-002-zero-trust-architecture-verification.md`
- `docs/GOVERNANCE.md` → `docs/governance.md`
- `docs/INTENT-ARCHITECTURE.md` → `docs/intent-architecture.md`
- `docs/KERNEL_FREEZE.md` → `docs/kernel-freeze.md`
- `docs/KNOWLEDGE_EVOLUTION.md` → `docs/knowledge-evolution.md`
- `docs/SYNTH_AUDIT_BLUEPRINT.md` → `docs/synth-audit-blueprint.md`
- `docs/UBIQUITOUS_LANGUAGE.md` → `docs/ubiquitous-language.md`
- `docs/architecture/EXECUTION-LAYER.md` → `docs/architecture/execution-layer.md`
- `docs/architecture/KNOWLEDGE-LAYER.md` → `docs/architecture/knowledge-layer.md`
- `docs/architecture/PLANNING-LAYER.md` → `docs/architecture/planning-layer.md`
- `docs/architecture/PROJECTION-LAYER.md` → `docs/architecture/projection-layer.md`

Updated references in `src/`, docs, tests, `.github/`, and `.githooks/`. Regenerated `dist/`.

Reorganized `docs/` to the public-release layout:

- `docs/adrs/` → `docs/adr/`
- `docs/agents/` → `docs/guides/agents/`
- `docs/developer/` → `docs/guides/developer/`
- `docs/philosophy/` → `docs/guides/philosophy/`
- `docs/tutorials/` → `docs/guides/tutorials/`
- `docs/constitutional-baseline.md` → `docs/architecture/constitutional-baseline.md`
- `docs/EXP-AUD-002-zero-trust-architecture-verification.md` → `docs/audits/EXP-AUD-002-zero-trust-architecture-verification.md`
- `docs/terminology-migration-report.md` → `docs/reference/terminology-migration-report.md`

Moved root Markdown files into `docs/`:

- `architectural-constitution.md` → `docs/architecture/constitution.md`
- `trust-boundary.md` → `docs/architecture/trust-boundary.md`
- `term-inventory.md` → `docs/reference/term-inventory.md`
- `term-migration-report.md` → `docs/reference/term-migration-report.md`
- `ASC-001-report.md` → `docs/audits/ASC-001-report.md`
- `audit-report-2026-06-29.md` → `docs/audits/audit-report-2026-06-29.md`
- `audit-report-2026-06-29-evidence.md` → `docs/audits/audit-report-2026-06-29-evidence.md`
- `AWS-001-implementation-report.md` → `docs/audits/AWS-001-implementation-report.md`

Renamed example:

- `examples/large-repository/` → `examples/monolith/`

Added `README.md` files for every top-level directory:

- `src/README.md`
- `tests/README.md`
- `scripts/README.md`
- `docs/README.md` (updated)
- `examples/README.md`
- `data/README.md`
- `proof/README.md`

Added navigational `README.md` files for new docs domains:

- `docs/getting-started/README.md`
- `docs/guides/README.md`
- `docs/examples/README.md`
- `docs/audits/README.md`

Updated `.gitignore` to exclude local runtime artifacts (`data/`, `data-test/`, `proof/`), build outputs (`dist/`, `coverage/`), generated docs (`docs/generated/`), and secrets (`.env`).

Added `scripts/repository-health-audit.js` and the `npm run audit:repository` command. The audit verifies the root layout, required files, README presence, obsolete-file absence, docs subdomain structure, and `.gitignore` coverage.

Verification:

- `npm run build` passes.
- `npm run test:freeze-certification` passes.
- `npm run test:public-vocabulary-audit` passes.
- `npm run audit:repository` passes.
- `npm run govern` passes with proof `proof/proof-2026-07-12T12-49-44-651Z.json`.
