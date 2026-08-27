import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { StateStore } from "../src/infra/state-store.js"
import type { CanonicalState } from "../src/types/index.js"

function tmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "synth-pes-state-"))
}

function makeState(): CanonicalState {
  return {
    version: 1,
    stateHash: "h",
    lifecycle: "initialized",
    workItems: {},
    plans: {},
    milestones: {},
    projects: {},
    missions: {
      "m-1": { id: "m-1", title: "Mission One", status: "active", createdAt: 1, intent: "x" } as any,
    },
    expeditions: {
      "e-active": { id: "e-active", title: "Active", status: "executing" } as any,
      "e-arch": { id: "e-arch", title: "Archived", status: "archived" } as any,
    },
    objectives: {},
    discoveries: {},
    decisions: {},
    referenceEvidence: {},
    lastEventOffset: 5,
  }
}

test("save splits collections into per-entity files", async () => {
  const dir = await tmpDir()
  const store = StateStore.createAuthorized(path.join(dir, ".synth", "data", "canonical-state.json"))
  await store.initialize()
  await store.save(makeState())

  const base = path.join(dir, ".synth", "data")
  assert.equal(await fileExists(path.join(base, "missions", "m-1.json")), true)
  assert.equal(await fileExists(path.join(base, "expeditions", "e-active.json")), true)
  assert.equal(await fileExists(path.join(base, "expeditions", "archived", "e-arch.json")), true)
  // Non-archived expedition must NOT also live in the active dir.
  assert.equal(await fileExists(path.join(base, "expeditions", "e-arch.json")), false)
  // Aggregate still written.
  assert.equal(await fileExists(path.join(dir, ".synth", "data", "canonical-state.json")), true)
})

test("load still reads the generated aggregate", async () => {
  const dir = await tmpDir()
  const store = StateStore.createAuthorized(path.join(dir, ".synth", "data", "canonical-state.json"))
  await store.initialize()
  const state = makeState()
  await store.save(state)

  const loaded = await store.load()
  assert.notEqual(loaded, null)
  assert.equal((loaded as CanonicalState).expeditions["e-active"].status, "executing")
  assert.equal((loaded as CanonicalState).lastEventOffset, 5)
})

test("stale per-entity files are pruned on save", async () => {
  const dir = await tmpDir()
  const store = StateStore.createAuthorized(path.join(dir, ".synth", "data", "canonical-state.json"))
  await store.initialize()
  const state = makeState()
  await store.save(state)
  assert.equal(await fileExists(path.join(dir, ".synth", "data", "missions", "m-1.json")), true)

  // Remove the mission and re-save.
  delete (state.missions as Record<string, unknown>)["m-1"]
  await store.save(state)
  assert.equal(await fileExists(path.join(dir, ".synth", "data", "missions", "m-1.json")), false)
})

test("archived expedition file relocates when status changes", async () => {
  const dir = await tmpDir()
  const store = StateStore.createAuthorized(path.join(dir, ".synth", "data", "canonical-state.json"))
  await store.initialize()
  const state = makeState()
  await store.save(state)
  assert.equal(await fileExists(path.join(dir, ".synth", "data", "expeditions", "archived", "e-arch.json")), true)

  // Flip e-active to archived and e-arch back to active; files should follow.
  ;(state.expeditions["e-active"] as any).status = "archived"
  ;(state.expeditions["e-arch"] as any).status = "executing"
  await store.save(state)
  assert.equal(await fileExists(path.join(dir, ".synth", "data", "expeditions", "archived", "e-active.json")), true)
  assert.equal(await fileExists(path.join(dir, ".synth", "data", "expeditions", "e-arch.json")), true)
  assert.equal(await fileExists(path.join(dir, ".synth", "data", "expeditions", "e-active.json")), false)
})

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}
