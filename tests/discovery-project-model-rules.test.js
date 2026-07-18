// ============================================================
// DISCOVERY PROJECT MODEL RULES TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import {
  createDefaultProjectModelRules,
  createDefaultConfidenceRules,
  projectProjectModel,
  validateProjectModel,
} from "../dist/discovery/index.js"

function makeGraph(claimsData) {
  const claims = []
  const observations = []
  const edges = []

  for (let i = 0; i < claimsData.length; i++) {
    const { assertion, payload, source } = claimsData[i]
    const obsId = `obs-${i}`
    observations.push({
      id: obsId,
      adapterId: "discovery:filesystem",
      adapterVersion: "1.0.0",
      source: source ?? { type: "filesystem", path: "/my-project" },
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
      source: source ?? { type: "filesystem", path: "/my-project" },
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

function ruleById(id) {
  return createDefaultProjectModelRules().find((rule) => rule.id === id)
}

test("identity rule infers name from filesystem source path", () => {
  const graph = makeGraph([{ assertion: "Source directory observed" }])
  const rule = ruleById("project-model:identity")
  const updates = rule.infer(graph, {})

  assert.strictEqual(updates.length, 1)
  assert.strictEqual(updates[0].value.name, "my-project")
  assert.strictEqual(updates[0].value.id, "my-project")
})

test("identity rule does not fire without source directory claim", () => {
  const graph = makeGraph([])
  const rule = ruleById("project-model:identity")
  assert.strictEqual(rule.infer(graph, {}), undefined)
})

test("lifecycle rule infers implementation stage with tests", () => {
  const graph = makeGraph([
    { assertion: "Node.js project manifest present" },
    { assertion: "Tests directory observed" },
  ])
  const rule = ruleById("project-model:lifecycle")
  const updates = rule.infer(graph, {})

  assert.strictEqual(updates[0].value.value, "implementation")
  assert.strictEqual(updates[0].value.confidence.value, 0.95)
})

test("lifecycle rule infers specification stage from docs", () => {
  const graph = makeGraph([{ assertion: "Documentation present" }])
  const rule = ruleById("project-model:lifecycle")
  const updates = rule.infer(graph, {})

  assert.strictEqual(updates[0].value.value, "specification")
})

test("lifecycle rule falls back to unknown", () => {
  const graph = makeGraph([])
  const rule = ruleById("project-model:lifecycle")
  const updates = rule.infer(graph, {})

  assert.strictEqual(updates[0].value.value, "unknown")
})

test("language rule maps file extensions to languages", () => {
  const graph = makeGraph([
    { assertion: "File extension observed", payload: { extensions: ["ts", "js"] } },
  ])
  const rule = ruleById("project-model:language")
  const updates = rule.infer(graph, {})

  const names = updates.map((u) => u.value.name)
  assert.ok(names.includes("TypeScript"))
  assert.ok(names.includes("JavaScript"))
})

test("framework rule maps dependencies to frameworks", () => {
  const graph = makeGraph([
    { assertion: "manifest dependencies observed", payload: { dependencies: ["react", "next"] } },
  ])
  const rule = ruleById("project-model:framework")
  const updates = rule.infer(graph, {})

  const names = updates.map((u) => u.value.name)
  assert.ok(names.includes("React"))
  assert.ok(names.includes("Next.js"))
})

test("runtime rule infers Node.js from manifest", () => {
  const graph = makeGraph([{ assertion: "Node.js project manifest present" }])
  const rule = ruleById("project-model:runtime")
  const updates = rule.infer(graph, {})

  assert.strictEqual(updates[0].value.name, "Node.js")
})

test("capability rules infer testing and documentation", () => {
  const graph = makeGraph([
    { assertion: "Tests directory observed" },
    { assertion: "Documentation present" },
  ])
  const rules = createDefaultProjectModelRules().filter((r) => r.domain === "capability")
  const updates = rules.flatMap((rule) => rule.infer(graph, {}) ?? [])

  const names = updates.map((u) => u.value.name)
  assert.ok(names.includes("testing"))
  assert.ok(names.includes("documentation"))
})

test("knowledge rules infer readme, architecture, and docs inventory", () => {
  const graph = makeGraph([
    { assertion: "Documentation present" },
    { assertion: "Architecture documentation present" },
    { assertion: "Docs directory observed" },
  ])
  const rules = createDefaultProjectModelRules().filter((r) => r.domain === "knowledge")
  const updates = rules.flatMap((rule) => rule.infer(graph, {}) ?? [])

  const kinds = updates.map((u) => u.value.kind)
  assert.ok(kinds.includes("readme"))
  assert.ok(kinds.includes("architecture"))
  assert.ok(kinds.includes("docs"))
})

test("unknown manifest rule fires when manifest is missing", () => {
  const graph = makeGraph([{ assertion: "Source directory observed" }])
  const rule = ruleById("project-model:unknown:manifest")
  const updates = rule.infer(graph, {})

  assert.strictEqual(updates.length, 1)
  assert.match(updates[0].value, /package manifest/)
})

test("unknown findings rule fires when findings are empty", () => {
  const graph = makeGraph([{ assertion: "Source directory observed" }])
  const rule = ruleById("project-model:unknown:findings")
  const updates = rule.infer(graph, { findings: { schema: "synth-discovery-findings-v1", items: [] } })

  assert.strictEqual(updates.length, 1)
  assert.match(updates[0].value, /No findings synthesized/)
})

test("default confidence rules pass through rule confidence", () => {
  const confidenceRules = createDefaultConfidenceRules()
  const update = {
    field: "lifecycleStage",
    value: "implementation",
    confidence: { value: 0.85, label: "high", kind: "derived", reason: "test" },
    evidenceClaimIds: [],
  }
  const rule = confidenceRules.find((r) => r.appliesTo === "lifecycle")

  assert.deepStrictEqual(rule.compute(update, makeGraph([])), update.confidence)
})

test("projectProjectModel assembles a validated model", () => {
  const graph = makeGraph([
    { assertion: "Source directory observed" },
    { assertion: "Node.js project manifest present" },
    { assertion: "File extension observed", payload: { extensions: ["ts"] } },
  ])
  const priorOutputs = { findings: { schema: "synth-discovery-findings-v1", items: [] } }
  const model = projectProjectModel(graph, priorOutputs, "Build a tracker")

  assert.strictEqual(model.identity.name, "my-project")
  assert.strictEqual(model.lifecycleStage.value, "implementation")
  assert.strictEqual(model.intent.statement, "Build a tracker")
  assert.ok(model.languages.some((l) => l.name === "TypeScript"))
  assert.ok(model.evidenceClaimReferences.length > 0)
})

test("validateProjectModel rejects invalid confidence and missing evidence", () => {
  const graph = makeGraph([{ assertion: "Source directory observed" }])
  const model = projectProjectModel(graph, {}, "test")
  const { valid, errors } = validateProjectModel(model, graph)

  assert.strictEqual(valid, true)
  assert.deepStrictEqual(errors, [])
})
