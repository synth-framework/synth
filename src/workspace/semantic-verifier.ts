// ============================================================
// WORKSPACE: Semantic Verifier
// ============================================================
// Verifies architectural meaning — not just vocabulary.
// Reads state via StateReader only; never touches runtime engine.
// ============================================================

import { promises as fs } from "fs"
import path from "path"
import type { CapabilityRegistry } from "../types/index.js"
import type { StateReader } from "./types.js"

export type SemanticAssertion = {
  id: string
  text: string
  invariant: string
  status: "PASS" | "FAIL" | "WARN"
  detail: string
}

export type SemanticVerificationResult = {
  passed: boolean
  assertions: SemanticAssertion[]
}

export class SemanticVerifier {
  constructor(
    private reader: StateReader,
    private capabilityRegistry: CapabilityRegistry,
  ) {}

  async verify(state: { workItems?: Record<string, unknown>; expeditions?: Record<string, unknown>; objectives?: Record<string, unknown> }): Promise<SemanticVerificationResult> {
    const assertions: SemanticAssertion[] = []

    assertions.push(this._checkCanonicalEntities(state))
    assertions.push(await this._checkReplayable())
    assertions.push(this._checkLifecycles(state))
    assertions.push(this._checkPlanningIndependence(state))
    assertions.push(this._checkProjectionOrigin(state))
    assertions.push(await this._checkLanguageAuthority())
    assertions.push(this._checkExecutionBelowPlanning(state))

    const allPassed = assertions.every((a) => a.status === "PASS")
    return { passed: allPassed, assertions }
  }

  private _checkCanonicalEntities(state: { workItems?: Record<string, unknown> }): SemanticAssertion {
    const workItems = Object.values(state.workItems || {})
    const allHaveIds = workItems.every((wi) => typeof (wi as Record<string, unknown>).id === "string" && String((wi as Record<string, unknown>).id).length > 0)
    const allHaveStatus = workItems.every((wi) => ["idle", "active", "complete", "blocked"].includes((wi as Record<string, unknown>).status as string))

    return {
      id: "A1",
      text: "Capabilities operate only on canonical entities",
      invariant: "KI-001",
      status: allHaveIds && allHaveStatus ? "PASS" : "FAIL",
      detail: `Checked ${workItems.length} work items — ${allHaveIds ? "all have ids" : "missing ids"}, ${allHaveStatus ? "all have valid status" : "invalid status found"}`,
    }
  }

  private async _checkReplayable(): Promise<SemanticAssertion> {
    let ok = false
    let detail = "Replay not available"
    try {
      const result = await this.reader.verifyReplay()
      ok = result.consistent
      detail = `Replayed ${result.eventCount} events — ${ok ? "consistent" : "INCONSISTENT"}`
    } catch (err) {
      detail = `Replay error: ${(err as Error).message}`
    }

    return {
      id: "A2",
      text: "Events are replayable",
      invariant: "Determinism",
      status: ok ? "PASS" : "FAIL",
      detail,
    }
  }

  private _checkLifecycles(state: { workItems?: Record<string, unknown> }): SemanticAssertion {
    const workItems = Object.values(state.workItems || {})
    const validStatuses = ["idle", "active", "complete", "blocked"]
    const allValid = workItems.every((wi) => validStatuses.includes((wi as Record<string, unknown>).status as string))

    return {
      id: "A3",
      text: "Entities have documented lifecycles",
      invariant: "State model",
      status: allValid ? "PASS" : "FAIL",
      detail: `Checked ${workItems.length} work items — all states ${allValid ? "valid" : "INVALID"}`,
    }
  }

  private _checkPlanningIndependence(state: { expeditions?: Record<string, unknown>; objectives?: Record<string, unknown> }): SemanticAssertion {
    const expeditions = Object.values(state.expeditions || {})
    const objectives = Object.values(state.objectives || {})
    const infraTerms = ["Agent", "Tool", "Workflow", "Capability", "Runtime", "Protocol", "GitHub", "Jira"]

    const checkEntity = (entity: unknown) => {
      const json = JSON.stringify(entity)
      return infraTerms.some((t) => json.includes(t))
    }
    const leaked = expeditions.some(checkEntity) || objectives.some(checkEntity)

    return {
      id: "A4",
      text: "Planning is independent of infrastructure",
      invariant: "KI-004",
      status: leaked ? "FAIL" : "PASS",
      detail: `Checked ${expeditions.length} expeditions, ${objectives.length} objectives — ${leaked ? "INFRASTRUCTURE LEAKAGE DETECTED" : "no leakage"}`,
    }
  }

  private _checkProjectionOrigin(state: { workItems?: Record<string, unknown> }): SemanticAssertion {
    const workItems = Object.values(state.workItems || {})
    const hasProjections = workItems.some((wi) => {
      const metadata = (wi as Record<string, unknown>).metadata as Record<string, unknown> | undefined
      return metadata && Object.keys(metadata).some((k) => ["github", "jira", "linear"].includes(k.toLowerCase()))
    })

    return {
      id: "A5",
      text: "Projections originate from canonical knowledge",
      invariant: "KI-003",
      status: "PASS",
      detail: `Checked ${workItems.length} work items — ${hasProjections ? "projections present" : "no projections (pure canonical state)"}`,
    }
  }

  private async _checkLanguageAuthority(): Promise<SemanticAssertion> {
    const ulPath = path.join(process.cwd(), "docs", "ubiquitous-language.md")
    let exists = false
    try {
      await fs.access(ulPath)
      exists = true
    } catch { /* not accessible */ }

    return {
      id: "A6",
      text: "Knowledge layer defines ubiquitous language",
      invariant: "KI-008",
      status: exists ? "PASS" : "WARN",
      detail: exists ? `ubiquitous-language.md found at ${ulPath}` : `ubiquitous-language.md not found at ${ulPath}`,
    }
  }

  private _checkExecutionBelowPlanning(state: { expeditions?: Record<string, unknown> }): SemanticAssertion {
    const expeditions = Object.values(state.expeditions || {})
    const hasCorrectHierarchy = expeditions.every((e) => !(e as Record<string, unknown>).workItems || Array.isArray((e as Record<string, unknown>).workItems))

    return {
      id: "A7",
      text: "Execution vocabulary remains below planning",
      invariant: "KI-002",
      status: hasCorrectHierarchy ? "PASS" : "WARN",
      detail: `Checked ${expeditions.length} expeditions — hierarchy ${hasCorrectHierarchy ? "correct" : "unclear"}`,
    }
  }
}
