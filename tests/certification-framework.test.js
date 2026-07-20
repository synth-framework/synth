// ============================================================
// SYNTH Certification Framework Test
// ============================================================
// Validates that the declarative Certification DSL and the
// `synth certify` runner execute the scenario library and produce
// a structured report and certification matrix.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

function runSynth(args, cwd) {
  const result = spawnSync("node", [CLI_PATH, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 180000,
  })
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  }
}

function parseJson(stdout) {
  try {
    return JSON.parse(stdout.trim())
  } catch (err) {
    throw new Error(`Failed to parse CLI output as JSON:\n${stdout}`)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function testCertifyRunsAllScenarios() {
  const result = runSynth(["certify"], process.cwd())
  assert(result.status === 0, `synth certify must exit 0:\n${result.stderr}`)
  const output = parseJson(result.stdout)
  assert(output.kind === "CertificationResult", `expected CertificationResult, got ${output.kind}`)
  assert(output.summary.total > 0, "certification library must contain at least one scenario")
  assert(output.summary.failed === 0, `certification scenarios failed: ${output.summary.failed}`)
  assert(output.summary.passed === output.summary.total, "all scenarios must pass")
  console.log(`[PASS] synth certify executed ${output.summary.total} scenario(s), all passed`)
}

async function testCertifyGeneratesMatrix() {
  const matrixPath = path.join(process.cwd(), "docs", "certification-matrix.md")
  const result = runSynth(["certify", "--matrix", matrixPath], process.cwd())
  assert(result.status === 0, `synth certify --matrix must exit 0:\n${result.stderr}`)
  const content = await fs.readFile(matrixPath, "utf-8")
  assert(content.includes("SYNTH Certification Matrix"), "matrix must have a title")
  assert(content.includes("Scenario"), "matrix must list scenarios")
  console.log("[PASS] synth certify generates certification matrix")
}

async function testCertifyExplainProducesReport() {
  const outputDir = path.join(process.cwd(), "proof", "certifications")
  const result = runSynth(["certify", "--explain", "--output-dir", outputDir], process.cwd())
  assert(result.status === 0, `synth certify --explain must exit 0:\n${result.stderr}`)
  const output = parseJson(result.stdout)
  assert(output.summary.total > 0, "explain report must contain scenarios")
  assert(output.summary.failed === 0, "explain report must show no failures")
  const entries = await fs.readdir(outputDir)
  assert(entries.some((f) => f.startsWith("certification-report-") && f.endsWith(".json")), "explain mode must write a report file")
  console.log("[PASS] synth certify --explain produces structured evidence report")
}

async function testCertifyHelp() {
  const result = runSynth(["certify", "--help"], process.cwd())
  assert(result.status === 0, `synth certify --help must exit 0:\n${result.stderr}`)
  const output = parseJson(result.stdout)
  assert(output.namespace === "certify", `help should be for certify namespace, got ${output.namespace}`)
  assert(Array.isArray(output.subcommands), "certify help should list subcommands")
  console.log("[PASS] synth certify --help provides namespace help")
}

async function main() {
  console.log("Running certification framework tests...")
  await testCertifyRunsAllScenarios()
  await testCertifyGeneratesMatrix()
  await testCertifyExplainProducesReport()
  await testCertifyHelp()
  console.log("\nAll certification framework tests passed.")
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
