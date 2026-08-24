import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { PartitionedEventStore } from "../src/infra/event-store.js"

function tmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "synth-esc-"))
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

// A custom-named event-log path (not the canonical `event-log.jsonl`) must
// behave as a live monolithic store so that direct tampering of that file is
// still detected by the replay verifier (adversarial / freeze / brownfield
// fixtures). See PartitionedEventStore.partitioned gating.
test("custom-named eventLogPath operates as a live monolithic store", async () => {
  const dir = await tmpDir()
  const logPath = path.join(dir, "adversarial-event-log.jsonl")
  const store = PartitionedEventStore.createAuthorized(logPath)

  await store.initialize()
  await store.appendBatch([makeEvent(0, "A"), makeEvent(1, "B")])

  const raw = await fs.readFile(logPath, "utf-8")
  assert.equal(raw.trim().split("\n").filter(Boolean).length, 2)
  assert.equal(raw.includes("partition-"), false)

  const loaded = await store.loadAll()
  assert.equal(loaded.length, 2)
  assert.equal((loaded[1] as any).type, "B")

  assert.equal(store.getFilePath(), logPath)
})
