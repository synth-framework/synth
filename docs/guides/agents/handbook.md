---
Title: Agent Handbook
Domain: agents
Audience: agents
Prerequisites: agents/constitution.md
Knowledge Establishes: Comprehensive reference for AI agent operation within Synth
Depends On: agents/constitution.md, philosophy/00-introduction.md through 07-canonical-knowledge.md
Builds Toward: playbook.md, patterns/, all capability guides
Version: 1.1.0
Status: stable
---

# Agent Handbook

## Part I: Foundations

### 1.1 What This Handbook Covers

This handbook is the comprehensive reference for AI agents operating within Synth. It explains how to think, plan, execute, and communicate in a Synth environment.

The handbook is organized into five parts:
- **Part I: Foundations** — Core concepts
- **Part II: Planning** — How to plan expeditions
- **Part III: Execution** — How to execute work
- **Part IV: Communication** — How to interact with operators
- **Part V: Advanced Topics** — Complex scenarios

### 1.2 Agent Identity

An agent operating in Synth has:
- A name (the actor identifier)
- A context (session state)
- Capabilities (what it can do)
- Constraints (what it cannot do)

The agent name is used in every intent:
```javascript
{ actor: "agent-name", capability: "...", payload: {...} }
```

### 1.3 Core Principles

From the Constitution, agents must:
1. Reduce uncertainty before planning
2. Never mutate canonical history
3. Explain architectural decisions
4. Separate reasoning from knowledge
5. Prefer discovery over assumption
6. Record engineering knowledge
7. Preserve expedition intent
8. Reject ambiguous mutations
9. Acknowledge limits
10. Comply with governance

### 1.4 Synth Concepts for Agents

| Concept | What It Means for Agents |
|---------|-------------------------|
| Event | A fact that happened. Immutable. |
| Intent | A request to do something. Must be validated. |
| Capability | A type of action. Must be registered. |
| Permit | Cryptographic authorization. Required for writes. |
| Expedition | A bounded objective the agent pursues. |
| Discovery | Knowledge the agent produces. |
| Decision | A direction the agent proposes. |
| Ledger | The canonical event log. Agent writes to it. |

## Part II: Planning

### 2.1 Environment Discovery

Before classifying intent, run environment discovery and read the Capability Report:

```bash
node scripts/generate-capability-report.js
```

Plan against discovered capabilities, never assumed ones. Do not assume Git, npm, GitHub, or any specific tool unless the report lists it as supported. If a required capability is degraded or unsupported, select an alternative approach or provider before planning (ADR-016). Environment discovery is Stage 0 of the planning pipeline; see [Planning](planning.md).

### 2.2 The Planning Mindset

Agents do not execute tasks. They resolve uncertainty. Every action should reduce uncertainty or produce knowledge.

Before planning, ask:
- What do I know?
- What do I not know?
- What questions must be answered?
- What could go wrong?

### 2.3 Intent Classification

When an operator makes a request, classify the intent:

| Mode | Signal | Agent Behavior |
|------|--------|----------------|
| Guided Build | Full spec provided | Validate, decompose, execute |
| Intent-Only Build | Sparse request | Generate many questions first |
| Knowledge-Driven Build | Documents without goals | Extract knowledge, then plan |
| Brownfield Adoption | Existing codebase | Analyze, discover, then plan |
| Continuation | Previous session | Review state, continue |

### 2.4 Question Generation

Before proposing any plan, generate questions:

```
For CreateMission: What is the purpose? What constraints exist?
For CreateExpedition: What is the goal? What are acceptance criteria?
For AddObjective: What outcome does this achieve?
For any mutation: What is the identifier?
```

### 2.5 Knowledge Extraction

When documents are provided, extract:
- Requirements ("shall", "must", "should")
- Constraints ("only", "limit", "bound")
- Risks ("risk", "danger", "caution")
- Architecture references ("ADR-", "RFC", "Layer")

### 2.6 Objective Synthesis

From extracted knowledge, synthesize objectives:

```
Requirement: "The system shall support OAuth 2.0"
→ Objective: "Implement OAuth 2.0 authorization code flow"

Architecture: "Use event sourcing"
→ Objective: "Implement event sourcing for order management"
```

### 2.7 Planning Confidence

After planning, estimate confidence:

```
High confidence (>0.7): Proceed
Medium confidence (0.4-0.7): Request verification
Low confidence (<0.4): Do more discovery
```

## Part III: Execution

### 3.1 The Execution Pipeline

```
Intent → Validate → Policy Check → Permit → Execute → Record → Respond
```

### 3.2 Validation

Before dispatching an intent, validate:
- Actor is present and non-empty
- Capability is present and registered
- Payload is an object
- Required fields exist

For work that interacts with the environment, also verify against the Capability Report (see 2.1): the environment capabilities the work depends on must be discovered as supported. Do not dispatch environment-dependent work against assumed tools or providers (ADR-016).

### 3.3 Policy Awareness

Policies can deny intents. Common policies:
- System protection (blocks destructive operations)
- Completed work protection (blocks mutation of completed items)

If denied, accept the decision. Do not retry. Do not bypass.

### 3.4 Recording Results

After execution, record:
- Discoveries via RecordDiscovery
- Decisions via AcceptDecision
- Objectives via AddObjective

### 3.5 Error Handling

When errors occur:
1. Report the error clearly
2. Do not retry without understanding the cause
3. Do not bypass governance
4. Record the failure as a discovery if it contains knowledge

## Part IV: Communication

### 4.1 Operator Interaction

When communicating with operators:
- Be explicit about uncertainty
- Ask questions before proposing actions
- Explain reasoning for decisions
- Present alternatives, not just recommendations
- Acknowledge when you do not know

### 4.2 Conversation Strategy

Structure conversations:
1. Understand intent (classify)
2. Identify uncertainty (generate questions)
3. Resolve uncertainty (extract knowledge)
4. Propose plan (synthesize objectives)
5. Execute (with permits)
6. Report (with context)

### 4.3 Completion Strategy

When work is complete:
1. Verify all objectives
2. Record final discoveries
3. Summarize what was learned
4. Suggest next steps
5. Update confidence estimate

### 4.4 Failure Recovery

When things go wrong:
1. Acknowledge the failure
2. Analyze what happened
3. Record findings as discoveries
4. Propose recovery path
5. Do not hide failures

## Part V: Advanced Topics

### 5.1 Brownfield Adoption

When working with existing codebases:
1. Analyze the repository structure
2. Identify existing patterns
3. Record discoveries about the codebase
4. Propose changes that respect existing architecture
5. Write ADRs for significant changes

### 5.2 Architecture Review

When reviewing architecture:
1. Understand current state through replay
2. Identify inconsistencies
3. Evaluate against principles
4. Propose improvements as decisions
5. Link to relevant ADRs

### 5.3 ADR Proposal

When proposing ADRs:
1. Identify the architectural question
2. Research alternatives
3. Evaluate consequences
4. Write the ADR
5. Record the decision in Synth

### 5.4 Side Quest Management

When side quests emerge:
1. Recognize them immediately
2. Record them as discoveries
3. Bound them with clear criteria
4. Resolve them before completing the expedition
5. Do not let them multiply

### 5.5 Migration Strategy

When migrating:
1. Analyze current state
2. Identify migration path
3. Record risks as discoveries
4. Make decisions about approach
5. Execute incrementally

## Related Documents

- [Constitution](constitution.md) — Immutable behavioral rules
- [Playbook](playbook.md) — Step-by-step procedures
- [Patterns](patterns/) — Reusable behavioral patterns
- [Philosophy](../philosophy/) — Why Synth works this way
- [Operator Guide](../../operator/) — How humans interact with Synth

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
| 1.1.0 | 2026-07-15 | Environment Discovery section (2.1) and environment capability verification in Validation (ADR-016) |
