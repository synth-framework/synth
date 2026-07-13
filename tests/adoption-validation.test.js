// ============================================================
// SYNTH Adoption Validation Tests
// ============================================================
// Verifies that the adoption validation artifacts exist and are
// correctly wired into the project.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"

const PROJECT_ROOT = process.cwd()
const AI_BENCHMARK_PATH = path.resolve(PROJECT_ROOT, "scripts", "ai-validation-benchmark.js")
const HUMAN_PROTOCOL_PATH = path.resolve(PROJECT_ROOT, "docs", "guides", "operator", "adoption-study.md")
const REPORT_PATH = path.resolve(PROJECT_ROOT, "docs", "operator", "synth-validation-report.md")

function runScript(scriptPath, cwd) {
  const result = spawnSync("node", [scriptPath], {
    cwd,
    encoding: "utf-8",
    timeout: 120000,
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

async function testHumanProtocolExists() {
  const content = await fs.readFile(HUMAN_PROTOCOL_PATH, "utf-8")
  assert(content.includes("Cohorts"), "Human protocol must define cohorts")
  assert(content.includes("Tasks"), "Human protocol must define tasks")
  assert(content.includes("Measurements"), "Human protocol must define measurements")
  assert(content.includes("Success Criteria"), "Human protocol must define success criteria")
}

async function testAiBenchmarkExistsAndRuns() {
  const result = runScript(AI_BENCHMARK_PATH, PROJECT_ROOT)
  assert(result.status === 0, `AI benchmark dry-run must pass:\n${result.stderr}`)
  assert(result.stdout.includes("AI validation benchmark dry-run passed"), "AI benchmark should report success")
}

async function testValidationReportExists() {
  const content = await fs.readFile(REPORT_PATH, "utf-8")
  assert(content.includes("SYNTH Validation Report"), "Report must be titled")
  assert(content.includes("Brownfield Validation"), "Report must include brownfield section")
  assert(content.includes("Human Validation"), "Report must include human section")
  assert(content.includes("AI Validation"), "Report must include AI section")
}

async function testNpmScriptsExist() {
  const packageJson = JSON.parse(await fs.readFile(path.join(PROJECT_ROOT, "package.json"), "utf-8"))
  assert(typeof packageJson.scripts["test:brownfield"] === "string", "test:brownfield script must exist")
  assert(typeof packageJson.scripts["test:adoption-validation"] === "string", "test:adoption-validation script must exist")
  assert(typeof packageJson.scripts["ai:benchmark:dry-run"] === "string", "ai:benchmark:dry-run script must exist")
}

async function main() {
  console.log("Running adoption validation tests...")

  await testHumanProtocolExists()
  console.log("✓ human validation protocol exists and is structured")

  await testAiBenchmarkExistsAndRuns()
  console.log("✓ AI validation benchmark exists and dry-run passes")

  await testValidationReportExists()
  console.log("✓ validation report exists")

  await testNpmScriptsExist()
  console.log("✓ adoption validation npm scripts exist")

  console.log("\nAll adoption validation tests passed.")
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
