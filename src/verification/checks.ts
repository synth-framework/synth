// ============================================================
// VERIFICATION ENGINE: Checks
// ============================================================
// Individual governance invariant checks. Each check is independent,
// deterministic, and grounded in replayable evidence.
// ============================================================

import fs from "fs/promises"
import path from "path"
import type {
  VerificationCheck,
  VerificationCheckResult,
  VerificationViolation,
  VerificationContext,
} from "./types.js"

function v(
  message: string,
  overrides: Partial<VerificationViolation> = {},
): VerificationViolation {
  return { message, severity: "error", ...overrides }
}

function result(
  name: string,
  status: "pass" | "fail" | "warn",
  message: string,
  violations: VerificationViolation[] = [],
): VerificationCheckResult {
  return { name, status, message, violations }
}

/**
 * Replay Integrity Check
 *
 * Verifies the cryptographic hash-chain and the equality of operational
 * state to replayed state. Also reports aggregate graph correctness.
 */
export const checkReplayIntegrity: VerificationCheck = async (ctx) => {
  if (!ctx.hasEventLog) {
    return result("ReplayIntegrity", "pass", "No event log present; replay integrity is vacuously satisfied.")
  }

  const r = ctx.replayResult
  if (!r) {
    return result("ReplayIntegrity", "fail", "Replay result unavailable.", [
      v("Replay verifier did not produce a result.", { nextStep: "synth explain replay" }),
    ])
  }

  const violations: VerificationViolation[] = []

  if (!r.chainValid) {
    violations.push(
      v(`Hash-chain is broken: ${r.explanation}`, {
        nextStep: "synth explain replay",
      }),
    )
  }

  if (!r.consistent) {
    violations.push(
      v(`Replay consistency failed: ${r.explanation}`, {
        nextStep: "synth explain replay",
      }),
    )
    for (const d of r.divergences.slice(0, 5)) {
      violations.push(
        v(`Divergence at ${d.key}: live=${JSON.stringify(d.live)} replayed=${JSON.stringify(d.replayed)}`, {
          severity: "warning",
        }),
      )
    }
  }

  if (!r.graphValid) {
    for (const gv of r.graphViolations.slice(0, 10)) {
      violations.push(
        v(`[${gv.kind}] ${gv.message}`, {
          severity: "error",
          nextStep: "synth explain replay --strict-graph",
          ids: gv.aggregateId ? [gv.aggregateId] : undefined,
        }),
      )
    }
  }

  if (violations.length === 0) {
    return result(
      "ReplayIntegrity",
      "pass",
      `Chain valid, replay consistent, graph valid (${r.eventCount} events).`,
    )
  }

  const hasError = violations.some((x) => x.severity === "error" || x.severity === undefined)
  return result(
    "ReplayIntegrity",
    hasError ? "fail" : "warn",
    `Replay integrity check reported ${violations.length} issue(s).`,
    violations,
  )
}

/**
 * Projection Consistency Check
 *
 * Verifies that cached projections are consistent with their source state
 * and carry required provenance. Also detects forbidden mutable status files.
 */
export const checkProjectionConsistency: VerificationCheck = async (ctx) => {
  const violations: VerificationViolation[] = []

  if (ctx.hasEventLog && ctx.replayResult) {
    const liveState = await ctx.stateStore.load()
    if (!liveState) {
      violations.push(
        v("Canonical state file is missing despite the presence of an event log.", {
          nextStep: "synth explain replay",
        }),
      )
    } else if (liveState.stateHash !== ctx.replayResult.replayHash) {
      violations.push(
        v(`Cached state hash ${liveState.stateHash} does not match replay hash ${ctx.replayResult.replayHash}.`, {
          nextStep: "synth explain replay",
        }),
      )
    }
  }

  const forbiddenStatusFile = path.join(ctx.cwd, ".synth", "expeditions.json")
  try {
    await fs.access(forbiddenStatusFile)
    violations.push(
      v("Forbidden mutable status file `.synth/expeditions.json` exists; expedition status must be replay-derived.", {
        nextStep: "remove .synth/expeditions.json and rely on the event log",
      }),
    )
  } catch {
    // expected
  }

  const generatedDir = path.join(ctx.cwd, "docs", "generated")
  try {
    const entries = await fs.readdir(generatedDir)
    const generatedFiles = entries.filter((f) => f.endsWith(".md"))
    for (const file of generatedFiles) {
      const content = await fs.readFile(path.join(generatedDir, file), "utf-8")
      const hasProvenance =
        content.includes("sourceStateHash:") &&
        content.includes("computedAt:") &&
        content.includes("schemaVersion:")
      if (!hasProvenance) {
        violations.push(
          v(`Generated documentation '${file}' lacks required provenance metadata.`, {
            severity: "warning",
            nextStep: "synth docs generate",
          }),
        )
      }
    }
  } catch {
    // no generated docs
  }

  if (violations.length === 0) {
    return result("ProjectionConsistency", "pass", "Projections are consistent and no forbidden mutable status files exist.")
  }

  const hasError = violations.some((x) => x.severity === "error" || x.severity === undefined)
  return result(
    "ProjectionConsistency",
    hasError ? "fail" : "warn",
    `Projection consistency check reported ${violations.length} issue(s).`,
    violations,
  )
}

/**
 * Evidence Referential Integrity Check
 *
 * Verifies that every durable decision points to an existing draft and,
 * for approvals, to an existing certified snapshot.
 */
export const checkEvidenceReferentialIntegrity: VerificationCheck = async (ctx) => {
  const violations: VerificationViolation[] = []

  if (!ctx.decisions.chainValid) {
    violations.push(
      v("Decision record chain is broken; referential integrity cannot be trusted.", {
        nextStep: "inspect .synth/data/decisions.jsonl",
      }),
    )
  }

  for (const decision of ctx.decisions.records) {
    if (!ctx.draftIds.includes(decision.draftId)) {
      violations.push(
        v(`${decision.type} references missing draft '${decision.draftId}'.`, {
          ids: [decision.draftId],
          nextStep: `synth mission decisions --draft-id ${decision.draftId}`,
        }),
      )
    }
    if (decision.type === "MISSION_APPROVAL_APPROVED" && decision.snapshotId) {
      if (!ctx.snapshotIds.includes(decision.snapshotId)) {
        violations.push(
          v(`Approved decision references missing snapshot '${decision.snapshotId}'.`, {
            ids: [decision.snapshotId],
            nextStep: "synth mission snapshot list",
          }),
        )
      }
    }
  }

  if (ctx.snapshotError) {
    violations.push(
      v(`Snapshot store failed to load: ${ctx.snapshotError}`, {
        severity: "warning",
        nextStep: "synth mission snapshot list",
      }),
    )
  }

  if (violations.length === 0) {
    return result(
      "EvidenceReferentialIntegrity",
      "pass",
      "All recorded decisions resolve to existing drafts and snapshots.",
    )
  }

  const hasError = violations.some((x) => x.severity === "error" || x.severity === undefined)
  return result(
    "EvidenceReferentialIntegrity",
    hasError ? "fail" : "warn",
    `Evidence referential integrity check reported ${violations.length} issue(s).`,
    violations,
  )
}

/**
 * Assertion Provenance Check
 *
 * Verifies that assertions (confidence values, approval reasons) are
 * traceable to durable evidence rather than hand-edited fields.
 */
export const checkAssertionProvenance: VerificationCheck = async (ctx) => {
  const violations: VerificationViolation[] = []

  for (const decision of ctx.decisions.records) {
    if (decision.type === "MISSION_APPROVAL_REJECTED" && !decision.reason) {
      violations.push(
        v(`Rejection decision for draft '${decision.draftId}' lacks a reason.`, {
          ids: [decision.draftId],
          nextStep: `synth mission decisions --draft-id ${decision.draftId}`,
        }),
      )
    }
    if (decision.confidence === undefined || decision.confidence === null) {
      violations.push(
        v(`${decision.type} for draft '${decision.draftId}' lacks a confidence value.`, {
          ids: [decision.draftId],
          nextStep: `synth mission decisions --draft-id ${decision.draftId}`,
        }),
      )
    }
  }

  const draftsDir = path.join(ctx.dataDir, "drafts")
  for (const draftId of ctx.draftIds) {
    try {
      const content = JSON.parse(await fs.readFile(path.join(draftsDir, `${draftId}.json`), "utf-8"))
      const observations = Array.isArray(content.observations) ? content.observations : []
      if (observations.length === 0) {
        violations.push(
          v(`Draft '${draftId}' has no observations; confidence cannot be traced to evidence.`, {
            severity: "warning",
            ids: [draftId],
            nextStep: `synth mission evidence add --draft-id ${draftId} --subject "<evidence>"`,
          }),
        )
      }
    } catch {
      violations.push(
        v(`Draft '${draftId}' could not be read for provenance checks.`, {
          ids: [draftId],
        }),
      )
    }
  }

  if (violations.length === 0) {
    return result("AssertionProvenance", "pass", "All assertions are traceable to recorded evidence.")
  }

  const hasError = violations.some((x) => x.severity === "error" || x.severity === undefined)
  return result(
    "AssertionProvenance",
    hasError ? "fail" : "warn",
    `Assertion provenance check reported ${violations.length} issue(s).`,
    violations,
  )
}

/**
 * Governance Invariant Check
 *
 * Programmable rules derived from the governance record, layer boundaries,
 * and projection model.
 */
export const checkGovernanceInvariants: VerificationCheck = async (ctx) => {
  const violations: VerificationViolation[] = []

  const manifestPath = path.join(ctx.cwd, ".synth", "manifest.json")
  if (ctx.hasManifest) {
    try {
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"))
      const vocab = manifest.publicVocabulary
      const expected = ["Mission", "Expedition", "Evidence", "Plan", "Event", "State", "Replay"].sort()
      if (!Array.isArray(vocab) || JSON.stringify([...vocab].sort()) !== JSON.stringify(expected)) {
        violations.push(
          v("Manifest public vocabulary does not match the seven canonical concepts.", {
            nextStep: "synth init",
          }),
        )
      }
      if (manifest.schema !== "synth-bootstrap-manifest-v1") {
        violations.push(
          v(`Unknown manifest schema: ${manifest.schema}.`, {
            nextStep: "synth init",
          }),
        )
      }
    } catch {
      violations.push(v("Manifest exists but is not valid JSON.", { nextStep: "synth init" }))
    }
  }

  if (ctx.replayResult) {
    const state = ctx.replayResult.liveHash ? await ctx.stateStore.load() : undefined
    if (state) {
      const ids = new Map<string, string[]>()
      for (const id of Object.keys(state.missions)) ids.set(id, [...(ids.get(id) || []), "mission"])
      for (const id of Object.keys(state.expeditions)) ids.set(id, [...(ids.get(id) || []), "expedition"])
      for (const id of Object.keys(state.objectives)) ids.set(id, [...(ids.get(id) || []), "objective"])
      for (const [id, kinds] of ids.entries()) {
        if (kinds.length > 1) {
          violations.push(
            v(`Identifier '${id}' is used as both ${kinds.join(" and ")}.`, {
              ids: [id],
              nextStep: "synth explain replay --strict-graph",
            }),
          )
        }
      }
    }
  }

  if (violations.length === 0) {
    return result("GovernanceInvariants", "pass", "Governance invariants are satisfied.")
  }

  return result(
    "GovernanceInvariants",
    "fail",
    `Governance invariant check reported ${violations.length} issue(s).`,
    violations,
  )
}

/**
 * Drift Check
 *
 * Detects divergence between expected and actual state: checkpoints that
 * have moved past the event log, or canonical state that lags events.
 */
export const checkDrift: VerificationCheck = async (ctx) => {
  const violations: VerificationViolation[] = []

  let eventCount = 0
  if (ctx.hasEventLog) {
    const events = await ctx.eventStore.loadAll()
    eventCount = events.length
  }

  const liveState = await ctx.stateStore.load()
  if (liveState && eventCount > 0) {
    const stateEventCount = liveState.lastEventOffset ?? 0
    if (stateEventCount < eventCount) {
      violations.push(
        v(`Canonical state lags the event log: state offset ${stateEventCount} < event count ${eventCount}.`, {
          nextStep: "synth explain replay",
        }),
      )
    }
  }

  try {
    const checkpoints = JSON.parse(await fs.readFile(path.join(ctx.dataDir, "checkpoints.json"), "utf-8"))
    for (const [key, checkpoint] of Object.entries(checkpoints as Record<string, { lastCommittedOffset?: number }>)) {
      const offset = checkpoint.lastCommittedOffset ?? 0
      if (offset > eventCount) {
        violations.push(
          v(`Checkpoint '${key}' offset ${offset} exceeds event count ${eventCount}.`, {
            ids: [key],
            nextStep: "synth explain replay",
          }),
        )
      }
    }
  } catch {
    // no checkpoints file is fine
  }

  if (violations.length === 0) {
    return result("Drift", "pass", "No drift detected between expected and actual state.")
  }

  return result(
    "Drift",
    "fail",
    `Drift check reported ${violations.length} issue(s).`,
    violations,
  )
}

export const ALL_CHECKS: VerificationCheck[] = [
  checkReplayIntegrity,
  checkProjectionConsistency,
  checkEvidenceReferentialIntegrity,
  checkAssertionProvenance,
  checkGovernanceInvariants,
  checkDrift,
]
