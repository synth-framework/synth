// ============================================================
// DISCOVERY CONSUMER: JSON
// ============================================================
// Presentation consumer that serializes a DiscoverySession into a
// deterministic JSON string. Suitable for persistence, transmission,
// or inspection by external tools.
// ============================================================

import type { DiscoveryConsumer, DiscoverySession } from "../types.js"
import { serializeCanonical } from "../canonical.js"

export const JSON_CONSUMER_ID = "discovery:json-consumer"
export const JSON_CONSUMER_VERSION = "1.0.0"

export interface JsonConsumerContext {
  /** Projection type keys to include. If omitted, all projections are included. */
  includeProjections?: string[]
  /** Pretty-print the JSON output with two-space indentation. */
  pretty?: boolean
}

function pickProjections(
  session: DiscoverySession,
  includeProjections?: string[],
): Record<string, unknown> {
  if (!includeProjections || includeProjections.length === 0) {
    return session.projections
  }

  const picked: Record<string, unknown> = {}
  for (const projectionType of includeProjections) {
    if (projectionType in session.projections) {
      picked[projectionType] = session.projections[projectionType]
    }
  }

  return picked
}

/**
 * Create a JSON serialization consumer.
 *
 * The output is deterministic: object keys are sorted, arrays are
 * preserved, and whitespace is controlled by the context.
 */
export function createJsonConsumer(): DiscoveryConsumer<JsonConsumerContext, string> {
  return {
    id: JSON_CONSUMER_ID,
    version: JSON_CONSUMER_VERSION,
    kind: "presentation",
    description: "Serializes a DiscoverySession to deterministic JSON.",

    consume(session: DiscoverySession, context?: JsonConsumerContext): string {
      const projections = pickProjections(session, context?.includeProjections)
      const serializable = {
        ...session,
        projections,
      }

      return serializeCanonical(serializable, context?.pretty ? 2 : undefined)
    },
  }
}
