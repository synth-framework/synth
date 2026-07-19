// ============================================================
// Canonical Knowledge Validation Tests
// ============================================================
// Regression guards for EXP-KNOWLEDGE-002:
//  - A KnowledgeGraph produces a ValidationReport.
//  - Acceptance scenarios are generated from objectives.
//  - Mock APIs are generated from domain events.
//  - Simulations are deterministic.
//  - Runtime verification reports capability availability.
// ============================================================

import { extractIntent } from "../dist/first-contact/extract/index.js"
import { buildIntentModel } from "../dist/semantic-modeling/intent/index.js"
import { buildDomainModel } from "../dist/semantic-modeling/domain/index.js"
import { buildKnowledgeGraph } from "../dist/knowledge/index.js"
import { validateKnowledge, RuleBasedValidationAdapter } from "../dist/knowledge/validation/index.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

function makeKnowledgeGraph(intentText) {
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
  return buildKnowledgeGraph({ intentModel, domainModel })
}

function testProducesValidationReport() {
  const graph = makeKnowledgeGraph("Build a space mission tracker in TypeScript for the web.")
  const report = validateKnowledge({ knowledgeGraph: graph })

  assert(report.schema === "synth-validation-report-v1", "report should use correct schema")
  assert(report.scenarios.length > 0, "report should contain acceptance scenarios")
  assert(report.mockApi.length > 0, "report should contain mock API endpoints")
  assert(report.runtimeVerification.checks.length > 0, "report should contain runtime checks")
  assert(report.reportHash.length > 0, "report should have a hash")
  console.log("[PASS] produces a ValidationReport from a KnowledgeGraph")
}

function testScenariosTraceToObjectives() {
  const graph = makeKnowledgeGraph("Build a markdown editor in TypeScript.")
  const report = validateKnowledge({ knowledgeGraph: graph })

  const objectiveIds = new Set(graph.nodes.filter((n) => n.type === "Objective").map((n) => n.id))
  assert(
    report.scenarios.every((s) => objectiveIds.has(s.objectiveId)),
    "every scenario should trace to a knowledge graph objective",
  )
  console.log("[PASS] acceptance scenarios trace to objectives")
}

function testMockApiDerivedFromEvents() {
  const graph = makeKnowledgeGraph("Build a markdown editor in TypeScript.")
  const report = validateKnowledge({ knowledgeGraph: graph })

  const eventIds = new Set(graph.nodes.filter((n) => n.type === "Discovery" && n.label.endsWith("Event")).map((n) => n.id))
  assert(
    report.mockApi.every((api) => eventIds.has(api.derivedFromEventId)),
    "every mock API endpoint should derive from a domain event",
  )
  console.log("[PASS] mock API endpoints derive from domain events")
}

function testRuntimeVerificationForNode() {
  const graph = makeKnowledgeGraph("Build a space mission tracker in TypeScript for the web.")
  const report = validateKnowledge({ knowledgeGraph: graph })

  const nodeCheck = report.runtimeVerification.checks.find((c) => c.capability === "node")
  assert(nodeCheck, "runtime verification should check Node capability")
  assert(nodeCheck.status === "AVAILABLE", `Node should be available, got ${nodeCheck.status}`)
  console.log("[PASS] runtime verification detects Node availability")
}

function testDeterministicReport() {
  const graph = makeKnowledgeGraph("Build a weather dashboard in TypeScript.")
  const a = validateKnowledge({ knowledgeGraph: graph })
  const b = validateKnowledge({ knowledgeGraph: graph })

  assert(a.reportHash === b.reportHash, "report hash should be deterministic")
  assert(a.scenarios.length === b.scenarios.length, "scenario count should match")
  assert(a.mockApi.length === b.mockApi.length, "mock API count should match")
  console.log("[PASS] validation report is deterministic")
}

function testAdapterContract() {
  const adapter = new RuleBasedValidationAdapter()
  assert(typeof adapter.id === "string", "adapter should expose id")
  assert(typeof adapter.version === "string", "adapter should expose version")

  const graph = makeKnowledgeGraph("Build a calculator.")
  const report = adapter.validate({ knowledgeGraph: graph })
  assert(report.schema === "synth-validation-report-v1", "adapter should produce correct schema")
  console.log("[PASS] validation adapter contract is satisfied")
}

async function main() {
  testProducesValidationReport()
  testScenariosTraceToObjectives()
  testMockApiDerivedFromEvents()
  testRuntimeVerificationForNode()
  testDeterministicReport()
  testAdapterContract()
  console.log("\n[CANONICAL KNOWLEDGE VALIDATION] All tests passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
