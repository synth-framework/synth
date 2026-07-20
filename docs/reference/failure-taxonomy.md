# SYNTH Failure Taxonomy

This document defines the canonical classes of failures that SYNTH certifications must be able to inject, observe, and recover from. Every certification scenario in the SYNTH Certification Framework is classified against one or more categories in this taxonomy.

## Purpose

Provide a shared vocabulary for resilience certification so that gaps in failure coverage are visible and agents can author new scenarios without inventing ad hoc categories.

---

## Lifecycle Failures

Failures that occur during the governed Mission / Expedition lifecycle.

| Subtype | Description | Example |
|---|---|---|
| `draft-creation` | A draft cannot be created from the current state. | Missing required fields for a Mission proposal. |
| `approval` | A proposal fails approval. | Mission confidence below the approval threshold. |
| `commit` | An approved proposal cannot be committed to runtime. | Expedition commit blocked by ExecutionGate. |
| `execution` | A committed Expedition cannot start or proceed. | Missing evidence path at expedition start. |
| `completion` | A running Expedition cannot complete cleanly. | Completion validation fails. |

---

## Persistence Failures

Failures that affect the durability or integrity of artifacts and state.

| Subtype | Description | Example |
|---|---|---|
| `partial-write` | A mutating operation leaves partial artifacts. | Bootstrap interrupted after manifest creation but before event log initialization. |
| `interrupted-write` | A write is interrupted before completion. | Mission approval process killed mid-write. |
| `missing-artifact` | An expected artifact is absent. | `.synth/context.json` missing after bootstrap. |
| `corrupt-artifact` | An artifact exists but is malformed. | `event-log.jsonl` contains invalid JSON. |

---

## Replay Failures

Failures that affect the ability to reconstruct state from the event log.

| Subtype | Description | Example |
|---|---|---|
| `missing-event` | A required event is absent from the log. | `MISSION_APPROVED` missing after approval. |
| `invalid-hash` | The hash chain no longer validates. | Manual edit to `event-log.jsonl` breaks chain integrity. |
| `event-ordering` | Events appear in an invalid order. | `EXPEDITION_STARTED` before `EXPEDITION_APPROVED`. |
| `unknown-event-type` | The log contains an unrecognized event type. | Replay encounters an event from a future version. |

---

## Operator Failures

Failures caused by incorrect or premature operator / agent action.

| Subtype | Description | Example |
|---|---|---|
| `invalid-command` | A command is invoked in an invalid context. | `synth docs generate` during `--discovery-mode`. |
| `missing-approval` | A mutating command is invoked without approval. | `synth bootstrap` without `--approve` or `--dry-run`. |
| `concurrent-operation` | Two mutating operations overlap. | Concurrent expedition creation attempts. |
| `interrupted-execution` | An operator aborts a long-running operation. | `synth govern` interrupted mid-validation. |

---

## Environment Failures

Failures caused by the host environment rather than SYNTH logic.

| Subtype | Description | Example |
|---|---|---|
| `missing-dependency` | A required tool is not available. | Node.js version below the required minimum. |
| `missing-govern-script` | A bootstrapped project has no `govern` script. | `package.json` lacks a `govern` entry. |
| `corrupt-installation` | The SYNTH installation is inconsistent. | `dist/` files missing or outdated. |
| `missing-source-history` | The repository has no version control history. | Brownfield intake on an un-initialized Git directory. |

---

## Classification Rules

1. A scenario MUST classify itself against at least one primary category.
2. A scenario MAY classify itself against additional secondary categories.
3. If a scenario does not map to any existing category, the taxonomy MUST be extended before the scenario is accepted.
4. The certification matrix is organized by capability × taxonomy category.

---

## Relationship to Certification DSL

In the Certification DSL, the `taxonomy` field accepts a list of category or subtype identifiers:

```yaml
taxonomy:
  - lifecycle.approval
  - operator.missing-approval
```

Both category-level (`lifecycle`) and subtype-level (`lifecycle.approval`) identifiers are valid.
