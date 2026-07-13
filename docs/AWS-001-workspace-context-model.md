# AWS-001 — Workspace Context Model

**Status:** P0 Required
**Audience:** Implementation Agents
**Date:** 2026-06-29
**Version:** 1.0.0
**Companion:** AWS-001-agent-workspace-specification.md

---

## Purpose

This document defines the canonical schema for all machine-readable workspace descriptors produced by the Agent Workspace.

Behavior belongs in `AWS-001-agent-workspace-specification.md`.

Schema belongs in this document.

---

## Versioning

All descriptors share the same version: `1.0.0`.

Future versions use semantic versioning. Patch = field additions. Minor = structural changes. Major = incompatible changes.

---

## File: workspace.json

The full workspace descriptor. Contains all phases of the orientation pipeline.

### Schema

```json
{
  "version": "1.0.0",
  "generatedAt": "ISO-8601 timestamp",
  "identity": {
    "system": "Synth v2",
    "version": "2.0.0",
    "description": "string",
    "layers": ["string"]
  },
  "environment": {
    "status": "READY | DEGRADED | BLOCKED",
    "platform": "string",
    "runtime": {
      "name": "Node.js",
      "version": "string",
      "ok": true
    },
    "checks": [
      {
        "name": "string",
        "status": "PASS | WARN | FAIL",
        "detail": "string"
      }
    ],
    "summary": {
      "pass": 0,
      "warn": 0,
      "fail": 0
    }
  },
  "architecture": {
    "checks": [
      {
        "name": "string",
        "status": "pass | fail",
        "category": "string"
      }
    ],
    "invariants": [
      {
        "id": "string",
        "text": "string",
        "status": "enforced | violated"
      }
    ]
  },
  "language": {
    "source": "path/to/ubiquitous-language.md",
    "loaded": true,
    "layers": {
      "planning": [{ "term": "string", "definition": "string" }],
      "execution": [{ "term": "string", "definition": "string" }],
      "governance": [{ "term": "string", "definition": "string" }],
      "infrastructure": [{ "term": "string", "definition": "string" }],
      "projection": [{ "term": "string", "definition": "string" }],
      "workspace": [{ "term": "string", "definition": "string" }]
    },
    "forbidden": [{ "term": "string", "replacement": "string" }],
    "audit": {
      "passed": true,
      "issues": [],
      "timestamp": 0
    }
  },
  "semantic": {
    "assertions": [
      {
        "id": "string",
        "text": "string",
        "invariant": "string",
        "status": "PASS | FAIL",
        "detail": "string"
      }
    ],
    "passed": true
  },
  "health": {
    "status": "ready | degraded",
    "checks": [
      {
        "category": "string",
        "name": "string",
        "status": "pass | warn | fail"
      }
    ],
    "summary": {
      "pass": 0,
      "warn": 0,
      "fail": 0
    }
  },
  "engineeringContext": {
    "missionCount": 0,
    "expeditionCount": 0,
    "objectiveCount": 0,
    "discoveryCount": 0,
    "decisionCount": 0,
    "workItemCount": 0,
    "eventCount": 0
  },
  "suggestedActions": [
    {
      "action": "string",
      "context": "string",
      "priority": "high | medium | low"
    }
  ]
}
```

### Required Fields

All fields at the top level are required.

`identity`, `environment`, `architecture`, `language`, `semantic`, `health`, `engineeringContext`, `suggestedActions` must all be present.

### Optional Fields

- `environment.checks[].detail` — may be empty string if no detail available
- `architecture.invariants` — may be empty array if no invariants defined
- `language.audit.issues` — may be empty array
- `suggestedActions` — may be empty array if no suggestions generated

---

## File: health.json

Subset of workspace.json focused on health.

### Schema

```json
{
  "version": "1.0.0",
  "generatedAt": "ISO-8601 timestamp",
  "status": "ready | degraded",
  "checks": [
    {
      "category": "string",
      "name": "string",
      "status": "pass | warn | fail"
    }
  ],
  "summary": {
    "pass": 0,
    "warn": 0,
    "fail": 0
  }
}
```

---

## File: context.json

Engineering context — canonical knowledge counts.

### Schema

```json
{
  "version": "1.0.0",
  "generatedAt": "ISO-8601 timestamp",
  "missionCount": 0,
  "expeditionCount": 0,
  "objectiveCount": 0,
  "discoveryCount": 0,
  "decisionCount": 0,
  "workItemCount": 0,
  "eventCount": 0
}
```

All counts are non-negative integers.

---

## File: architecture.json

Architecture verification results.

### Schema

```json
{
  "version": "1.0.0",
  "generatedAt": "ISO-8601 timestamp",
  "checks": [
    {
      "name": "string",
      "category": "architecture | runtime | quality | documentation | workspace",
      "status": "pass | fail",
      "path": "string"
    }
  ],
  "invariants": [
    {
      "id": "string",
      "text": "string",
      "status": "enforced | violated"
    }
  ]
}
```

---

## File: language.json

Canonical language verification results.

### Schema

```json
{
  "version": "1.0.0",
  "generatedAt": "ISO-8601 timestamp",
  "source": "path/to/ubiquitous-language.md",
  "loaded": true,
  "layers": {
    "planning": [{ "term": "string", "definition": "string" }],
    "execution": [{ "term": "string", "definition": "string" }],
    "governance": [{ "term": "string", "definition": "string" }],
    "infrastructure": [{ "term": "string", "definition": "string" }],
    "projection": [{ "term": "string", "definition": "string" }],
    "workspace": [{ "term": "string", "definition": "string" }]
  },
  "forbidden": [{ "term": "string", "replacement": "string" }],
  "sourceAudit": {
    "passed": true,
    "issues": [],
    "timestamp": 0
  }
}
```

---

## File: memory.json

Session memory — orientation history.

### Schema

```json
{
  "version": "1.0.0",
  "generatedAt": "ISO-8601 timestamp",
  "orientationCount": 0,
  "lastOrientationAt": "ISO-8601 timestamp | null",
  "phases": [
    {
      "phase": "number",
      "name": "string",
      "durationMs": 0,
      "status": "completed | failed | skipped"
    }
  ],
  "blocks": [
    {
      "reason": "string",
      "phase": "string",
      "timestamp": "ISO-8601 timestamp"
    }
  ]
}
```

---

## Compatibility Guarantees

1. **Patch releases** (1.0.x) may add optional fields. Existing consumers ignore unknown fields.
2. **Minor releases** (1.x.0) may add required fields or change field semantics. Consumers must update.
3. **Major releases** (x.0.0) may restructure the schema. Migration guide required.

## Extension Mechanism

Any descriptor may contain an `_extensions` object at any level. Extensions are:

- Ignored by the canonical validator
- Preserved during serialization
- Available for tool-specific data

## Deterministic Serialization Rules

1. JSON output must use 2-space indentation.
2. Object keys must be sorted alphabetically.
3. Arrays must preserve insertion order.
4. No trailing commas.
5. Dates use ISO-8601 format.
6. Numbers use decimal notation (no scientific notation for integers).

---

## Determinism Contract

Given the same repository state, `workspace.json` must be byte-for-byte identical across sessions, except for:

- `generatedAt` (observational timestamp)
- `environment.runtime.version` (may differ across Node.js versions)

All other fields must be deterministic.

---

*Document: AWS-001 Workspace Context Model*
*Status: P0 Required*
*Version: 1.0.0*
