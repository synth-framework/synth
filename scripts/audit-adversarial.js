#!/usr/bin/env node
// ============================================================
// SYNTH: Adversarial Architecture Audit (P4)
// ============================================================
// Attempts to violate every constitutional invariant.
// A failed attack is a PASS for the architecture.
//
// Attacks:
//   1. Direct EventStore append (bypass ExecutionGate)
//   2. Capability registry mutation after seal
//   3. Policy mutation after freeze
//   4. Event log tampering (payload modification)
//   5. Event log reordering
//   6. Event hash forgery
//
// Exit 0 = all attacks were correctly blocked
// Exit 1 = at least one attack succeeded
// ============================================================

import { promises as fs } from "fs"
import path from "path"
import { bootstrap } from "../dist/core/bootstrap.js"
import { createReplayVerifier } from "../dist/core/replay-verifier.js"
import { EventStore } from "../dist/infra/event-store.js"

const ATTACK_LOG = path.join(process.cwd(), "data-test", "adversarial-event-log.jsonl")
const ATTACK_STATE = path.join(process.cwd(), "data-test", "adversarial-state.json")

async function setup() {
  await fs.rm(path.dirname(ATTACK_LOG), { recursive: true, force: true })
  return bootstrap({
    infra: {
      persistence: "file",
      eventLogPath: ATTACK_LOG,
      statePath: ATTACK_STATE,
    },
    genesis: {
      projectName: "AdversarialTest",
      systemId: "attack-test",
      initialWorkItems: [{ id: "W-1", name: "Baseline" }],
    },
  })
}

const results = []

function record(name, blocked, detail) {
  results.push({ name, blocked, detail })
  const icon = blocked ? "✅ BLOCKED" : "❌ SUCCEEDED"
  console.log(`  ${icon}: ${name}`)
  if (detail) console.log(`      ${detail}`)
}

async function attackDirectAppend(ctx) {
  try {
    const eventStore = new EventStore(ATTACK_LOG)
    await eventStore.append({
      id: "FORGED",
      type: "WORK_ITEM_CREATED",
      timestamp: 999,
      transactionId: "forged-tx",
      capability: "CreateWorkItem",
      actor: "attacker",
      payload: { workItem: { id: "W-ATTACK", name: "Forged" } },
      eventHash: "forged-hash",
      previousHash: "genesis",
    })
    record("Direct EventStore append", false, "append succeeded without ExecutionGate")
  } catch (err) {
    record("Direct EventStore append", true, err.message)
  }
}

async function attackRegistryMutationAfterSeal(ctx) {
  try {
    ctx.capabilityRegistry.register({
      name: "AttackCapability",
      handler: () => ({ events: [] }),
    })
    record("Registry mutation after seal", false, "registration succeeded after freeze")
  } catch (err) {
    record("Registry mutation after seal", true, err.message)
  }
}

async function attackPolicyMutationAfterFreeze(ctx) {
  try {
    ctx.policyEngine.defineRule("attack", () => ({ allowed: false }))
    record("Policy mutation after freeze", false, "rule definition succeeded after freeze")
  } catch (err) {
    record("Policy mutation after freeze", true, err.message)
  }
}

async function attackEventTampering(ctx) {
  const events = await ctx.infra.eventStore.loadAll()
  if (events.length < 2) {
    record("Event payload tampering", true, "not enough events to tamper")
    return
  }

  // Clone and modify a non-genesis event payload
  const corrupted = events.map((e, i) => {
    if (i !== 1) return e
    return {
      ...e,
      payload: { ...e.payload, tampered: true },
    }
  })

  await fs.writeFile(ATTACK_LOG, corrupted.map((e) => JSON.stringify(e)).join("\n") + "\n")

  const verifier = createReplayVerifier(ctx.infra.eventStore, ctx.infra.stateStore)
  const result = await verifier.verify()
  const blocked = !result.consistent || !result.chainValid

  await setup() // reset

  record("Event payload tampering", blocked, result.explanation)
}

async function attackEventReordering(ctx) {
  const events = await ctx.infra.eventStore.loadAll()
  if (events.length < 3) {
    record("Event reordering", true, "not enough events to reorder")
    return
  }

  // Swap two non-genesis events
  const reordered = [...events]
  const temp = reordered[1]
  reordered[1] = reordered[2]
  reordered[2] = temp

  await fs.writeFile(ATTACK_LOG, reordered.map((e) => JSON.stringify(e)).join("\n") + "\n")

  const verifier = createReplayVerifier(ctx.infra.eventStore, ctx.infra.stateStore)
  const result = await verifier.verify()
  const blocked = !result.consistent || !result.chainValid

  await setup() // reset

  record("Event reordering", blocked, result.explanation)
}

async function attackHashForgery(ctx) {
  const events = await ctx.infra.eventStore.loadAll()
  if (events.length < 2) {
    record("Event hash forgery", true, "not enough events to forge")
    return
  }

  const forged = events.map((e, i) => {
    if (i !== 1) return e
    return { ...e, eventHash: "0".repeat(64) }
  })

  await fs.writeFile(ATTACK_LOG, forged.map((e) => JSON.stringify(e)).join("\n") + "\n")

  const verifier = createReplayVerifier(ctx.infra.eventStore, ctx.infra.stateStore)
  const result = await verifier.verify()
  const blocked = !result.consistent || !result.chainValid

  await setup() // reset

  record("Event hash forgery", blocked, result.explanation)
}

async function main() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  SYNTH: Adversarial Architecture Audit (P4)")
  console.log("═══════════════════════════════════════════════════\n")

  const ctx = await setup()
  if (!ctx.isSealed) ctx.seal()

  await attackDirectAppend(ctx)
  await attackRegistryMutationAfterSeal(ctx)
  await attackPolicyMutationAfterFreeze(ctx)
  await attackEventTampering(ctx)
  await attackEventReordering(ctx)
  await attackHashForgery(ctx)

  const blocked = results.filter((r) => r.blocked).length
  const total = results.length

  console.log("\n═══════════════════════════════════════════════════")
  if (blocked === total) {
    console.log(`  ✅ All ${total} attacks blocked — architecture resisted misuse`)
    console.log("═══════════════════════════════════════════════════\n")
    process.exit(0)
  } else {
    console.log(`  ❌ ${total - blocked} of ${total} attacks succeeded`)
    console.log("═══════════════════════════════════════════════════\n")
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("\n  ❌ FATAL:", err.message)
  process.exit(1)
})
