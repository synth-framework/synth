// ============================================================
// FIRST CONTACT: Rule-Based Capability Verifier
// ============================================================
// Checks runtime, language, and platform assumptions before Mission
// materialization. Deterministic for a given environment.
// ============================================================

import { spawnSync } from "child_process"
import crypto from "crypto"
import type {
  CapabilityAssumption,
  CapabilityBlocker,
  CapabilityCheck,
  CapabilityStatus,
  CapabilityVerificationReport,
  CapabilityVerifier,
} from "../types.js"

function parseAssumption(assumption: string): CapabilityAssumption {
  const normalized = assumption.toLowerCase().trim()

  if (normalized.startsWith("node") || normalized.includes("node.js")) {
    return { capability: "node", requirement: extractVersionRequirement(normalized) }
  }
  if (normalized.startsWith("python")) {
    return { capability: "python", requirement: extractVersionRequirement(normalized) }
  }
  if (normalized.startsWith("vercel")) {
    return { capability: "vercel", requirement: undefined }
  }
  if (normalized.startsWith("supabase")) {
    return { capability: "supabase", requirement: undefined }
  }

  return { capability: assumption, requirement: undefined }
}

function extractVersionRequirement(normalized: string): string | undefined {
  const match = normalized.match(/(>=|<=|>|<=|=)\s*v?(\d+(?:\.\d+)*)/)
  if (!match) return undefined
  return `${match[1]}${match[2]}`
}

function compareVersions(actual: string, required: string): CapabilityStatus {
  const op = required.match(/^(>=|<=|>|<|=)/)?.[0] ?? ">="
  const requiredVersion = required.replace(/^(>=|<=|>|<|=)/, "")
  const actualParts = actual.split(".").map(Number)
  const requiredParts = requiredVersion.split(".").map(Number)

  let comparison = 0
  const maxLen = Math.max(actualParts.length, requiredParts.length)
  for (let i = 0; i < maxLen; i++) {
    const a = actualParts[i] ?? 0
    const r = requiredParts[i] ?? 0
    if (a > r) {
      comparison = 1
      break
    }
    if (a < r) {
      comparison = -1
      break
    }
  }

  const satisfied =
    (op === ">=" && comparison >= 0) ||
    (op === "<=" && comparison <= 0) ||
    (op === ">" && comparison > 0) ||
    (op === "<" && comparison < 0) ||
    (op === "=" && comparison === 0)

  return satisfied ? "AVAILABLE" : "DEGRADED"
}

function runCommand(command: string, args: string[]): { found: boolean; version?: string; error?: string } {
  const result = spawnSync(command, args, { encoding: "utf-8" })
  if (result.error || result.status !== 0) {
    return { found: false, error: result.stderr || result.error?.message || "command failed" }
  }
  const output = `${result.stdout} ${result.stderr}`.trim()
  const versionMatch = output.match(/(\d+(?:\.\d+)*)/)
  return { found: true, version: versionMatch?.[1] }
}

function checkNode(requirement?: string): CapabilityCheck {
  const actual = process.versions.node
  if (!requirement) {
    return { capability: "node", status: "AVAILABLE", message: `Node ${actual} is available.` }
  }
  const status = compareVersions(actual, requirement)
  return {
    capability: "node",
    status,
    message:
      status === "AVAILABLE"
        ? `Node ${actual} satisfies ${requirement}.`
        : `Node ${actual} does not satisfy ${requirement}.`,
  }
}

function checkPython(requirement?: string): CapabilityCheck {
  const python3 = runCommand("python3", ["--version"])
  if (python3.found) {
    const status = requirement && python3.version ? compareVersions(python3.version, requirement) : "AVAILABLE"
    return {
      capability: "python",
      status,
      message: status === "AVAILABLE" ? `Python ${python3.version} is available.` : `Python ${python3.version} does not satisfy ${requirement}.`,
    }
  }

  const python = runCommand("python", ["--version"])
  if (python.found) {
    const status = requirement && python.version ? compareVersions(python.version, requirement) : "AVAILABLE"
    return {
      capability: "python",
      status,
      message: status === "AVAILABLE" ? `Python ${python.version} is available.` : `Python ${python.version} does not satisfy ${requirement}.`,
    }
  }

  return { capability: "python", status: "MISSING", message: "Python is not installed." }
}

function checkExternalService(capability: string): CapabilityCheck {
  return {
    capability,
    status: "UNAVAILABLE",
    message: `${capability} availability cannot be verified automatically; manual confirmation required.`,
  }
}

function checkUnknown(capability: string): CapabilityCheck {
  return {
    capability,
    status: "UNAVAILABLE",
    message: `Capability '${capability}' is not recognized by the verifier.`,
  }
}

function checkCapability(parsed: CapabilityAssumption): CapabilityCheck {
  switch (parsed.capability) {
    case "node":
      return checkNode(parsed.requirement)
    case "python":
      return checkPython(parsed.requirement)
    case "vercel":
    case "supabase":
      return checkExternalService(parsed.capability)
    default:
      return checkUnknown(parsed.capability)
  }
}

function computeReportHash(report: CapabilityVerificationReport): string {
  const canonical = JSON.stringify({
    status: report.status,
    checks: report.checks.map((c) => ({ capability: c.capability, status: c.status, message: c.message })),
  })
  return crypto.createHash("sha256").update(canonical).digest("hex").slice(0, 16)
}

export class RuleBasedCapabilityVerifier implements CapabilityVerifier {
  readonly version = "1.0.0"

  verify(assumptions: string[]): CapabilityVerificationReport {
    const checks: CapabilityCheck[] = []
    const blockers: CapabilityBlocker[] = []

    for (const assumption of assumptions) {
      const parsed = parseAssumption(assumption)
      const check = checkCapability(parsed)
      checks.push(check)
      if (check.status !== "AVAILABLE") {
        blockers.push({
          capability: check.capability,
          status: check.status,
          message: check.message,
        })
      }
    }

    const report: CapabilityVerificationReport = {
      status: blockers.length === 0 ? "passed" : "blocked",
      blockers,
      checks,
      reportHash: "",
    }

    report.reportHash = computeReportHash(report)
    return report
  }
}
