# First Contact Discovery Artifact Schema

> **Canonical schema for greenfield Discovery artifacts.** Defines the structure, fields, serialization rules, and validation contract for the immutable artifact that captures operator intent before any project state exists.

**Schema version:** 1.0.0  
**Governed by:** EXP-AIFC-002 — Discovery Artifact Schema  
**Program:** EXP-PROGRAM-022 — AI-Native First Contact

---

## 1. Purpose

The Discovery artifact is the single source of intent for greenfield onboarding. It is:

- **Complete enough** to generate a Mission and architecture candidates.
- **Immutable** once approved.
- **Replayable** from its inputs and clarification transcript.
- **Deterministically serializable** so it can be hashed and provenanced.

This document defines the artifact schema. The canonical JSON Schema is at [`docs/schemas/first-contact-artifact.schema.json`](../schemas/first-contact-artifact.schema.json).

---

## 2. Top-level structure

```json
{
  "$schema": "synth-first-contact-artifact-v1",
  "id": "artifact-<uuid>",
  "sessionId": "session-<uuid>",
  "version": "1.0.0",
  "createdAt": "2026-07-19T00:00:00.000Z",
  "approvedAt": "2026-07-19T00:00:00.000Z",
  "intent": { ... },
  "audience": { ... },
  "environment": { ... },
  "capabilities": { ... },
  "constraints": { ... },
  "unknowns": [ ... ],
  "risks": [ ... ],
  "confidence": { ... },
  "architectureCandidates": [ ... ],
  "selectedArchitecture": { ... },
  "capabilityVerification": { ... },
  "transcript": [ ... ],
  "provenance": { ... },
  "artifactHash": "<hash>"
}
```

---

## 3. Field definitions

### 3.1 Identity and versioning

| Field | Type | Description |
|---|---|---|
| `$schema` | string | Schema identifier: `synth-first-contact-artifact-v1`. |
| `id` | string | Unique artifact identifier. |
| `sessionId` | string | Identifier of the Discovery session that produced the artifact. |
| `version` | string | Schema version of the artifact. |
| `createdAt` | string (ISO 8601) | When the artifact was created. |
| `approvedAt` | string (ISO 8601) | When the artifact was approved. Null before approval. |

### 3.2 Intent

| Field | Type | Description |
|---|---|---|
| `intent.description` | string | Original plain-language idea. |
| `intent.goals` | array of strings | High-level goals derived from the idea. |
| `intent.successCriteria` | array of strings | Measurable success criteria. |

### 3.3 Audience

| Field | Type | Description |
|---|---|---|
| `audience.primaryUsers` | array of strings | Who will use the system. |
| `audience.stakeholders` | array of strings | Who cares about the outcome. |

### 3.4 Environment

| Field | Type | Description |
|---|---|---|
| `environment.targetRuntime` | string | e.g., `node`, `python`, `browser`. |
| `environment.languagePreferences` | array of strings | Preferred languages. |
| `environment.platformConstraints` | array of strings | e.g., `serverless`, `desktop`, `mobile`. |

### 3.5 Capabilities

| Field | Type | Description |
|---|---|---|
| `capabilities.required` | array of strings | Capabilities the system must have. |
| `capabilities.optional` | array of strings | Capabilities that are desirable. |

### 3.6 Constraints

| Field | Type | Description |
|---|---|---|
| `constraints.functional` | array of strings | Functional constraints. |
| `constraints.nonFunctional` | array of strings | Non-functional constraints (performance, security, etc.). |

### 3.7 Unknowns

Each unknown is an object:

```json
{
  "id": "unknown-001",
  "field": "audience.primaryUsers",
  "description": "Primary user base is unclear.",
  "confidence": 0.3,
  "accepted": false
}
```

### 3.8 Risks

Each risk is an object:

```json
{
  "id": "risk-001",
  "category": "technical",
  "description": "Unfamiliar framework may increase delivery risk.",
  "severity": "medium",
  "mitigation": "Allocate time for spike."
}
```

### 3.9 Confidence

| Field | Type | Description |
|---|---|---|
| `confidence.overall` | number [0,1] | Aggregate confidence score. |
| `confidence.threshold` | number [0,1] | Minimum confidence required for Discovery approval. |
| `confidence.byField` | object | Per-field confidence scores. |

### 3.10 Architecture candidates

Each candidate is a projection:

```json
{
  "id": "arch-001",
  "name": "Next.js + Supabase",
  "description": "Full-stack web application with serverless backend.",
  "rationale": "Matches the operator's preference for React and managed backend.",
  "tradeoffs": {
    "advantages": ["Familiar stack", "Rapid prototyping"],
    "disadvantages": ["Vendor lock-in", "Requires Node runtime"]
  },
  "assumptions": ["Node >= 20", "Supabase project available"],
  "recommended": true,
  "confidence": 0.85
}
```

### 3.11 Selected architecture

After Discovery approval, the selected candidate is copied here for provenance:

```json
{
  "selectedArchitecture.id": "arch-001",
  "selectedArchitecture.name": "Next.js + Supabase"
}
```

### 3.12 Capability verification

| Field | Type | Description |
|---|---|---|
| `capabilityVerification.status` | string | `passed`, `blocked`, or `overridden`. |
| `capabilityVerification.blockers` | array | List of blockers if status is not `passed`. |
| `capabilityVerification.reportHash` | string | Hash of the verification report. |

### 3.13 Transcript

The transcript records every operator input and system question:

```json
{
  "turn": 1,
  "actor": "operator",
  "type": "input",
  "content": "Let's build a space mission tracker.",
  "timestamp": "2026-07-19T00:00:00.000Z"
}
```

### 3.14 Provenance

| Field | Type | Description |
|---|---|---|
| `provenance.eventIds` | array of strings | Event IDs that produced the artifact. |
| `provenance.sessionHash` | string | Hash of the Discovery session inputs. |
| `provenance.validatorVersion` | string | Version of the artifact validator. |

### 3.15 Integrity

| Field | Type | Description |
|---|---|---|
| `artifactHash` | string | Hash over the canonical serialized artifact (excludes this field). |

---

## 4. Serialization rules

To guarantee determinism and replayability:

1. **Key ordering:** Object keys are sorted lexicographically.
2. **Array ordering:** Arrays are preserved in the order they were produced.
3. **Whitespace:** Canonical form uses no unnecessary whitespace.
4. **Timestamps:** Use ISO 8601 UTC with millisecond precision.
5. **Numbers:** Confidence scores are rounded to three decimal places.
6. **Excluded fields:** `artifactHash` is excluded from the hash input.

The canonical hash is computed over the canonical JSON serialization.

---

## 5. Validation levels

| Level | Checks |
|---|---|
| **Structural** | Required fields present, types correct. |
| **Semantic** | Confidence scores in range, timestamps valid, selected architecture refers to an existing candidate. |
| **Replay** | `artifactHash` matches canonical serialization. |
| **Provenance** | `provenance.eventIds` exist in the event log. |

---

## 6. Versioning

Schema version follows semantic versioning:

- **Patch:** Documentation or example changes.
- **Minor:** New optional fields.
- **Major:** Required field changes or semantic changes.

A new major schema version requires a new expedition and ADR.

---

## 7. Related

- [Greenfield Discovery Lifecycle Specification](../guides/greenfield-discovery-lifecycle.md)
- [ADR-019 — Greenfield Discovery Lifecycle](../adr/ADR-019-greenfield-discovery-lifecycle.md)
- [EXP-AIFC-002 — Discovery Artifact Schema](../expeditions/EXP-AIFC-002.md)
