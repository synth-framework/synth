# Engineering Cognition Principles

> The constitutional foundation for the Planning Cognition Engine.
> These principles are to planning what the Architectural Constitution is to execution.
> They describe immutable truths. Not components. Not implementations.

---

## Preamble

Planning is not the arrangement of tasks. Planning is the reduction of uncertainty.

A planner that decomposes work before understanding intent is not planning. It is guessing.

These principles define the philosophical foundation for deterministic engineering cognition. Every component of the Planning Cognition Engine derives from them. No implementation detail may contradict them.

---

## Principle 1: Planning Is the Reduction of Uncertainty

Every planning session begins with unknowns.

The purpose of planning is not to produce a task list. The purpose of planning is to transform uncertainty into understanding, and understanding into resolved engineering knowledge.

The most important artifact of early planning is not the objective. It is the question.

A planner that immediately decomposes intent into tasks has skipped the most important phase of engineering. The senior engineer asks first. Decomposes second.

> *Intent does not imply understanding. Understanding precedes decomposition.*

---

## Principle 2: Knowledge Is Canonical; Reasoning Is Ephemeral

The system shall distinguish between what was learned and how it was learned.

Knowledge — missions, expeditions, objectives, discoveries, decisions — shall persist as canonical engineering history. It shall be event-sourced, replayable, and immutable.

Reasoning — questions asked, hypotheses considered, alternatives evaluated, confidence calculated — shall be transient. It may be logged for diagnostic purposes. It shall never enter the canonical ledger.

> *The engineer remembers the decision. The engineer rarely remembers every intermediate thought.*

---

## Principle 3: Objectives Emerge From Understanding, Not Decomposition

An objective is not a task. An objective is a stable expression of desired outcome that survived the process of understanding.

Objectives are not created. Objectives are synthesized from resolved uncertainty.

An objective that exists before its supporting understanding is a premature commitment. The system shall resist premature commitment.

> *Decomposition without understanding produces work. Understanding without decomposition produces the right work.*

---

## Principle 4: Discoveries Are Expected and Encouraged

Software development is not the execution of a known plan. It is the discovery of what the plan should have been.

Discoveries are not scope creep. Discoveries are the system learning about the problem space.

The planning architecture shall make discoveries first-class citizens. They shall be recorded, evaluated, and linked to the objectives they affect.

A planning system that penalizes discovery is a planning system that penalizes learning.

> *If the plan does not change during execution, the plan was wrong to begin with.*

---

## Principle 5: Side Quests Are Valid Engineering Behavior

A side quest is a temporary engineering objective that emerges during execution in support of existing objectives without changing the parent expedition's intent.

Side quests are not distractions. They are the natural consequence of implementation revealing hidden dependencies.

The system shall recognize, track, and link side quests to the objectives that motivated them. They shall not be treated as anomalies or governance violations.

> *The shortest path to the destination sometimes requires a detour.*

---

## Principle 6: The Planner Proposes; the Ledger Records

The Planning Cognition Engine proposes engineering knowledge. The Expedition Ledger records only what survives the proposal process.

This is not a suggestion. It is a structural separation.

The PCE shall never write directly to the ledger. It shall produce Planning Permits that the Planning Coordinator validates before the ledger accepts them.

The ledger does not know what the PCE is. It does not know about AI. It does not know about planners. It only knows that it received a valid Planning Permit.

> *The ledger records resolved understanding. It does not record the process of resolution.*

---

## Principle 7: Every Planning Mutation Requires a Planning Permit

Every write to the Expedition Ledger shall be authorized by a Planning Permit.

The Planning Permit is to the Expedition Ledger what the Execution Permit is to the Runtime. It is a cryptographically signed authorization token that binds a planning intent to a specific ledger mutation.

The parallel is deliberate and structural:

```
Execution:  ExecutionGate → ExecutionPermit → ExecutionCoordinator → Runtime
Planning:   PlanningEngine → PlanningPermit → PlanningCoordinator → Ledger
```

Both permits are verified before their respective targets execute. Neither target trusts the source. Both targets trust the permit.

> *Trust the Permit. Never trust the Planner.*

---

## Principle 8: No Engineering Knowledge Becomes Canonical Until Uncertainty Has Been Resolved

This is the foundational invariant of the Planning Cognition Engine.

The ledger never records guesses. It records resolved understanding.

A Mission exists because questions were asked and answered. An Objective exists because uncertainty was reduced to understanding. A Discovery exists because the system learned something it did not previously know.

Nothing enters the ledger at the moment of first thought. Everything enters the ledger at the moment of resolved understanding.

This is not a delay. This is a discipline.

> *The ledger is a history of what the system knows. Not what the system wonders.*

---

## Principle 9: Canonical Planning History Must Be Replayable Without Reconstructing AI Reasoning

The Expedition Ledger shall be deterministic. Replaying its events shall reconstruct identical planning state.

AI reasoning that produced the events is not replayed. It is not expected to be. The reasoning was transient. The knowledge it produced is permanent.

This means the ledger's determinism does not depend on the AI model, its version, or its prompt. The ledger depends only on the events it contains.

> *Replace the AI. Keep the history. The history remains true.*

---

## Principle 10: Planning Events Describe Engineering Evolution, Not Object Mutations

Events in the Expedition Ledger describe what happened in the engineering process, not what happened to a database row.

```
OBJECTIVE_SYNTHESIZED  →  PLAN_EXPANDED
DISCOVERY_RECORDED     →  KNOWLEDGE_ACQUIRED
DECISION_ACCEPTED      →  DIRECTION_SET
EXPEDITION_CREATED     →  EXPEDITION_CHARTED
MISSION_APPROVED       →  MISSION_COMMISSIONED
```

The event name answers the question "What happened in engineering?" not "What changed in the object?"

> *Events are the story of engineering. Not the changelog of a database.*

---

## Principle 11: Planning Remains Implementation Independent

No planning object may assume a programming language, framework, repository layout, editor, AI provider, or execution environment.

The Planning Cognition Engine governs engineering intent. Not implementation details.

A mission to "build a documentation website" is the same mission whether the implementation uses React, Vue, or vanilla JavaScript. The expedition to "enable search" is the same expedition whether it uses Elasticsearch, Algolia, or a custom index.

Implementation specificity belongs in the Work Items. Work Items are operational and transient. They do not enter the ledger.

> *The plan describes what. The work item describes how. The plan persists. The work item disappears.*

---

## Amendment

Amendments to these Principles require:
1. Architectural review
2. Demonstration that the proposed change does not violate Principles 1-11
3. Update to all derived documents

No single principle may be overridden. They form a coherent system. Changing one changes the meaning of all.

---

## Supremacy

These Principles are subordinate to the Architectural Constitution of Synth. They extend the Constitution into the planning domain. They do not contradict it.

In the event of apparent conflict, the Constitutional provision prevails, and the Principle must be reinterpreted to conform.

---

*Adopted as the philosophical foundation of the Planning Cognition Engine.*
