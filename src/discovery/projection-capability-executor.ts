// ============================================================
// DISCOVERY: Projection Capability Executor
// ============================================================
// Executes registered ProjectionCapabilities in dependency order.
//
// Capabilities declare dependencies on other projection types. The
// executor validates the dependency graph is a DAG, topologically sorts
// the projections, and runs each against a shared ProjectionContext.
//
// The executor is referentially transparent: it never mutates inputs or
// outputs from other projections.
// ============================================================

import type {
  EvidenceGraph,
  ProjectionCapability,
  ProjectionContext,
  ProjectionProvenance,
} from "./types.js"
import { hashCanonical } from "./canonical.js"

function topologicalSort(capabilities: ProjectionCapability[]): string[] {
  const capabilityByType = new Map(capabilities.map((capability) => [capability.projectionType, capability]))
  const inDegree = new Map<string, number>()
  const dependents = new Map<string, string[]>()

  for (const capability of capabilities) {
    inDegree.set(capability.projectionType, capability.dependencies.length)
    for (const dependency of capability.dependencies) {
      if (!capabilityByType.has(dependency)) {
        throw new Error(
          `Projection ${capability.id} declares unknown dependency: ${dependency}`,
        )
      }
      const list = dependents.get(dependency) ?? []
      list.push(capability.projectionType)
      dependents.set(dependency, list)
    }
  }

  // Topological sort via Kahn's algorithm.
  const sorted: string[] = []
  const queue: string[] = []
  for (const [type, degree] of inDegree.entries()) {
    if (degree === 0) queue.push(type)
  }

  while (queue.length > 0) {
    const current = queue.shift()!
    sorted.push(current)

    for (const dependent of dependents.get(current) ?? []) {
      const newDegree = (inDegree.get(dependent) ?? 0) - 1
      inDegree.set(dependent, newDegree)
      if (newDegree === 0) queue.push(dependent)
    }
  }

  if (sorted.length !== capabilityByType.size) {
    const remaining = Array.from(capabilityByType.keys()).filter((type) => !sorted.includes(type))
    throw new Error(`Projection dependency cycle detected involving: ${remaining.join(", ")}`)
  }

  return sorted
}

function createEmptyProvenance(evidenceGraphHash: string): ProjectionProvenance {
  return {
    evidenceGraphHash,
    priorOutputHashes: {},
    capabilityVersions: {},
  }
}

/**
 * Execute projection capabilities in dependency order.
 *
 * The executor topologically sorts projections by their declared
 * dependencies, constructs a ProjectionContext for each, and stores the
 * result. It validates that the dependency graph is a DAG and records
 * provenance for every output.
 */
export function executeProjectionCapabilities(
  evidenceGraph: EvidenceGraph,
  capabilities: ProjectionCapability[],
  declaredIntent?: string,
): {
  outputs: Record<string, unknown>
  provenance: Record<string, ProjectionProvenance>
} {
  if (capabilities.length === 0) {
    return { outputs: {}, provenance: {} }
  }

  const order = topologicalSort(capabilities)
  const capabilityByType = new Map(capabilities.map((capability) => [capability.projectionType, capability]))
  const evidenceGraphHash = hashCanonical(evidenceGraph)

  const outputs: Record<string, unknown> = {}
  const provenance: Record<string, ProjectionProvenance> = {}

  for (const projectionType of order) {
    const capability = capabilityByType.get(projectionType)!
    const priorOutputHashes: Record<string, string> = {}

    for (const dependency of capability.dependencies) {
      if (!(dependency in outputs)) {
        throw new Error(
          `Projection ${capability.id} depends on ${dependency}, but it was not produced`,
        )
      }
      priorOutputHashes[dependency] = hashCanonical(outputs[dependency])
    }

    const context: ProjectionContext = {
      evidenceGraph,
      declaredIntent,
      priorOutputs: { ...outputs },
      provenance: createEmptyProvenance(evidenceGraphHash),
    }

    const value = capability.project(context)

    outputs[projectionType] = value
    provenance[projectionType] = {
      evidenceGraphHash,
      priorOutputHashes,
      capabilityVersions: {
        [capability.id]: capability.version,
      },
    }
  }

  return { outputs, provenance }
}
