// ============================================================
// EXP-GOVERNABILITY-003 — Proposal Evaluation Capability Tests
// ============================================================
// Exercises all 12 replay branches from the Program 027 Replay
// Specification through the public EvaluateAndResolveDivergenceGate
// capability and the pure evaluateProposal function.

import { strict as assert } from "assert"
import path from "path"
import { promises as fs } from "fs"
import { bootstrap } from "../dist/core/bootstrap.js"
import {
  createIntentModel,
  createAlignmentContract,
  approveAlignmentContract,
} from "./helpers/alignment-fixture.js"
import { buildDerivedState } from "../dist/state/derived/index.js"
import { buildProposal } from "../dist/governance/proposal-evaluation/rules/program-027.js"
import { evaluateProposal, program027RuleSet } from "../dist/governance/proposal-evaluation/index.js"

let ctxCounter = 0

function makeDataDir() {
  return path.join(process.cwd(), "data-test-proposal-evaluation", `run-${ctxCounter++}`)
}

async function cleanData() {
  const base = path.join(process.cwd(), "data-test-proposal-evaluation")
  try { await fs.rm(base, { recursive: true }) } catch { /* ok */ }
}

async function makeCtx() {
  const dataDir = makeDataDir()
  return bootstrap({
    infra: {
      eventLogPath: path.join(dataDir, "event-log.jsonl"),
      statePath: path.join(dataDir, "canonical-state.json"),
      checkpointPath: path.join(dataDir, "checkpoint.json"),
    },
    genesis: { projectName: "Proposal Evaluation Test", systemId: "proposal-eval-test", partitions: 1 },
    skipGenesis: false,
  })
}

const TESTS = []
let passed = 0
let failed = 0

function test(name, fn) { TESTS.push({ name, fn }) }

async function run() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  EXP-GOVERNABILITY-003 — Proposal Evaluation")
  console.log("═══════════════════════════════════════════════════\n")

  for (const t of TESTS) {
    try {
      await t.fn()
      console.log(`  [PASS] ${t.name}`)
      passed++
    } catch (err) {
      console.log(`  [FAIL] ${t.name}`)
      console.log(`         ${err.message || err}`)
      failed++
    }
  }

  console.log("\n═══════════════════════════════════════════════════")
  console.log(`  Results: ${passed} passed, ${failed} failed`)
  console.log("═══════════════════════════════════════════════════\n")

  if (failed > 0) process.exit(1)
}

async function createApprovedContractAndOpenGate(ctx) {
  const { intentModelId } = await createIntentModel(ctx)
  const { contractId } = await createAlignmentContract(ctx, intentModelId)
  await approveAlignmentContract(ctx, contractId)

  const openResult = await ctx.api.handleIntent({
    actor: "test",
    capability: "OpenDivergenceGate",
    payload: { contractId, intentModelId },
  })
  assert.equal(openResult.status, "ok", `OpenDivergenceGate should succeed: ${openResult.error}`)

  const events = await ctx.infra.eventStore.loadAll()
  const opened = events
    .slice()
    .reverse()
    .find((e) => e.type === "DIVERGENCE_GATE_OPENED" && e.payload.contractId === contractId)
  assert.ok(opened, "DIVERGENCE_GATE_OPENED event should exist")

  return { contractId, intentModelId, gateId: opened.payload.gateId }
}

async function evaluateGate(ctx, gateId, proposal) {
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "EvaluateAndResolveDivergenceGate",
    payload: {
      gateId,
      proposal,
      ruleSetId: "program-027-homepage",
      reviewer: { kind: "engine", id: "proposal-evaluation-capability" },
    },
  })

  assert.equal(result.status, "ok", `EvaluateAndResolveDivergenceGate should succeed: ${result.error}`)
  const events = await ctx.infra.eventStore.loadAll()
  const resolved = events.slice().reverse().find((e) => e.type === "DIVERGENCE_GATE_RESOLVED")
  assert.ok(resolved, "DIVERGENCE_GATE_RESOLVED event should exist")
  return resolved.payload
}

function assertEvaluationShape(evaluation) {
  assert.ok(evaluation, "Evaluation payload should exist")
  assert.ok(["aligned", "revision_required", "rejected"].includes(evaluation.decision), `Unexpected decision: ${evaluation.decision}`)
  assert.equal(typeof evaluation.confidence, "number", "Confidence should be a number")
  assert.ok(evaluation.confidence >= 0 && evaluation.confidence <= 1, "Confidence should be in [0, 1]")
  assert.ok(Array.isArray(evaluation.matchedDriftClasses), "matchedDriftClasses should be an array")
  assert.ok(Array.isArray(evaluation.reasoning), "reasoning should be an array")
  assert.ok(evaluation.reasoning.length > 0, "reasoning should not be empty")
}

// ------------------------------------------------------------------
// Drift-class replay branches (must be rejected)
// ------------------------------------------------------------------

const DRIFT_BRANCHES = [
  {
    branchId: "D01",
    name: "Generic dashboard drift",
    features: {
      hasMetricCards: true,
      hasPromotionalBanners: true,
      hasDisconnectedWidgets: true,
    },
  },
  {
    branchId: "D02",
    name: "Marketing-first landing",
    features: {
      hasMarketingHero: true,
      hasFeatureGrid: true,
      hasMissionStudioAsSection: true,
    },
  },
  {
    branchId: "D03",
    name: "Chat-primary interface",
    features: {
      hasChatPrimaryInteraction: true,
      hasDecorativeAiImagery: true,
    },
  },
  {
    branchId: "D04",
    name: "Page-jump navigation",
    features: {
      hasSeparateLifecyclePages: true,
      hasPageJumpNavigation: true,
    },
  },
  {
    branchId: "D05",
    name: "Storybook aesthetic",
    features: {
      hasComponentGrid: true,
      hasIsolatedSpecimens: true,
    },
  },
  {
    branchId: "D06",
    name: "Placeholder artifacts",
    features: {
      hasFakeTerminalOutput: true,
      hasMockData: true,
      hasPlaceholderScreenshots: true,
    },
  },
  {
    branchId: "D07",
    name: "Hardcoded values",
    features: {
      hasHardcodedColors: true,
      hasHardcodedSpacing: true,
      hasNonTokenTypography: true,
    },
  },
  {
    branchId: "D08",
    name: "Workspace dilution",
    features: {
      hasMissionStudioShell: true,
      hasDominantMarketingContent: true,
    },
  },
]

for (const branch of DRIFT_BRANCHES) {
  test(`[${branch.branchId}] ${branch.name} is rejected`, async () => {
    const ctx = await makeCtx()
    const { gateId } = await createApprovedContractAndOpenGate(ctx)
    const payload = await evaluateGate(ctx, gateId, buildProposal(branch.features))

    assert.equal(payload.decision, "rejected", `Expected rejected, got ${payload.decision}`)
    assertEvaluationShape(payload.evaluation)
    assert.ok(
      payload.evaluation.matchedDriftClasses.includes(branch.branchId),
      `Expected matchedDriftClasses to include ${branch.branchId}, got ${JSON.stringify(payload.evaluation.matchedDriftClasses)}`
    )
  })
}

// ------------------------------------------------------------------
// Valid-branch replay branches (must remain admissible)
// ------------------------------------------------------------------

const VALID_BRANCHES = [
  {
    branchId: "V01",
    name: "Persistent workspace",
    features: {
      hasPersistentHeader: true,
      hasPersistentSidebar: true,
      hasScrollDrivenPhases: true,
    },
  },
  {
    branchId: "V02",
    name: "Hero invitation",
    features: {
      hasPersistentHeader: true,
      hasPersistentSidebar: true,
      hasScrollDrivenPhases: true,
      hasShortHero: true,
      hasHeroCtaIntoWorkspace: true,
      hasPersistentWorkspace: true,
    },
  },
  {
    branchId: "V03",
    name: "Deterministic demo",
    features: {
      hasPersistentHeader: true,
      hasPersistentSidebar: true,
      hasScrollDrivenPhases: true,
      hasDemoOperatorAdapter: true,
      hasDeterministicExecution: true,
    },
  },
  {
    branchId: "V04",
    name: "Light-theme default",
    features: {
      hasPersistentHeader: true,
      hasPersistentSidebar: true,
      hasScrollDrivenPhases: true,
      hasLightThemeDefault: true,
      hasOptionalDarkMode: true,
    },
  },
]

for (const branch of VALID_BRANCHES) {
  test(`[${branch.branchId}] ${branch.name} is aligned`, async () => {
    const ctx = await makeCtx()
    const { gateId } = await createApprovedContractAndOpenGate(ctx)
    const payload = await evaluateGate(ctx, gateId, buildProposal(branch.features))

    assert.equal(payload.decision, "aligned", `Expected aligned, got ${payload.decision}`)
    assertEvaluationShape(payload.evaluation)
    assert.equal(payload.evaluation.matchedDriftClasses.length, 0, "Valid branches should not match drift classes")
  })
}

// ------------------------------------------------------------------
// Capability-level invariants
// ------------------------------------------------------------------

test("evaluateProposal is deterministic for the same inputs", async () => {
  const proposal = buildProposal({
    hasMetricCards: true,
    hasPromotionalBanners: true,
    hasDisconnectedWidgets: true,
  })

  const ctx = await makeCtx()
  const { contractId } = await createApprovedContractAndOpenGate(ctx)
  const events = await ctx.infra.eventStore.loadAll()
  const derived = buildDerivedState(events)
  const contract = derived.alignmentContracts[contractId]
  assert.ok(contract, "Alignment contract should exist in derived state")

  const first = evaluateProposal(proposal, contract, program027RuleSet)
  const second = evaluateProposal(proposal, contract, program027RuleSet)

  assert.equal(first.decision, second.decision)
  assert.equal(first.confidence, second.confidence)
  assert.deepStrictEqual(first.matchedDriftClasses, second.matchedDriftClasses)
  assert.deepStrictEqual(first.reasoning, second.reasoning)
  assert.equal(first.deterministic, true)
  assert.equal(second.deterministic, true)
})

test("EvaluateAndResolveDivergenceGate blocks Mission approval after rejection", async () => {
  const ctx = await makeCtx()
  await ctx.api.handleIntent({ actor: "test", capability: "CreateMission", payload: { id: "M-DRIFTED", name: "Drifted Mission" } })
  const { contractId, gateId } = await createApprovedContractAndOpenGate(ctx)

  await evaluateGate(ctx, gateId, buildProposal({
    hasMetricCards: true,
    hasPromotionalBanners: true,
    hasDisconnectedWidgets: true,
  }))

  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: "M-DRIFTED", alignmentContractId: contractId },
  })

  assert.equal(result.status, "error", "Mission approval should fail after gate rejection")
  assert.ok(result.error.includes("DIVERGENCE_GATE_NOT_ALIGNED"), `Expected DIVERGENCE_GATE_NOT_ALIGNED, got ${result.error}`)
})

test("EvaluateAndResolveDivergenceGate permits Mission approval after alignment", async () => {
  const ctx = await makeCtx()
  await ctx.api.handleIntent({ actor: "test", capability: "CreateMission", payload: { id: "M-ALIGNED-VIA-EVAL", name: "Aligned Mission" } })
  const { contractId, gateId } = await createApprovedContractAndOpenGate(ctx)

  await evaluateGate(ctx, gateId, buildProposal({
    hasPersistentHeader: true,
    hasPersistentSidebar: true,
    hasScrollDrivenPhases: true,
  }))

  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: "M-ALIGNED-VIA-EVAL", alignmentContractId: contractId },
  })

  assert.equal(result.status, "ok", `Mission approval should succeed after gate alignment: ${result.error}`)
  const state = await ctx.runtime.getState()
  assert.equal(state.missions["M-ALIGNED-VIA-EVAL"].status, "active", "Mission should be active")
})

await cleanData()
await run()
