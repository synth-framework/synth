// ============================================================
// ADAPTER: TDD — Methodology Adapter
// ============================================================
// Enforces Test-Driven Development workflow.
//
// This adapter does not connect to an external system.
// It operates on the local codebase by:
//   - detecting missing tests
//   - generating failing test skeletons (Red)
//   - running tests to confirm failure or pass
//   - tracking Red → Green → Refactor transitions
//   - producing TDD evidence for the proof pipeline
// ============================================================

import fs from "fs"
import path from "path"
import { execSync } from "child_process"
import type { AdapterState, AdapterHealth, AdapterHealthState } from "../../types/index.js"
import type {
  TddAdapter,
  TddConfig,
  TddWorkflowState,
  TddTestSpec,
  TddEvidence,
  GenerateTestResult,
  RunTestsResult,
  VerifyFailureResult,
  VerifyImplementationResult,
  CoverageResult,
  GenerateEvidenceResult,
} from "./types.js"

export class TddAdapterImpl implements TddAdapter {
  readonly metadata = {
    name: "tdd",
    version: "1.0.0",
    kind: "tdd" as const,
    category: "methodology" as const,
    description: "Test-Driven Development methodology adapter",
  }

  private _state: AdapterState = "discovered"
  private _config?: TddConfig
  private _health: AdapterHealth = { state: "unknown", message: "Adapter not yet health-checked" }
  private _workflowState: TddWorkflowState = "requirement"
  private _tests: TddTestSpec[] = []
  private _timeline: { phase: TddWorkflowState; timestamp: number }[] = [
    { phase: "requirement", timestamp: Date.now() },
  ]

  get state(): AdapterState {
    return this._state
  }

  get config(): TddConfig | undefined {
    return this._config
  }

  get health(): AdapterHealth {
    return this._health
  }

  private setHealth(state: AdapterHealthState, message: string, diagnostics?: Record<string, unknown>): void {
    this._health = { state, message, diagnostics }
  }

  private transition(
    transition: string,
    success: boolean,
    state: AdapterState,
    message: string,
  ): AdapterState {
    if (success) this._state = state
    else this._state = "error"
    return this._state
  }

  private recordWorkflow(phase: TddWorkflowState): void {
    this._workflowState = phase
    this._timeline.push({ phase, timestamp: Date.now() })
  }

  private sourceDir(): string {
    return this._config?.sourceDirectory || path.join(process.cwd(), "src")
  }

  private testDir(): string {
    return this._config?.testDirectory || path.join(process.cwd(), "tests")
  }

  async discover(): Promise<AdapterState> {
    this._config = undefined
    this.setHealth("unknown", "Adapter discovered, not yet configured")
    return this.transition("discover", true, "discovered", "Adapter discovered")
  }

  async configure(config: Record<string, unknown>): Promise<AdapterState> {
    this._config = config as TddConfig
    this.setHealth("unknown", "Adapter configured, awaiting validation")
    return this.transition("configure", true, "configured", "Adapter configured")
  }

  async validate(): Promise<AdapterState> {
    if (!this._config) {
      this.setHealth("unhealthy", "TDD adapter not configured")
      return this.transition("validate", false, "error", "Adapter not configured")
    }
    const sourceExists = fs.existsSync(this.sourceDir())
    const testExists = fs.existsSync(this.testDir())
    if (!sourceExists || !testExists) {
      this.setHealth("unhealthy", `Source or test directory missing: ${this.sourceDir()}, ${this.testDir()}`)
      return this.transition("validate", false, "error", "Source or test directory missing")
    }
    this.setHealth("unknown", "Adapter validated, awaiting enablement")
    return this.transition("validate", true, "validated", "Adapter validated")
  }

  async enable(): Promise<AdapterState> {
    if (this._state === "disabled" || this._state === "discovered") {
      await this.configure({
        testDirectory: path.join(process.cwd(), "tests"),
        sourceDirectory: path.join(process.cwd(), "src"),
        coverageEnabled: false,
      })
    }
    this.setHealth("unknown", "Adapter enabled, awaiting health check")
    return this.transition("enable", true, "enabled", "Adapter enabled")
  }

  async disable(): Promise<AdapterState> {
    this.setHealth("disabled", "Adapter disabled")
    return this.transition("disable", true, "disabled", "Adapter disabled")
  }

  async healthCheck(): Promise<AdapterState> {
    const h = await this.checkHealth()
    const healthState: AdapterHealthState = h.healthy ? "healthy" : "unhealthy"
    this.setHealth(healthState, h.message)
    return this.transition("healthCheck", h.healthy, h.healthy ? "healthy" : "error", h.message)
  }

  async initialize(): Promise<AdapterState> {
    return this.configure({
      testDirectory: path.join(process.cwd(), "tests"),
      sourceDirectory: path.join(process.cwd(), "src"),
      coverageEnabled: false,
    })
  }

  async status(): Promise<{ workflowState: TddWorkflowState; tests: TddTestSpec[]; state: AdapterState }> {
    return {
      workflowState: this._workflowState,
      tests: this._tests,
      state: this._state,
    }
  }

  async checkHealth(): Promise<{ healthy: boolean; message: string }> {
    if (!this._config) {
      return { healthy: false, message: "TDD adapter not configured" }
    }
    const sourceExists = fs.existsSync(this.sourceDir())
    const testExists = fs.existsSync(this.testDir())
    const healthy = sourceExists && testExists
    return {
      healthy,
      message: healthy
        ? "TDD adapter is healthy"
        : "TDD adapter health checks failed: source or test directory missing",
    }
  }

  async generateTest(requirement: string, targetModule: string, functionName: string): Promise<GenerateTestResult> {
    const testFileName = `tdd-${functionName}.test.js`
    const testFilePath = path.join(this.testDir(), testFileName)

    const relativeImport = path
      .relative(this.testDir(), path.join(this.sourceDir(), targetModule))
      .replace(/\\/g, "/")
      .replace(/\.ts$/, ".js")

    const skeleton = `// Auto-generated TDD test skeleton for: ${requirement}
import { test } from "node:test"
import assert from "node:assert"
import { ${functionName} } from "${relativeImport}"

test("${functionName} satisfies: ${requirement}", () => {
  // Arrange
  const ctx = { timestamp: 1, commandId: "tdd-test" }
  
  // Act
  const result = ${functionName}(ctx)
  
  // Assert
  assert.ok(result, "Expected result to be defined")
})
`

    fs.writeFileSync(testFilePath, skeleton)

    const spec: TddTestSpec = {
      name: `${functionName} satisfies: ${requirement}`,
      targetModule,
      functionName,
      status: "generated",
    }
    this._tests.push(spec)
    this.recordWorkflow("test-generated")

    return {
      success: true,
      generatedFiles: [testFilePath],
      message: `Generated failing test skeleton for ${functionName}`,
    }
  }

  async runTests(): Promise<RunTestsResult> {
    const testFiles = fs.readdirSync(this.testDir()).filter((f) => f.startsWith("tdd-") && f.endsWith(".test.js"))
    if (testFiles.length === 0) {
      return { success: true, passing: 0, failing: 0, message: "No TDD-generated tests to run" }
    }

    const command = `node --test ${testFiles.map((f) => path.join(this.testDir(), f)).join(" ")}`
    try {
      const output = execSync(command, { cwd: process.cwd(), encoding: "utf-8", stdio: "pipe" } as any)
      const passing = (output.match(/✔/g) || []).length
      const failing = (output.match(/✖/g) || []).length
      return { success: failing === 0, passing, failing, message: `Tests: ${passing} passing, ${failing} failing` }
    } catch (err: any) {
      const output = err.stdout?.toString() || err.message || ""
      const passing = (output.match(/✔/g) || []).length
      const failing = (output.match(/✖/g) || []).length
      return { success: false, passing, failing, message: `Tests failed: ${passing} passing, ${failing} failing` }
    }
  }

  async verifyFailure(): Promise<VerifyFailureResult> {
    const result = await this.runTests()
    const failingTests = this._tests.filter((t) => t.status === "generated" || t.status === "missing")

    if (result.failing > 0) {
      failingTests.forEach((t) => {
        if (t.status === "generated") t.status = "failing"
      })
      this.recordWorkflow("failing")
      return {
        success: true,
        failingTests: failingTests.map((t) => t.name),
        message: `Confirmed ${result.failing} failing tests (Red phase)`,
      }
    }

    return {
      success: false,
      failingTests: [],
      message: "Expected at least one failing test for Red phase",
    }
  }

  async verifyImplementation(): Promise<VerifyImplementationResult> {
    const result = await this.runTests()
    const generatedTests = this._tests.filter((t) => t.status === "failing" || t.status === "generated")

    if (result.failing === 0 && generatedTests.length > 0) {
      generatedTests.forEach((t) => (t.status = "passing"))
      this.recordWorkflow("passing")
      return {
        success: true,
        passingTests: generatedTests.map((t) => t.name),
        message: `All generated tests pass (Green phase)`,
      }
    }

    return {
      success: false,
      passingTests: [],
      message: result.failing > 0 ? "Tests still failing" : "No generated tests to verify",
    }
  }

  async measureCoverage(): Promise<CoverageResult> {
    if (!this._config?.coverageEnabled) {
      return { success: true, message: "Coverage measurement disabled" }
    }
    return { success: false, message: "Coverage tooling not installed" }
  }

  async generateEvidence(requirement: string): Promise<GenerateEvidenceResult> {
    const coverage = await this.measureCoverage()
    this.recordWorkflow("refactored")

    const evidence: TddEvidence = {
      requirement,
      workflowState: this._workflowState,
      tests: this._tests,
      timeline: this._timeline,
      coverage: coverage.success
        ? { lines: coverage.lines ?? 0, functions: coverage.functions ?? 0, branches: coverage.branches ?? 0 }
        : undefined,
      message: `TDD workflow completed for: ${requirement}`,
    }

    return {
      success: true,
      evidence,
      message: "TDD evidence generated",
    }
  }
}

export function createTddAdapter(): TddAdapterImpl {
  return new TddAdapterImpl()
}
