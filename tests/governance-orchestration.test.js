// ============================================================
// GOVERNANCE ORCHESTRATION TESTS (EXP-PROGRAM-030)
// ============================================================
// Tests the intelligent governance orchestrator and its components:
// governance classes, certification profiles, explanations, and benchmarks.
// ============================================================

import assert from "assert"
import path from "path"
import { fileURLToPath } from "url"
import { runGovernanceOrchestrator } from "../scripts/governance/orchestrator.js"
import { getGovernanceClass, getFileGovernanceClass, getGovernanceClasses } from "../scripts/governance/governance-classes.js"
import { resolveProfile, resolveClassesForProfile, isValidatorInProfile } from "../scripts/governance/profiles.js"
import { explainReason, buildExplanationReport } from "../scripts/governance/explain.js"
import { buildBenchmark } from "../scripts/governance/benchmark.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, "..")

function testGovernanceClassMapping() {
  assert.strictEqual(getGovernanceClass("Documentation"), "documentation")
  assert.strictEqual(getGovernanceClass("Runtime"), "runtime")
  assert.strictEqual(getGovernanceClass("Compiler"), "compiler")
  assert.strictEqual(getGovernanceClass("MissionStudio"), "knowledge")
  assert.strictEqual(getGovernanceClass("GitHubAdapter"), "release")
  console.log("[PASS] governance class mapping")
}

function testFileGovernanceClass() {
  assert.strictEqual(getFileGovernanceClass("docs/getting-started.md"), "documentation")
  assert.strictEqual(getFileGovernanceClass("src/runtime/executor.ts"), "runtime")
  assert.strictEqual(getFileGovernanceClass("src/compiler/parser.ts"), "compiler")
  assert.strictEqual(getFileGovernanceClass("src/cli/synth.ts"), "kernel")
  assert.strictEqual(getFileGovernanceClass("website/index.html"), "documentation")
  console.log("[PASS] file governance class mapping")
}

function testGovernanceClassesAggregation() {
  const classes = getGovernanceClasses(["Runtime", "Compiler", "Documentation"])
  assert.ok(classes.includes("runtime"))
  assert.ok(classes.includes("compiler"))
  assert.ok(classes.includes("documentation"))
  console.log("[PASS] governance classes aggregation")
}

function testProfileResolution() {
  const profile = resolveProfile("pull-request")
  assert.strictEqual(profile.name, "pull-request")
  assert.ok(profile.requireProofs)

  const local = resolveProfile("local-fast")
  assert.strictEqual(local.name, "local-fast")
  assert.strictEqual(local.requireProofs, false)

  const unknown = resolveProfile("unknown-profile")
  assert.strictEqual(unknown.name, "pull-request")
  console.log("[PASS] profile resolution")
}

function testProfileClassFiltering() {
  const impacted = ["documentation"]
  const required = resolveClassesForProfile("pull-request", impacted)
  assert.ok(required.includes("documentation"))
  assert.ok(!required.includes("runtime"))

  const strict = resolveClassesForProfile("main-branch", ["documentation"])
  assert.ok(strict.includes("runtime"))
  assert.ok(strict.includes("kernel"))
  console.log("[PASS] profile class filtering")
}

function testValidatorProfileScope() {
  assert.ok(isValidatorInProfile("pull-request", ["runtime"], ["runtime"]))
  assert.ok(!isValidatorInProfile("pull-request", ["runtime"], ["documentation"]))
  assert.ok(isValidatorInProfile("main-branch", ["runtime"], ["documentation"]))
  console.log("[PASS] validator profile scope")
}

function testExplainReasons() {
  const cacheHit = explainReason({ action: "skip", reason: "cache-hit", checkId: "test" })
  assert.ok(cacheHit.includes("reusable proof"))

  const inputChanged = explainReason({ action: "run", reason: "input-changed: src/foo.ts", checkId: "test" })
  assert.ok(inputChanged.includes("Inputs changed"))

  const fullRun = explainReason({ action: "run", reason: "full-run", checkId: "test" })
  assert.ok(fullRun.includes("Full validation"))
  console.log("[PASS] explain reasons")
}

function testExplanationReport() {
  const report = buildExplanationReport({
    mode: "incremental",
    profile: "pull-request",
    changedFiles: ["docs/README.md"],
    affectedCapabilities: ["Documentation"],
    affectedClasses: ["documentation"],
    entries: [
      { checkId: "docs:check-links", action: "run", reason: "Documentation class affected." },
      { checkId: "test", action: "skip", reason: "No affected governance class." },
    ],
  })

  assert.strictEqual(report.kind, "GovernanceExplanation")
  assert.strictEqual(report.summary.run, 1)
  assert.strictEqual(report.summary.skipped, 1)
  console.log("[PASS] explanation report")
}

function testBenchmark() {
  const entries = [
    { checkId: "docs:check-links", action: "run", durationMs: 5000 },
    { checkId: "test", action: "skip", durationMs: 0 },
  ]
  const result = buildBenchmark(entries, {
    checkClasses: { "docs:check-links": "documentation", test: "tests" },
  })

  assert.strictEqual(result.totalDurationMs, 5000)
  assert.strictEqual(result.executedDurationMs, 5000)
  assert.strictEqual(result.skippedCount, 1)
  assert.ok(result.allWithinTarget)
  console.log("[PASS] benchmark")
}

async function testOrchestratorDocumentationOnly() {
  const result = await runGovernanceOrchestrator({
    root: REPO_ROOT,
    changedFiles: ["docs/getting-started/README.md"],
    dryRun: true,
    explain: true,
    profile: "pull-request",
  })

  assert.strictEqual(result.summary.mode, "incremental")
  assert.strictEqual(result.summary.profile, "pull-request")
  assert.ok(result.summary.affectedClasses.includes("documentation"))
  assert.ok(result.explanation)
  assert.ok(result.explanation.skipped.length > 0)
  console.log("[PASS] orchestrator documentation-only plan")
}

async function testOrchestratorRuntimeChange() {
  const result = await runGovernanceOrchestrator({
    root: REPO_ROOT,
    changedFiles: ["src/runtime/executor.ts"],
    dryRun: true,
    profile: "pull-request",
  })

  assert.ok(result.summary.affectedClasses.includes("runtime"))
  assert.ok(result.summary.protectedAssets.includes("Runtime"))
  assert.strictEqual(result.summary.risk, "high")
  console.log("[PASS] orchestrator runtime change escalates")
}

async function testOrchestratorFullProfile() {
  const result = await runGovernanceOrchestrator({
    root: REPO_ROOT,
    changedFiles: ["docs/getting-started/README.md"],
    dryRun: true,
    profile: "main-branch",
  })

  assert.strictEqual(result.summary.mode, "incremental")
  assert.ok(result.summary.requiredClasses.includes("runtime"))
  console.log("[PASS] orchestrator main-branch profile requires all classes")
}

async function main() {
  testGovernanceClassMapping()
  testFileGovernanceClass()
  testGovernanceClassesAggregation()
  testProfileResolution()
  testProfileClassFiltering()
  testValidatorProfileScope()
  testExplainReasons()
  testExplanationReport()
  testBenchmark()
  await testOrchestratorDocumentationOnly()
  await testOrchestratorRuntimeChange()
  await testOrchestratorFullProfile()

  console.log("\n[GOVERNANCE ORCHESTRATION] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  console.error(err.stack)
  process.exit(1)
})
