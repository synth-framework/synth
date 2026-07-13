> **Note:** This document lists both planning events (MISSION_*, EXPEDITION_*, etc.) and execution artifact events (TICKET_*). Execution artifact events are projections of planning intent. See [Artifact Independence](../guides/philosophy/01-engineering-philosophy.md).

---
Title: Planning Events
Domain: reference
Audience: everyone
Prerequisites: none
Knowledge Establishes: All event types related to the Planning Cognition Engine
Depends On: none
Builds Toward: none (terminal reference)
Version: 1.0.0
Status: stable
---

# Planning Events

## PCE Events

Events produced by the Planning Cognition Engine:

| Event | Description | Payload |
|-------|-------------|---------|
| MISSION_CREATED | New mission charted | `{ mission: Mission }` |
| MISSION_APPROVED | Mission commissioned | `{ id: string, status: "active" }` |
| MISSION_COMPLETED | Mission finished | `{ id: string, status: "completed" }` |
| MISSION_ARCHIVED | Mission archived | `{ id: string, status: "archived" }` |
| EXPEDITION_CREATED | New expedition charted | `{ expedition: Expedition }` |
| EXPEDITION_APPROVED | Expedition approved | `{ id: string, status: "approved" }` |
| EXPEDITION_STARTED | Expedition executing | `{ id: string, status: "executing" }` |
| EXPEDITION_COMPLETED | Expedition finished | `{ id: string, status: "completed" }` |
| OBJECTIVE_ADDED | Objective created | `{ objective: Objective }` |
| OBJECTIVE_COMPLETED | Objective finished | `{ id: string, status: "completed" }` |
| DISCOVERY_RECORDED | Knowledge discovered | `{ discovery: Discovery }` |
| DECISION_ACCEPTED | Decision made | `{ id: string, status: "accepted" }` |
| DECISION_REJECTED | Decision rejected | `{ id: string, status: "rejected" }` |
| WORK_ITEM_GENERATED | Work item created | `{ workItem: WorkItem }` |
| WORK_ITEM_COMPLETED | Work item done | `{ id: string, status: "completed" }` |

## Standard Events

Core system events:

| Event | Description | Payload |
|-------|-------------|---------|
| SYSTEM_GENESIS | System initialized | `{ systemId, projectName, partitions }` |
| TICKET_CREATED | Ticket created | `{ ticket: Ticket }` |
| TICKET_STARTED | Ticket started | `{ id, status: "active" }` |
| TICKET_COMPLETED | Ticket completed | `{ id, status: "complete" }` |
| TICKET_BLOCKED | Ticket blocked | `{ id, status: "blocked", reason }` |
| PLAN_CREATED | Plan created | `{ plan: Plan }` |
| PLAN_ACTIVATED | Plan activated | `{ id, status: "active" }` |
| PLAN_COMPLETED | Plan completed | `{ id, status: "completed" }` |
| MILESTONE_CREATED | Milestone created | `{ milestone: Milestone }` |
| MILESTONE_STARTED | Milestone started | `{ id, status: "in_progress" }` |
| MILESTONE_COMPLETED | Milestone completed | `{ id, status: "completed" }` |
| PROJECT_CREATED | Project created | `{ project: Project }` |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
