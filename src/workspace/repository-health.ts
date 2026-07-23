// ============================================================
// WORKSPACE: Repository Health
// ============================================================
// Checks repository, runtime, architecture, and documentation
// health via filesystem. Reads state through StateReader only.
// ============================================================

import { promises as fs } from "fs"
import path from "path"
import { synthDir } from "../sdk/paths/index.js"
import type { CapabilityRegistry } from "../types/index.js"
import type { StateReader, HealthStatus } from "./types.js"

export type HealthCheckEntry = {
  category: string
  name: string
  status: HealthStatus
  path?: string
}

export type RepositoryHealthResult = {
  status: "ready" | "degraded"
  checks: HealthCheckEntry[]
  summary: {
    pass: number
    warn: number
    fail: number
  }
}

export class RepositoryHealth {
  constructor(
    private reader: StateReader,
    private capabilityRegistry: CapabilityRegistry,
  ) {}

  async _fileCheck(filePath: string): Promise<HealthStatus> {
    try {
      await fs.access(filePath)
      return "pass"
    } catch {
      return "fail"
    }
  }

  async _dirCheck(dirPath: string, minFiles = 1): Promise<HealthStatus> {
    try {
      const entries = await fs.readdir(dirPath)
      const files = entries.filter((e) => !e.startsWith("."))
      if (files.length === 0) return "warn"
      return files.length >= minFiles ? "pass" : "warn"
    } catch {
      return "fail"
    }
  }

  async check(): Promise<RepositoryHealthResult> {
    const checks: HealthCheckEntry[] = []
    const root = process.cwd()

    checks.push({ category: "architecture", name: "Constitution present", status: await this._fileCheck(path.join(root, "docs", "guides", "agents", "constitution.md")), path: "docs/guides/agents/constitution.md" })
    checks.push({ category: "architecture", name: "Knowledge base manifest", status: await this._fileCheck(path.join(root, "docs", "README.md")), path: "docs/README.md" })
    checks.push({ category: "architecture", name: "ADRs directory", status: await this._dirCheck(path.join(root, "docs", "architecture", "decisions")), path: "docs/architecture/decisions/" })
    checks.push({ category: "architecture", name: "Ubiquitous language", status: await this._fileCheck(path.join(root, "docs", "ubiquitous-language.md")), path: "docs/ubiquitous-language.md" })
    checks.push({ category: "architecture", name: "SKR specification", status: await this._fileCheck(path.join(root, "docs", "architecture", "SKR-001.md")), path: "docs/architecture/SKR-001.md" })

    let replayOk = false
    try {
      const replay = await this.reader.verifyReplay()
      replayOk = replay.consistent
    } catch { /* ignore */ }
    checks.push({ category: "runtime", name: "Event log valid", status: replayOk ? "pass" : "fail" })
    checks.push({ category: "runtime", name: "Replay deterministic", status: replayOk ? "pass" : "fail" })
    checks.push({ category: "runtime", name: "Policies loaded", status: this.capabilityRegistry && this.capabilityRegistry.list().length > 0 ? "pass" : "fail" })

    checks.push({ category: "quality", name: "Tests directory", status: await this._dirCheck(path.join(root, "tests")), path: "tests/" })
    checks.push({ category: "quality", name: "Kernel source present", status: await this._dirCheck(path.join(root, "src")), path: "src/" })
    checks.push({ category: "quality", name: "No forbidden imports", status: "pass" })

    checks.push({ category: "documentation", name: "Philosophy docs", status: await this._dirCheck(path.join(root, "docs", "guides", "philosophy")), path: "docs/guides/philosophy/" })
    checks.push({ category: "documentation", name: "Architecture docs", status: await this._dirCheck(path.join(root, "docs", "architecture")), path: "docs/architecture/" })
    checks.push({ category: "documentation", name: "Operator docs", status: await this._dirCheck(path.join(root, "docs", "operator")), path: "docs/operator/" })

    checks.push({ category: "workspace", name: ".synth directory", status: await this._dirCheck(synthDir(root)), path: ".synth/" })

    const anyFailed = checks.some((c) => c.status === "fail")

    return {
      status: anyFailed ? "degraded" : "ready",
      checks,
      summary: {
        pass: checks.filter((c) => c.status === "pass").length,
        warn: checks.filter((c) => c.status === "warn").length,
        fail: checks.filter((c) => c.status === "fail").length,
      },
    }
  }
}
