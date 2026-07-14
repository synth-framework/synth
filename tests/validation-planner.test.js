// ============================================================
// Validation Planner Tests
// ============================================================
// Verifies the planner produces deterministic, ordered validation
// plans from impact reports and the capability-validation map.
// ============================================================

import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PLANNER_PATH = path.resolve(__dirname, "..", "dist", "validation", "planner.js")
const MAP_PATH = path.resolve(__dirname, "..", "docs", "reference", "capability-validation-map.json")
const PACKAGE_PATH = path.resolve(__dirname, "..", "package.json")

async function loadJson(filePath) {
  const content = await fs.readFile(filePath, "utf-8")
  return JSON.parse(content)
}

async function loadPlanner() {
  return await import(PLANNER_PATH)
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function testProtectedAssetEscalation() {
  const { buildValidationPlan } = await loadPlanner()
  const map = await loadJson(MAP_PATH)
  const packageJson = await loadJson(PACKAGE_PATH)

  const plan = buildValidationPlan(
    {
      files: ["src/mission-studio/engine.ts"],
      affectedCapabilities: ["MissionStudio"],
      protectedAssets: ["Mission Studio"],
      risk: "high",
    },
    map,
    { availableScripts: Object.keys(packageJson.scripts) },
  )

  assert(plan.protectedAssetsTouched === true, "should flag Protected Asset touch")
  assert(plan.run.includes("govern"), "should run full govern")
  assert(plan.confidence === 1.0, "should have full confidence")
  assert(plan.reason.includes("Mission Studio"), "should explain escalation")
  console.log("[PASS] Protected Asset change escalates to full govern")
}

async function testDocumentationOnlyChange() {
  const { buildValidationPlan } = await loadPlanner()
  const map = await loadJson(MAP_PATH)
  const packageJson = await loadJson(PACKAGE_PATH)
  const scripts = Object.keys(packageJson.scripts)

  const plan = buildValidationPlan(
    {
      files: ["README.md", "docs/getting-started/README.md"],
      affectedCapabilities: ["Documentation"],
      protectedAssets: [],
      risk: "low",
    },
    map,
    { availableScripts: scripts },
  )

  assert(plan.risk === "low", `expected low risk, got ${plan.risk}`)
  assert(plan.run.length > 0, "should have at least one documentation check")
  assert(!plan.run.includes("test:replay"), "should skip replay")
  assert(!plan.run.includes("test:determinism"), "should skip determinism")
  assert(plan.skip.includes("test:replay"), "should list replay in skip")
  console.log("[PASS] Documentation-only change runs only documentation checks")
}

async function testTddAdapterChange() {
  const { buildValidationPlan } = await loadPlanner()
  const map = await loadJson(MAP_PATH)
  const packageJson = await loadJson(PACKAGE_PATH)
  const scripts = Object.keys(packageJson.scripts)

  const plan = buildValidationPlan(
    {
      files: ["src/adapters/tdd/adapter.ts", "tests/adapter-tdd.test.js"],
      affectedCapabilities: ["TddAdapter", "Tests"],
      protectedAssets: [],
      risk: "medium",
    },
    map,
    { availableScripts: scripts },
  )

  assert(plan.run.includes("test:tdd"), "should run TDD adapter tests")
  assert(plan.run.includes("test:adapter"), "should run adapter registry tests")
  assert(!plan.run.includes("test:replay"), "should skip replay")
  assert(plan.skip.includes("test:replay"), "should list replay in skip")
  console.log("[PASS] TDD adapter change runs adapter tests and skips replay")
}

async function testRuntimeChange() {
  const { buildValidationPlan } = await loadPlanner()
  const map = await loadJson(MAP_PATH)
  const packageJson = await loadJson(PACKAGE_PATH)
  const scripts = Object.keys(packageJson.scripts)

  const plan = buildValidationPlan(
    {
      files: ["src/runtime/executor.ts"],
      affectedCapabilities: ["Runtime"],
      protectedAssets: ["Runtime"],
      risk: "high",
    },
    map,
    { availableScripts: scripts },
  )

  assert(plan.protectedAssetsTouched === true, "should flag Runtime as Protected Asset")
  assert(plan.run.includes("govern"), "should run full govern")
  console.log("[PASS] Runtime change produces full governance plan")
}

async function testOrdering() {
  const { buildValidationPlan } = await loadPlanner()
  const map = await loadJson(MAP_PATH)
  const packageJson = await loadJson(PACKAGE_PATH)
  const scripts = Object.keys(packageJson.scripts)

  const plan = buildValidationPlan(
    {
      files: ["src/adapters/tdd/adapter.ts"],
      affectedCapabilities: ["TddAdapter"],
      protectedAssets: [],
      risk: "medium",
    },
    map,
    { availableScripts: scripts },
  )

  if (plan.run.includes("typecheck") && plan.run.includes("test:tdd")) {
    const typecheckIndex = plan.run.indexOf("typecheck")
    const testIndex = plan.run.indexOf("test:tdd")
    assert(typecheckIndex < testIndex, "typecheck should run before unit tests")
  }

  console.log("[PASS] Plan ordering puts checks before tests")
}

async function testNoCapabilities() {
  const { buildValidationPlan } = await loadPlanner()
  const map = await loadJson(MAP_PATH)
  const packageJson = await loadJson(PACKAGE_PATH)
  const scripts = Object.keys(packageJson.scripts)

  const plan = buildValidationPlan(
    {
      files: [],
      affectedCapabilities: [],
      protectedAssets: [],
      risk: "low",
    },
    map,
    { availableScripts: scripts },
  )

  assert(plan.run.length <= 1, "should run at most minimal sanity check")
  assert(plan.confidence === 1.0, "should have full confidence for empty change")
  console.log("[PASS] Empty change produces minimal plan")
}

async function testUnknownCapability() {
  const { buildValidationPlan } = await loadPlanner()
  const map = await loadJson(MAP_PATH)
  const packageJson = await loadJson(PACKAGE_PATH)
  const scripts = Object.keys(packageJson.scripts)

  const plan = buildValidationPlan(
    {
      files: ["some/unknown/path.xyz"],
      affectedCapabilities: ["Unknown"],
      protectedAssets: [],
      risk: "medium",
    },
    map,
    { availableScripts: scripts },
  )

  assert(plan.run.length === 0 || plan.run.includes("test"), "unknown capability should produce empty or minimal plan")
  assert(plan.confidence < 1.0, "unknown capability should reduce confidence")
  console.log("[PASS] Unknown capability handled gracefully")
}

async function testConfidence() {
  const { buildValidationPlan } = await loadPlanner()
  const map = await loadJson(MAP_PATH)
  const packageJson = await loadJson(PACKAGE_PATH)
  const scripts = Object.keys(packageJson.scripts)

  const allMapped = buildValidationPlan(
    {
      files: ["src/adapters/tdd/adapter.ts"],
      affectedCapabilities: ["TddAdapter"],
      protectedAssets: [],
      risk: "medium",
    },
    map,
    { availableScripts: scripts },
  )

  const partiallyMapped = buildValidationPlan(
    {
      files: ["src/adapters/tdd/adapter.ts", "some/unknown/path.xyz"],
      affectedCapabilities: ["TddAdapter", "Unknown"],
      protectedAssets: [],
      risk: "medium",
    },
    map,
    { availableScripts: scripts },
  )

  assert(allMapped.confidence > partiallyMapped.confidence, "full mapping should yield higher confidence")
  assert(allMapped.confidence >= 0.9, "fully mapped capability should have high confidence")
  console.log("[PASS] Confidence reflects mapping coverage")
}

async function main() {
  try {
    await fs.access(PLANNER_PATH)
  } catch {
    console.error(`[SKIP] Validation planner not built. Run 'npm run build' first.`)
    process.exit(0)
  }

  await testProtectedAssetEscalation()
  await testDocumentationOnlyChange()
  await testTddAdapterChange()
  await testRuntimeChange()
  await testOrdering()
  await testNoCapabilities()
  await testUnknownCapability()
  await testConfidence()

  console.log("\n[VALIDATION PLANNER] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
