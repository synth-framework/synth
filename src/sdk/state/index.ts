// ============================================================
// SDK: State
// ============================================================
// Canonical read-only access to canonical state. Writes remain the
// exclusive responsibility of the ExecutionGate → StateStore path.
// ============================================================

import type { CanonicalState } from "../../types/index.js"
import { stateFile } from "../paths/index.js"
import { readJsonMaybe } from "../json/index.js"

export async function readState(root: string): Promise<CanonicalState | null> {
  return (await readJsonMaybe<CanonicalState>(stateFile(root))) ?? null
}

export async function readStateOrThrow(root: string): Promise<CanonicalState> {
  const state = await readState(root)
  if (state === null) {
    throw new Error(`Canonical state not found: ${stateFile(root)}`)
  }
  return state
}
