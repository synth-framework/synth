// ============================================================
// CLI: Certification Runner
// ============================================================
// Executes declarative failure and recovery scenarios defined
// in the Certification DSL. Every scenario runs in an isolated
// temporary workspace and may only use documented public CLI
// commands. The runner produces structured evidence reports and
// a certification coverage matrix.
// ============================================================

import fs from "fs/promises"
import fsSync from "fs"
import path from "path"
import * as sdk from "../sdk/index.js"
import { load as loadYaml } from "js-yaml"

export type CertificationLevel = 1 | 2 | 3

export interface CertificationWorkspaceFile {
  path: string
  content: string
}

export interface CertificationWorkspace {
  files?: CertificationWorkspaceFile[]
}

export interface StepExpectation {
  status: 0 | "non-zero"
  stdoutContains?: string | string[]
  stderrContains?: string | string[]
  jsonPath?: Record<string, unknown>
}

export interface StepCapture {
  jsonPath: Record<string, string>
}

export interface CertificationStep {
  name: string
  command: string[]
  expect: StepExpectation
  capture?: StepCapture
}

export interface CertificationScenario {
  id: string
  name: string
  description: string
  taxonomy: string[]
  level: CertificationLevel
  workspace?: CertificationWorkspace
  setup?: CertificationStep[]
  steps: CertificationStep[]
  recovery: CertificationStep[]
  verify: CertificationStep[]
}

export interface StepResult {
  name: string
  command: string[]
  status: number
  passed: boolean
  stdout: string
  stderr: string
  captured?: Record<string, unknown>
  error?: string
}

export interface ScenarioResult {
  id: string
  name: string
  taxonomy: string[]
  level: CertificationLevel
  status: "pass" | "fail"
  phase: "setup" | "steps" | "recovery" | "verify"
  setupResults: StepResult[]
  stepResults: StepResult[]
  recoveryResults: StepResult[]
  verifyResults: StepResult[]
  error?: string
  durationMs: number
}

export interface CertificationReport {
  generatedAt: string
  synthVersion: string
  summary: {
    total: number
    passed: number
    failed: number
  }
  scenarios: ScenarioResult[]
  matrix: Record<string, Record<string, boolean>>
}

export interface CertificationOptions {
  cliPath: string
  libraryDir: string
  outputDir?: string
  suite?: string
  explain?: boolean
}

function normalizeStrings(value: string | string[] | undefined): string[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

function interpolateCommand(command: string[], context: Record<string, unknown>): string[] {
  return command.map((token) => {
    return token.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = context[key]
      return value === undefined ? `{{${key}}}` : String(value)
    })
  })
}

function checkExpectation(step: CertificationStep, result: { status: number; stdout: string; stderr: string }): { passed: boolean; error?: string } {
  const expect = step.expect

  if (expect.status === 0 && result.status !== 0) {
    return { passed: false, error: `expected exit status 0, got ${result.status}` }
  }
  if (expect.status === "non-zero" && result.status === 0) {
    return { passed: false, error: `expected non-zero exit status, got 0` }
  }

  for (const needle of normalizeStrings(expect.stdoutContains)) {
    if (!result.stdout.includes(needle)) {
      return { passed: false, error: `stdout did not contain "${needle}"` }
    }
  }

  for (const needle of normalizeStrings(expect.stderrContains)) {
    if (!result.stderr.includes(needle)) {
      return { passed: false, error: `stderr did not contain "${needle}"` }
    }
  }

  if (expect.jsonPath && result.stdout.trim().length > 0) {
    let parsed: unknown
    try {
      parsed = JSON.parse(result.stdout.trim())
    } catch {
      return { passed: false, error: "stdout was not valid JSON as required by jsonPath expectation" }
    }
    for (const [key, expectedValue] of Object.entries(expect.jsonPath)) {
      const actualValue = getJsonPath(parsed, key)
      if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
        return {
          passed: false,
          error: `jsonPath ${key}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`,
        }
      }
    }
  }

  return { passed: true }
}

function getJsonPath(obj: unknown, pathStr: string): unknown {
  const parts = pathStr.split(".")
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function captureValues(step: CertificationStep, stdout: string): Record<string, unknown> | undefined {
  if (!step.capture || !step.capture.jsonPath) return undefined
  let parsed: unknown
  try {
    parsed = JSON.parse(stdout.trim())
  } catch {
    return undefined
  }
  const captured: Record<string, unknown> = {}
  for (const [variableName, jsonPathStr] of Object.entries(step.capture.jsonPath)) {
    captured[variableName] = getJsonPath(parsed, jsonPathStr)
  }
  return captured
}

function runStep(
  step: CertificationStep,
  workspaceDir: string,
  cliPath: string,
  context: Record<string, unknown>,
): StepResult {
  const command = interpolateCommand(step.command, context)
  const result = sdk.process.spawnSync("node", [cliPath, ...command], {
    cwd: workspaceDir,
    timeout: 120000,
  })

  const stepResult: StepResult = {
    name: step.name,
    command,
    status: result.status ?? -1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    passed: false,
  }

  const expectation = checkExpectation(step, {
    status: stepResult.status,
    stdout: stepResult.stdout,
    stderr: stepResult.stderr,
  })

  if (expectation.passed) {
    stepResult.passed = true
    stepResult.captured = captureValues(step, stepResult.stdout)
  } else {
    stepResult.error = expectation.error
  }

  return stepResult
}

async function prepareWorkspace(scenario: CertificationScenario): Promise<string> {
  const tmpDir = await sdk.temp.directory(`synth-cert-${scenario.id}-`)

  if (scenario.workspace?.files) {
    for (const file of scenario.workspace.files) {
      const filePath = path.join(tmpDir, file.path)
      await sdk.files.ensureDirectory(path.dirname(filePath))
      await sdk.files.writeFile(filePath, file.content)
    }
  }

  return tmpDir
}

function mergeCaptured(into: Record<string, unknown>, stepResult: StepResult): void {
  if (stepResult.captured) {
    Object.assign(into, stepResult.captured)
  }
}

async function runScenario(scenario: CertificationScenario, cliPath: string): Promise<ScenarioResult> {
  const startTime = Date.now()
  const workspaceDir = await prepareWorkspace(scenario)

  const result: ScenarioResult = {
    id: scenario.id,
    name: scenario.name,
    taxonomy: scenario.taxonomy,
    level: scenario.level,
    status: "fail",
    phase: "setup",
    setupResults: [],
    stepResults: [],
    recoveryResults: [],
    verifyResults: [],
    durationMs: 0,
  }

  const context: Record<string, unknown> = {}

  try {
    for (const step of scenario.setup || []) {
      const stepResult = runStep(step, workspaceDir, cliPath, context)
      result.setupResults.push(stepResult)
      mergeCaptured(context, stepResult)
      if (!stepResult.passed) {
        result.error = `Setup failed: ${stepResult.error}`
        result.phase = "setup"
        return result
      }
    }

    result.phase = "steps"
    for (const step of scenario.steps) {
      const stepResult = runStep(step, workspaceDir, cliPath, context)
      result.stepResults.push(stepResult)
      mergeCaptured(context, stepResult)
      if (!stepResult.passed) {
        result.error = `Failure step failed: ${stepResult.error}`
        return result
      }
    }

    result.phase = "recovery"
    for (const step of scenario.recovery) {
      const stepResult = runStep(step, workspaceDir, cliPath, context)
      result.recoveryResults.push(stepResult)
      mergeCaptured(context, stepResult)
      if (!stepResult.passed) {
        result.error = `Recovery failed: ${stepResult.error}`
        return result
      }
    }

    result.phase = "verify"
    for (const step of scenario.verify) {
      const stepResult = runStep(step, workspaceDir, cliPath, context)
      result.verifyResults.push(stepResult)
      mergeCaptured(context, stepResult)
      if (!stepResult.passed) {
        result.error = `Verify failed: ${stepResult.error}`
        return result
      }
    }

    result.status = "pass"
  } finally {
    result.durationMs = Date.now() - startTime
    await fs.rm(workspaceDir, { recursive: true, force: true })
  }

  return result
}

export async function loadScenarios(libraryDir: string): Promise<CertificationScenario[]> {
  const scenarios: CertificationScenario[] = []
  let entries: string[] = []
  try {
    entries = await fs.readdir(libraryDir)
  } catch {
    return scenarios
  }

  for (const entry of entries.sort()) {
    if (!entry.endsWith(".yaml") && !entry.endsWith(".yml")) continue
    const filePath = path.join(libraryDir, entry)
    const content = await fs.readFile(filePath, "utf-8")
    const parsed = loadYaml(content) as CertificationScenario
    scenarios.push(parsed)
  }

  return scenarios
}

function buildMatrix(results: ScenarioResult[]): Record<string, Record<string, boolean>> {
  const matrix: Record<string, Record<string, boolean>> = {}
  const capabilities = ["Discovery", "Bootstrap", "Mission", "Expedition", "Replay", "Governance"]
  const categories = ["lifecycle", "persistence", "replay", "operator", "environment"]

  for (const cap of capabilities) {
    matrix[cap] = {}
    for (const cat of categories) {
      matrix[cap][cat] = false
    }
  }

  for (const result of results) {
    if (result.status !== "pass") continue
    for (const taxonomyEntry of result.taxonomy) {
      const category = taxonomyEntry.split(".")[0]
      const capability = inferCapability(result.id)
      if (matrix[capability] && matrix[capability][category] !== undefined) {
        matrix[capability][category] = true
      }
    }
  }

  return matrix
}

function inferCapability(scenarioId: string): string {
  if (scenarioId.includes("discovery")) return "Discovery"
  if (scenarioId.includes("bootstrap")) return "Bootstrap"
  if (scenarioId.includes("mission")) return "Mission"
  if (scenarioId.includes("expedition")) return "Expedition"
  if (scenarioId.includes("replay")) return "Replay"
  if (scenarioId.includes("govern")) return "Governance"
  return "Governance"
}

function formatMatrix(report: CertificationReport): string {
  const capabilities = Object.keys(report.matrix)
  const categories = Object.keys(report.matrix[capabilities[0]] || {})

  let md = "# SYNTH Certification Matrix\n\n"
  md += "This matrix is generated automatically by `synth certify`.\n\n"
  md += "| Capability | " + categories.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(" | ") + " |\n"
  md += "| --- | " + categories.map(() => "---").join(" | ") + " |\n"

  for (const capability of capabilities) {
    const row = categories.map((cat) => (report.matrix[capability][cat] ? "✅" : "⬜"))
    md += `| ${capability} | ${row.join(" | ")} |\n`
  }

  md += "\n## Scenarios\n\n"
  md += "| Scenario | Level | Status |\n"
  md += "| --- | --- | --- |\n"
  for (const scenario of report.scenarios) {
    md += `| ${scenario.name} | ${scenario.level} | ${scenario.status === "pass" ? "✅ PASS" : "❌ FAIL"} |\n`
  }

  md += `\n_Generated at ${report.generatedAt}_\n`
  return md
}

export async function runCertification(options: CertificationOptions): Promise<CertificationReport> {
  const scenarios = await loadScenarios(options.libraryDir)
  const results: ScenarioResult[] = []

  for (const scenario of scenarios) {
    const result = await runScenario(scenario, options.cliPath)
    results.push(result)
  }

  const passed = results.filter((r) => r.status === "pass").length
  const report: CertificationReport = {
    generatedAt: new Date().toISOString(),
    synthVersion: await getSynthVersion(options.cliPath),
    summary: {
      total: results.length,
      passed,
      failed: results.length - passed,
    },
    scenarios: results,
    matrix: buildMatrix(results),
  }

  if (options.outputDir) {
    await sdk.files.ensureDirectory(options.outputDir)
    const reportPath = path.join(options.outputDir, `certification-report-${Date.now()}.json`)
    await sdk.json.writeJson(reportPath, report)
  }

  return report
}

async function getSynthVersion(cliPath: string): Promise<string> {
  const result = sdk.process.spawnSync("node", [cliPath, "--version"], { timeout: 30000 })
  return (result.stdout || "unknown").trim()
}

export function printCertificationReport(report: CertificationReport): void {
  console.log(JSON.stringify(report, null, 2))
}

export function writeMatrix(report: CertificationReport, matrixPath: string): void {
  fsSync.writeFileSync(matrixPath, formatMatrix(report), "utf-8")
}
