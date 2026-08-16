// ============================================================
// ADAPTER CATALOG
// ============================================================
// Unified, queryable index of all SYNTH adapters.
//
// The catalog consumes canonical AdapterDescriptor objects (via describe()
// on adapter instances or static runtime descriptors) and exposes:
//   - query(criteria)  → ranked list of matching descriptors
//   - resolve(id)      → single descriptor by stable id
//   - list()           → all registered descriptor ids
//
// This replaces the static ADAPTER_CATALOG in first-contact and the
// hardcoded defaults in discovery/initialization engines.
// ============================================================

import type { AdapterDescriptor } from "../types/adapter.js"
import { RUNTIME_ADAPTER_DESCRIPTORS } from "./runtime/runtime-adapter-descriptors.js"
import { createGitRepositoryAdapter } from "./repository/git.js"
import { createGitHubAdapter } from "./github/adapter.js"
import { createFilesystemInitializationAdapter } from "./filesystem-initialization-adapter.js"
import {
  createFilesystemDiscoveryAdapter,
  createGitDiscoveryAdapter,
  createOperationalArtifactDiscoveryAdapter,
} from "../discovery/adapters/index.js"
import { createTddAdapter } from "./tdd/adapter.js"
import { createBddAdapter } from "./bdd/adapter.js"
import { createConversationAdapter } from "./conversation/adapter.js"
import { createDocumentAdapter } from "./document/adapter.js"
import { createFilesystemAdapter } from "./filesystem/adapter.js"
import { createSpecificationAdapter } from "./specification/adapter.js"
import { createKnowledgeExtractionAdapter } from "./knowledge/adapter.js"
import { createConfidenceAdapter } from "./confidence/adapter.js"
import { createDependencyAdapter } from "./dependency/adapter.js"
import { createArchitectureAdapter } from "./architecture/adapter.js"
import { createMissionBuilderAdapter } from "./mission-builder/adapter.js"
import { createExpeditionBuilderAdapter } from "./expedition-builder/adapter.js"
import { createObjectiveBuilderAdapter } from "./objective-builder/adapter.js"
import { createWizardAdapter } from "./wizard/adapter.js"
import type { InitializationAdapter } from "./initialization-adapter.js"
import type { ObservationCapability } from "../discovery/types.js"
import { createFilesystemObservationCapability } from "../discovery/capabilities/filesystem-capability.js"
import { createGitObservationCapability } from "../discovery/capabilities/git-capability.js"
import { createOperationalArtifactObservationCapability } from "../discovery/capabilities/operational-artifact-capability.js"

export type AdapterCatalogQuery = {
  /** Match adapters that declare any of these source types. */
  sourceType?: string | string[]

  /** Match adapters that declare any of these runtimes. */
  runtime?: string | string[]

  /** Match adapters that declare any of these languages. */
  language?: string | string[]

  /** Match adapters that declare any of these platforms. */
  platform?: string | string[]

  /** Match adapters that provide any of these capabilities (required or optional). */
  capability?: string | string[]

  /** Match adapters in any of these functional families. */
  family?: string | string[]

  /** Match adapters of any of these kinds. */
  kind?: string | string[]

  /** Exclude specific adapter ids from results. */
  excludeAdapterIds?: string[]
}

export interface AdapterCatalog {
  /** Register a descriptor directly. */
  register(descriptor: AdapterDescriptor): void

  /** Register the descriptor returned by an adapter's describe() method, if present. */
  registerFrom(adapter: { describe?(): AdapterDescriptor }): void

  /** Find all descriptors matching the query criteria. */
  query(criteria: AdapterCatalogQuery): AdapterDescriptor[]

  /** Find a single descriptor by id. */
  resolve(id: string): AdapterDescriptor | undefined

  /** List all registered adapter ids. */
  list(): string[]

  /** Return all registered descriptors. */
  all(): AdapterDescriptor[]
}

function normalize(value: string): string {
  return value.toLowerCase().trim()
}

function normalizeArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value.map(normalize) : [normalize(value)]
}

function hasAnyIntersection(a: string[] | undefined, b: string[]): boolean {
  if (!a || a.length === 0) return false
  const setA = new Set(a.map(normalize))
  return b.some((item) => setA.has(normalize(item)))
}

function scoreDescriptor(descriptor: AdapterDescriptor, criteria: AdapterCatalogQuery): number {
  let score = 0
  const sourceTypes = normalizeArray(criteria.sourceType)
  const runtimes = normalizeArray(criteria.runtime)
  const languages = normalizeArray(criteria.language)
  const platforms = normalizeArray(criteria.platform)
  const capabilities = normalizeArray(criteria.capability)
  const families = normalizeArray(criteria.family)
  const kinds = normalizeArray(criteria.kind)

  if (sourceTypes.length > 0 && hasAnyIntersection(descriptor.sourceTypes, sourceTypes)) {
    score += 1
  }
  if (runtimes.length > 0 && hasAnyIntersection(descriptor.runtimes, runtimes)) {
    score += 1
  }
  if (languages.length > 0 && hasAnyIntersection(descriptor.languages, languages)) {
    score += 1
  }
  if (platforms.length > 0 && hasAnyIntersection(descriptor.platforms, platforms)) {
    score += 1
  }
  if (capabilities.length > 0) {
    const allCapabilities = [
      ...(descriptor.capabilities ?? []),
      ...(descriptor.optionalCapabilities ?? []),
    ]
    if (hasAnyIntersection(allCapabilities, capabilities)) {
      score += 1
    }
  }
  if (families.length > 0 && families.includes(normalize(descriptor.family))) {
    score += 1
  }
  if (kinds.length > 0 && kinds.includes(normalize(descriptor.kind))) {
    score += 1
  }

  return score
}

class AdapterCatalogImpl implements AdapterCatalog {
  private descriptors = new Map<string, AdapterDescriptor>()

  register(descriptor: AdapterDescriptor): void {
    this.descriptors.set(descriptor.id, descriptor)
  }

  registerFrom(adapter: { describe?(): AdapterDescriptor }): void {
    if (typeof adapter.describe !== "function") return
    const descriptor = adapter.describe()
    if (descriptor) {
      this.register(descriptor)
    }
  }

  query(criteria: AdapterCatalogQuery): AdapterDescriptor[] {
    const exclude = new Set((criteria.excludeAdapterIds ?? []).map(normalize))
    const families = normalizeArray(criteria.family)
    const kinds = normalizeArray(criteria.kind)

    const scored: Array<{ descriptor: AdapterDescriptor; score: number }> = []

    for (const descriptor of this.descriptors.values()) {
      if (exclude.has(normalize(descriptor.id))) continue

      const familyMatch = families.length === 0 || families.includes(normalize(descriptor.family))
      const kindMatch = kinds.length === 0 || kinds.includes(normalize(descriptor.kind))
      if (!familyMatch || !kindMatch) continue

      const score = scoreDescriptor(descriptor, criteria)
      // When any specific criteria beyond family/kind are supplied, require
      // at least one positive match. Otherwise, include all family/kind matches.
      const hasSpecificCriteria =
        criteria.sourceType !== undefined ||
        criteria.runtime !== undefined ||
        criteria.language !== undefined ||
        criteria.platform !== undefined ||
        criteria.capability !== undefined

      if (hasSpecificCriteria && score === 0) continue

      scored.push({ descriptor, score })
    }

    return scored
      .sort((a, b) => b.score - a.score || a.descriptor.id.localeCompare(b.descriptor.id))
      .map((s) => s.descriptor)
  }

  resolve(id: string): AdapterDescriptor | undefined {
    return this.descriptors.get(id)
  }

  list(): string[] {
    return Array.from(this.descriptors.keys()).sort()
  }

  all(): AdapterDescriptor[] {
    return Array.from(this.descriptors.values()).sort((a, b) => a.id.localeCompare(b.id))
  }
}

function createAdapterCatalog(): AdapterCatalog {
  return new AdapterCatalogImpl()
}

/**
 * Create the canonical SYNTH adapter catalog seeded with all built-in
 * descriptors.
 */
export function createDefaultAdapterCatalog(): AdapterCatalog {
  const catalog = createAdapterCatalog()

  for (const descriptor of RUNTIME_ADAPTER_DESCRIPTORS) {
    catalog.register(descriptor)
  }

  // Integration adapters
  catalog.registerFrom(createGitRepositoryAdapter())
  catalog.registerFrom(createGitHubAdapter())

  // Initialization adapters
  catalog.registerFrom(createFilesystemInitializationAdapter())

  // Discovery adapters
  catalog.registerFrom(createFilesystemDiscoveryAdapter())
  catalog.registerFrom(createGitDiscoveryAdapter())
  catalog.registerFrom(createOperationalArtifactDiscoveryAdapter())

  // Mission Studio planning/intelligence adapters
  catalog.registerFrom(createTddAdapter())
  catalog.registerFrom(createBddAdapter())
  catalog.registerFrom(createConversationAdapter())
  catalog.registerFrom(createDocumentAdapter())
  catalog.registerFrom(createFilesystemAdapter())
  catalog.registerFrom(createSpecificationAdapter())
  catalog.registerFrom(createKnowledgeExtractionAdapter())
  catalog.registerFrom(createConfidenceAdapter())
  catalog.registerFrom(createDependencyAdapter())
  catalog.registerFrom(createArchitectureAdapter())
  catalog.registerFrom(createMissionBuilderAdapter())
  catalog.registerFrom(createExpeditionBuilderAdapter())
  catalog.registerFrom(createObjectiveBuilderAdapter())
  catalog.registerFrom(createWizardAdapter())

  return catalog
}

/**
 * Instantiate an InitializationAdapter from its canonical descriptor.
 *
 * Returns undefined when the descriptor does not map to a known
 * initialization adapter factory.
 */
export function createInitializationAdapter(
  descriptor: AdapterDescriptor,
): InitializationAdapter | undefined {
  if (descriptor.family === "initialization" && descriptor.id === "filesystem-initialization") {
    return createFilesystemInitializationAdapter()
  }
  return undefined
}

/**
 * Instantiate an ObservationCapability from a discovery adapter descriptor.
 *
 * Returns undefined when the descriptor does not map to a known
 * observation capability factory.
 */
export function createObservationCapability(
  descriptor: AdapterDescriptor,
): ObservationCapability | undefined {
  const discoveryFamilies = new Set(["discovery", "filesystem", "operational-artifact"])
  if (!discoveryFamilies.has(descriptor.family)) return undefined

  switch (descriptor.id) {
    case "discovery:filesystem":
      return createFilesystemObservationCapability()
    case "discovery:git":
      return createGitObservationCapability()
    case "discovery:operational-artifacts":
      return createOperationalArtifactObservationCapability()
    default:
      return undefined
  }
}
