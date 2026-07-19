> Part of **EXP-AI-004 — AI Interaction Manifest**.

# AI Interaction Manifest Schema

The AI Interaction Manifest is a machine-readable contract located at:

```text
.synth/ai/interaction-manifest.json
```

It tells any compliant AI agent how to interact with a specific SYNTH repository without repository-specific instructions.

---

## Schema

```text
synth-ai-interaction-manifest-v1
```

## Fields

| Field | Type | Description |
| --- | --- | --- |
| `schema` | string | Fixed value: `synth-ai-interaction-manifest-v1` |
| `version` | string | Manifest format version |
| `generatedAt` | ISO 8601 timestamp | When the manifest was produced |
| `repositoryPurpose` | string | Why the project exists |
| `repositoryType` | `greenfield` \| `brownfield` \| `hybrid` \| `unknown` | Class of repository |
| `lifecyclePhase` | `uninitialized` \| `initialized` \| `planning` \| `approved` \| `executing` \| `blocked` \| `complete` | Current lifecycle phase |
| `mutationPolicy` | `READ_ONLY` \| `PROPOSAL_ONLY` \| `MUTATING` | What mutations the agent may perform |
| `expectedWorkflows` | array of `ExpectedWorkflow` | Typical SYNTH workflows for this repository |
| `prohibitedActions` | array of `ProhibitedAction` | Actions the agent must never take |
| `approvalRequirements` | array of `ApprovalRequirement` | Actions requiring explicit approval |
| `preferredInteractionPattern` | string | How the agent should engage the operator |
| `evidenceExpectations` | array of string | Required evidence for approvals |
| `escalationRules` | array of `EscalationRule` | When and how to escalate |
| `ownershipBoundaries` | array of `OwnershipBoundary` | Domains the agent may reason about |

### ExpectedWorkflow

| Field | Type | Description |
| --- | --- | --- |
| `name` | string | Workflow name |
| `trigger` | string | When the workflow applies |
| `command` | string | Public CLI command |
| `requiresApproval` | boolean | Whether the workflow requires operator approval |

### ProhibitedAction

| Field | Type | Description |
| --- | --- | --- |
| `action` | string | Prohibited action |
| `reason` | string | Why it is prohibited |

### ApprovalRequirement

| Field | Type | Description |
| --- | --- | --- |
| `action` | string | Action requiring approval |
| `evidence` | array of string | Required evidence |
| `escalationMessage` | string | Message to surface when approval is missing |

### EscalationRule

| Field | Type | Description |
| --- | --- | --- |
| `condition` | string | Condition triggering escalation |
| `action` | string | What the agent should do |

### OwnershipBoundary

| Field | Type | Description |
| --- | --- | --- |
| `domain` | string | Domain name |
| `scope` | string | What the agent may do in that domain |

---

## Lifecycle

- Generated during `synth init` and `synth bootstrap --approve`.
- Refreshed by `synth ai refresh`.
- Updated automatically by `synth status`.
- Versioned and governed as a generated artifact.

---

## Example

```json
{
  "schema": "synth-ai-interaction-manifest-v1",
  "version": "1.0.0",
  "generatedAt": "2026-07-19T18:00:00.000Z",
  "repositoryPurpose": "Governed SYNTH project: Example",
  "repositoryType": "brownfield",
  "lifecyclePhase": "initialized",
  "mutationPolicy": "MUTATING",
  "expectedWorkflows": [
    {
      "name": "Status",
      "trigger": "Agent needs orientation",
      "command": "synth status",
      "requiresApproval": false
    }
  ],
  "prohibitedActions": [
    {
      "action": "Edit event-log.jsonl manually",
      "reason": "Events are immutable and replayable."
    }
  ],
  "approvalRequirements": [
    {
      "action": "Bootstrap a repository",
      "evidence": ["Bootstrap proposal reviewed", "Operator approval via --approve"],
      "escalationMessage": "Do not bootstrap without explicit operator approval."
    }
  ],
  "preferredInteractionPattern": "Operate within the active expedition; record every state change as an event.",
  "evidenceExpectations": [
    "Mission or Expedition draft must reference an approved charter."
  ],
  "escalationRules": [
    {
      "condition": "Mutation policy is READ_ONLY",
      "action": "Stop and ask the operator for the next step."
    }
  ],
  "ownershipBoundaries": [
    {
      "domain": "Governance",
      "scope": "Read-only unless explicitly authorized."
    }
  ]
}
```
