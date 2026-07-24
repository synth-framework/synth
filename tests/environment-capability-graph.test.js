// ============================================================
// CAPABILITY GRAPH TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import {
  CapabilityGraphBuilder,
  CapabilityResolver,
  createCapabilityGraph,
  createCapabilityGraphResolver,
  CAPABILITY_CATALOG,
  CAPABILITY_DEPENDENCIES,
} from "../dist/discovery/index.js"

function makeEvidence(providers = []) {
  return {
    schema: "synth-discovery-evidence-v1",
    timestamp: Date.now(),
    environment: {
      platform: "node:v20.0.0",
      workspaceRoot: "/test",
      classification: "project",
    },
    observations: [],
    capabilities: CAPABILITY_CATALOG.map((cap) => ({
      family: cap.family,
      available: providers.some((p) => p.family === cap.family),
      confidence: "high",
      observations: [],
    })),
    providers,
    assumptions: [],
    compatibility: [],
    provenance: {
      rulesExecuted: [],
      providersEvaluated: providers.map((p) => p.providerName),
    },
  }
}

test("CAPABILITY_CATALOG contains all supported families", () => {
  const families = new Set(CAPABILITY_CATALOG.map((c) => c.family))
  assert.strictEqual(families.size, 12)
  assert.ok(families.has("Filesystem"))
  assert.ok(families.has("Revision"))
  assert.ok(families.has("Runtime"))
})

test("CapabilityGraphBuilder builds graph from catalog", () => {
  const graph = new CapabilityGraphBuilder().build()
  assert.strictEqual(graph.schema, "synth-capability-graph-v1")
  assert.strictEqual(graph.nodes.length, CAPABILITY_CATALOG.length)
  assert.ok(graph.edges.length >= CAPABILITY_DEPENDENCIES.length)
})

test("CapabilityGraphBuilder includes provider nodes from evidence", () => {
  const evidence = makeEvidence([
    { family: "Filesystem", providerName: "node-filesystem", confidence: "certain", reason: "available" },
  ])
  const graph = createCapabilityGraph(evidence)
  const provider = graph.nodes.find((n) => n.kind === "provider")
  assert.ok(provider)
  assert.strictEqual(provider.name, "node-filesystem")
})

test("Resolution selects the only available provider", () => {
  const evidence = makeEvidence([
    { family: "Filesystem", providerName: "node-filesystem", confidence: "certain", reason: "available" },
  ])
  const graph = createCapabilityGraph(evidence)
  const resolver = createCapabilityGraphResolver(graph)
  const result = resolver.resolve("cap:Filesystem")
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.path.providerName, "node-filesystem")
  assert.strictEqual(result.path.capabilityId, "cap:Filesystem")
})

test("Resolution selects highest priority provider", () => {
  const evidence = makeEvidence([
    { family: "Filesystem", providerName: "low-priority", confidence: "medium", reason: "available" },
    { family: "Filesystem", providerName: "high-priority", confidence: "certain", reason: "available" },
  ])
  const graph = createCapabilityGraph(evidence)
  const resolver = createCapabilityGraphResolver(graph)
  const result = resolver.resolve("cap:Filesystem")
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.path.providerName, "high-priority")
})

test("Resolution fails when no provider satisfies a capability", () => {
  const evidence = makeEvidence([])
  const graph = createCapabilityGraph(evidence)
  const resolver = createCapabilityGraphResolver(graph)
  const result = resolver.resolve("cap:Forge")
  assert.strictEqual(result.success, false)
  assert.ok(result.failures.some((f) => f.reason.includes("No provider satisfies")))
})

test("Resolution resolves transitive dependencies", () => {
  const evidence = makeEvidence([
    { family: "Filesystem", providerName: "node-filesystem", confidence: "certain", reason: "available" },
    { family: "Revision", providerName: "git-revision", confidence: "high", reason: "git repo" },
  ])
  const graph = createCapabilityGraph(evidence)
  const resolver = createCapabilityGraphResolver(graph)
  const result = resolver.resolve("cap:Revision")
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.path.providerName, "git-revision")
  assert.ok(result.path.dependencies.length > 0)
  assert.strictEqual(result.path.dependencies[0].capabilityId, "cap:Filesystem")
})

test("Resolution detects circular dependencies", () => {
  const builder = new CapabilityGraphBuilder([
    { id: "cap:A", kind: "capability", family: "Filesystem", version: "1.0.0", required: true, metadata: { description: "A" } },
    { id: "cap:B", kind: "capability", family: "Revision", version: "1.0.0", required: true, metadata: { description: "B" } },
  ])
  builder["nodes"].set("prov:a", {
    id: "prov:a",
    kind: "provider",
    name: "provider-a",
    version: "1.0.0",
    capabilities: ["cap:A"],
    priority: 100,
    metadata: { confidence: "high" },
  })
  builder["nodes"].set("prov:b", {
    id: "prov:b",
    kind: "provider",
    name: "provider-b",
    version: "1.0.0",
    capabilities: ["cap:B"],
    priority: 100,
    metadata: { confidence: "high" },
  })
  builder["edges"].push({
    id: "edge:sat:a:A",
    source: "prov:a",
    target: "cap:A",
    kind: "satisfies",
  })
  builder["edges"].push({
    id: "edge:sat:b:B",
    source: "prov:b",
    target: "cap:B",
    kind: "satisfies",
  })
  builder["edges"].push({
    id: "edge:req:A:B",
    source: "cap:A",
    target: "cap:B",
    kind: "requires",
  })
  builder["edges"].push({
    id: "edge:req:B:A",
    source: "cap:B",
    target: "cap:A",
    kind: "requires",
  })
  const graph = builder.build()
  const resolver = createCapabilityGraphResolver(graph)
  const result = resolver.resolve("cap:A")
  assert.strictEqual(result.success, false)
  assert.ok(result.failures.some((f) => f.reason.includes("Circular")))
})

test("Graph serialization contains all expected fields", () => {
  const evidence = makeEvidence([
    { family: "Runtime", providerName: "node-runtime", confidence: "high", reason: "node available" },
  ])
  const graph = createCapabilityGraph(evidence)
  assert.strictEqual(typeof graph.version, "string")
  assert.ok(graph.timestamp > 0)
  assert.ok(Array.isArray(graph.nodes))
  assert.ok(Array.isArray(graph.edges))
  assert.ok(typeof graph.resolution === "object")
  assert.ok("cap:Runtime" in graph.resolution)
})

test("Graph nodes and edges are sorted by id", () => {
  const evidence = makeEvidence([
    { family: "Filesystem", providerName: "z-provider", confidence: "certain", reason: "" },
    { family: "Runtime", providerName: "a-provider", confidence: "certain", reason: "" },
  ])
  const graph = createCapabilityGraph(evidence)
  const nodeIds = graph.nodes.map((n) => n.id)
  const sortedNodeIds = [...nodeIds].sort((a, b) => a.localeCompare(b))
  assert.deepStrictEqual(nodeIds, sortedNodeIds)

  const edgeIds = graph.edges.map((e) => e.id)
  const sortedEdgeIds = [...edgeIds].sort((a, b) => a.localeCompare(b))
  assert.deepStrictEqual(edgeIds, sortedEdgeIds)
})

test("Provider node aggregates multiple satisfied capabilities", () => {
  const evidence = makeEvidence([
    { family: "Runtime", providerName: "node-runtime", confidence: "certain", reason: "" },
    { family: "Process", providerName: "node-runtime", confidence: "certain", reason: "" },
  ])
  const graph = createCapabilityGraph(evidence)
  const provider = graph.nodes.find((n) => n.kind === "provider" && n.name === "node-runtime")
  assert.ok(provider)
  assert.ok(provider.capabilities.includes("cap:Runtime"))
  assert.ok(provider.capabilities.includes("cap:Process"))
})
