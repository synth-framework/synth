// ============================================================
// Protected Asset Escalation Tests
// ============================================================
// Verifies that changes to any Protected Asset (ADR-004) force the
// full governance plan, and that non-protected changes do not.
// ============================================================

import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROTECTED_ASSETS_PATH = path.resolve(__dirname, "..", "dist", "governance", "protected-assets.js")
const ANALYZER_PATH = path.resolve(__dirname, "..", "dist", "governance", "impact-analyzer.js")
const PLANNER_PATH = path.resolve(__dirname, "..", "dist", "validation", "planner.js")
const MAP_PATH = path.resolve(__dirname, "..", "docs", "reference", "capability-validation-map.json")
const PACKAGE_PATH = path.resolve(__dirname, "..", "package.json")

async function loadJson(filePath) {
  const content = await fs.readFile(filePath, "utf-8")
  return JSON.parse(content)
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function testCatalogMatchesAdr004() {
  const { PROTECTED_ASSETS } = await import(PROTECTED_ASSETS_PATH)
  const names = PROTECTED_ASSETS.map((a) => a.name)

  assert(names.includes("Mission Studio"), "catalog includes Mission Studio")
  assert(names.includes("Genesis"), "catalog includes Genesis")
  assert(names.includes("Replay"), "catalog includes Replay")
  assert(names.includes("ExecutionGate"), "catalog includes ExecutionGate")
  assert(names.includes("Capability Model"), "catalog includes Capability Model")
  assert(names.includes("Constitutional Baseline"), "catalog includes Constitutional Baseline")
  assert(names.includes("Public Vocabulary"), "catalog includes Public Vocabulary")

  console.log("[PASS] Protected Asset catalog matches ADR-004")
}

async function testEachProtectedAssetPathEscalates() {
  const { analyzeFiles } = await import(ANALYZER_PATH)
  const { buildValidationPlan } = await import(PLANNER_PATH)
  const map = await loadJson(MAP_PATH)
  const packageJson = await loadJson(PACKAGE_PATH)
  const scripts = Object.keys(packageJson.scripts)

  const cases = [
    { file: "src/mission-studio/engine.ts", expected: "Mission Studio" },
    { file: "src/genesis/intake.ts", expected: "Genesis" },
    { file: "src/core/replay-verifier.ts", expected: "Replay" },
    { file: "src/runtime/executor.ts", expected: "Runtime" },
    { file: "src/control/execution-gate.ts", expected: "ExecutionGate" },
    { file: "src/types/event.ts", expected: "Event Model" },
    { file: "src/capability/registry.ts", expected: "Capability Model" },
    { file: "docs/architecture/constitution.md", expected: "Constitutional Baseline" },
    { file: "docs/adr/ADR-004-synth-eras-and-protected-assets.md", expected: "Constitutional Baseline" },
    { file: "docs/reference/public-vocabulary.md", expected: "Public Vocabulary" },
  ]

  for (const { file, expected } of cases) {
    const report = analyzeFiles([file])
    assert(report.protectedAssets.includes(expected), `${file} should flag ${expected}`)
    assert(report.risk === "high", `${file} should escalate to high risk`)

    const plan = buildValidationPlan(report, map, { availableScripts: scripts })
    assert(plan.protectedAssetsTouched === true, `${file} should produce protectedAssetsTouched`)
    assert(plan.run.includes("govern"), `${file} should run full govern`)
    assert(plan.reason.includes(expected), `${file} reason should name ${expected}`)
  }

  console.log("[PASS] Each Protected Asset path escalates to full govern")
}

async function testNonProtectedChangeDoesNotEscalate() {
  const { analyzeFiles } = await import(ANALYZER_PATH)
  const { buildValidationPlan } = await import(PLANNER_PATH)
  const map = await loadJson(MAP_PATH)
  const packageJson = await loadJson(PACKAGE_PATH)
  const scripts = Object.keys(packageJson.scripts)

  const report = analyzeFiles(["README.md", "docs/getting-started/README.md"])
  assert(report.protectedAssets.length === 0, "README/docs should not touch Protected Assets")
  assert(report.risk === "low", "README/docs should be low risk")

  const plan = buildValidationPlan(report, map, { availableScripts: scripts })
  assert(plan.protectedAssetsTouched === false, "README/docs should not escalate")
  assert(!plan.run.includes("govern"), "README/docs should not run full govern")

  console.log("[PASS] Non-protected change does not escalate")
}

async function testMixedChangeEscalates() {
  const { analyzeFiles } = await import(ANALYZER_PATH)
  const { buildValidationPlan } = await import(PLANNER_PATH)
  const map = await loadJson(MAP_PATH)
  const packageJson = await loadJson(PACKAGE_PATH)
  const scripts = Object.keys(packageJson.scripts)

  const report = analyzeFiles(["README.md", "src/runtime/executor.ts"])
  assert(report.protectedAssets.includes("Runtime"), "mixed change should flag Runtime")
  assert(report.risk === "high", "mixed change should escalate to high risk")

  const plan = buildValidationPlan(report, map, { availableScripts: scripts })
  assert(plan.protectedAssetsTouched === true, "mixed change should produce protectedAssetsTouched")
  assert(plan.run.includes("govern"), "mixed change should run full govern")

  console.log("[PASS] Mixed protected + non-protected change escalates")
}

async function testMultipleProtectedAssetsNamed() {
  const { analyzeFiles } = await import(ANALYZER_PATH)
  const { buildValidationPlan } = await import(PLANNER_PATH)
  const map = await loadJson(MAP_PATH)
  const packageJson = await loadJson(PACKAGE_PATH)
  const scripts = Object.keys(packageJson.scripts)

  const report = analyzeFiles(["src/mission-studio/engine.ts", "src/runtime/executor.ts"])
  assert(report.protectedAssets.includes("Mission Studio"), "should flag Mission Studio")
  assert(report.protectedAssets.includes("Runtime"), "should flag Runtime")

  const plan = buildValidationPlan(report, map, { availableScripts: scripts })
  assert(plan.reason.includes("Mission Studio"), "reason should name Mission Studio")
  assert(plan.reason.includes("Runtime"), "reason should name Runtime")

  console.log("[PASS] Multiple Protected Assets named in escalation reason")
}

async function main() {
  for (const file of [PROTECTED_ASSETS_PATH, ANALYZER_PATH, PLANNER_PATH]) {
    try {
      await fs.access(file)
    } catch {
      console.error(`[SKIP] Required module not built: ${file}. Run 'npm run build' first.`)
      process.exit(0)
    }
  }

  await testCatalogMatchesAdr004()
  await testEachProtectedAssetPathEscalates()
  await testNonProtectedChangeDoesNotEscalate()
  await testMixedChangeEscalates()
  await testMultipleProtectedAssetsNamed()

  console.log("\n[PROTECTED ASSET ESCALATION] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
