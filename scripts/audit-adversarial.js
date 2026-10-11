#!/usr/bin/env node
// ============================================================
// SYNTH: Adversarial Architecture Audit (P4)
// ============================================================
// Attempts to violate every constitutional invariant.
// A failed attack is a PASS for the architecture.
//
// Attacks:
//   1. Direct EventStore append (bypass ExecutionGate)
//   2. Direct PartitionedEventStore append (bypass ExecutionGate)
//   3. Capability registry mutation after seal
//   4. Policy mutation after freeze
//   5. Event payload tampering (segment-file modification)
//   6. Event reordering (global-offset forgery across segments)
//   7. Event hash forgery (segment-file modification)
//
// The event log is the partitioned event-stream
// (data-test/event-stream/partition-*/segment-*.jsonl, expedition 01604a3).
// Attacks 5-7 operate on the authoritative segment files: tampering with a
// retired monolithic copy would exercise nothing, since no reader consults
// it. Line order inside a segment file is irrelevant (loadAll sorts by the
// global offset), so the reorder attack forges offsets, not line positions.
//
// Exit 0 = all attacks were correctly blocked
// Exit 1 = at least one attack succeeded
// ============================================================

import { promises as fs } from "fs"
import path from "path"
import { bootstrap } from "../dist/core/bootstrap.js"
import { createReplayVerifier } from "../dist/core/replay-verifier.js"
import { EventStore, PartitionedEventStore } from "../dist/infra/event-store.js"

const ATTACK_LOG = path.join(process.cwd(), "data-test", "adversarial-event-log.jsonl")
const ATTACK_STATE = path.join(process.cwd(), "data-test", "adversarial-state.json")
// resolveEventStreamDir maps eventLogPath -> dirname + "/event-stream".
const STREAM_DIR = path.join(process.cwd(), "data-test", "event-stream")

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

// Drive one legitimate intent through the gate so the stream holds genesis
// plus post-genesis activity (>= 3 events). Fail loud if seeding fails:
// a vacuous attack (too few events) must never read as a pass.
async function seedBaselineActivity(ctx) {
  await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateWorkItem",
    payload: { id: "W-ATTACK-BASE", name: "Attack baseline" },
  })
  const events = await ctx.infra.eventStore.loadAll()
  if (events.length < 3) {
    throw new Error(`adversarial setup failed: expected >=3 events after seeding, got ${events.length}`)
  }
}

// Reset the attack log to a pristine 3-event baseline and return the fresh
// context. Callers must thread the returned context: the previous store
// instance points at deleted files.
async function resetAttackLog() {
  const fresh = await setup()
  if (!fresh.isSealed) fresh.seal()
  await seedBaselineActivity(fresh)
  return fresh
}

// --- Partitioned-stream file helpers -------------------------------------

async function listSegmentFiles() {
  const files = []
  let partitions
  try {
    partitions = (await fs.readdir(STREAM_DIR)).filter((e) => e.startsWith("partition-")).sort()
  } catch {
    return []
  }
  for (const part of partitions) {
    const partDir = path.join(STREAM_DIR, part)
    let segments
    try {
      segments = (await fs.readdir(partDir)).filter((f) => f.endsWith(".jsonl")).sort()
    } catch {
      continue
    }
    for (const seg of segments) files.push(path.join(partDir, seg))
  }
  return files
}

async function readSegmentLines(file) {
  const raw = await fs.readFile(file, "utf-8")
  return raw
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line))
}

async function writeSegmentLines(file, events) {
  await fs.writeFile(file, events.map((e) => JSON.stringify(e)).join("\n") + "\n")
}

// Load every segment-file event with its file location, in canonical
// (global-offset) order — the same order the store replays.
async function locateStreamEvents() {
  const located = []
  for (const file of await listSegmentFiles()) {
    const lines = await readSegmentLines(file)
    lines.forEach((event, index) => located.push({ file, index, event }))
  }
  located.sort((a, b) => (a.event.offset ?? 0) - (b.event.offset ?? 0))
  return located
}

async function rewriteSegmentEvent(file, index, event) {
  const lines = await readSegmentLines(file)
  lines[index] = event
  await writeSegmentLines(file, lines)
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

async function attackDirectPartitionedAppend(ctx) {
  try {
    // No auth token: the partitioned store must reject writes that did not
    // pass through the ExecutionGate, exactly like the monolithic store.
    const rogue = new PartitionedEventStore(STREAM_DIR, 4)
    await rogue.append({
      id: "FORGED-PART",
      type: "WORK_ITEM_CREATED",
      timestamp: 999,
      transactionId: "forged-tx",
      capability: "CreateWorkItem",
      actor: "attacker",
      payload: { workItem: { id: "W-ATTACK", name: "Forged" } },
      eventHash: "forged-hash",
      previousHash: "genesis",
    })
    record("Direct partitioned-store append", false, "append succeeded without ExecutionGate")
  } catch (err) {
    record("Direct partitioned-store append", true, err.message)
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
  const located = await locateStreamEvents()
  if (located.length < 2) {
    record("Event payload tampering", true, "not enough events to tamper")
    return ctx
  }

  // Modify a non-genesis event payload inside its own segment file — the
  // authoritative copy the store replays.
  const target = located[1]
  await rewriteSegmentEvent(target.file, target.index, {
    ...target.event,
    payload: { ...target.event.payload, tampered: true },
  })

  const verifier = createReplayVerifier(ctx.infra.eventStore, ctx.infra.stateStore)
  const result = await verifier.verify()
  const blocked = !result.consistent || !result.chainValid

  const fresh = await resetAttackLog()

  record("Event payload tampering", blocked, result.explanation)
  return fresh
}

async function attackEventReordering(ctx) {
  const located = await locateStreamEvents()
  if (located.length < 3) {
    record("Event reordering", true, "not enough events to reorder")
    return ctx
  }

  // Swap the authoritative global offsets of two non-genesis events. Line
  // order inside segment files is irrelevant (loadAll sorts by offset), so
  // forging the offsets is the real reorder attack on this layout.
  const a = located[1]
  const b = located[2]
  const tmpOffset = a.event.offset
  a.event.offset = b.event.offset
  b.event.offset = tmpOffset

  const writes = new Map()
  for (const loc of [a, b]) {
    if (!writes.has(loc.file)) writes.set(loc.file, await readSegmentLines(loc.file))
    writes.get(loc.file)[loc.index] = loc.event
  }
  for (const [file, lines] of writes) await writeSegmentLines(file, lines)

  const verifier = createReplayVerifier(ctx.infra.eventStore, ctx.infra.stateStore)
  const result = await verifier.verify()
  const blocked = !result.consistent || !result.chainValid

  const fresh = await resetAttackLog()

  record("Event reordering", blocked, result.explanation)
  return fresh
}

async function attackHashForgery(ctx) {
  const located = await locateStreamEvents()
  if (located.length < 2) {
    record("Event hash forgery", true, "not enough events to forge")
    return ctx
  }

  // Zero the stored hash of a non-genesis event inside its segment file.
  const target = located[1]
  await rewriteSegmentEvent(target.file, target.index, { ...target.event, eventHash: "0".repeat(64) })

  const verifier = createReplayVerifier(ctx.infra.eventStore, ctx.infra.stateStore)
  const result = await verifier.verify()
  const blocked = !result.consistent || !result.chainValid

  const fresh = await resetAttackLog()

  record("Event hash forgery", blocked, result.explanation)
  return fresh
}

async function main() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  SYNTH: Adversarial Architecture Audit (P4)")
  console.log("═══════════════════════════════════════════════════\n")

  let ctx = await setup()
  // Seed post-genesis activity through the gate so the reorder attack has
  // two non-genesis events to forge offsets between.
  await seedBaselineActivity(ctx)
  if (!ctx.isSealed) ctx.seal()

  await attackDirectAppend(ctx)
  await attackDirectPartitionedAppend(ctx)
  await attackRegistryMutationAfterSeal(ctx)
  await attackPolicyMutationAfterFreeze(ctx)
  ctx = await attackEventTampering(ctx)
  ctx = await attackEventReordering(ctx)
  ctx = await attackHashForgery(ctx)

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
