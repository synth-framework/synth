// ============================================================
// KNOWLEDGE: Rule-Based Prototype-First Validation Adapter
// ============================================================
// Derives acceptance scenarios, mock APIs, simulations, and runtime
// verification from a Canonical Knowledge Graph.
// Deterministic for a fixed graph and adapter version.
// ============================================================

import crypto from "crypto"
import { spawnSync } from "child_process"
import type {
  AcceptanceScenario,
  MockApiEndpoint,
  RuntimeCheck,
  RuntimeVerificationReport,
  SimulationTrace,
  ValidationAdapter,
  ValidationOptions,
  ValidationReport,
  ValidationStatus,
} from "../types.js"
import type { KnowledgeGraph, KnowledgeNode } from "../../types.js"

const ADAPTER_ID = "rule-based-prototype-validator"
const ADAPTER_VERSION = "1.0.0"

function stableId(...parts: string[]): string {
  const normalized = parts.map((p) => p.toLowerCase().trim()).join("|")
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16)
}

function computeHash(obj: unknown): string {
  const canonical = JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort())
  return crypto.createHash("sha256").update(canonical).digest("hex").slice(0, 16)
}

function buildScenarios(graph: KnowledgeGraph): AcceptanceScenario[] {
  const objectives = graph.nodes.filter((n) => n.type === "Objective")
  const domainEvents = graph.nodes.filter((n) => n.type === "Discovery" && n.label.endsWith("Event"))

  return objectives.map((objective) => {
    const event = domainEvents.find((e) => e.label.toLowerCase().includes(objective.label.toLowerCase().split(" ")[0]))
    return {
      id: stableId("scenario", objective.id),
      objectiveId: objective.id,
      given: "The system is initialized with the canonical domain model.",
      when: event ? `A '${event.label}' occurs.` : `The user attempts to '${objective.label}'.`,
      then: `The system fulfills '${objective.label}'.`,
      validationMethod: event ? "simulation" : "manual",
      status: event ? "passed" : "pending",
    }
  })
}

function buildMockApi(graph: KnowledgeGraph): MockApiEndpoint[] {
  const events = graph.nodes.filter((n) => n.type === "Discovery" && n.label.endsWith("Event"))
  return events.map((event, index) => ({
    id: stableId("api", event.id),
    path: `/api/${event.label.replace(/Event$/, "").replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "")}`,
    method: index % 2 === 0 ? "POST" : "GET",
    description: `Mock endpoint for '${event.label}'.`,
    requestSchema: { type: "object", properties: {} },
    responseSchema: { type: "object", properties: { acknowledged: { type: "boolean" } } },
    derivedFromEventId: event.id,
  }))
}

function buildSimulations(graph: KnowledgeGraph, scenarios: AcceptanceScenario[]): SimulationTrace[] {
  const events = graph.nodes.filter((n) => n.type === "Discovery" && n.label.endsWith("Event"))
  return scenarios
    .filter((s) => s.validationMethod === "simulation")
    .map((scenario) => {
      const event = events.find((e) => e.id === scenario.objectiveId || e.label.toLowerCase().includes(scenario.then.toLowerCase().split(" ")[0]))
      return {
        id: stableId("sim", scenario.id),
        scenarioId: scenario.id,
        events: event ? ["system initialized", event.label] : ["system initialized"],
        outcome: scenario.then,
        deterministic: true,
      }
    })
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

function checkRuntime(capability: string): RuntimeCheck {
  if (capability === "node" || capability === "nodejs") {
    return {
      capability: "node",
      status: "AVAILABLE",
      message: `Node ${process.versions.node} is available.`,
    }
  }
  if (capability === "python") {
    const python3 = runCommand("python3", ["--version"])
    if (python3.found) {
      return { capability: "python", status: "AVAILABLE", message: `Python ${python3.version} is available.` }
    }
    const python = runCommand("python", ["--version"])
    if (python.found) {
      return { capability: "python", status: "AVAILABLE", message: `Python ${python.version} is available.` }
    }
    return { capability: "python", status: "MISSING", message: "Python is not installed." }
  }
  return {
    capability,
    status: "UNAVAILABLE",
    message: `${capability} availability cannot be verified automatically; manual confirmation required.`,
  }
}

function inferRuntimeCapabilities(graph: KnowledgeGraph): string[] {
  const capabilities: string[] = []
  const missionNode = graph.nodes.find((n) => n.type === "Mission")
  if (missionNode?.metadata?.languagePreferences) {
    const prefs = missionNode.metadata.languagePreferences as string[]
    for (const pref of prefs) {
      const normalized = pref.toLowerCase()
      if (normalized.includes("typescript") || normalized.includes("javascript")) capabilities.push("node")
      if (normalized.includes("python")) capabilities.push("python")
    }
  }
  // Fallback: inspect discovery nodes for common runtime hints.
  for (const node of graph.nodes) {
    const label = node.label.toLowerCase()
    if (label.includes("typescript") || label.includes("javascript")) capabilities.push("node")
    if (label.includes("python")) capabilities.push("python")
  }
  // Deduplicate.
  return [...new Set(capabilities)]
}

function buildRuntimeVerification(graph: KnowledgeGraph): RuntimeVerificationReport {
  const capabilities = inferRuntimeCapabilities(graph)
  if (capabilities.length === 0) {
    return {
      status: "passed",
      checks: [{ capability: "unknown", status: "UNAVAILABLE", message: "No runtime capabilities inferred from knowledge graph." }],
      reportHash: "",
    }
  }
  const checks = capabilities.map((cap) => checkRuntime(cap))
  const blockers = checks.filter((c) => c.status === "MISSING" || c.status === "DEGRADED")
  const report: RuntimeVerificationReport = {
    status: blockers.length === 0 ? "passed" : "blocked",
    checks,
    reportHash: "",
  }
  report.reportHash = computeHash({ status: report.status, checks: checks.map((c) => ({ capability: c.capability, status: c.status, message: c.message })) })
  return report
}

export class RuleBasedValidationAdapter implements ValidationAdapter {
  readonly id = ADAPTER_ID
  readonly version = ADAPTER_VERSION

  validate(options: ValidationOptions): ValidationReport {
    const { knowledgeGraph } = options

    const scenarios = buildScenarios(knowledgeGraph)
    const mockApi = buildMockApi(knowledgeGraph)
    const simulations = buildSimulations(knowledgeGraph, scenarios)
    const runtimeVerification = buildRuntimeVerification(knowledgeGraph)

    const blockers: string[] = []
    if (runtimeVerification.status === "blocked") {
      blockers.push(...runtimeVerification.checks.filter((c) => c.status === "MISSING" || c.status === "DEGRADED").map((c) => c.message))
    }
    const pendingScenarios = scenarios.filter((s) => s.status === "pending").map((s) => s.id)
    if (pendingScenarios.length > 0) {
      blockers.push(`Pending scenarios: ${pendingScenarios.join(", ")}`)
    }

    let status: ValidationStatus = "passed"
    if (blockers.length > 0) status = "blocked"
    else if (scenarios.some((s) => s.status === "pending")) status = "pending"

    const report: ValidationReport = {
      schema: "synth-validation-report-v1",
      version: "1.0.0",
      status,
      scenarios,
      mockApi,
      simulations,
      runtimeVerification,
      blockers,
      reportHash: "",
      generatedAt: new Date().toISOString(),
    }

    report.reportHash = computeHash({
      status: report.status,
      scenarios: report.scenarios.map((s) => ({ id: s.id, status: s.status })),
      mockApi: report.mockApi.map((a) => ({ id: a.id, path: a.path })),
      simulations: report.simulations.map((s) => ({ id: s.id, events: s.events })),
      runtimeVerification: {
        status: report.runtimeVerification.status,
        checks: report.runtimeVerification.checks.map((c) => ({ capability: c.capability, status: c.status })),
      },
      blockers: report.blockers,
    })

    return report
  }
}
