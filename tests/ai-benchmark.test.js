// ============================================================
// SYNTH AI Benchmark Tests
// ============================================================
// Verifies the AI benchmark harness, fixtures, and report exist
// and that the dry-run benchmark produces a valid report.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"

const PROJECT_ROOT = process.cwd()
const BENCHMARK_PATH = path.resolve(PROJECT_ROOT, "scripts", "ai-benchmark.js")
const FIXTURES_DIR = path.resolve(PROJECT_ROOT, "tests", "ai-benchmark-fixtures")
const REPORT_PATH = path.resolve(PROJECT_ROOT, "data-test", "ai-benchmark-report.json")

function runScript(scriptPath, cwd) {
  const result = spawnSync("node", [scriptPath], {
    cwd,
    encoding: "utf-8",
    timeout: 300000,
  })
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function testFixturesExist() {
  const repoSuitePath = path.join(FIXTURES_DIR, "repository-suite.json")
  const promptSuitePath = path.join(FIXTURES_DIR, "prompt-suite.json")

  const repoStats = await fs.stat(repoSuitePath).catch(() => null)
  const promptStats = await fs.stat(promptSuitePath).catch(() => null)

  assert(repoStats && repoStats.isFile(), "Repository suite fixture must exist")
  assert(promptStats && promptStats.isFile(), "Prompt suite fixture must exist")

  const repoSuite = JSON.parse(await fs.readFile(repoSuitePath, "utf-8"))
  const promptSuite = JSON.parse(await fs.readFile(promptSuitePath, "utf-8"))

  assert(Array.isArray(repoSuite) && repoSuite.length >= 3, "Repository suite must contain at least 3 repositories")
  assert(Array.isArray(promptSuite) && promptSuite.length >= 2, "Prompt suite must contain at least 2 prompts")

  for (const repo of repoSuite) {
    assert(typeof repo.id === "string", "Repository must have an id")
    assert(typeof repo.path === "string", "Repository must have a path")
  }

  for (const prompt of promptSuite) {
    assert(typeof prompt.id === "string", "Prompt must have an id")
    assert(Array.isArray(prompt.commands), "Prompt must have commands")
  }
}

async function testBenchmarkRuns() {
  const result = runScript(BENCHMARK_PATH, PROJECT_ROOT)
  assert(result.status === 0, `AI benchmark dry-run must pass:\n${result.stderr}`)
  assert(result.stdout.includes("AI Benchmark dry-run passed"), "AI benchmark should report success")
}

async function testReportProduced() {
  const reportExists = await fs.access(REPORT_PATH).then(() => true).catch(() => false)
  assert(reportExists, `AI benchmark report must be written to ${REPORT_PATH}`)

  const report = JSON.parse(await fs.readFile(REPORT_PATH, "utf-8"))
  assert(report.mode === "dry-run", "Report must indicate dry-run mode")
  assert(typeof report.metrics === "object", "Report must contain metrics")
  assert(typeof report.metrics.overall.missionSimilarity === "number", "Report must contain mission similarity")
  assert(typeof report.metrics.overall.replayFidelity === "number", "Report must contain replay fidelity")
  assert(typeof report.metrics.overall.governPassRate === "number", "Report must contain govern pass rate")
  assert(Array.isArray(report.models) && report.models.length >= 5, "Report must benchmark at least 5 models")

  // Agentic Mission Lifecycle: verify draft creation and explicit approval attempt.
  const firstResult = report.modelResults[0]
  assert(firstResult.missionDraftCreated === true, "Report must show Mission Draft creation")
  assert(firstResult.missionApprovalDecision && typeof firstResult.missionApprovalDecision.approved === "boolean", "Report must contain Mission Approval decision")
}

async function testNpmScriptsExist() {
  const packageJson = JSON.parse(await fs.readFile(path.join(PROJECT_ROOT, "package.json"), "utf-8"))
  assert(typeof packageJson.scripts["ai:benchmark"] === "string", "ai:benchmark script must exist")
  assert(typeof packageJson.scripts["test:ai-benchmark"] === "string", "test:ai-benchmark script must exist")
}

async function main() {
  console.log("Running AI benchmark tests...")

  await testFixturesExist()
  console.log("✓ benchmark fixtures exist and are valid")

  await testBenchmarkRuns()
  console.log("✓ AI benchmark dry-run passes")

  await testReportProduced()
  console.log("✓ AI benchmark report is produced with required metrics")

  await testNpmScriptsExist()
  console.log("✓ npm scripts for AI benchmark exist")

  console.log("\nAll AI benchmark tests passed.")
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
