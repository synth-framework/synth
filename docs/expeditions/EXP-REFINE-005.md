# EXP-REFINE-005 — Reference Evidence Binding

**Status:** Proposed  
**Kind:** Expedition  
**Priority:** Medium  
**Program:** EXP-PROGRAM-036 — Intent Refinement & Alignment Governance  
**Phase:** 2 — Alignment Artifacts  
**Authority:** Synth Architectural Constitution

---

## Goal

Bind screenshots, designs, documents, and examples as intent evidence without embedding large binaries in the event log.

---

## Purpose

Visual and experiential intent cannot be captured in prose alone. This expedition defines how reference assets are attached to the Alignment Contract by link or hash, keeping the event log deterministic and compact.

---

## Deliverables

1. **Reference Evidence artifact schema** in `src/governance/reference-evidence.ts`.
2. **Supported evidence kinds**:
   - `image`
   - `document`
   - `video`
   - `audio`
   - `example_url`
   - `example_path`
   - `design_board`
   - `cli_recording`
3. **Evidence binding API** that links evidence to an Alignment Contract.
4. **Hash-based integrity check** for local files.
5. **Unit tests** covering evidence binding and integrity validation.

---

## Reference Evidence Fields

```text
id
kind
uri
hash
mimeType
description
capturedAt
```

---

## Acceptance Criteria

- Evidence can be bound to an Alignment Contract by URI.
- Local file evidence includes a content hash.
- Unsupported evidence kinds are rejected.
- Evidence is referenced, not embedded, in the event log.
- Missing or unreachable evidence is reported during validation.

---

## Out of Scope

- Hosting or serving evidence assets.
- Automated screenshot capture.
- Visual diff tooling.

---

## Related

- ADR-036 — Intent Refinement and Alignment Governance
- EXP-PROGRAM-036 — Intent Refinement & Alignment Governance
- EXP-REFINE-002 — Alignment Contract
