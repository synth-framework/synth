// ============================================================
// SDK: Events
// ============================================================
// Canonical read-only access to the event log. Writes remain the
// exclusive responsibility of the ExecutionGate → EventStore path.
// ============================================================

import path from "path"
import type { SynthEvent } from "../../types/index.js"
import { PartitionedEventStore } from "../../infra/event-store.js"
import { dataDir, eventLogFile } from "../paths/index.js"

export async function readEvents(root: string): Promise<SynthEvent[]> {
  const streamDir = path.join(dataDir(root), "event-stream")
  const store = PartitionedEventStore.createAuthorized(eventLogFile(root), streamDir, 4)
  await store.initialize()
  return store.loadAll()
}

export async function countEvents(root: string): Promise<number> {
  const events = await readEvents(root)
  return events.length
}

export async function getLastEvent(root: string): Promise<SynthEvent | undefined> {
  const events = await readEvents(root)
  return events.length > 0 ? events[events.length - 1] : undefined
}
