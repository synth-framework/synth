// ============================================================
// Semantic Intent Modeling Tests
// ============================================================
// Regression guards for EXP-SEMANTIC-001:
//  - An approved Genesis artifact produces an IntentModel.
//  - The model contains expected node types.
//  - The intent graph links problems to goals.
//  - Ambiguities are detected deterministically.
//  - The same artifact produces the same model.
// ============================================================

import { extractIntent } from "../dist/first-contact/extract/index.js"
import { buildIntentModel, RuleBasedIntentModelingAdapter } from "../dist/semantic-modeling/intent/index.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

function makeApprovedArtifact(intentText) {
  const artifact = extractIntent(intentText)
  // Simulate approval: fill required clarification fields that the CLI would normally require.
  artifact.id = artifact.id || "artifact-test-001"
  artifact.audience.primaryUsers = artifact.audience.primaryUsers.length
    ? artifact.audience.primaryUsers
    : ["operators"]
  artifact.audience.stakeholders = artifact.audience.stakeholders.length
    ? artifact.audience.stakeholders
    : ["team"]
  return artifact
}

function testProducesIntentModel() {
  const artifact = makeApprovedArtifact("Build a space mission tracker in TypeScript for the web.")
  const model = buildIntentModel({ artifact })

  assert(model.schema === "synth-intent-model-v1", "model should use correct schema")
  assert(model.graph.nodes.length > 0, "model should contain nodes")
  assert(typeof model.aggregateConfidence === "number", "model should have aggregate confidence")
  assert(Array.isArray(model.ambiguities), "model should report ambiguities")
  console.log("[PASS] produces an IntentModel from a Genesis artifact")
}

function testContainsExpectedNodeTypes() {
  const artifact = makeApprovedArtifact("Build a markdown editor in TypeScript.")
  artifact.intent.goals = ["render markdown", "edit markdown"]
  artifact.intent.successCriteria = ["preview updates in real time"]
  artifact.constraints.functional = ["support GitHub-flavored markdown"]
  artifact.constraints.nonFunctional = ["load in under 1 second"]

  const model = buildIntentModel({ artifact })
  const types = new Set(model.graph.nodes.map((n) => n.type))

  assert(types.has("problem"), "model should contain problem nodes")
  assert(types.has("goal"), "model should contain goal nodes")
  assert(types.has("stakeholder"), "model should contain stakeholder nodes")
  assert(types.has("outcome"), "model should contain outcome nodes")
  assert(types.has("success-criterion"), "model should contain success-criterion nodes")
  assert(types.has("constraint"), "model should contain constraint nodes")
  console.log("[PASS] model contains expected node types")
}

function testLinksProblemsToGoals() {
  const artifact = makeApprovedArtifact("Build a space mission tracker.")
  artifact.intent.goals = ["track missions"]

  const model = buildIntentModel({ artifact })
  const problems = model.graph.nodes.filter((n) => n.type === "problem")
  const goals = model.graph.nodes.filter((n) => n.type === "goal")
  const problemIds = new Set(problems.map((n) => n.id))
  const goalIds = new Set(goals.map((n) => n.id))

  const derivesEdges = model.graph.edges.filter((e) => e.type === "derives")
  assert(derivesEdges.length > 0, "model should contain derives edges")
  assert(
    derivesEdges.every((e) => problemIds.has(e.source) && goalIds.has(e.target)),
    "derives edges should link problems to goals",
  )
  console.log("[PASS] intent graph links problems to goals")
}

function testDetectsMissingSuccessCriteria() {
  const artifact = makeApprovedArtifact("Build something.")
  artifact.intent.goals = ["do something"]
  artifact.intent.successCriteria = []

  const model = buildIntentModel({ artifact })
  const missing = model.ambiguities.find((a) => a.field === "intent.successCriteria")
  assert(missing, "model should report missing success criteria")
  assert(missing.blocking === true, "missing success criteria should be blocking")
  console.log("[PASS] ambiguity detection reports missing success criteria")
}

function testDeterministicForSameArtifact() {
  const artifact = makeApprovedArtifact("Build a space mission tracker in TypeScript for the web.")
  artifact.intent.goals = ["track missions"]
  artifact.intent.successCriteria = ["show mission status"]

  const a = buildIntentModel({ artifact })
  const b = buildIntentModel({ artifact })

  assert(a.graph.nodes.length === b.graph.nodes.length, "node count should match")
  assert(a.graph.edges.length === b.graph.edges.length, "edge count should match")
  assert(a.ambiguities.length === b.ambiguities.length, "ambiguity count should match")
  assert(a.aggregateConfidence === b.aggregateConfidence, "aggregate confidence should match")

  const aNodeIds = a.graph.nodes.map((n) => n.id).sort()
  const bNodeIds = b.graph.nodes.map((n) => n.id).sort()
  assert(JSON.stringify(aNodeIds) === JSON.stringify(bNodeIds), "node ids should match")
  console.log("[PASS] model is deterministic for the same artifact")
}

function testAdapterContract() {
  const adapter = new RuleBasedIntentModelingAdapter()
  assert(typeof adapter.id === "string", "adapter should expose id")
  assert(typeof adapter.version === "string", "adapter should expose version")

  const artifact = makeApprovedArtifact("Build a weather dashboard.")
  artifact.intent.goals = ["display forecasts"]
  artifact.intent.successCriteria = ["update every hour"]
  const model = adapter.model({ artifact })
  assert(model.schema === "synth-intent-model-v1", "adapter should produce correct schema")
  console.log("[PASS] adapter contract is satisfied")
}

async function main() {
  testProducesIntentModel()
  testContainsExpectedNodeTypes()
  testLinksProblemsToGoals()
  testDetectsMissingSuccessCriteria()
  testDeterministicForSameArtifact()
  testAdapterContract()
  console.log("\n[SEMANTIC INTENT] All tests passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
