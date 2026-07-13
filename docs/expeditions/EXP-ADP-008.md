# EXP-ADP-008 — Filesystem Adapter

**Status:** Completed  
**Kind:** Evidence Adapter  
**External System:** No  
**Priority:** High  
**Depends On:** EXP-ADP-000, EXP-ADP-OBS-001  
**Blocks:** Mission Studio filesystem input

---

## Purpose

Read arbitrary local files and directories and emit canonical Observations for Mission Studio.

The Filesystem Adapter is similar to the Document Adapter, but it is not limited to documentation. It can scan any folder tree — `config/`, `assets/`, `schemas/`, source folders, or runtime configuration — and surface every file as evidence.

---

## Classification

| Attribute | Value |
|-----------|-------|
| Adapter kind | Evidence Adapter |
| External system | None |
| Kernel dependency | Observation contract |
| Primary value | Surface arbitrary filesystem content to Mission Studio |

---

## Responsibilities

- Scan a configured root directory recursively.
- Accept an explicit file list as an alternative to directory scanning.
- Read known text file formats and emit `evidence` Observations with content snippets.
- Detect binary or unknown files and emit placeholder `evidence` Observations.
- Exclude build artifacts, dependency directories, and hidden files by default.
- Never mutate filesystem state.
- Never infer meaning from file paths or contents.

---

## Input

```typescript
FilesystemConfig {
  rootDirectory?: string    // default: process.cwd()
  files?: string[]          // explicit file list overrides directory
  maxSnippetLength?: number // default: 500
  includeHidden?: boolean   // default: false
}
```

---

## Output

For text files:

```typescript
Observation {
  id: "obs-filesystem-..."
  source: { adapter: "filesystem", locator: "relative/path.json" }
  category: "evidence"
  subject: "path.json"
  evidence: [{
    description: "Filesystem text file content",
    snippet: "...first 500 characters...",
    fingerprint: "sha256-12"
  }]
  confidence: "high"
  timestamp: number
  metadata: { path: "relative/path.json", size: 1234, kind: "text" }
}
```

For binary files:

```typescript
Observation {
  confidence: "unknown"
  evidence: [{
    description: "Filesystem binary or non-text file detected",
    fingerprint: "sha256-12"
  }]
  metadata: { kind: "binary" }
}
```

---

## Text Formats

The adapter currently reads the following extensions as UTF-8 text:

```text
.txt, .md, .adr, .json, .yaml, .yml, .toml, .ini, .cfg, .conf,
.sql, .xml, .csv, .tsv, .html, .css, .js, .ts, .jsx, .tsx
```

All other files are treated as binary placeholders.

---

## Exclusions

By default the adapter skips:

- `.git`
- `node_modules`
- `dist`
- `build`
- `.synth`
- `coverage`
- Hidden files and directories (unless `includeHidden` is true)

---

## Lifecycle

Uses the canonical adapter lifecycle from EXP-ADP-000:

```
Discover → Configure → Validate → Enable → Healthy → Operational → Disable
```

`observe()` is available once enabled.

---

## Invariants

- `observe()` is read-only.
- Text file Observations include a content snippet and fingerprint.
- Binary file Observations declare `unknown` confidence.
- No file is created, modified, or deleted.
- Hidden and build-artifact exclusions are deterministic.

---

## Success Criteria

- Text files produce `evidence` Observations with snippets.
- Binary files produce placeholder Observations with `unknown` confidence.
- Missing directories produce an empty observation batch.
- Explicit file lists override directory scanning.
- Adapter passes lifecycle and health checks.
- Extraction is deterministic for the same filesystem state.

---

## Completion Criteria

Filesystem Adapter is complete when:

- `src/adapters/filesystem/adapter.ts` implements `ObservableAdapter`.
- `src/adapters/filesystem/types.ts` defines the input/output contracts.
- The adapter is registered in `AdapterRegistry`.
- Tests cover directory scanning, explicit file list, text extraction, binary placeholder, hidden-file exclusion, missing directory, and lifecycle.
