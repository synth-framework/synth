// ============================================================
// INITIALIZATION ADAPTER CONTRACT TESTS
// ============================================================
// Validates the EXP-INIT-001 contract-only milestone:
//  - InitializationAdapter boundary exists
//  - ProjectModel is source-agnostic (semantic equivalence)
//  - Initialization cannot introduce implementation assumptions
//  - Missing evidence remains unknown
//  - Initialization cannot create expeditions, missions, or work items
// ============================================================

import { test } from "node:test"
import assert from "node:assert"

import {
  createProjectModel,
  areProjectModelsEquivalent,
  PROJECT_MODEL_SCHEMA_VERSION,
} from "../dist/initialization/project-model.js"

import {
  evidenceToProjectModelInput,
} from "../dist/adapters/initialization-adapter.js"

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function createFilesystemAdapter() {
  return {
    id: "filesystem",
    version: "1.0.0",
    canHandle(input) {
      return input.sourceType === "filesystem"
    },
    async collectEvidence(input) {
      return {
        adapterId: this.id,
        adapterVersion: this.version,
        sourceType: input.sourceType,
        lifecycleStage: "specification",
        intent: input.declaredIntent ?? "unknown",
        domains: [{ name: "hospitality", description: "Guest services" }],
        constraints: [{ type: "compliance", statement: "PCI-DSS required" }],
        summary: "Filesystem scan yielded specification artifacts",
        confidence: { value: 0.72, label: "medium" },
      }
    },
  }
}

function createConversationAdapter() {
  return {
    id: "conversation",
    version: "1.1.0",
    canHandle(input) {
      return input.sourceType === "conversation"
    },
    async collectEvidence(input) {
      return {
        adapterId: this.id,
        adapterVersion: this.version,
        sourceType: input.sourceType,
        lifecycleStage: "specification",
        intent: input.declaredIntent ?? "unknown",
        domains: [{ name: "hospitality", description: "Guest services" }],
        constraints: [{ type: "compliance", statement: "PCI-DSS required" }],
        summary: "Operator described a hospitality platform",
        confidence: { value: 0.8, label: "high" },
      }
    },
  }
}

function modelFromEvidence(evidence, identity) {
  const input = evidenceToProjectModelInput(evidence)
  input.identity = identity
  return createProjectModel(input)
}

// ------------------------------------------------------------
// Adapter contract
// ------------------------------------------------------------

test("InitializationAdapter has required contract fields", async () => {
  const adapter = createFilesystemAdapter()
  assert.strictEqual(adapter.id, "filesystem")
  assert.strictEqual(adapter.version, "1.0.0")
  assert.strictEqual(adapter.canHandle({ sourceType: "filesystem", sourceLocation: "." }), true)
  assert.strictEqual(adapter.canHandle({ sourceType: "conversation", sourceLocation: "." }), false)

  const evidence = await adapter.collectEvidence({
    sourceType: "filesystem",
    sourceLocation: "./knowledge",
    declaredIntent: "Build a hospitality platform",
  })
  assert.strictEqual(evidence.adapterId, "filesystem")
  assert.strictEqual(evidence.sourceType, "filesystem")
  assert.strictEqual(evidence.summary.length > 0, true)
})

// ------------------------------------------------------------
// Semantic equivalence
// ------------------------------------------------------------

test("Equivalent intent from different adapters produces equivalent ProjectModel", async () => {
  const identity = { id: "hospitality-platform", name: "Hospitality Platform" }
  const filesystem = createFilesystemAdapter()
  const conversation = createConversationAdapter()

  const fsEvidence = await filesystem.collectEvidence({
    sourceType: "filesystem",
    sourceLocation: "./knowledge",
    declaredIntent: "Build a hospitality platform",
  })
  const convEvidence = await conversation.collectEvidence({
    sourceType: "conversation",
    sourceLocation: "operator-session-1",
    declaredIntent: "Build a hospitality platform",
  })

  const fsModel = modelFromEvidence(fsEvidence, identity)
  const convModel = modelFromEvidence(convEvidence, identity)

  assert.strictEqual(areProjectModelsEquivalent(fsModel, convModel), true)
  assert.strictEqual(fsModel.intent.statement, "Build a hospitality platform")
  assert.strictEqual(convModel.intent.statement, "Build a hospitality platform")
  assert.strictEqual(fsModel.lifecycleStage, "specification")
  assert.strictEqual(convModel.lifecycleStage, "specification")
})

test("Different intent produces non-equivalent ProjectModel", async () => {
  const identity = { id: "hospitality-platform", name: "Hospitality Platform" }
  const filesystem = createFilesystemAdapter()

  const a = modelFromEvidence(
    await filesystem.collectEvidence({
      sourceType: "filesystem",
      sourceLocation: ".",
      declaredIntent: "Build a hospitality platform",
    }),
    identity,
  )
  const b = modelFromEvidence(
    await filesystem.collectEvidence({
      sourceType: "filesystem",
      sourceLocation: ".",
      declaredIntent: "Build a marketplace",
    }),
    identity,
  )

  assert.strictEqual(areProjectModelsEquivalent(a, b), false)
})

// ------------------------------------------------------------
// No implementation assumptions
// ------------------------------------------------------------

test("ProjectModel builder rejects framework metadata", () => {
  assert.throws(
    () =>
      createProjectModel({
        identity: { id: "x", name: "X" },
        intent: "Build something",
        metadata: { framework: "React Native" },
      }),
    /Implementation assumption detected/,
  )
})

test("ProjectModel builder rejects language metadata", () => {
  assert.throws(
    () =>
      createProjectModel({
        identity: { id: "x", name: "X" },
        intent: "Build something",
        metadata: { language: "TypeScript" },
      }),
    /Implementation assumption detected/,
  )
})

test("ProjectModel builder rejects platform and deployment metadata", () => {
  assert.throws(
    () =>
      createProjectModel({
        identity: { id: "x", name: "X" },
        intent: "Build something",
        metadata: { platform: "iOS", deployment: "Vercel" },
      }),
    /Implementation assumption detected/,
  )
})

// ------------------------------------------------------------
// Missing evidence remains unknown
// ------------------------------------------------------------

test("Empty evidence yields unknown lifecycle and intent", () => {
  const model = createProjectModel({
    identity: { id: "x", name: "X" },
  })

  assert.strictEqual(model.schemaVersion, PROJECT_MODEL_SCHEMA_VERSION)
  assert.strictEqual(model.lifecycleStage, "unknown")
  assert.strictEqual(model.intent.statement, "unknown")
  assert.deepStrictEqual(model.intent.targetOutcomes, [])
  assert.deepStrictEqual(model.domains, [])
  assert.deepStrictEqual(model.constraints, [])
  assert.deepStrictEqual(model.evidence, [])
  assert.strictEqual(model.confidence.label, "none")
  assert.strictEqual(model.confidence.value, 0)
})

test("Partial evidence preserves unknown fields", () => {
  const model = createProjectModel({
    identity: { id: "x", name: "X" },
    intent: "Build a hospitality platform",
  })

  assert.strictEqual(model.lifecycleStage, "unknown")
  assert.strictEqual(model.intent.statement, "Build a hospitality platform")
  assert.deepStrictEqual(model.domains, [])
  assert.deepStrictEqual(model.constraints, [])
})

// ------------------------------------------------------------
// Initialization cannot create governance artifacts
// ------------------------------------------------------------

test("ProjectModel builder rejects expedition metadata", () => {
  assert.throws(
    () =>
      createProjectModel({
        identity: { id: "x", name: "X" },
        intent: "Build something",
        metadata: { expedition: "EXP-001" },
      }),
    /Initialization cannot create/,
  )
})

test("ProjectModel builder rejects mission metadata", () => {
  assert.throws(
    () =>
      createProjectModel({
        identity: { id: "x", name: "X" },
        intent: "Build something",
        metadata: { mission: "MISSION-001" },
      }),
    /Initialization cannot create/,
  )
})

test("ProjectModel builder rejects work items metadata", () => {
  assert.throws(
    () =>
      createProjectModel({
        identity: { id: "x", name: "X" },
        intent: "Build something",
        metadata: { workItems: ["task-1"] },
      }),
    /Initialization cannot create/,
  )
})

test("ProjectModel has no expedition or mission fields", () => {
  const model = createProjectModel({
    identity: { id: "x", name: "X" },
    intent: "Build something",
  })

  assert.strictEqual("expedition" in model, false)
  assert.strictEqual("expeditions" in model, false)
  assert.strictEqual("mission" in model, false)
  assert.strictEqual("missions" in model, false)
  assert.strictEqual("workItems" in model, false)
})

// ------------------------------------------------------------
// Versioning
// ------------------------------------------------------------

test("ProjectModel carries schema version", () => {
  const model = createProjectModel({
    identity: { id: "x", name: "X" },
  })
  assert.strictEqual(model.schemaVersion, "1.0.0")
})

test("InitializationAdapter carries semantic version", async () => {
  const adapter = createConversationAdapter()
  assert.strictEqual(adapter.version, "1.1.0")
})
