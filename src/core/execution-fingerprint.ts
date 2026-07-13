// ============================================================
// LAYER 5: Execution Fingerprinting
// ============================================================
// For every command execution: produces a deterministic
// SHA-256 fingerprint of (input, capability, events, result).
//
// Guarantees:
//   Same input + same capability → same fingerprint
//   Divergence = non-determinism detected
//
// This makes the system execution-verifiable, not just
// event-sourced.
// ============================================================

import crypto from "crypto"

/** Input to fingerprint generation */
export type ExecutionRecord = {
  command: {
    actor: string
    capability: string
    payload: Record<string, unknown>
  }
  capability: string
  partition: string
  events: Array<{ type: string; payload: unknown }>
  result: unknown
}

/** Deterministic execution fingerprint */
export class ExecutionFingerprint {
  /** Create a SHA-256 fingerprint of an execution */
  static create(record: ExecutionRecord): string {
    // Normalize: deterministic JSON serialization
    const normalized = {
      command: {
        actor: record.command.actor,
        capability: record.command.capability,
        // Sort payload keys for determinism
        payload: sortKeys(record.command.payload),
      },
      capability: record.capability,
      partition: record.partition,
      // Normalize events
      events: record.events.map((e) => ({
        type: e.type,
        payload: sortKeys(e.payload as Record<string, unknown>),
      })),
      result: record.result ? sortKeys(record.result as Record<string, unknown>) : null,
    }

    return crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex")
  }

  /** Verify that two executions produced the same fingerprint */
  static verify(a: string, b: string): boolean {
    return a === b
  }
}

/** Sort object keys recursively for deterministic serialization */
function sortKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj
  if (Array.isArray(obj)) return obj.map(sortKeys)

  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = sortKeys((obj as Record<string, unknown>)[key])
  }
  return sorted
}
