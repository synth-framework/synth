// ============================================================
// SYNTH-LOCK-1: EventStore Guard — Runtime Enforcement
// ============================================================
// Wraps EventStore with a Proxy that blocks ALL direct writes.
// Only ExecutionGate.execute may append events.
//
// Enforcement: stack trace inspection at call time.
// If the call stack does NOT include "ExecutionGate", the write
// throws IllegalMutationError.
//
// This is NOT a soft convention. This is a hard runtime boundary.
// ============================================================

import type { EventStore } from "./event-store.js"
import { IllegalMutationError } from "../core/errors.js"

/** Wrap an EventStore with the mutation guard */
export function createGuardedEventStore(store: EventStore): EventStore {
  return new Proxy(store, {
    get(target, prop) {
      const value = (target as unknown as Record<string | symbol, unknown>)[prop as string]

      // Guard append and appendBatch — the mutation methods
      if (prop === "append" || prop === "appendBatch") {
        return function (this: unknown, ...args: unknown[]) {
          const stack = new Error().stack || ""

          // Allow if call originated from ExecutionGate (single mutation authority)
          if (
            !stack.includes("ExecutionGate") &&
            !stack.includes("execution-gate")
          ) {
            throw new IllegalMutationError(
              `ILLEGAL_EVENTSTORE_WRITE: ${String(prop)}() must be called through ExecutionGate. ` +
              `Direct writes to EventStore are forbidden. ` +
              `Stack: ${stack.split("\n").slice(2, 5).join(" -> ")}`,
            )
          }

          return (value as (...args: unknown[]) => unknown).apply(this, args)
        }
      }

      // Passthrough for all other methods (loadAll, count, initialize are safe)
      return value
    },
  }) as EventStore
}
