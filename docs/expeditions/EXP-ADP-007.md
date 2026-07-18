# EXP-ADP-007 — Repository Adapter Observation Extension

**Status:** Completed  
**Kind:** Evidence Adapter Extension  
**Program:** EXP-PROGRAM-018 — Foundation Architecture Program  
**External System:** No  
**Priority:** High  
**Depends On:** EXP-ADP-001, EXP-ADP-OBS-001  
**Blocks:** Mission Studio repository input

---

## Purpose

Extend the existing Repository Adapter with an `observe()` method that emits canonical Observations about the codebase.

The Repository Adapter already performs Git operations. This extension adds read-only inspection of repository contents so Mission Studio can understand the project it is planning work for.

---

## Classification

| Attribute | Value |
|-----------|-------|
| Adapter kind | Evidence Adapter |
| External system | None |
| Kernel dependency | Observation contract |
| Primary value | Surface repository structure, languages, dependencies, and tooling to Mission Studio |

---

## Responsibilities

- Scan the repository file tree.
- Detect programming languages from file extensions.
- Read `package.json` dependencies and devDependencies.
- Detect build, test, and configuration files.
- Detect test files and test scripts.
- Emit `Observation[]` through `observe()`.
- Never mutate repository state.
- Never infer architecture or intent beyond what files directly declare.

---

## Observations Produced

| Category | Subject | Source |
|----------|---------|--------|
| `language` | Detected language name | File extension counts |
| `dependency` | Package name | `package.json` |
| `test` | Test framework or presence | Test files / scripts |
| `evidence` | Build/test/config file | `tsconfig.json`, `Makefile`, etc. |

---

## Invariants

- `observe()` is read-only.
- Platform-specific concepts (e.g., `node_modules`, `.git`) are excluded.
- Every observation references the file(s) that produced it.
- Confidence is `high` for direct reads, `medium` for derived counts, `unknown` when content cannot be read.

---

## Lifecycle

The extension uses the existing Repository Adapter lifecycle from EXP-ADP-001.

`observe()` requires the adapter to be enabled and the path to be a valid repository directory.

---

## Success Criteria

- `observe()` returns Observations for the configured repository path.
- Languages, dependencies, and tooling are detected from files.
- Mission Studio receives only canonical Observations.
- Existing Repository Adapter tests continue to pass.

---

## Completion Criteria

Repository Adapter observation extension is complete when:

- `RepositoryAdapter` interface declares `observe(): Promise<ObservationBatch>`.
- `GitRepositoryAdapter` implements `observe()` without mutating state.
- The adapter skips `node_modules`, `.git`, `dist`, and other build artifacts.
- Tests verify language, dependency, and tooling observations.
