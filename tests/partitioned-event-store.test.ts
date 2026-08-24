import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { PartitionedEventStore } from "../src/infra/event-store.js"

function tmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "synth-pes-"))
}

function makeEvent(i: number, type: string) {
  return {
    id: `evt-${i}`,
    type,
    timestamp: 1000 + i,
    transactionId: `tx-${i}`,
    capability: "test",
    actor: "agent",
    payload: { index: i },
    eventHash: `h-${i}`,
    previousHash: i === 0 ? "genesis" : `h-${i - 1}`,
  }
}

test("append preserves global offset ordering across partitions", async () => {
  const dir = await tmpDir()
  const streamDir = path.join(dir, "event-stream")
  const store = PartitionedEventStore.createAuthorized(path.join(dir, "event-log.jsonl"), streamDir, 4)

  await store.initialize()
  for (let i = 0; i < 12; i++) {
    await store.append(makeEvent(i, i % 2 === 0 ? "A" : "B"))
  }

  const all = await store.loadAll()
  assert.equal(all.length, 12)
  for (let i = 0; i < all.length; i++) {
    assert.equal((all[i] as any).payload.index, i)
    assert.equal((all[i] as any).offset, i + 1)
  }

  const last = await store.getLastEvent()
  assert.equal((last as any).payload.index, 11)
  assert.equal(await store.count(), 12)
})

test("appendBatch routes into partitions and preserves order", async () => {
  const dir = await tmpDir()
  const streamDir = path.join(dir, "event-stream")
  const store = PartitionedEventStore.createAuthorized(path.join(dir, "event-log.jsonl"), streamDir, 4)

  await store.initialize()
  const batch = Array.from({ length: 7 }, (_, i) => makeEvent(i, "X"))
  await store.appendBatch(batch)

  const all = await store.loadAll()
  assert.equal(all.length, 7)
  for (let i = 0; i < all.length; i++) {
    assert.equal((all[i] as any).payload.index, i)
  }
})

test("migration copies a legacy monolith in order exactly once", async () => {
  const dir = await tmpDir()
  const legacy = path.join(dir, "event-log.jsonl")
  const streamDir = path.join(dir, "event-stream")

  const legacyEvents = Array.from({ length: 5 }, (_, i) => makeEvent(i, i % 3 === 0 ? "A" : "B"))
  await fs.writeFile(legacy, legacyEvents.map((e) => JSON.stringify(e)).join("\n") + "\n")

  const store = PartitionedEventStore.createAuthorized(legacy, streamDir, 4)
  await store.initialize()

  const all = await store.loadAll()
  assert.equal(all.length, 5)
  for (let i = 0; i < all.length; i++) {
    assert.equal((all[i] as any).payload.index, i)
    assert.equal((all[i] as any).offset, i + 1)
  }

  const store2 = PartitionedEventStore.createAuthorized(legacy, streamDir, 4)
  await store2.initialize()
  assert.equal((await store2.loadAll()).length, 5)
})

test("migration is skipped when partitions already hold data", async () => {
  const dir = await tmpDir()
  const legacy = path.join(dir, "event-log.jsonl")
  const streamDir = path.join(dir, "event-stream")

  const store = PartitionedEventStore.createAuthorized(legacy, streamDir, 4)
  await store.initialize()
  await store.append(makeEvent(0, "A"))

  await fs.rm(legacy, { force: true })
  const store2 = PartitionedEventStore.createAuthorized(legacy, streamDir, 4)
  await store2.initialize()
  assert.equal((await store2.loadAll()).length, 1)
})
