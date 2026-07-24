// ============================================================
// ADAPTER: BDD — Methodology Adapter
// ============================================================
// Behavior-Driven Development adapter.
//
// This adapter does not connect to an external system.
// It operates on the local codebase by:
//   - creating features and scenarios
//   - generating acceptance tests from Gherkin-style specs
//   - verifying behavior
//   - producing traceability evidence
// ============================================================

import fs from "fs"
import path from "path"
import { execSync } from "child_process"
import { shortHash } from "../../sdk/hashing/index.js"
import type { AdapterState, AdapterHealth, AdapterHealthState } from "../../types/index.js"
import type {
  BddAdapter,
  BddConfig,
  BddFeature,
  BddScenario,
  BddAcceptanceReport,
  BddTraceabilityMatrix,
  BddEvidence,
  CreateFeatureResult,
  CreateScenarioResult,
  GenerateAcceptanceTestsResult,
  VerifyBehaviorResult,
  GenerateBehaviorEvidenceResult,
} from "./types.js"

export class BddAdapterImpl implements BddAdapter {
  readonly metadata = {
    name: "bdd",
    version: "1.0.0",
    kind: "bdd" as const,
    category: "methodology" as const,
    description: "Behavior-Driven Development methodology adapter",
  }

  private _state: AdapterState = "discovered"
  private _config?: BddConfig
  private _health: AdapterHealth = { state: "unknown", message: "Adapter not yet health-checked" }
  private _features: BddFeature[] = []

  get state(): AdapterState {
    return this._state
  }

  get config(): BddConfig | undefined {
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

  private featuresDir(): string {
    return this._config?.featuresDirectory || path.join(process.cwd(), "bdd")
  }

  private testsDir(): string {
    return this._config?.testsDirectory || path.join(process.cwd(), "tests")
  }

  private loadFeatures(): void {
    const dir = this.featuresDir()
    if (!fs.existsSync(dir)) return
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"))
    this._features = files
      .map((f) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as BddFeature
        } catch {
          return null
        }
      })
      .filter(Boolean) as BddFeature[]
  }

  private saveFeature(feature: BddFeature): void {
    const dir = this.featuresDir()
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, `${feature.id}.json`), JSON.stringify(feature, null, 2))
  }

  async discover(): Promise<AdapterState> {
    this._config = undefined
    this._features = []
    this.setHealth("unknown", "Adapter discovered, not yet configured")
    return this.transition("discover", true, "discovered", "Adapter discovered")
  }

  async configure(config: Record<string, unknown>): Promise<AdapterState> {
    this._config = config as BddConfig
    this.setHealth("unknown", "Adapter configured, awaiting validation")
    return this.transition("configure", true, "configured", "Adapter configured")
  }

  async validate(): Promise<AdapterState> {
    if (!this._config) {
      this.setHealth("unhealthy", "BDD adapter not configured")
      return this.transition("validate", false, "error", "Adapter not configured")
    }
    const featuresExists = fs.existsSync(this.featuresDir())
    const testsExists = fs.existsSync(this.testsDir())
    if (!testsExists) {
      this.setHealth("unhealthy", "Test directory missing")
      return this.transition("validate", false, "error", "Test directory missing")
    }
    this.setHealth("unknown", "Adapter validated, awaiting enablement")
    return this.transition("validate", true, "validated", "Adapter validated")
  }

  async enable(): Promise<AdapterState> {
    if (this._state === "disabled" || this._state === "discovered") {
      await this.configure({
        featuresDirectory: path.join(process.cwd(), "bdd"),
        testsDirectory: path.join(process.cwd(), "tests"),
        sourceDirectory: path.join(process.cwd(), "src"),
      })
    }
    this.loadFeatures()
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
      featuresDirectory: path.join(process.cwd(), "bdd"),
      testsDirectory: path.join(process.cwd(), "tests"),
      sourceDirectory: path.join(process.cwd(), "src"),
    })
  }

  async status(): Promise<{ features: number; scenarios: number; verified: number; state: AdapterState }> {
    this.loadFeatures()
    const scenarios = this._features.reduce((acc, f) => acc + f.scenarios.length, 0)
    const verified = this._features.reduce(
      (acc, f) => acc + f.scenarios.filter((s) => s.status === "verified").length,
      0,
    )
    return { features: this._features.length, scenarios, verified, state: this._state }
  }

  async checkHealth(): Promise<{ healthy: boolean; message: string }> {
    if (!this._config) {
      return { healthy: false, message: "BDD adapter not configured" }
    }
    const featuresExists = fs.existsSync(this.featuresDir())
    const testsExists = fs.existsSync(this.testsDir())
    const healthy = testsExists
    return {
      healthy,
      message: healthy
        ? "BDD adapter is healthy"
        : "BDD adapter health checks failed: test directory missing",
    }
  }

  async createFeature(missionId: string | undefined, name: string, description: string): Promise<CreateFeatureResult> {
    const id = `feat-${shortHash(name, 8)}`
    const feature: BddFeature = {
      id,
      missionId,
      name,
      description,
      scenarios: [],
      status: "draft",
    }
    this._features.push(feature)
    this.saveFeature(feature)
    return { success: true, feature, message: `Created feature ${id}` }
  }

  async createScenario(
    featureId: string,
    name: string,
    given: string[],
    when: string,
    then: string[],
  ): Promise<CreateScenarioResult> {
    const feature = this._features.find((f) => f.id === featureId)
    if (!feature) {
      return { success: false, message: `Feature ${featureId} not found` }
    }
    const id = `sc-${shortHash(`${featureId}-${name}`, 8)}`
    const scenario: BddScenario = {
      id,
      name,
      given,
      when,
      then,
      status: "draft",
    }
    feature.scenarios.push(scenario)
    this.saveFeature(feature)
    return { success: true, scenario, message: `Created scenario ${id}` }
  }

  async generateAcceptanceTests(featureId?: string): Promise<GenerateAcceptanceTestsResult> {
    this.loadFeatures()
    const features = featureId ? this._features.filter((f) => f.id === featureId) : this._features
    const generatedFiles: string[] = []

    for (const feature of features) {
      for (const scenario of feature.scenarios) {
        const testFileName = `bdd-${feature.id}-${scenario.id}.test.js`
        const testFilePath = path.join(this.testsDir(), testFileName)

        const givenBlock = scenario.given.map((g) => `  // Given: ${g}`).join("\n")
        const thenBlock = scenario.then.map((t) => `  // Then: ${t}`).join("\n")

        const skeleton = `// Auto-generated BDD acceptance test
// Feature: ${feature.name}
// Scenario: ${scenario.name}
import { test } from "node:test"
import assert from "node:assert"

test("${feature.name} — ${scenario.name}", () => {
${givenBlock}
  // When: ${scenario.when}
${thenBlock}
  assert.fail("Acceptance test not yet implemented")
})
`
        fs.writeFileSync(testFilePath, skeleton)
        generatedFiles.push(testFilePath)
        scenario.status = "implemented"
      }
      this.saveFeature(feature)
    }

    return {
      success: generatedFiles.length > 0,
      generatedFiles,
      message: generatedFiles.length > 0 ? `Generated ${generatedFiles.length} acceptance tests` : "No scenarios to generate",
    }
  }

  async verifyBehavior(featureId?: string): Promise<VerifyBehaviorResult> {
    this.loadFeatures()
    const testFiles = fs
      .readdirSync(this.testsDir())
      .filter((f) => f.startsWith("bdd-") && f.endsWith(".test.js"))
      .map((f) => path.join(this.testsDir(), f))

    let passed = 0
    let failed = 0
    let output = ""

    if (testFiles.length > 0) {
      try {
        output = execSync(`node --test ${testFiles.join(" ")}`, { cwd: process.cwd(), encoding: "utf-8", stdio: "pipe" } as any)
        passed = (output.match(/✔/g) || []).length
        failed = (output.match(/✖/g) || []).length
      } catch (err: any) {
        output = err.stdout?.toString() || err.message || ""
        passed = (output.match(/✔/g) || []).length
        failed = (output.match(/✖/g) || []).length
      }
    }

    const reports: BddAcceptanceReport[] = []
    const features = featureId ? this._features.filter((f) => f.id === featureId) : this._features

    for (const feature of features) {
      for (const scenario of feature.scenarios) {
        const report: BddAcceptanceReport = {
          featureId: feature.id,
          scenarioId: scenario.id,
          passed: failed === 0 && testFiles.length > 0,
          message: failed === 0 && testFiles.length > 0 ? "Behavior verified" : "Behavior not yet verified",
        }
        reports.push(report)
        scenario.status = report.passed ? "verified" : scenario.status
      }
      this.saveFeature(feature)
    }

    return {
      success: failed === 0 && testFiles.length > 0,
      reports,
      message: `Acceptance tests: ${passed} passing, ${failed} failing`,
    }
  }

  async generateBehaviorEvidence(): Promise<GenerateBehaviorEvidenceResult> {
    this.loadFeatures()
    const reports = (await this.verifyBehavior()).reports
    const matrix: BddTraceabilityMatrix[] = []

    for (const feature of this._features) {
      for (const scenario of feature.scenarios) {
        const report = reports.find((r) => r.scenarioId === scenario.id)
        matrix.push({
          missionId: feature.missionId,
          featureId: feature.id,
          scenarioId: scenario.id,
          testFile: `bdd-${feature.id}-${scenario.id}.test.js`,
          verified: report?.passed ?? false,
        })
      }
    }

    const verified = matrix.filter((m) => m.verified).length
    const evidence: BddEvidence = {
      features: this._features,
      acceptanceReports: reports,
      traceabilityMatrix: matrix,
      coverage: {
        features: this._features.length,
        scenarios: this._features.reduce((acc, f) => acc + f.scenarios.length, 0),
        verified,
      },
      message: `BDD evidence generated: ${verified} of ${matrix.length} scenarios verified`,
    }

    return { success: true, evidence, message: "Behavior evidence generated" }
  }
}

export function createBddAdapter(): BddAdapterImpl {
  return new BddAdapterImpl()
}
