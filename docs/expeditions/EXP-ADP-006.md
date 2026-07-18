# EXP-ADP-006 — Document Adapter

**Status:** Completed  
**Kind:** Evidence Adapter  
**Program:** EXP-PROGRAM-018 — Foundation Architecture Program  
**External System:** No  
**Priority:** High  
**Depends On:** EXP-ADP-000, EXP-ADP-OBS-001  
**Blocks:** Mission Studio document input

---

## Purpose

Read local documents and emit canonical Observations for Mission Studio.

The Document Adapter is read-only. It does not infer meaning. It surfaces file contents as evidence so that downstream Intelligence Adapters can extract missions, capabilities, constraints, and architecture.

---

## Classification

| Attribute | Value |
|-----------|-------|
| Adapter kind | Evidence Adapter |
| External system | None |
| Kernel dependency | Observation contract |
| Primary value | Convert documentation into Mission Studio input |

---

## Responsibilities

- Scan a configured directory or explicit file list.
- Read Markdown, plain text, and ADR files.
- Emit one `evidence` Observation per readable document.
- Report PDF and DOCX presence without parsing binary content.
- Ignore unknown formats.
- Never mutate runtime state.
- Never infer beyond file type and path.

---

## Supported Formats

| Format | Extension | Handling |
|--------|-----------|----------|
| Markdown | `.md` | Read as UTF-8 text |
| Plain text | `.txt` | Read as UTF-8 text |
| ADR | `.adr` | Read as UTF-8 text |
| PDF | `.pdf` | Detected; binary parsing not implemented |
| DOCX | `.docx` | Detected; binary parsing not implemented |

Future extensions may add PDF/DOCX text extraction through external parsers.

---

## Input

```typescript
DocumentConfig {
  documentsDirectory?: string   // default: ./docs
  files?: string[]              // explicit file list overrides directory
  maxSnippetLength?: number     // default: 500
}
```

---

## Output

```typescript
Observation {
  id: "obs-document-..."
  source: { adapter: "document", locator: "relative/path.md" }
  category: "evidence"
  subject: "path.md"
  evidence: [{
    description: "markdown document content",
    snippet: "...first 500 characters...",
    fingerprint: "sha256-12"
  }]
  confidence: "high"
  timestamp: number
  metadata: { format: "markdown", size: 1234, path: "relative/path.md" }
}
```

For PDF/DOCX:

```typescript
Observation {
  category: "evidence"
  confidence: "unknown"
  evidence: [{
    description: "pdf document detected; binary parsing not implemented",
    fingerprint: "sha256-12"
  }]
}
```

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
- Only file contents that can be read as UTF-8 are surfaced.
- Binary formats are reported, not parsed.
- Every observation includes the relative file path as evidence.
- No state outside the adapter is modified.

---

## Success Criteria

- Markdown, text, and ADR files produce `evidence` Observations.
- Missing directories produce an empty observation batch.
- PDF/DOCX files produce placeholder Observations with `unknown` confidence.
- Adapter passes lifecycle and health checks.
- Extraction is deterministic for the same files.

---

## Completion Criteria

Document Adapter is complete when:

- `src/adapters/document/adapter.ts` implements `ObservableAdapter`.
- `src/adapters/document/types.ts` defines the input/output contracts.
- The adapter is registered in `AdapterRegistry`.
- Tests cover directory scanning, explicit file list, markdown/text extraction, binary placeholder, missing directory, and lifecycle.
