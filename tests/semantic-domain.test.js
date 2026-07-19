// ============================================================
// Semantic Domain Modeling Tests
// ============================================================
// Regression guards for EXP-SEMANTIC-002:
//  - An IntentModel produces a DomainModel.
//  - The model contains entities, relationships, bounded contexts, etc.
//  - Ubiquitous language is generated.
//  - Integrity findings are deterministic.
//  - The same intent model produces the same domain model.
// ============================================================

import { extractIntent } from "../dist/first-contact/extract/index.js"
import { buildIntentModel } from "../dist/semantic-modeling/intent/index.js"
import { buildDomainModel, RuleBasedDomainModelingAdapter } from "../dist/semantic-modeling/domain/index.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

function makeIntentModel(intentText) {
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
  return buildIntentModel({ artifact })
}

function testProducesDomainModel() {
  const intentModel = makeIntentModel("Build a space mission tracker in TypeScript for the web.")
  const model = buildDomainModel({ intentModel })

  assert(model.schema === "synth-domain-model-v1", "model should use correct schema")
  assert(model.entities.length > 0, "model should contain entities")
  assert(model.ubiquitousLanguage.length > 0, "model should contain ubiquitous language terms")
  assert(Array.isArray(model.integrityFindings), "model should report integrity findings")
  console.log("[PASS] produces a DomainModel from an IntentModel")
}

function testContainsExpectedElements() {
  const intentModel = makeIntentModel("Build a markdown editor in TypeScript.")
  intentModel.graph.nodes.push({
    id: "stakeholder-user",
    type: "stakeholder",
    label: "End User",
    kind: "primary",
    confidence: 0.9,
    evidence: ["audience"],
    source: "test",
  })
  intentModel.graph.edges.push({
    id: "edge-user-goal",
    source: "stakeholder-user",
    target: intentModel.graph.nodes.find((n) => n.type === "goal").id,
    type: "owns",
  })

  const model = buildDomainModel({ intentModel })
  assert(model.entities.length > 0, "model should contain entities")
  assert(model.boundedContexts.length > 0, "model should contain bounded contexts")
  assert(model.aggregates.length > 0, "model should contain aggregates")
  assert(model.events.length > 0, "model should contain domain events")
  console.log("[PASS] domain model contains expected elements")
}

function testUbiquitousLanguage() {
  const intentModel = makeIntentModel("Build a task manager for teams.")
  const model = buildDomainModel({ intentModel })

  const names = model.ubiquitousLanguage.map((t) => t.canonicalName)
  assert(names.some((n) => n.toLowerCase().includes("task") || n.toLowerCase().includes("manager")), "language should include task or manager")
  assert(model.ubiquitousLanguage.every((t) => t.definition.length > 0), "every term should have a definition")
  assert(model.ubiquitousLanguage.every((t) => t.owner.length > 0), "every term should have an owner")
  console.log("[PASS] ubiquitous language is generated with definitions and owners")
}

function testIntegrityFindings() {
  const intentModel = makeIntentModel("Build a mission tracker for controllers and operators.")
  // Force two stakeholder contexts that both reference the same entity.
  const controller = intentModel.graph.nodes.find((n) => n.type === "stakeholder" && n.label.toLowerCase().includes("controllers"))
  const operator = intentModel.graph.nodes.find((n) => n.type === "stakeholder" && n.label.toLowerCase().includes("operators"))
  const goal = intentModel.graph.nodes.find((n) => n.type === "goal")
  if (controller && goal) {
    intentModel.graph.edges.push({ id: "edge-controller-goal", source: controller.id, target: goal.id, type: "owns" })
  }
  if (operator && goal) {
    intentModel.graph.edges.push({ id: "edge-operator-goal", source: operator.id, target: goal.id, type: "owns" })
  }

  const model = buildDomainModel({ intentModel })
  const conflict = model.integrityFindings.find((f) => f.class === "CONFLICTING_TERMINOLOGY")
  const unowned = model.integrityFindings.find((f) => f.class === "INCONSISTENT_OWNERSHIP")
  assert(conflict || unowned, "should detect conflicting terminology or inconsistent ownership")
  console.log("[PASS] integrity findings are produced")
}

function testDeterministicForSameIntentModel() {
  const intentModel = makeIntentModel("Build a weather dashboard in TypeScript.")
  const a = buildDomainModel({ intentModel })
  const b = buildDomainModel({ intentModel })

  assert(a.entities.length === b.entities.length, "entity count should match")
  assert(a.relationships.length === b.relationships.length, "relationship count should match")
  assert(a.ubiquitousLanguage.length === b.ubiquitousLanguage.length, "language count should match")
  assert(a.integrityFindings.length === b.integrityFindings.length, "finding count should match")

  const aEntityIds = a.entities.map((e) => e.id).sort()
  const bEntityIds = b.entities.map((e) => e.id).sort()
  assert(JSON.stringify(aEntityIds) === JSON.stringify(bEntityIds), "entity ids should match")
  console.log("[PASS] domain model is deterministic for the same intent model")
}

function testAdapterContract() {
  const adapter = new RuleBasedDomainModelingAdapter()
  assert(typeof adapter.id === "string", "adapter should expose id")
  assert(typeof adapter.version === "string", "adapter should expose version")

  const intentModel = makeIntentModel("Build a contact book.")
  const model = adapter.model({ intentModel })
  assert(model.schema === "synth-domain-model-v1", "adapter should produce correct schema")
  console.log("[PASS] adapter contract is satisfied")
}

async function main() {
  testProducesDomainModel()
  testContainsExpectedElements()
  testUbiquitousLanguage()
  testIntegrityFindings()
  testDeterministicForSameIntentModel()
  testAdapterContract()
  console.log("\n[SEMANTIC DOMAIN] All tests passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
