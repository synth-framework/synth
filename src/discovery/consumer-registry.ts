// ============================================================
// DISCOVERY: Consumer Registry
// ============================================================
// Central registry for DiscoveryConsumer implementations.
//
// The registry is intentionally thin: it stores consumers, validates
// their projection requirements before execution, and wraps every
// consumed output in a provenanced ConsumerResult envelope. Consumers
// remain read-only with respect to the compiler pipeline.
// ============================================================

import type {
  ConsumerRegistry,
  ConsumerResult,
  DiscoveryConsumer,
  DiscoverySession,
} from "./types.js"
import { hashCanonical } from "./canonical.js"

function getOutputType<TOutput>(output: TOutput): string {
  if (output === null || output === undefined) {
    return "null"
  }

  if (typeof output === "string") {
    return "string"
  }

  if (typeof output === "number") {
    return Number.isInteger(output) ? "integer" : "number"
  }

  if (typeof output === "boolean") {
    return "boolean"
  }

  if (Array.isArray(output)) {
    return "array"
  }

  return "object"
}

export function createConsumerRegistry(): ConsumerRegistry {
  const consumers = new Map<string, DiscoveryConsumer<unknown, unknown>>()

  return {
    register<TInput, TOutput>(consumer: DiscoveryConsumer<TInput, TOutput>): void {
      if (consumers.has(consumer.id)) {
        throw new Error(`Consumer already registered: ${consumer.id}`)
      }

      consumers.set(consumer.id, consumer as DiscoveryConsumer<unknown, unknown>)
    },

    unregister(id: string): void {
      consumers.delete(id)
    },

    resolve<TInput, TOutput>(id: string): DiscoveryConsumer<TInput, TOutput> | undefined {
      return consumers.get(id) as DiscoveryConsumer<TInput, TOutput> | undefined
    },

    list(): DiscoveryConsumer<unknown, unknown>[] {
      return Array.from(consumers.values())
    },

    execute<TInput, TOutput>(
      id: string,
      session: DiscoverySession,
      context?: TInput,
    ): ConsumerResult<TOutput> {
      const consumer = consumers.get(id) as DiscoveryConsumer<TInput, TOutput> | undefined
      if (!consumer) {
        throw new Error(`Consumer not found: ${id}`)
      }

      const requiredProjections = consumer.requiredProjections ?? []
      const missingProjections = requiredProjections.filter(
        (projectionType) => !(projectionType in session.projections),
      )

      if (missingProjections.length > 0) {
        throw new Error(
          `Consumer ${id} requires missing projections: ${missingProjections.join(", ")}`,
        )
      }

      const startTime = Date.now()
      let output: TOutput

      try {
        output = consumer.consume(session, context)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(`Consumer ${id} failed: ${message}`)
      }

      const durationMs = Date.now() - startTime

      return {
        consumerId: consumer.id,
        consumerVersion: consumer.version,
        outputType: getOutputType(output),
        outputHash: hashCanonical(output),
        output,
        warnings: [],
        durationMs,
        provenance: {
          sessionId: session.id,
          sessionHash: session.hash,
          consumedAt: startTime + durationMs,
        },
      }
    },
  }
}
