// ============================================================
// TEST HELPERS — Execution Fixtures
// ============================================================
// Shared fixtures for execution/intent tests.
//
// Replaces duplicated makeWorkItem / makeExpedition / makeObjective helpers
// across execution-*.test.js files.
//
// Usage:
//   import { makeWorkItem, makeExpedition, makeObjective } from "./helpers/execution-fixtures.js"
// ============================================================

/** Build a work item fixture for execution tests. */
export function makeWorkItem(id, metadata = {}) {
  return {
    id,
    expeditionId: "EXP-1",
    objectiveId: "OBJ-1",
    title: "work item",
    status: "generated",
    metadata,
    createdAt: Date.now(),
  }
}

/** Build an expedition fixture for execution tests. */
export function makeExpedition(id, overrides = {}) {
  return {
    id,
    missionId: "M-1",
    name: "execution expedition",
    goal: "execute",
    status: "approved",
    objectives: ["OBJ-1"],
    discoveries: [],
    decisions: [],
    metadata: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

/** Build an objective fixture for execution tests. */
export function makeObjective(id, expeditionId = "EXP-1", overrides = {}) {
  return {
    id,
    expeditionId,
    title: "objective",
    purpose: "purpose",
    status: "draft",
    metadata: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}
