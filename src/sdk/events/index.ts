// ============================================================
// SDK: Events
// ============================================================
// Canonical read-only access to the event log. Writes remain the
// exclusive responsibility of the ExecutionGate → EventStore path.
// ============================================================

import type { SynthEvent } from "../../types/index.js"
import { eventLogFile } from "../paths/index.js"
import { readFileMaybe } from "../files/index.js"

export async function readEvents(root: string): Promise<SynthEvent[]> {
  const text = await readFileMaybe(eventLogFile(root))
  if (text === undefined) {
    return []
  }
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as SynthEvent)
}

export async function countEvents(root: string): Promise<number> {
  const events = await readEvents(root)
  return events.length
}

export async function getLastEvent(root: string): Promise<SynthEvent | undefined> {
  const events = await readEvents(root)
  return events.length > 0 ? events[events.length - 1] : undefined
}
