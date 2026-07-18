// ============================================================
// DISCOVERY PROJECT MODEL PROJECTION TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { projectProjectModel } from "../dist/discovery/index.js"

function makeGraph(claimsData) {
  const claims = []
  const observations = []
  const edges = []

  for (let i = 0; i < claimsData.length; i++) {
    const { assertion, payload } = claimsData[i]
    const obsId = `obs-${i}`
    observations.push({
      id: obsId,
      adapterId: "discovery:filesystem",
      adapterVersion: "1.0.0",
      source: { type: "filesystem", path: "/my-project" },
      fact: assertion,
      payload,
      timestamp: 1,
    })
    const claimId = `claim-${String(i).padStart(6, "0")}`
    claims.push({
      id: claimId,
      assertion,
      observationIds: [obsId],
      adapterId: "discovery:filesystem",
      adapterVersion: "1.0.0",
      source: { type: "filesystem", path: "/my-project" },
      confidence: { value: 1, label: "certain", kind: "deterministic", reason: "test" },
    })
    edges.push({ from: obsId, to: claimId, kind: "supports" })
  }

  const observationIndex = {}
  const claimIndex = {}
  for (let i = 0; i < observations.length; i++) observationIndex[observations[i].id] = i
  for (let i = 0; i < claims.length; i++) claimIndex[claims[i].id] = i

  return {
    schema: "synth-discovery-evidence-v1",
    observations,
    claims,
    edges,
    observationIndex,
    claimIndex,
    sourceIndex: { "filesystem:/my-project": 0 },
  }
}

test("project model infers identity from filesystem source", () => {
  const graph = makeGraph([{ assertion: "Source directory observed" }])
  const model = projectProjectModel(graph, {})

  assert.strictEqual(model.identity.name, "my-project")
  assert.strictEqual(model.identity.id, "my-project")
})

test("project model defaults to unknown when no filesystem source", () => {
  const graph = makeGraph([])
  graph.claims = []
  graph.observations = []
  graph.observationIndex = {}
  graph.claimIndex = {}
  const model = projectProjectModel(graph, {})

  assert.strictEqual(model.identity.name, "Unknown Project")
  assert.strictEqual(model.identity.id, "unknown")
})

test("project model uses declared intent", () => {
  const graph = makeGraph([{ assertion: "Source directory observed" }])
  const model = projectProjectModel(graph, {}, "Build a mission tracker")

  assert.strictEqual(model.intent.statement, "Build a mission tracker")
})

test("project model infers implementation lifecycle stage", () => {
  const graph = makeGraph([{ assertion: "Node.js project manifest present" }])
  const model = projectProjectModel(graph, {})

  assert.strictEqual(model.lifecycleStage.value, "implementation")
  assert.ok(model.lifecycleStage.confidence.value >= 0.8)
})

test("project model infers specification stage from docs without implementation", () => {
  const graph = makeGraph([{ assertion: "Documentation present" }])
  const model = projectProjectModel(graph, {})

  assert.strictEqual(model.lifecycleStage.value, "specification")
})

test("project model infers languages from file extension observation", () => {
  const graph = makeGraph([
    {
      assertion: "File extension observed",
      payload: { extensions: ["ts", "js"] },
    },
  ])
  const model = projectProjectModel(graph, {})

  const languageNames = model.languages.map((l) => l.name)
  assert.ok(languageNames.includes("TypeScript"))
  assert.ok(languageNames.includes("JavaScript"))
})

test("project model infers frameworks from Node.js dependencies", () => {
  const graph = makeGraph([
    {
      assertion: "manifest dependencies observed",
      payload: { dependencies: ["react", "next"] },
    },
  ])
  const model = projectProjectModel(graph, {})

  const frameworkNames = model.frameworks.map((f) => f.name)
  assert.ok(frameworkNames.includes("React"))
  assert.ok(frameworkNames.includes("Next.js"))
})

test("project model infers Node.js runtime", () => {
  const graph = makeGraph([{ assertion: "Node.js project manifest present" }])
  const model = projectProjectModel(graph, {})

  assert.strictEqual(model.runtimes.length, 1)
  assert.strictEqual(model.runtimes[0].name, "Node.js")
})

test("project model records unknowns when evidence is sparse", () => {
  const graph = makeGraph([{ assertion: "Source directory observed" }])
  const model = projectProjectModel(graph, {})

  assert.ok(model.unknowns.length > 0)
  assert.ok(model.unknowns.some((u) => u.includes("package manifest")))
})

test("project model references all evidence claim ids", () => {
  const graph = makeGraph([
    { assertion: "Source directory observed" },
    { assertion: "Documentation present" },
  ])
  const model = projectProjectModel(graph, {})

  assert.strictEqual(model.evidenceClaimReferences.length, 2)
})

test("project model includes knowledge inventory", () => {
  const graph = makeGraph([
    { assertion: "Documentation present" },
    { assertion: "Architecture documentation present" },
  ])
  const model = projectProjectModel(graph, {})

  const kinds = model.knowledgeInventory.map((k) => k.kind)
  assert.ok(kinds.includes("readme"))
  assert.ok(kinds.includes("architecture"))
})
