// ============================================================
// Canonical Knowledge Graph Tests
// ============================================================
// Regression guards for EXP-KNOWLEDGE-001:
//  - Intent + Domain models produce a KnowledgeGraph.
//  - Graph nodes align with SKR types.
//  - Projections are deterministic.
//  - Drift detection reports expected findings.
// ============================================================

import { extractIntent } from "../dist/first-contact/extract/index.js"
import { buildIntentModel } from "../dist/semantic-modeling/intent/index.js"
import { buildDomainModel } from "../dist/semantic-modeling/domain/index.js"
import { buildKnowledgeGraph, projectKnowledge, detectDrift, RuleBasedKnowledgeAdapter } from "../dist/knowledge/index.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

function makeModels(intentText) {
  const artifact = extractIntent(intentText)
  artifact.id = artifact.id || "artifact-test-001"
  artifact.audience.primaryUsers = artifact.audience.primaryUsers.length
    ? artifact.audience.primaryUsers
    : ["operators"]
  artifact.audience.stakeholders = artifact.audience.stakeholders.length
    ? artifact.audience.stakeholders
    : ["team"]
  artifact.intent.goals = artifact.intent.goals.length ? artifact.intent.goals : ["achieve the objective"]
  artifact.intent.successCriteria = artifact.intent.successCriteria.length
    ? artifact.intent.successCriteria
    : ["system works"]
  artifact.constraints.functional = artifact.constraints.functional.length
    ? artifact.constraints.functional
    : ["support core workflow"]
  artifact.constraints.nonFunctional = artifact.constraints.nonFunctional.length
    ? artifact.constraints.nonFunctional
    : ["respond quickly"]

  const intentModel = buildIntentModel({ artifact })
  const domainModel = buildDomainModel({ intentModel })
  return { intentModel, domainModel }
}

function testBuildsKnowledgeGraph() {
  const { intentModel, domainModel } = makeModels("Build a space mission tracker in TypeScript for the web.")
  const graph = buildKnowledgeGraph({ intentModel, domainModel })

  assert(graph.schema === "synth-knowledge-graph-v1", "graph should use correct schema")
  assert(graph.nodes.length > 0, "graph should contain nodes")
  assert(graph.edges.length > 0, "graph should contain edges")
  assert(graph.version, "graph should have a version")
  console.log("[PASS] builds a Canonical Knowledge Graph")
}

function testContainsSKRNodeTypes() {
  const { intentModel, domainModel } = makeModels("Build a markdown editor in TypeScript.")
  const graph = buildKnowledgeGraph({ intentModel, domainModel })
  const types = new Set(graph.nodes.map((n) => n.type))

  assert(types.has("Mission"), "graph should contain Mission nodes")
  assert(types.has("Objective"), "graph should contain Objective nodes")
  assert(types.has("Constraint"), "graph should contain Constraint nodes")
  assert(types.has("Observation"), "graph should contain Observation nodes")
  assert(types.has("Decision"), "graph should contain Decision nodes")
  assert(types.has("Discovery"), "graph should contain Discovery nodes")
  assert(types.has("Artifact"), "graph should contain Artifact nodes")
  console.log("[PASS] graph contains SKR-aligned node types")
}

function testProjectsMissionAndExpeditions() {
  const { intentModel, domainModel } = makeModels("Build a task manager for teams.")
  const graph = buildKnowledgeGraph({ intentModel, domainModel })
  const projections = projectKnowledge(graph)

  assert(projections.mission, "projections should contain a mission")
  assert(projections.mission.objectives.length > 0, "mission should have objectives")
  assert(projections.expeditions.length >= 2, "projections should contain at least two expeditions")
  console.log("[PASS] projections generate mission and expeditions")
}

function testProjectsAdrsAndDocs() {
  const { intentModel, domainModel } = makeModels("Build a contact book in TypeScript.")
  const graph = buildKnowledgeGraph({ intentModel, domainModel })
  const projections = projectKnowledge(graph)

  assert(projections.adrs.length > 0, "projections should contain ADRs")
  assert(projections.documentation.length > 0, "projections should contain documentation")
  console.log("[PASS] projections generate ADRs and documentation")
}

function testDeterministicProjections() {
  const { intentModel, domainModel } = makeModels("Build a weather dashboard in TypeScript.")
  const graph = buildKnowledgeGraph({ intentModel, domainModel })
  const a = projectKnowledge(graph)
  const b = projectKnowledge(graph)

  assert(JSON.stringify(a) === JSON.stringify(b), "projections should be deterministic")
  console.log("[PASS] projections are deterministic")
}

function testDetectsRequirementsDrift() {
  const { intentModel, domainModel } = makeModels("Build a note-taking app in TypeScript.")
  const graph = buildKnowledgeGraph({ intentModel, domainModel })
  const projections = projectKnowledge(graph)

  // Remove an objective node from the graph to simulate drift.
  const objectiveToRemove = graph.nodes.find((n) => n.type === "Objective")
  if (objectiveToRemove) {
    graph.nodes = graph.nodes.filter((n) => n.id !== objectiveToRemove.id)
  }

  const drift = detectDrift(graph, projections)
  const requirementsDrift = drift.find((d) => d.class === "REQUIREMENTS_DRIFT")
  assert(requirementsDrift, "should detect requirements drift when objective is missing")
  console.log("[PASS] drift detection reports requirements drift")
}

function testAdapterContract() {
  const adapter = new RuleBasedKnowledgeAdapter()
  assert(typeof adapter.id === "string", "adapter should expose id")
  assert(typeof adapter.version === "string", "adapter should expose version")

  const { intentModel, domainModel } = makeModels("Build a calculator.")
  const graph = adapter.buildGraph({ intentModel, domainModel })
  assert(graph.schema === "synth-knowledge-graph-v1", "adapter should produce correct schema")
  console.log("[PASS] adapter contract is satisfied")
}

async function main() {
  testBuildsKnowledgeGraph()
  testContainsSKRNodeTypes()
  testProjectsMissionAndExpeditions()
  testProjectsAdrsAndDocs()
  testDeterministicProjections()
  testDetectsRequirementsDrift()
  testAdapterContract()
  console.log("\n[CANONICAL KNOWLEDGE] All tests passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
