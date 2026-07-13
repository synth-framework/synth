#!/usr/bin/env node
// ============================================================
// SYNTH: Determinism Verification (Layer 5)
// ============================================================
// Verifies that identical commands produce identical fingerprints
// and identical canonical state.
//
// Two checks:
//   1. Existing event log: no fingerprint collisions between different
//      capabilities.
//   2. Paired execution: execute the same command twice from the same
//      initial state and compare resulting fingerprints + state hashes.
// Exit 0 = deterministic, Exit 1 = nondeterminism detected
// ============================================================

import { promises as fs } from "fs"
import crypto from "crypto"
import path from "path"

const EVENT_LOG = path.join(process.cwd(), "data", "event-log.jsonl")

function sortKeys(obj) {
  if (obj === null || typeof obj !== "object") return obj
  if (Array.isArray(obj)) return obj.map(sortKeys)
  const sorted = {}; for (const key of Object.keys(obj).sort()) sorted[key] = sortKeys(obj[key])
  return sorted
}

function createFingerprint(command, capability, partition, events, result) {
  const normalized = {
    command: { actor: command.actor, capability: command.capability, payload: sortKeys(command.payload) },
    capability, partition,
    events: events.map((e) => ({ type: e.type, payload: sortKeys(e.payload) })),
    result: result ? sortKeys(result) : null,
  }
  return crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex")
}

async function checkExistingLog() {
  let events = []
  try {
    const raw = await fs.readFile(EVENT_LOG, "utf-8")
    events = raw.split("\n").filter(Boolean).map(JSON.parse)
  } catch { /* empty */ }

  if (events.length === 0) {
    console.log("  ℹ No existing events to fingerprint")
    return { passed: true, commandEvents: 0 }
  }

  const fingerprints = []
  for (const event of events) {
    if (!event.capability || event.capability === "Genesis") continue
    const fp = createFingerprint(
      { actor: event.actor, capability: event.capability, payload: event.payload || {} },
      event.capability,
      event.partitionKey || "default",
      [{ type: event.type, payload: event.payload }],
      event.payload?._result || null,
    )
    fingerprints.push({ id: event.id?.slice(0, 8) || "?", fp, cap: event.capability })
  }

  const seen = new Map()
  const collisions = []
  for (const f of fingerprints) {
    if (seen.has(f.fp) && seen.get(f.fp) !== f.cap) collisions.push(f)
    seen.set(f.fp, f.cap)
  }

  console.log(`  Existing events: ${events.length} | Command events: ${fingerprints.length}`)
  console.log(`  Unique fingerprints: ${new Set(fingerprints.map((f) => f.fp)).size}`)

  if (collisions.length > 0) {
    console.log(`\n  ❌ Fingerprint collision(s): ${collisions.length}`)
    for (const c of collisions) console.log(`    ${c.fp.slice(0, 16)}... ${c.cap}`)
    return { passed: false, commandEvents: fingerprints.length }
  }

  fingerprints.slice(0, 4).forEach((f) => console.log(`    ${f.id} ${f.cap} → ${f.fp.slice(0, 16)}...`))
  return { passed: true, commandEvents: fingerprints.length }
}

async function checkPairedExecution() {
  const { bootstrap } = await import("../dist/core/bootstrap.js")

  const command = {
    actor: "test",
    capability: "CreateWorkItem",
    payload: { id: "W-DET-2", name: "Second work item" },
  }

  const baseConfig = (suffix) => ({
    infra: {
      persistence: "memory",
      eventLogPath: path.join(process.cwd(), "data-test", `determinism-${suffix}.jsonl`),
      statePath: path.join(process.cwd(), "data-test", `determinism-${suffix}.json`),
    },
    genesis: {
      projectName: "DeterminismTest",
      systemId: "det-test",
      initialWorkItems: [{ id: "W-DET", name: "Determinism baseline" }],
    },
    skipGenesis: false,
  })

  const run1 = await bootstrap(baseConfig("run1"))
  const r1 = await run1.api.handleIntent(command)
  const events1 = await run1.infra.eventStore.loadAll()
  const state1 = await run1.infra.stateStore.load()
  const fingerprint1 = createFingerprint(
    command,
    command.capability,
    "default",
    events1.slice(-1).map((e) => ({ type: e.type, payload: e.payload })),
    r1.result,
  )

  const run2 = await bootstrap(baseConfig("run2"))
  const r2 = await run2.api.handleIntent(command)
  const events2 = await run2.infra.eventStore.loadAll()
  const state2 = await run2.infra.stateStore.load()
  const fingerprint2 = createFingerprint(
    command,
    command.capability,
    "default",
    events2.slice(-1).map((e) => ({ type: e.type, payload: e.payload })),
    r2.result,
  )

  console.log("\n  Paired execution check:")
  console.log(`    Run 1: events=${events1.length} stateHash=${state1?.stateHash || "none"} fp=${fingerprint1.slice(0, 16)}...`)
  console.log(`    Run 2: events=${events2.length} stateHash=${state2?.stateHash || "none"} fp=${fingerprint2.slice(0, 16)}...`)

  const fingerprintsMatch = fingerprint1 === fingerprint2
  const stateHashesMatch = state1?.stateHash === state2?.stateHash
  const eventCountsMatch = events1.length === events2.length

  if (!fingerprintsMatch || !stateHashesMatch || !eventCountsMatch) {
    console.log("\n  ❌ Paired execution produced different results")
    return { passed: false }
  }

  console.log("  ✅ Paired execution produced identical fingerprints and state")
  return { passed: true }
}

async function main() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  SYNTH: Determinism Check (Layer 5)")
  console.log("═══════════════════════════════════════════════════\n")

  const logCheck = await checkExistingLog()
  const pairedCheck = await checkPairedExecution()

  if (!logCheck.passed || !pairedCheck.passed) {
    console.log("\n═══════════════════════════════════════════════════")
    console.log("  ❌ NON-DETERMINISTIC")
    console.log("═══════════════════════════════════════════════════\n")
    process.exit(1)
  }

  console.log("\n═══════════════════════════════════════════════════")
  console.log("  ✅ Deterministic — existing log and paired execution agree")
  console.log("═══════════════════════════════════════════════════\n")
}

main().catch((err) => { console.error("\n  ❌ FATAL:", err.message); process.exit(1) })
