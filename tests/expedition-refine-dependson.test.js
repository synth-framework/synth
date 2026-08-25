// Regression guard for 01604a3 deliverable (3): dependsOn must be settable
// via expedition refine and survive a no-op refine (when not provided).
import { refineExpedition } from "../dist/domain/planning.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

function makeExpedition(overrides = {}) {
  return {
    id: "e1",
    missionId: "m1",
    status: "committed",
    metadata: {},
    dependsOn: ["existing-dep"],
    objectives: [],
    ...overrides,
  }
}

const ctx = { timestamp: 100 }

async function testSetDependsOn() {
  const updated = refineExpedition(makeExpedition(), ctx, "note", "rid", ["a", "b"])
  assert(Array.isArray(updated.dependsOn), "dependsOn should be an array")
  assert(updated.dependsOn.length === 2, "dependsOn should have 2 entries")
  assert(updated.dependsOn[0] === "a" && updated.dependsOn[1] === "b", "dependsOn values applied")
  assert(updated.metadata.refinementNote === "note", "note recorded in metadata")
  console.log("[PASS] refineExpedition sets dependsOn when provided")
}

async function testPreservesDependsOnWhenOmitted() {
  const updated = refineExpedition(makeExpedition(), ctx, "note", "rid")
  assert(
    Array.isArray(updated.dependsOn) && updated.dependsOn[0] === "existing-dep",
    "dependsOn preserved when refine omits it",
  )
  console.log("[PASS] refineExpedition preserves existing dependsOn when omitted")
}

async function testTerminalRejected() {
  let threw = false
  try {
    refineExpedition(makeExpedition({ status: "completed" }), ctx, "note", "rid", ["x"])
  } catch {
    threw = true
  }
  assert(threw, "refining a terminal expedition must throw")
  console.log("[PASS] refineExpedition rejects terminal expeditions")
}

async function main() {
  await testSetDependsOn()
  await testPreservesDependsOnWhenOmitted()
  await testTerminalRejected()
  console.log("\n[EXPEDTION-REFINE-DEPENDSON] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
