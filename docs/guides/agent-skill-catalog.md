> Part of **EXP-AI-002 — Agent Skill Catalog**.

# SYNTH Agent Skill Catalog

This catalog defines reusable agent skills for participating in SYNTH workflows. Each skill describes behavior, not implementation, so any capable AI agent platform can adopt it.

---

## Skill Contract

Every skill in this catalog declares:

| Field | Description |
| --- | --- |
| `id` | Stable identifier |
| `name` | Human-readable name |
| `trigger` | When the skill should activate |
| `behavior` | What the agent does |
| `inputs` | Information the skill consumes |
| `outputs` | Artifacts the skill produces |
| `stoppingConditions` | When the skill is finished |
| `governanceConstraints` | Approval and mutation rules |

---

## Skills

### `genesis`

**Name:** Genesis Skill

**Trigger:** The user expresses raw product intent, e.g. "Build me a CRM" or "Create a markdown viewer in Python."

**Behavior:**
- Begin a structured Discovery workflow before proposing implementation.
- Capture intent, audience, constraints, and unknowns.
- Produce a Discovery artifact and Intent Model.
- Do not generate code or mutate repository state until the Mission is approved.

**Inputs:**
- Natural language intent
- Optional context (documents, URLs, diagrams)

**Outputs:**
- Discovery Artifact
- Intent Model
- Architecture candidates
- Uncertainty report

**Stopping Conditions:**
- Discovery artifact is approved, or
- The operator explicitly redirects the workflow.

**Governance Constraints:**
- PROPOSAL_ONLY until Discovery approval.
- No repository initialization before Mission approval.

---

### `brownfield-discovery`

**Name:** Brownfield Discovery Skill

**Trigger:** The agent encounters an existing repository that is or should be SYNTH-governed.

**Behavior:**
- Run `synth discover` to produce a read-only analysis.
- Use `synth discover --export` only when durable evidence is required.
- Capture baseline architecture, domain inventory, dependencies, and risks.
- Do not modify application code.

**Inputs:**
- Repository path
- Existing project files

**Outputs:**
- Discovery baseline (transient or exported)
- Repository classification
- Risk assessment
- Unknown tracker

**Stopping Conditions:**
- Baseline is captured and reviewed.
- Mission can be proposed from the baseline.

**Governance Constraints:**
- READ_ONLY by default.
- `--export` is an explicit, approved mutation.

---

### `mission-authoring`

**Name:** Mission Authoring Skill

**Trigger:** A Discovery artifact is approved or the operator asks to create a Mission.

**Behavior:**
- Help refine the Mission subject, purpose, objectives, and success criteria.
- Use `synth mission create` to produce a draft.
- Surface confidence, unknowns, and required evidence.
- Do not approve the Mission unless explicitly authorized.

**Inputs:**
- Approved Discovery artifact
- Intent Model

**Outputs:**
- Mission draft
- Confidence assessment
- Evidence recommendations

**Stopping Conditions:**
- Mission draft is created and awaiting approval.
- Operator explicitly approves or rejects.

**Governance Constraints:**
- PROPOSAL_ONLY.
- Approval is an explicit operator action.

---

### `expedition-planning`

**Name:** Expedition Planning Skill

**Trigger:** A Mission is active.

**Behavior:**
- Propose Expeditions that satisfy the Mission objectives.
- Define goals, acceptance criteria, and plans.
- Use `synth expedition create` to produce proposals.

**Inputs:**
- Active Mission
- Canonical knowledge

**Outputs:**
- Expedition proposals
- Acceptance criteria
- Estimated plans

**Stopping Conditions:**
- Expeditions are proposed and approved.
- Execution begins.

**Governance Constraints:**
- PROPOSAL_ONLY for proposal creation.
- MUTATING only within an approved, committed, and started Expedition.

---

### `governance-verification`

**Name:** Governance Verification Skill

**Trigger:** Before any state mutation or before requesting merge.

**Behavior:**
- Run `synth status` to resolve context.
- Run `synth verify` or `npm run govern` as appropriate.
- Verify the action complies with mutation policy and active expedition.
- Refuse mutations that bypass governance.

**Inputs:**
- Current repository state
- Proposed action

**Outputs:**
- Verdict (allowed / proposal-only / forbidden)
- Reasoning
- Suggested next command

**Stopping Conditions:**
- Governance check passes, or
- Agent escalates to operator.

**Governance Constraints:**
- Always READ_ONLY.
- Never mutate state during verification.

---

### `replay-inspection`

**Name:** Replay Inspection Skill

**Trigger:** The agent needs to understand previous decisions or recover context.

**Behavior:**
- Run `synth explain replay` to inspect event history.
- Use `synth explain all` for aggregate diagnostics.
- Summarize decisions, evidence, and state transitions for the operator.

**Inputs:**
- Event log
- Canonical state

**Outputs:**
- Replay summary
- Decision timeline
- State reconstruction

**Stopping Conditions:**
- Required context is recovered.

**Governance Constraints:**
- READ_ONLY.
- Do not edit event logs or state.

---

## Platform Adapters

The canonical skill definitions above are platform-neutral. Example adapters may be provided for common agent frameworks under `examples/agent-skills/`, but they are not required for compliance.

---

## Compliance

A compliant agent:

- Activates the right skill based on trigger conditions.
- Respects governance constraints for each skill.
- Produces the declared outputs before finishing.
- Escalates when stopping conditions cannot be met.
