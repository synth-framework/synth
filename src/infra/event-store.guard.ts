// ============================================================
// SYNTH-LOCK-1: EventStore Guard — Runtime Enforcement
// ============================================================
// Wraps EventStore with a Proxy that blocks ALL direct writes.
// Only ExecutionGate.execute may append events.
//
// Enforcement (two layers):
//   Primary:  caller must pass the EVENT_STORE_WRITE_TOKEN symbol.
//   Secondary: stack trace inspection at call time (defense-in-depth).
// If either check fails, the write throws IllegalMutationError.
//
// This is NOT a soft convention. This is a hard runtime boundary.
// ============================================================

import type { EventStore } from "./event-store.js"
import { EVENT_STORE_WRITE_TOKEN } from "./event-store.js"
import { IllegalMutationError } from "../core/errors.js"

/** Wrap an EventStore with the mutation guard */
export function createGuardedEventStore(store: EventStore): EventStore {
  return new Proxy(store, {
    get(target, prop) {
      const value = (target as unknown as Record<string | symbol, unknown>)[prop as string]

      // Guard append and appendBatch — the mutation methods
      if (prop === "append" || prop === "appendBatch") {
        return function (this: unknown, ...args: unknown[]) {
          // Primary guard: require EVENT_STORE_WRITE_TOKEN as the last argument
          const authToken = args.length > 0 ? args[args.length - 1] : undefined
          if (authToken !== EVENT_STORE_WRITE_TOKEN) {
            throw new IllegalMutationError(
              `ILLEGAL_EVENTSTORE_WRITE: ${String(prop)}() must be called with EVENT_STORE_WRITE_TOKEN. ` +
              `Direct writes to EventStore are forbidden.`,
            )
          }

          // Secondary guard (defense-in-depth): stack trace inspection
          const stack = new Error().stack || ""
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

          // Strip the auth token from args before forwarding
          const callArgs = args.slice(0, -1)
          return (value as (...args: unknown[]) => unknown).apply(this, callArgs)
        }
      }

      // Passthrough for all other methods (loadAll, count, initialize are safe)
      return value
    },
  }) as EventStore
}
