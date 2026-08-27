// ============================================================
// TEST HELPER — seedEventLog
// ============================================================
// Seeds events directly into the partitioned event-stream
// (.synth/data/event-stream). This replaces the legacy practice of writing a
// monolithic event-log.jsonl fixture: the event-stream is the sole authority,
// so test fixtures must land there to be read back by readEvents / the CLI.
//
// Usage (mirrors the old writeEventLog helper):
//   import { seedEventLog } from "./seed-event-log.js"
//   await seedEventLog(rootOrDataDir, events)
// ============================================================

import path from "path"
import { PartitionedEventStore } from "../../dist/infra/event-store.js"

/**
 * @param target project root, or a `<root>/.synth/data` directory.
 * @param events hash-chained events already shaped as SynthEvent.
 */
export async function seedEventLog(target, events) {
  const normalized = path.resolve(target)
  let streamDir
  if (path.basename(normalized) === "data" && path.basename(path.dirname(normalized)) === ".synth") {
    streamDir = path.join(normalized, "event-stream")
  } else {
    streamDir = path.join(normalized, ".synth", "data", "event-stream")
  }
  const store = PartitionedEventStore.createAuthorized(streamDir, 4)
  await store.initialize()
  await store.appendBatch(events)
}
