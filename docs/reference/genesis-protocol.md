# Genesis Protocol

**Version:** 1.0.0  
**Status:** Accepted  
**Authority:** ADR-035 — Genesis Protocol

The Genesis Protocol is the open interoperability contract through which any capable AI agent discovers, understands, and participates in the SYNTH lifecycle. It is implementation-independent: agents implement the protocol by reading repository metadata and invoking public SYNTH commands; SYNTH exposes metadata and commands that satisfy the protocol.

## 1. Repository Discovery

A SYNTH-governed repository is identified by:

```text
.synth/
    manifest.json
    ai/
        discovery.json
        capabilities.json
        lifecycle.json
        protocols.json
        skills.json
```

An agent performs discovery in this order:

1. Check for `.synth/manifest.json`.
2. Check for `.synth/ai/protocols.json` listing supported protocol versions.
3. If both are present and valid, the repository is SYNTH-governed.

## 2. Context Classification

The agent reads `.synth/ai/lifecycle.json` to determine:

- `repositoryType`: `greenfield`, `brownfield`, or `hybrid`.
- `currentPhase`: the current SYNTH lifecycle phase.
- `governanceVersion`: the version of SYNTH governance in use.
- `mutationPolicy`: `READ_ONLY`, `PROPOSAL_ONLY`, or `MUTATING`.

Based on this classification, the agent selects the appropriate Discovery workflow.

## 3. Discovery Execution

### 3.1 Inputs

- Natural language intent.
- Existing repository artifacts.
- Documents, URLs, diagrams, images.

### 3.2 Workflows

| Repository Type | Workflow | Command |
|---|---|---|
| Greenfield | Genesis discovery from intent | `synth first-contact start --intent "..."` |
| Brownfield | Baseline capture from repository | `synth discover [--export]` |
| Hybrid | Combined intent and baseline discovery | `synth first-contact start --intent "..."` followed by `synth discover` |

### 3.3 Phase classification

| Phase | Classification | Requires Approval |
|---|---|---|
| Intake | READ_ONLY | No |
| Intent Extraction | READ_ONLY | No |
| Clarification | PROPOSAL_ONLY | No |
| Architecture Projection | PROPOSAL_ONLY | No |
| Capability Verification | READ_ONLY | No |
| Discovery Approval | MUTATING | Yes |
| Mission Materialization | MUTATING | Yes |
| Expedition Proposal | PROPOSAL_ONLY | No |

## 4. Artifact Production

Discovery produces the following artifacts, each serialized as JSON and optionally certified:

- **Discovery Artifact** — captures intent, constraints, unknowns, and architecture candidates.
- **Intent Model** — canonical representation of goals, stakeholders, and success criteria.
- **Domain Model** — entities, relationships, bounded contexts, and ubiquitous language.
- **Mission Proposal** — draft Mission with purpose, objectives, and acceptance criteria.
- **Uncertainty Report** — unknowns, assumptions, and required evidence.

Artifacts are produced in-memory or exported explicitly. They do not mutate repository state until approved.

## 5. Approval Participation

Agents must respect approval boundaries:

- READ_ONLY phases: agent may observe only.
- PROPOSAL_ONLY phases: agent may produce artifacts for operator review.
- MUTATING phases: agent must obtain explicit operator approval before invoking commands.

Approved actions are executed through public SYNTH commands, which emit events through the ExecutionGate.

## 6. Mission / Expedition Interaction

After Discovery approval, the agent may:

- Review the approved Mission.
- Propose Expeditions.
- Assist in executing Expeditions by adding evidence, discoveries, and decisions.
- Complete Objectives.

All interactions use public CLI commands and documented artifacts.

## 7. Replay Consumption

Agents consume replay to understand previous decisions and state:

```bash
synth explain replay
synth explain status
synth mission snapshot list
```

Replay output is deterministic for a given event log. Agents must not infer state from mutable files such as drafts or generated documentation when replay is available.

## 8. Protocol Versioning

The protocol version is declared in `.synth/ai/protocols.json`:

```json
{
  "protocols": [
    { "name": "genesis", "version": "1.0.0" }
  ]
}
```

Protocol changes follow semantic versioning. Minor versions add features; major versions require agent updates.

## 9. Agent Compliance

A compliant agent:

- Detects SYNTH repositories from metadata.
- Classifies repository type and lifecycle phase.
- Executes the appropriate Discovery workflow.
- Produces deterministic artifacts.
- Respects approval boundaries.
- Uses only public CLI commands for mutations.
- Consumes replay for decision context.

## 10. Related Documents

- `docs/adr/ADR-035-genesis-protocol.md`
- `docs/reference/repository-semantic-metadata.md`
- `docs/reference/ai-interaction-manifest-schema.md`
- `docs/guides/agent-skill-catalog.md`
