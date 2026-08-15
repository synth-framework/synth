// ============================================================
// MISSION LIFECYCLE CLEANUP TESTS
// ============================================================
// Verifies the mission-lifecycle flexibility capabilities:
//   1. DeleteMission — remove an empty mission (no expeditions).
//   2. DeleteExpedition — remove an empty expedition (no objectives).
//   3. MoveExpedition — re-parent an expedition to a different
//      mission under a scope-and-intent verification check; when
//      misaligned, requires explicit operator approval.
//
// All writes go to true memory mode; the repo data/ dir is untouched.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { bootstrap } from "../dist/core/bootstrap.js"
import { rebuildState } from "../dist/runtime/replay.js"
import { assessExpeditionMissionAlignment } from "../dist/governance/scope-alignment.js"

async function createCtx() {
  const ctx = await bootstrap({
    skipGenesis: true,
    infra: { persistence: "memory" },
  })
  return ctx
}

async function createMission(ctx, id, name, purpose) {
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateMission",
    payload: { id, name, purpose },
  })
  assert.strictEqual(result.status, "ok", `CreateMission ${id} failed: ${result.error}`)
}

async function createExpedition(ctx, id, missionId, name, goal) {
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateExpedition",
    payload: { id, missionId, name, goal },
  })
  assert.strictEqual(result.status, "ok", `CreateExpedition ${id} failed: ${result.error}`)
}

async function getState(ctx) {
  return ctx.runtime.getState()
}

// ============================================================
// DeleteMission
// ============================================================

test("DeleteMission removes an empty mission and emits MISSION_DELETED", async () => {
  const ctx = await createCtx()
  await createMission(ctx, "m-empty", "Cleanup target", "A mission created to be removed")

  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "DeleteMission",
    payload: { id: "m-empty", reason: "Created by mistake" },
  })
  assert.strictEqual(result.status, "ok", `DeleteMission failed: ${result.error}`)

  const state = await getState(ctx)
  assert.ok(!state.missions["m-empty"], "empty mission should be removed from state")

  const events = await ctx.runtime.loadEvents()
  const deleted = events.find((e) => e.type === "MISSION_DELETED")
  assert.ok(deleted, "MISSION_DELETED event must be emitted")
  assert.strictEqual(deleted.payload.id, "m-empty", "MISSION_DELETED must reference the deleted mission id")

  const replayed = rebuildState(events)
  assert.ok(!replayed.missions["m-empty"], "replay must not contain the deleted mission")
})

test("DeleteMission rejects a mission that still has expeditions", async () => {
  const ctx = await createCtx()
  await createMission(ctx, "m-host", "Host mission", "Hosts an expedition")
  await createExpedition(ctx, "e-1", "m-host", "Expedition one", "Do the work")

  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "DeleteMission",
    payload: { id: "m-host" },
  })
  assert.strictEqual(result.status, "error", "DeleteMission must fail for a non-empty mission")
  assert.ok(
    /empty|expedition/i.test(result.error || ""),
    `error should explain the mission is not empty, got: ${result.error}`,
  )

  const state = await getState(ctx)
  assert.ok(state.missions["m-host"], "non-empty mission must remain in state")
})

// ============================================================
// DeleteExpedition
// ============================================================

test("DeleteExpedition removes an empty expedition and detaches it from the mission", async () => {
  const ctx = await createCtx()
  await createMission(ctx, "m-host2", "Host mission", "Hosts expeditions")
  await createExpedition(ctx, "e-del", "m-host2", "Doomed expedition", "Never started")

  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "DeleteExpedition",
    payload: { id: "e-del", reason: "Wrong scope" },
  })
  assert.strictEqual(result.status, "ok", `DeleteExpedition failed: ${result.error}`)

  const state = await getState(ctx)
  assert.ok(!state.expeditions["e-del"], "expedition should be removed from state")
  assert.ok(
    !state.missions["m-host2"].expeditions.includes("e-del"),
    "deleted expedition must be removed from the parent mission's expeditions list",
  )

  const events = await ctx.runtime.loadEvents()
  const deleted = events.find((e) => e.type === "EXPEDITION_DELETED")
  assert.ok(deleted, "EXPEDITION_DELETED event must be emitted")
  assert.strictEqual(deleted.payload.id, "e-del", "EXPEDITION_DELETED must reference the deleted expedition id")
})

test("DeleteExpedition rejects an expedition that has objectives", async () => {
  const ctx = await createCtx()
  await createMission(ctx, "m-host3", "Host mission", "Hosts expeditions")
  await createExpedition(ctx, "e-with-obj", "m-host3", "Busy expedition", "Has objectives")

  const objResult = await ctx.api.handleIntent({
    actor: "test",
    capability: "AddObjective",
    payload: { id: "obj-1", expeditionId: "e-with-obj", title: "First objective" },
  })
  assert.strictEqual(objResult.status, "ok", `AddObjective failed: ${objResult.error}`)

  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "DeleteExpedition",
    payload: { id: "e-with-obj" },
  })
  assert.strictEqual(result.status, "error", "DeleteExpedition must fail for an expedition with objectives")
  assert.ok(
    /objective|empty/i.test(result.error || ""),
    `error should explain the expedition is not empty, got: ${result.error}`,
  )

  const state = await getState(ctx)
  assert.ok(state.expeditions["e-with-obj"], "expedition with objectives must remain in state")
})

// ============================================================
// MoveExpedition
// ============================================================

test("MoveExpedition re-parents an aligned expedition without approval", async () => {
  const ctx = await createCtx()
  await createMission(ctx, "m-a", "Postgres tuning", "Optimize Postgres query performance for the repository adapter")
  await createMission(ctx, "m-b", "Adapter catalog", "Repository adapter query performance optimization")
  await createExpedition(ctx, "e-move", "m-a", "Query optimization", "Optimize Postgres query performance in the repository adapter")

  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "MoveExpedition",
    payload: { id: "e-move", toMissionId: "m-b" },
  })
  assert.strictEqual(result.status, "ok", `MoveExpedition failed: ${result.error}`)

  const state = await getState(ctx)
  assert.strictEqual(state.expeditions["e-move"].missionId, "m-b", "expedition must be re-parented to the target mission")
  assert.ok(
    !state.missions["m-a"].expeditions.includes("e-move"),
    "expedition must be removed from the source mission's expeditions list",
  )
  assert.ok(
    state.missions["m-b"].expeditions.includes("e-move"),
    "expedition must be added to the target mission's expeditions list",
  )

  const events = await ctx.runtime.loadEvents()
  const moved = events.find((e) => e.type === "EXPEDITION_MOVED")
  assert.ok(moved, "EXPEDITION_MOVED event must be emitted")
  assert.strictEqual(moved.payload.fromMissionId, "m-a", "EXPEDITION_MOVED must record the source mission")
  assert.strictEqual(moved.payload.toMissionId, "m-b", "EXPEDITION_MOVED must record the target mission")
  assert.strictEqual(moved.payload.verification, "scope_aligned", "aligned move must record scope_aligned verification")

  const replayed = rebuildState(events)
  assert.strictEqual(replayed.expeditions["e-move"].missionId, "m-b", "replay must reflect the re-parenting")
  assert.ok(replayed.missions["m-a"].expeditions.includes("e-move") === false, "replay must detach from source mission")
  assert.ok(replayed.missions["m-b"].expeditions.includes("e-move"), "replay must attach to target mission")
})

test("MoveExpedition requires operator approval when scope is misaligned", async () => {
  const ctx = await createCtx()
  await createMission(ctx, "m-x", "Data pipelines", "Build batch data pipeline infrastructure for analytics")
  await createMission(ctx, "m-y", "Homepage marketing", "Marketing homepage design and campaign landing pages")
  await createExpedition(ctx, "e-wrong", "m-x", "Pipeline work", "Build batch data pipeline infrastructure")

  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "MoveExpedition",
    payload: { id: "e-wrong", toMissionId: "m-y" },
  })
  assert.strictEqual(result.status, "error", "misaligned MoveExpedition without approval must fail")
  assert.ok(
    /approve|align/i.test(result.error || ""),
    `error should require operator approval, got: ${result.error}`,
  )

  const state = await getState(ctx)
  assert.strictEqual(state.expeditions["e-wrong"].missionId, "m-x", "expedition must remain with its source mission")
})

test("MoveExpedition honors explicit operator approval for a misaligned move", async () => {
  const ctx = await createCtx()
  await createMission(ctx, "m-p", "Data pipelines", "Build batch data pipeline infrastructure for analytics")
  await createMission(ctx, "m-q", "Homepage marketing", "Marketing homepage design and campaign landing pages")
  await createExpedition(ctx, "e-override", "m-p", "Pipeline work", "Build batch data pipeline infrastructure")

  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "MoveExpedition",
    payload: { id: "e-override", toMissionId: "m-q", approved: true, reason: "Operator override" },
  })
  assert.strictEqual(result.status, "ok", `MoveExpedition with approval failed: ${result.error}`)

  const state = await getState(ctx)
  assert.strictEqual(state.expeditions["e-override"].missionId, "m-q", "approved move must re-parent the expedition")

  const events = await ctx.runtime.loadEvents()
  const moved = events.find((e) => e.type === "EXPEDITION_MOVED")
  assert.strictEqual(moved.payload.verification, "operator_approved", "approved move must record operator_approved verification")
})

test("MoveExpedition rejects a move to a mission that does not exist", async () => {
  const ctx = await createCtx()
  await createMission(ctx, "m-src", "Source mission", "Source of the expedition")
  await createExpedition(ctx, "e-ghost", "m-src", "Ghost target", "Moved to nowhere")

  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "MoveExpedition",
    payload: { id: "e-ghost", toMissionId: "m-missing" },
  })
  assert.strictEqual(result.status, "error", "MoveExpedition must fail for a missing target mission")
  assert.ok(
    /mission|exist/i.test(result.error || ""),
    `error should explain the target mission does not exist, got: ${result.error}`,
  )

  const state = await getState(ctx)
  assert.strictEqual(state.expeditions["e-ghost"].missionId, "m-src", "expedition must remain with its source mission")
})

// ============================================================
// Scope-and-intent verification
// ============================================================

test("assessExpeditionMissionAlignment scores aligned intent as aligned", () => {
  const result = assessExpeditionMissionAlignment(
    {
      id: "e",
      name: "Query optimization",
      goal: "Optimize Postgres query performance in the repository adapter",
    },
    {
      id: "m",
      name: "Adapter catalog",
      purpose: "Repository adapter query performance optimization",
    },
  )
  assert.strictEqual(result.aligned, true, `expected aligned, got score ${result.score}`)
  assert.ok(result.score > 0, "aligned pair should have a positive score")
  assert.ok(Array.isArray(result.overlap), "overlap should be a token list")
})

test("assessExpeditionMissionAlignment reports disjoint intent as misaligned", () => {
  const result = assessExpeditionMissionAlignment(
    {
      id: "e",
      name: "Pipeline work",
      goal: "Build batch data pipeline infrastructure for analytics",
    },
    {
      id: "m",
      name: "Homepage marketing",
      purpose: "Marketing homepage design and campaign landing pages",
    },
  )
  assert.strictEqual(result.aligned, false, `expected misaligned, got score ${result.score}`)
})
