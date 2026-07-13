---
Title: Agent Playbook
Domain: agents
Audience: agents
Prerequisites: agents/constitution.md, agents/handbook.md
Knowledge Establishes: Step-by-step procedures for common agent operations
Depends On: agents/constitution.md, agents/handbook.md
Builds Toward: patterns/, capability guides
Version: 1.0.0
Status: stable
---

# Agent Playbook

## Play 1: Starting a New Session

**When:** An agent begins interacting with an operator.

**Steps:**
1. Classify the operator's intent (Guided, Intent-Only, Knowledge-Driven, Brownfield, Continuation)
2. If sparse intent: generate clarifying questions
3. Review any previous session context
4. Identify the current Synth state
5. Begin planning

**Checklist:**
- [ ] Intent classified
- [ ] Questions generated (if needed)
- [ ] Previous context reviewed
- [ ] Current state understood

## Play 2: Planning an Expedition

**When:** An agent needs to plan work.

**Steps:**
1. Generate questions to resolve uncertainty
2. Extract knowledge from available documents
3. Classify intent mode
4. Synthesize objectives from knowledge
5. Create the expedition
6. Add objectives
7. Report the plan to the operator

**Checklist:**
- [ ] Questions generated
- [ ] Knowledge extracted
- [ ] Intent classified
- [ ] Objectives synthesized
- [ ] Expedition created
- [ ] Objectives added
- [ ] Plan reported

## Play 3: Recording a Discovery

**When:** The agent learns something during work.

**Steps:**
1. Identify what was learned
2. Determine impact (low, medium, high, critical)
3. Identify affected objectives
4. Record via RecordDiscovery
5. Report to operator if high/critical impact

**Checklist:**
- [ ] Discovery identified
- [ ] Impact assessed
- [ ] Affected objectives noted
- [ ] Discovery recorded
- [ ] Operator notified (if needed)

## Play 4: Making a Decision

**When:** The agent must choose between alternatives.

**Steps:**
1. Identify the decision to be made
2. Research alternatives
3. Evaluate consequences (positive and negative)
4. Link to supporting discoveries
5. Propose to operator
6. If approved: record via AcceptDecision
7. If rejected: record via RejectDecision

**Checklist:**
- [ ] Decision identified
- [ ] Alternatives researched
- [ ] Consequences evaluated
- [ ] Discoveries linked
- [ ] Operator consulted
- [ ] Decision recorded

## Play 5: Handling a Side Quest

**When:** Unexpected work emerges during an expedition.

**Steps:**
1. Recognize the side quest
2. Record as discovery with "SIDE QUEST:" prefix
3. Define bounds (what "done" means)
4. Evaluate impact on main expedition
5. Execute side quest
6. Record resolution
7. Return to main expedition

**Checklist:**
- [ ] Side quest recognized
- [ ] Discovery recorded
- [ ] Bounds defined
- [ ] Impact evaluated
- [ ] Side quest resolved
- [ ] Main expedition resumed

## Play 6: Completing Work

**When:** An expedition's objectives are achieved.

**Steps:**
1. Verify all objectives are complete
2. Record final discoveries
3. Accept/reject any pending decisions
4. Complete objectives
5. Complete expedition
6. Complete mission (if all expeditions done)
7. Summarize learnings
8. Report to operator

**Checklist:**
- [ ] Objectives verified
- [ ] Final discoveries recorded
- [ ] Decisions resolved
- [ ] Expedition completed
- [ ] Mission completed (if applicable)
- [ ] Summary reported

## Play 7: Recovering from Failure

**When:** Something goes wrong.

**Steps:**
1. Acknowledge the failure
2. Stop current work (do not make things worse)
3. Analyze what happened
4. Record findings as discoveries
5. Propose recovery path
6. Get operator approval
7. Execute recovery
8. Verify recovery

**Checklist:**
- [ ] Failure acknowledged
- [ ] Work stopped
- [ ] Analysis complete
- [ ] Findings recorded
- [ ] Recovery proposed
- [ ] Recovery approved
- [ ] Recovery executed
- [ ] Recovery verified

## Play 8: Brownfield Analysis

**When:** Working with an existing codebase.

**Steps:**
1. Analyze repository structure
2. Identify technology stack
3. Find existing patterns
4. Record discoveries about the codebase
5. Identify integration points
6. Propose approach respecting existing architecture
7. Write ADRs for significant changes

**Checklist:**
- [ ] Structure analyzed
- [ ] Stack identified
- [ ] Patterns found
- [ ] Discoveries recorded
- [ ] Integration points identified
- [ ] Approach proposed
- [ ] ADRs written (if needed)

## Related Documents

- [Constitution](constitution.md) — Rules governing all plays
- [Handbook](handbook.md) — Comprehensive reference
- [Patterns](patterns/) — Reusable patterns for plays

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
