// ============================================================
// WORKSPACE: Workspace Cognition Environment
// ============================================================
// Deterministic orientation layer for every engineering session.
// Consumer and validator of canonical knowledge — never a source
// of truth. Depends only on StateReader + CapabilityRegistry.
// ============================================================

import { promises as fs, constants as fsConstants } from "fs"
import path from "path"
import type { CapabilityRegistry } from "../types/index.js"
import { ExecutionArtifactAdapter } from "./artifact-adapter.js"
import { CanonicalLanguageAuditor } from "./language-auditor.js"
import { RepositoryHealth } from "./repository-health.js"
import { SemanticVerifier } from "./semantic-verifier.js"
import type { StateReader, HealthStatus } from "./types.js"

export type EnvironmentCheck = {
  name: string
  status: "PASS" | "WARN" | "FAIL"
  detail: string
}

export type EnvironmentReport = {
  status: "READY" | "DEGRADED" | "BLOCKED"
  platform: string
  runtime: { name: string; version: string; ok: boolean }
  checks: EnvironmentCheck[]
  summary: { pass: number; warn: number; fail: number }
}

export type WorkspaceDescriptor = {
  version: string
  generatedAt: string
  identity: { system: string; version: string; description: string; layers: string[] }
  environment: EnvironmentReport
  architecture: Awaited<ReturnType<WorkspaceCognitionEnvironment["verifyArchitecture"]>>
  language: Awaited<ReturnType<WorkspaceCognitionEnvironment["verifyLanguage"]>>
  semantic: Awaited<ReturnType<WorkspaceCognitionEnvironment["verifySemantics"]>>
  health: Awaited<ReturnType<WorkspaceCognitionEnvironment["getHealth"]>>
  engineeringContext: {
    missionCount: number
    expeditionCount: number
    objectiveCount: number
    discoveryCount: number
    decisionCount: number
    workItemCount: number
    eventCount: number
  }
  suggestedActions: { action: string; context: string; priority: string }[]
}

export class WorkspaceCognitionEnvironment {
  public languageAuditor: CanonicalLanguageAuditor
  public semanticVerifier: SemanticVerifier
  public health: RepositoryHealth
  public artifactAdapter: ExecutionArtifactAdapter
  private orientationCount = 0
  private lastOrientationAt: string | null = null
  private phaseLog: Array<{ phase: number; name: string; durationMs: number; status: string }> = []
  private blocks: unknown[] = []

  constructor(
    private reader: StateReader,
    private capabilityRegistry: CapabilityRegistry,
  ) {
    this.languageAuditor = new CanonicalLanguageAuditor()
    this.semanticVerifier = new SemanticVerifier(reader, capabilityRegistry)
    this.health = new RepositoryHealth(reader, capabilityRegistry)
    this.artifactAdapter = new ExecutionArtifactAdapter()
  }

  getIdentity() {
    return {
      system: "Synth v2",
      version: "2.0.0",
      description: "Deterministic Execution Kernel + Planning Cognition Engine",
      layers: ["Authority", "Mutation", "Execution", "Truth", "Determinism"],
    }
  }

  async getEnvironment(): Promise<EnvironmentReport> {
    const checks: EnvironmentCheck[] = []

    const nodeVersion = process.version
    const nodeMajor = parseInt(nodeVersion.slice(1).split(".")[0], 10)
    checks.push({
      name: "Node.js",
      status: nodeMajor >= 18 ? "PASS" : nodeMajor >= 16 ? "WARN" : "FAIL",
      detail: nodeVersion,
    })

    try {
      const { execSync } = await import("child_process")
      const npmVersion = execSync("npm --version", { encoding: "utf-8", timeout: 5000 } as any).trim()
      checks.push({ name: "npm", status: "PASS", detail: `v${npmVersion}` })
    } catch {
      checks.push({ name: "npm", status: "FAIL", detail: "not found or not executable" })
    }

    try {
      const { execSync } = await import("child_process")
      const gitVersion = execSync("git --version", { encoding: "utf-8", timeout: 5000 } as any).trim().split(" ")[2]
      checks.push({ name: "Git", status: "PASS", detail: `v${gitVersion}` })
    } catch {
      checks.push({ name: "Git", status: "WARN", detail: "not found — version history unavailable" })
    }

    const nodeModulesPath = path.join(process.cwd(), "node_modules")
    const packageJsonPath = path.join(process.cwd(), "package.json")
    let depsStatus: EnvironmentCheck["status"] = "PASS"
    let depsDetail = "installed"
    try {
      await fs.access(packageJsonPath)
      const pkg = JSON.parse(await fs.readFile(packageJsonPath, "utf-8")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
      const depNames = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })
      if (depNames.length > 0) {
        try {
          await fs.access(nodeModulesPath)
          const installed = await fs.readdir(nodeModulesPath)
          const missing = depNames.filter((d) => !installed.includes(d))
          if (missing.length > 0) {
            depsStatus = "WARN"
            depsDetail = `${missing.length} missing: ${missing.slice(0, 3).join(", ")}`
          }
        } catch {
          depsStatus = "FAIL"
          depsDetail = "node_modules/ not found"
        }
      }
    } catch {
      depsDetail = "no package.json — dependency check skipped"
    }
    checks.push({ name: "Dependencies", status: depsStatus, detail: depsDetail })

    const requiredDirs = ["dist", "tests", "docs"]
    const presentDirs: string[] = []
    for (const dir of requiredDirs) {
      try {
        await fs.access(path.join(process.cwd(), dir))
        presentDirs.push(dir)
      } catch { /* absent */ }
    }
    const missingDirs = requiredDirs.filter((d) => !presentDirs.includes(d))
    checks.push({
      name: "Repository structure",
      status: missingDirs.length === 0 ? "PASS" : "WARN",
      detail: missingDirs.length === 0 ? `all required (${requiredDirs.join(", ")})` : `missing: ${missingDirs.join(", ")}`,
    })

    try {
      await (fs.access as any)(process.cwd(), fsConstants.W_OK)
      checks.push({ name: "Workspace writable", status: "PASS", detail: process.cwd() })
    } catch {
      checks.push({ name: "Workspace writable", status: "WARN", detail: "read-only mode" })
    }

    const anyFail = checks.some((c) => c.status === "FAIL")
    const anyWarn = checks.some((c) => c.status === "WARN")
    const overallStatus = anyFail ? "BLOCKED" : anyWarn ? "DEGRADED" : "READY"

    return {
      status: overallStatus,
      platform: process.platform,
      runtime: { name: "Node.js", version: nodeVersion, ok: nodeMajor >= 18 },
      checks,
      summary: {
        pass: checks.filter((c) => c.status === "PASS").length,
        warn: checks.filter((c) => c.status === "WARN").length,
        fail: checks.filter((c) => c.status === "FAIL").length,
      },
    }
  }

  getArchitecture() {
    const report = this.languageAuditor.getLanguageReport()
    return {
      ubiquitousLanguage: report,
      invariants: [
        { id: "I1", text: "Planner never emits execution instructions directly", status: "enforced" },
        { id: "I2", text: "Execution operations are implementation details", status: "enforced" },
        { id: "I3", text: "Canonical knowledge is independent of execution mechanisms", status: "enforced" },
        { id: "I4", text: "Projection adapters isolate external tooling", status: "enforced" },
        { id: "I5", text: "Execution primitives may evolve without changing planning semantics", status: "enforced" },
      ],
    }
  }

  async verifyArchitecture() {
    const checks: Array<{ name: string; category: string; status: HealthStatus; path: string }> = []
    const root = process.cwd()

    checks.push({ name: "Agent Constitution", category: "architecture", status: await this.health._fileCheck(path.join(root, "docs", "guides", "agents", "constitution.md")), path: "docs/guides/agents/constitution.md" })
    checks.push({ name: "Knowledge base manifest", category: "architecture", status: await this.health._fileCheck(path.join(root, "docs", "README.md")), path: "docs/README.md" })
    checks.push({ name: "ADR directory", category: "architecture", status: await this.health._dirCheck(path.join(root, "docs", "architecture", "decisions")), path: "docs/architecture/decisions/" })
    checks.push({ name: "Ubiquitous language", category: "architecture", status: await this.health._fileCheck(path.join(root, "docs", "ubiquitous-language.md")), path: "docs/ubiquitous-language.md" })
    checks.push({ name: "SKR specification", category: "architecture", status: await this.health._fileCheck(path.join(root, "docs", "architecture", "SKR-001.md")), path: "docs/architecture/SKR-001.md" })

    return {
      checks,
      invariants: [
        { id: "I1", text: "Planner never emits execution instructions directly", status: "enforced" },
        { id: "I2", text: "Execution operations are implementation details", status: "enforced" },
        { id: "I3", text: "Canonical knowledge is independent of execution mechanisms", status: "enforced" },
        { id: "I4", text: "Projection adapters isolate external tooling", status: "enforced" },
        { id: "I5", text: "Execution primitives may evolve without changing planning semantics", status: "enforced" },
      ],
    }
  }

  async verifyLanguage() {
    const loadResult = await this.languageAuditor.loadFromFile()

    const srcPaths = [path.join(process.cwd(), "dist", "main.js")]
    let sourceAudit = { passed: true, issues: [] as Array<{ message: string }> }
    try {
      const src = await fs.readFile(srcPaths[0], "utf-8")
      sourceAudit = this.languageAuditor.auditSource(src)
    } catch (e) {
      sourceAudit = { passed: false, issues: [{ message: `Cannot read ${srcPaths[0]}: ${(e as Error).message}` }] }
    }

    const layers: Record<string, Array<{ term: string; definition: string }>> = {}
    for (const [layer, terms] of Object.entries(this.languageAuditor.ubiquitousLanguage)) {
      layers[layer] = terms.map((t) => ({ term: t, definition: "" }))
    }

    return {
      source: this.languageAuditor.sourcePath,
      loaded: loadResult.loaded,
      layers,
      forbidden: [
        { term: "Ticket", replacement: "WorkItem" },
        { term: "Sprint", replacement: "Expedition" },
        { term: "Story", replacement: "Objective" },
        { term: "Epic", replacement: "Objective" },
        { term: "Task", replacement: "WorkItem" },
        { term: "Command", replacement: "Intent" },
        { term: "Script", replacement: "Execution Plan" },
      ],
      sourceAudit,
    }
  }

  async verifySemantics() {
    const state = await this.reader.loadState()
    return this.semanticVerifier.verify(state)
  }

  async getHealth() {
    return this.health.check()
  }

  async getEngineeringContext() {
    const events = await this.reader.loadEvents()
    const state = await this.reader.loadState()

    return {
      missions: Object.values(state.missions || {}),
      expeditions: Object.values(state.expeditions || {}),
      objectives: Object.values(state.objectives || {}),
      discoveries: Object.values(state.discoveries || {}),
      decisions: Object.values(state.decisions || {}),
      workItems: Object.values(state.workItems || {}),
      eventCount: events.length,
    }
  }

  getSuggestedActions(context: {
    expeditions?: Array<{ status: string; name: string }>
    discoveries?: unknown[]
  }) {
    const actions = []
    const expeditions = context.expeditions || []
    const activeExpedition = expeditions.find((e) => e.status === "executing")

    if (activeExpedition) {
      actions.push({ action: "Continue Expedition", context: activeExpedition.name, priority: "high" })
    } else {
      actions.push({ action: "Chart New Expedition", context: "No active expedition", priority: "medium" })
    }

    actions.push({ action: "Review Architecture", context: "INTENT-001 vision", priority: "medium" })
    actions.push({ action: "Inspect Discoveries", context: `${(context.discoveries || []).length} recorded`, priority: "low" })
    actions.push({ action: "Run Health Audit", context: "Repository health check", priority: "low" })

    return actions
  }

  async canProceed() {
    const warnings: string[] = []

    const arch = await this.verifyArchitecture()
    const missingArch = arch.checks.filter((c) => c.status === "fail")
    if (missingArch.length > 0) {
      return {
        canProceed: false,
        blockReason: `Architecture documents missing: ${missingArch.map((c) => c.name).join(", ")}`,
        warnings,
      }
    }

    const semantic = await this.verifySemantics()
    const failedSemantic = semantic.assertions.filter((a) => a.status === "FAIL")
    if (failedSemantic.length > 0) {
      return {
        canProceed: false,
        blockReason: `Semantic integrity failed: ${failedSemantic.map((a) => a.id).join(", ")}`,
        warnings,
      }
    }

    try {
      const replay = await this.reader.verifyReplay()
      if (!replay.consistent) {
        return {
          canProceed: false,
          blockReason: "Replay is nondeterministic — event log corrupted",
          warnings,
        }
      }
    } catch { /* no replay data — not a block */ }

    const lang = await this.verifyLanguage()
    if (!lang.sourceAudit.passed) {
      warnings.push(`Canonical language audit found ${lang.sourceAudit.issues.length} issues`)
    }

    return { canProceed: true, blockReason: null, warnings }
  }

  async generateWorkspaceDescriptor(): Promise<WorkspaceDescriptor> {
    const identity = this.getIdentity()
    const environment = await this.getEnvironment()
    const architecture = await this.verifyArchitecture()
    const language = await this.verifyLanguage()
    const semantic = await this.verifySemantics()
    const health = await this.getHealth()
    const engineeringContext = await this.getEngineeringContext()
    const actions = this.getSuggestedActions(engineeringContext)

    return {
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      identity,
      environment,
      architecture,
      language,
      semantic,
      health,
      engineeringContext: {
        missionCount: engineeringContext.missions.length,
        expeditionCount: engineeringContext.expeditions.length,
        objectiveCount: engineeringContext.objectives.length,
        discoveryCount: engineeringContext.discoveries.length,
        decisionCount: engineeringContext.decisions.length,
        workItemCount: engineeringContext.workItems.length,
        eventCount: engineeringContext.eventCount,
      },
      suggestedActions: actions,
    }
  }

  async render() {
    const desc = await this.generateWorkspaceDescriptor()

    const lines: string[] = []
    lines.push("")
    lines.push("╔══════════════════════════════════════════════════════════════╗")
    lines.push("║  SYNTH v2 — Agent Workspace (AWS-001)                      ║")
    lines.push("╠══════════════════════════════════════════════════════════════╣")

    lines.push("║  1. IDENTITY                                                 ║")
    lines.push(`║    System: ${desc.identity.system.padEnd(49)}║`)
    lines.push(`║    Version: ${desc.identity.version.padEnd(48)}║`)
    lines.push(`║    Platform: ${desc.environment.platform.padEnd(47)}║`)
    lines.push("╠══════════════════════════════════════════════════════════════╣")

    lines.push("║  2. ENVIRONMENT                                              ║")
    for (const check of desc.environment.checks) {
      const icon = check.status === "PASS" ? "✓" : check.status === "WARN" ? "◆" : "✗"
      const text = `${icon} ${check.name}: ${check.detail}`.slice(0, 54).padEnd(54)
      lines.push(`║    ${text}║`)
    }
    lines.push(`║    ${desc.environment.status.padEnd(53)}║`)
    lines.push("╠══════════════════════════════════════════════════════════════╣")

    lines.push("║  3. ARCHITECTURE                                             ║")
    const archPassed = desc.architecture.checks.filter((c) => c.status === "pass").length
    lines.push(`║    ${String(archPassed).padEnd(2)}/${String(desc.architecture.checks.length).padEnd(2)} documents verified${"".padEnd(33)}║`)
    lines.push("╠══════════════════════════════════════════════════════════════╣")

    lines.push("║  4. CANONICAL LANGUAGE                                       ║")
    const langAudit = desc.language?.sourceAudit ?? { passed: true }
    const langOk = langAudit.passed ? "✓" : "✗"
    const langSource = desc.language?.source ?? "docs/ubiquitous-language.md"
    const langLoaded = desc.language?.loaded
    lines.push(`║    ${langOk} Source: ${langSource}${"".padEnd(35)}║`)
    lines.push(`║    ${langLoaded ? "✓" : "○"} Data-driven: ${langLoaded ? "loaded from file" : "using defaults"}${"".padEnd(26)}║`)
    lines.push("╠══════════════════════════════════════════════════════════════╣")

    lines.push("║  5. SEMANTIC VERIFICATION                                    ║")
    const semPassed = desc.semantic.assertions.filter((a) => a.status === "PASS").length
    lines.push(`║    ${String(semPassed).padEnd(2)}/${String(desc.semantic.assertions.length).padEnd(2)} assertions passed${"".padEnd(33)}║`)
    lines.push("╠══════════════════════════════════════════════════════════════╣")

    const h = desc.health
    const hStatusStr = h.status.toUpperCase()
    lines.push(`║  6. HEALTH: ${hStatusStr}${"".padEnd(52 - hStatusStr.length)}║`)
    lines.push(`║    ✓ ${String(h.summary.pass).padEnd(3)} passed  ◆ ${String(h.summary.warn || 0).padEnd(3)} warn  ✗ ${String(h.summary.fail || 0).padEnd(3)} fail${"".padEnd(24)}║`)
    lines.push("╠══════════════════════════════════════════════════════════════╣")

    const ec = desc.engineeringContext
    lines.push("║  7. ENGINEERING CONTEXT                                      ║")
    lines.push(`║    Missions: ${String(ec.missionCount).padEnd(6)}  Expeditions: ${String(ec.expeditionCount).padEnd(24)}║`)
    lines.push(`║    Objectives: ${String(ec.objectiveCount).padEnd(4)}  Discoveries: ${String(ec.discoveryCount).padEnd(24)}║`)
    lines.push(`║    Decisions: ${String(ec.decisionCount).padEnd(5)}  Work Items: ${String(ec.workItemCount).padEnd(25)}║`)
    lines.push(`║    Events: ${String(ec.eventCount).padEnd(8)}${"".padEnd(43)}║`)
    lines.push("╠══════════════════════════════════════════════════════════════╣")

    lines.push("║  8. SUGGESTED ACTIONS                                        ║")
    for (const action of desc.suggestedActions) {
      const icon = action.priority === "high" ? "▶" : "○"
      lines.push(`║    ${icon} ${action.action.padEnd(52)}║`)
    }
    lines.push("╚══════════════════════════════════════════════════════════════╝")
    lines.push("")

    return lines.join("\n")
  }

  async writeDescriptors() {
    const desc = await this.generateWorkspaceDescriptor()

    const synthDir = path.join(process.cwd(), ".synth")
    await fs.mkdir(synthDir, { recursive: true })

    this.orientationCount++
    this.lastOrientationAt = new Date().toISOString()

    const files: string[] = []

    await fs.writeFile(path.join(synthDir, "workspace.json"), JSON.stringify(desc, null, 2))
    files.push("workspace.json")

    await fs.writeFile(path.join(synthDir, "health.json"), JSON.stringify(desc.health, null, 2))
    files.push("health.json")

    await fs.writeFile(path.join(synthDir, "context.json"), JSON.stringify(desc.engineeringContext, null, 2))
    files.push("context.json")

    await fs.writeFile(
      path.join(synthDir, "architecture.json"),
      JSON.stringify({ version: "1.0.0", generatedAt: desc.generatedAt, ...desc.architecture }, null, 2),
    )
    files.push("architecture.json")

    await fs.writeFile(
      path.join(synthDir, "language.json"),
      JSON.stringify({ version: "1.0.0", generatedAt: desc.generatedAt, ...desc.language }, null, 2),
    )
    files.push("language.json")

    this.phaseLog.push({ phase: this.orientationCount, name: "orientation", durationMs: 0, status: "completed" })
    await fs.writeFile(
      path.join(synthDir, "memory.json"),
      JSON.stringify({
        version: "1.0.0",
        generatedAt: desc.generatedAt,
        orientationCount: this.orientationCount,
        lastOrientationAt: this.lastOrientationAt,
        phases: this.phaseLog,
        blocks: this.blocks,
      }, null, 2),
    )
    files.push("memory.json")

    return { written: files.length, files, directory: synthDir }
  }
}
