// ============================================================
// MISSION STUDIO: Adapter Observation Collector
// ============================================================
// Orchestrates adapter execution to collect raw Observations and
// map them into PlanningObservations for Mission Studio.
//
// This module is read-only: it may call adapter observation methods
// (observe, buildFrom, extractFrom, evaluateFrom, inferFrom) but
// never mutates runtime state, the event store, or the filesystem.
// ============================================================

import type { AdapterRegistry } from "../adapters/registry.js"
import type { Observation, ObservationBatch } from "../types/observation.js"
import type { PlanningObservation } from "../planning/observation.js"
import { mapObservationsToPlanningObservations } from "./adapter-mapper.js"

/**
 * Minimal interface for adapters that can produce Observations.
 * Adapters are not required to implement this explicitly; the collector
 * checks for the presence of observation methods at runtime.
 */
type ObservationProducer = {
  observe?(): Promise<ObservationBatch>
  buildFrom?(observations: Observation[]): Promise<ObservationBatch>
  extractFrom?(observations: Observation[]): Promise<ObservationBatch>
  evaluateFrom?(observations: Observation[]): Promise<ObservationBatch>
  inferFrom?(observations: Observation[]): Promise<ObservationBatch>
}

export type ObservationCollectorOptions = {
  /** Adapter names to invoke. If omitted, all registered adapters are used. */
  adapterNames?: string[]

  /** If true, run enrichment adapters (buildFrom/extractFrom/etc.) after collection. */
  enrich?: boolean
}

/**
 * Collect PlanningObservations from the adapter registry.
 *
 * Phase 1: invoke every listed adapter that has an `observe()` method.
 * Phase 2 (optional): invoke every listed adapter that has an enrichment
 * method (`buildFrom`, `extractFrom`, `evaluateFrom`, or `inferFrom`) on
 * the observations collected in phase 1, and append the results.
 *
 * All results are mapped to PlanningObservation[] and deduplicated.
 */
export async function collectPlanningObservations(
  registry: AdapterRegistry,
  options: ObservationCollectorOptions = {},
): Promise<PlanningObservation[]> {
  const names = options.adapterNames && options.adapterNames.length > 0
    ? options.adapterNames
    : registry.list()

  const rawObservations: Observation[] = []

  // Phase 1: collect direct observations.
  for (const name of names) {
    const adapter = registry.create(name) as ObservationProducer
    if (typeof adapter.observe === "function") {
      const batch = await adapter.observe()
      if (batch && Array.isArray(batch.observations)) {
        rawObservations.push(...batch.observations)
      }
    }
  }

  // Phase 2: optional enrichment pass.
  if (options.enrich !== false) {
    for (const name of names) {
      const adapter = registry.create(name) as ObservationProducer
      const enrich =
        adapter.buildFrom || adapter.extractFrom || adapter.evaluateFrom || adapter.inferFrom

      if (typeof enrich === "function" && rawObservations.length > 0) {
        const batch = await enrich.call(adapter, rawObservations)
        if (batch && Array.isArray(batch.observations)) {
          rawObservations.push(...batch.observations)
        }
      }
    }
  }

  return mapObservationsToPlanningObservations(rawObservations)
}
