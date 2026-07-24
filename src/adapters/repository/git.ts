// ============================================================
// ADAPTER: Repository — Git Reference Implementation
// ============================================================
// This is the only module in Synth that executes Git commands.
// All repository operations flow through this adapter.
// ============================================================

import { execFileSync, execSync } from "child_process"
import fs from "fs"
import path from "path"
import { shortHash } from "../../sdk/hashing/index.js"
import type {
  AdapterState,
  AdapterHealth,
  AdapterHealthState,
  Observation,
  ObservationBatch,
  ObservationCategory,
  ObservationConfidence,
} from "../../types/index.js"
import type {
  RepositoryAdapter,
  RepositoryConfig,
  RepositoryHealth,
  RepositoryStatus,
  PromotionResult,
  MergeResult,
} from "./types.js"

function git(cwd: string, args: string[]): string {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] } as any).trim()
  } catch (err: any) {
    const stderr = err.stderr?.toString().trim() || err.message
    throw new Error(`GIT_ERROR: git ${args.join(" ")} failed: ${stderr}`)
  }
}

function gitSilent(cwd: string, args: string[]): string | null {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] } as any).trim()
  } catch {
    return null
  }
}

export class GitRepositoryAdapter implements RepositoryAdapter {
  readonly metadata = {
    name: "repository",
    version: "1.0.0",
    kind: "repository" as const,
    category: "integration" as const,
    description: "Git reference implementation of the Repository Adapter",
  }

  private _state: AdapterState = "discovered"
  private _config?: RepositoryConfig
  private _health: AdapterHealth = { state: "unknown", message: "Adapter not yet health-checked" }

  get state(): AdapterState {
    return this._state
  }

  get config(): RepositoryConfig | undefined {
    return this._config
  }

  get health(): AdapterHealth {
    return this._health
  }

  private setHealth(state: AdapterHealthState, message: string, diagnostics?: Record<string, unknown>): void {
    this._health = { state, message, diagnostics }
  }

  private setState(state: AdapterState): AdapterState {
    this._state = state
    return state
  }

  private transition(
    transition: string,
    success: boolean,
    state: AdapterState,
    message: string,
    detail?: Record<string, unknown>,
  ): AdapterState {
    const previous = this._state
    if (success) this._state = state
    else this._state = "error"
    return this._state
  }

  private repoPath(): string {
    return this._config?.path || process.cwd()
  }

  private isGitRepo(): boolean {
    return fs.existsSync(path.join(this.repoPath(), ".git"))
  }

  private currentBranch(): string {
    if (!this.isGitRepo()) return "none"
    return git(this.repoPath(), ["rev-parse", "--abbrev-ref", "HEAD"])
  }

  private hasUncommittedChanges(): boolean {
    if (!this.isGitRepo()) return false
    const status = git(this.repoPath(), ["status", "--porcelain"])
    return status.length > 0
  }

  private hasRemote(): boolean {
    if (!this.isGitRepo()) return false
    const remotes = gitSilent(this.repoPath(), ["remote"])
    return remotes !== null && remotes.length > 0
  }

  private hasHooksInstalled(): boolean {
    const hookPath = path.join(this.repoPath(), ".git", "hooks", "pre-commit")
    if (!fs.existsSync(hookPath)) return false
    const content = fs.readFileSync(hookPath, "utf-8")
    return content.includes("npm run govern")
  }

  private hasProofGenerated(): boolean {
    const proofDir = path.join(this.repoPath(), "proof")
    if (!fs.existsSync(proofDir)) return false
    return fs.readdirSync(proofDir).some((f) => f.startsWith("proof-") && f.endsWith(".json"))
  }

  async discover(): Promise<AdapterState> {
    this._config = undefined
    this.setHealth("unknown", "Adapter discovered, not yet configured")
    return this.transition("discover", true, "discovered", "Adapter discovered")
  }

  async configure(config: Record<string, unknown>): Promise<AdapterState> {
    this._config = config as RepositoryConfig
    this.setHealth("unknown", "Adapter configured, awaiting validation")
    return this.transition("configure", true, "configured", "Adapter configured", { path: this._config.path })
  }

  async validate(): Promise<AdapterState> {
    if (!this._config) {
      this.setHealth("unhealthy", "Adapter not configured")
      return this.transition("validate", false, "error", "Adapter not configured")
    }
    if (!fs.existsSync(this._config.path)) {
      this.setHealth("unhealthy", `Repository path does not exist: ${this._config.path}`)
      return this.transition("validate", false, "error", `Repository path does not exist: ${this._config.path}`)
    }
    this.setHealth("unknown", "Adapter validated, awaiting enablement")
    return this.transition("validate", true, "validated", "Adapter validated")
  }

  async enable(): Promise<AdapterState> {
    if (this._state === "disabled" || this._state === "discovered") {
      await this.configure({ path: process.cwd(), remote: "origin", defaultBranch: "main", promotionMode: "direct" })
    }
    this.setHealth("unknown", "Adapter enabled, awaiting health check")
    return this.transition("enable", true, "enabled", "Adapter enabled")
  }

  async disable(): Promise<AdapterState> {
    this.setHealth("disabled", "Adapter disabled")
    return this.transition("disable", true, "disabled", "Adapter disabled")
  }

  async healthCheck(): Promise<AdapterState> {
    const repoHealth = await this.checkHealth()
    return this.transition("healthCheck", repoHealth.healthy, repoHealth.healthy ? "healthy" : "error", repoHealth.message)
  }

  async initialize(): Promise<AdapterState> {
    const cwd = this.repoPath()
    if (!fs.existsSync(cwd)) {
      fs.mkdirSync(cwd, { recursive: true })
    }
    if (!this.isGitRepo()) {
      git(cwd, ["init"])
      if (this._config?.defaultBranch) {
        git(cwd, ["checkout", "-b", this._config.defaultBranch])
      }
      if (this._config?.email) {
        git(cwd, ["config", "user.email", this._config.email])
      }
      if (this._config?.username) {
        git(cwd, ["config", "user.name", this._config.username])
      }
    }
    return this.setState("configured")
  }

  async status(): Promise<RepositoryStatus> {
    return {
      initialized: this.isGitRepo(),
      branch: this.currentBranch(),
      uncommittedChanges: this.hasUncommittedChanges(),
      remoteConfigured: this.hasRemote(),
      hooksInstalled: this.hasHooksInstalled(),
      proofGenerated: this.hasProofGenerated(),
      adapterEnabled: this._state !== "disabled" && this._state !== "discovered",
      state: this._state,
    }
  }

  async checkHealth(): Promise<RepositoryHealth> {
    const initialized = this.isGitRepo()
    const branch = this.currentBranch()
    const branchValid = initialized && branch !== "HEAD" && branch !== "none"
    const remoteReachable = initialized && this.hasRemote()
    const hooksInstalled = this.hasHooksInstalled()
    const proofCurrent = this.hasProofGenerated()

    const healthy = initialized && branchValid && hooksInstalled && proofCurrent
    const adapterHealthState: AdapterHealthState = this._state === "disabled" ? "disabled" : healthy ? "healthy" : "unhealthy"
    this.setHealth(adapterHealthState, healthy ? "Repository is healthy" : "Repository health checks failed", {
      initialized,
      branchValid,
      hooksInstalled,
      proofCurrent,
    })

    return {
      healthy,
      checks: {
        initialized,
        remoteReachable,
        hooksInstalled,
        branchValid,
        proofCurrent,
      },
      message: this._health.message,
    }
  }

  async createBranch(name: string): Promise<AdapterState> {
    const cwd = this.repoPath()
    git(cwd, ["checkout", "-b", name])
    return this.setState(this._state)
  }

  async checkout(name: string): Promise<AdapterState> {
    const cwd = this.repoPath()
    git(cwd, ["checkout", name])
    return this.setState(this._state)
  }

  async commit(message: string): Promise<AdapterState> {
    const cwd = this.repoPath()
    git(cwd, ["add", "-A"])
    git(cwd, ["commit", "-m", message])
    return this.setState(this._state)
  }

  async promote(branch: string): Promise<PromotionResult> {
    const cfg = this._config
    if (!cfg) {
      return { success: false, sourceBranch: branch, targetBranch: "unknown", auditPassed: false, determinismPassed: false, message: "Adapter not configured" }
    }

    const targetBranch =
      cfg.promotionMode === "staged" && cfg.promotionBranch
        ? cfg.promotionBranch
        : cfg.defaultBranch

    // Governance gate: run full verification pipeline
    let auditPassed = false
    let determinismPassed = false
    try {
      execSync("npm run test:audit", { cwd: this.repoPath(), stdio: "pipe" } as any)
      auditPassed = true
    } catch {
      auditPassed = false
    }

    try {
      execSync("npm run test:determinism", { cwd: this.repoPath(), stdio: "pipe" } as any)
      determinismPassed = true
    } catch {
      determinismPassed = false
    }

    if (!auditPassed || !determinismPassed) {
      return {
        success: false,
        sourceBranch: branch,
        targetBranch,
        auditPassed,
        determinismPassed,
        message: "Governance gate failed: audit or determinism check did not pass",
      }
    }

    // Generate proof
    let proofId: string | undefined
    try {
      execSync("npm run proof", { cwd: this.repoPath(), stdio: "pipe" } as any)
      const proofDir = path.join(this.repoPath(), "proof")
      const files = fs.readdirSync(proofDir).filter((f) => f.startsWith("proof-") && f.endsWith(".json"))
      files.sort()
      proofId = files[files.length - 1]
    } catch {
      return {
        success: false,
        sourceBranch: branch,
        targetBranch,
        auditPassed,
        determinismPassed,
        message: "Proof generation failed",
      }
    }

    // Merge feature into target
    const merge = await this.merge(branch, targetBranch)
    if (!merge.success) {
      return {
        success: false,
        sourceBranch: branch,
        targetBranch,
        auditPassed,
        determinismPassed,
        message: `Merge failed: ${merge.message}`,
      }
    }

    return {
      success: true,
      sourceBranch: branch,
      targetBranch,
      commit: merge.commit,
      proofId,
      replayHash: this.extractReplayHash(proofId),
      auditPassed,
      determinismPassed,
      message: `Promoted ${branch} to ${targetBranch}`,
    }
  }

  private extractReplayHash(proofId?: string): string | undefined {
    if (!proofId) return undefined
    try {
      const proofPath = path.join(this.repoPath(), "proof", proofId)
      const proof = JSON.parse(fs.readFileSync(proofPath, "utf-8"))
      return proof.runtime?.replayHash
    } catch {
      return undefined
    }
  }

  async merge(source: string, target: string): Promise<MergeResult> {
    const cwd = this.repoPath()
    try {
      git(cwd, ["checkout", target])
      git(cwd, ["merge", "--no-ff", "-m", `Promote ${source} into ${target}`, source])
      const commit = git(cwd, ["rev-parse", "HEAD"])
      return { success: true, sourceBranch: source, targetBranch: target, commit, message: `Merged ${source} into ${target}` }
    } catch (err: any) {
      git(cwd, ["merge", "--abort"])
      return { success: false, sourceBranch: source, targetBranch: target, message: err.message }
    }
  }

  async push(remote = "origin"): Promise<AdapterState> {
    const cwd = this.repoPath()
    git(cwd, ["push", remote, this.currentBranch()])
    return this.setState("operational")
  }

  async pull(remote = "origin"): Promise<AdapterState> {
    const cwd = this.repoPath()
    git(cwd, ["pull", remote, this.currentBranch()])
    return this.setState("operational")
  }

  async installHooks(): Promise<AdapterState> {
    const cwd = this.repoPath()
    const hooksDir = path.join(cwd, ".git", "hooks")
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true })
    }

    const preCommitPath = path.join(hooksDir, "pre-commit")
    const hook = `#!/bin/sh
# Synth pre-commit governance hook (installed by Repository Adapter)
set -e
npm run govern
`
    fs.writeFileSync(preCommitPath, hook, { mode: 0o755 })

    return this.setState(this._state)
  }

  async observe(): Promise<ObservationBatch> {
    const cwd = this.repoPath()
    const observations: Observation[] = []
    const errors: string[] = []
    const timestamp = Date.now()

    if (!fs.existsSync(cwd)) {
      errors.push(`Repository path does not exist: ${cwd}`)
      return { observations, errors }
    }

    // File tree scan
    const files = this.walkRepo(cwd)
    const extensions = this.countExtensions(files)

    // Language observations
    const languageMap: Record<string, string> = {
      ".ts": "TypeScript",
      ".tsx": "TypeScript React",
      ".js": "JavaScript",
      ".jsx": "JavaScript React",
      ".py": "Python",
      ".go": "Go",
      ".rs": "Rust",
      ".java": "Java",
      ".kt": "Kotlin",
      ".scala": "Scala",
      ".rb": "Ruby",
      ".php": "PHP",
      ".cs": "C#",
      ".cpp": "C++",
      ".c": "C",
      ".h": "C/C++ Header",
      ".swift": "Swift",
      ".sh": "Shell",
      ".yaml": "YAML",
      ".yml": "YAML",
      ".json": "JSON",
      ".toml": "TOML",
      ".md": "Markdown",
    }

    for (const [ext, count] of Object.entries(extensions)) {
      const language = languageMap[ext]
      if (!language) continue
      observations.push({
        id: `obs-repo-lang-${this.hash(ext)}`,
        source: { adapter: "repository", locator: cwd },
        category: "language" as ObservationCategory,
        subject: language,
        evidence: [
          {
            description: `Detected ${count} ${ext} file(s) in repository`,
            fingerprint: this.hash(`${ext}:${count}`),
          },
        ],
        confidence: "high" as ObservationConfidence,
        timestamp,
        metadata: { extension: ext, fileCount: count },
      })
    }

    // package.json observations
    const packageJsonPath = path.join(cwd, "package.json")
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))
        const deps = { ...pkg.dependencies, ...pkg.devDependencies }
        for (const [name, version] of Object.entries(deps)) {
          observations.push({
            id: `obs-repo-dep-${this.hash(name)}`,
            source: { adapter: "repository", locator: packageJsonPath },
            category: "dependency" as ObservationCategory,
            subject: name,
            evidence: [
              {
                description: "package.json dependency",
                snippet: `${name}: ${String(version)}`,
                fingerprint: this.hash(`${name}:${String(version)}`),
              },
            ],
            confidence: "high" as ObservationConfidence,
            timestamp,
            metadata: { version: String(version), packageJson: true },
          })
        }

        // Scripts as evidence
        if (pkg.scripts) {
          observations.push({
            id: `obs-repo-scripts-${this.hash("scripts")}`,
            source: { adapter: "repository", locator: packageJsonPath },
            category: "evidence" as ObservationCategory,
            subject: "package.json scripts",
            evidence: [
              {
                description: "npm scripts detected",
                snippet: JSON.stringify(pkg.scripts),
                fingerprint: this.hash(JSON.stringify(pkg.scripts)),
              },
            ],
            confidence: "high" as ObservationConfidence,
            timestamp,
            metadata: { scripts: pkg.scripts },
          })
        }
      } catch (err: any) {
        errors.push(`Failed to parse package.json: ${err.message}`)
      }
    }

    // Tooling/config file observations
    const toolingFiles = files.filter((f) => {
      const name = path.basename(f)
      return [
        "tsconfig.json",
        "jsconfig.json",
        "Dockerfile",
        "docker-compose.yml",
        "Makefile",
        "jest.config.js",
        "vitest.config.ts",
        "playwright.config.ts",
        ".eslintrc.json",
        ".prettierrc",
        " biome.json ",
      ].includes(name)
    })

    for (const file of toolingFiles) {
      const content = this.readFileSafe(file)
      observations.push({
        id: `obs-repo-tool-${this.hash(file)}`,
        source: { adapter: "repository", locator: file },
        category: "evidence" as ObservationCategory,
        subject: path.basename(file),
        evidence: [
          {
            description: "Tooling/configuration file detected",
            snippet: content ?? undefined,
            fingerprint: this.hash(content ?? file),
          },
        ],
        confidence: content ? "high" : "unknown" as ObservationConfidence,
        timestamp,
        metadata: { path: path.relative(cwd, file) },
      })
    }

    // Test observations
    const testFiles = files.filter((f) => /\.(test|spec)\.(ts|tsx|js|jsx|py|go|rs|java|kt)$/.test(path.basename(f)))
    const hasTestScript = observations.some(
      (o) => o.category === "evidence" && o.subject === "package.json scripts" && JSON.stringify(o.metadata?.scripts).includes("test"),
    )
    if (testFiles.length > 0 || hasTestScript) {
      observations.push({
        id: `obs-repo-tests-${this.hash("tests")}`,
        source: { adapter: "repository", locator: cwd },
        category: "test" as ObservationCategory,
        subject: "Tests detected",
        evidence: [
          {
            description: `Found ${testFiles.length} test file(s)`,
            fingerprint: this.hash(testFiles.join(",")),
          },
        ],
        confidence: testFiles.length > 0 ? "high" : "medium" as ObservationConfidence,
        timestamp,
        metadata: { testFileCount: testFiles.length },
      })
    }

    return { observations, errors }
  }

  private walkRepo(dir: string): string[] {
    const results: string[] = []
    const exclude = new Set([".git", "node_modules", "dist", "build", ".synth", "coverage"])
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (exclude.has(entry.name)) continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...this.walkRepo(fullPath))
      } else if (entry.isFile()) {
        results.push(fullPath)
      }
    }
    return results
  }

  private countExtensions(files: string[]): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const file of files) {
      const ext = path.extname(file).toLowerCase()
      if (!ext) continue
      counts[ext] = (counts[ext] || 0) + 1
    }
    return counts
  }

  private readFileSafe(filePath: string): string | null {
    try {
      return fs.readFileSync(filePath, "utf-8")
    } catch {
      return null
    }
  }

  private hash(input: string): string {
    return shortHash(input)
  }
}

export function createGitRepositoryAdapter(): GitRepositoryAdapter {
  return new GitRepositoryAdapter()
}
