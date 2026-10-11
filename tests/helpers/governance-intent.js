// ============================================================
// TEST HELPERS — In-memory governance intents
// ============================================================
// Shared handleIntent flows for tests that drive the governance engine
// directly (no CLI): approveMission, createExecutingExpedition, and the
// fixed-payload certifyConvergence. Single home for the identical blocks
// previously copied across convergence-certification,
// governance-evaluation-enforcement, expedition-lifecycle, and
// governance-lifecycle-contract tests (expedition 7a79e79b, round 15/150).
//
// Usage:
//   import {
//     approveMission, createExecutingExpedition, certifyConvergence,
//   } from "./helpers/governance-intent.js"
// ============================================================

import { strict as assert } from "assert"
import { createAlignedContract } from "./alignment-fixture.js"

/**
 * Create + approve a mission through the engine. Returns { contractId }.
 * `purpose` is the only per-file variation; everything else is shared.
 */
export async function approveMission(ctx, id, { purpose = "Governance test" } = {}) {
  let result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateMission",
    payload: { id, name: `Mission ${id}`, purpose },
  })
  assert.equal(result.status, "ok", `CreateMission should succeed: ${result.error}`)

  const { contractId } = await createAlignedContract(ctx)
  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id, alignmentContractId: contractId },
  })
  assert.equal(result.status, "ok", `ApproveMission should succeed: ${result.error}`)
  return { contractId }
}

/** Create → approve → commit → start an expedition through the engine. Pass `{ start: false }` for the pre-start draft. */
export async function createExecutingExpedition(ctx, missionId, expeditionId, { name = "Test Expedition", goal, start = true } = {}) {
  let result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateExpedition",
    payload: { id: expeditionId, missionId, name, ...(goal ? { goal } : {}) },
  })
  assert.equal(result.status, "ok", `CreateExpedition should succeed: ${result.error}`)

  result = await ctx.api.handleIntent({ actor: "test", capability: "ApproveExpedition", payload: { id: expeditionId } })
  assert.equal(result.status, "ok", `ApproveExpedition should succeed: ${result.error}`)

  result = await ctx.api.handleIntent({ actor: "test", capability: "CommitExpedition", payload: { id: expeditionId } })
  assert.equal(result.status, "ok", `CommitExpedition should succeed: ${result.error}`)

  if (start) {
    result = await ctx.api.handleIntent({ actor: "test", capability: "StartExpedition", payload: { id: expeditionId } })
    assert.equal(result.status, "ok", `StartExpedition should succeed: ${result.error}`)
  }
}

/**
 * Fixed-payload convergence certification asserting a "converged" decision.
 * For parameterized observedFeatures, see convergence-certification tests.
 */
export async function certifyConvergence(gateCtx, missionId, expeditionId, contractId, {
  artifacts,
  runtimeEvidence,
  observedFeatures,
  decisionMessage = "Convergence certification must converge",
} = {}) {
  const result = await gateCtx.api.handleIntent({
    actor: "test",
    capability: "CertifyConvergence",
    payload: {
      missionId,
      expeditionId,
      alignmentContractId: contractId,
      observedFeatures: observedFeatures ?? {
        hasPersistentHeader: true,
        hasPersistentSidebar: true,
        hasScrollDrivenPhases: true,
      },
      ruleSetId: "program-027-homepage",
      artifacts: artifacts ?? [
        {
          path: `synth://missions/${missionId}/expeditions/${expeditionId}/implementation`,
          hash: `test-${missionId}-${expeditionId}`,
          description: "Test implementation reference",
        },
      ],
      runtimeEvidence: runtimeEvidence ?? [
        {
          source: `synth://missions/${missionId}/expeditions/${expeditionId}/runtime`,
          observation: "Runtime behavior observed",
          timestamp: 0,
        },
      ],
      executionEvidence: [
        {
          executionId: `test-execution-${expeditionId}`,
          result: "passed",
          outcome: "completed",
        },
      ],
      certifier: { kind: "engine", id: "convergence-certification" },
    },
  })
  assert(result.status === "ok", `CertifyConvergence must succeed: ${result.error}`)
  assert(result.result?.decision === "converged", `${decisionMessage}, got ${result.result?.decision}`)
}

/**
 * Parameterized convergence certification (caller-supplied observedFeatures).
 * Returns the raw result for caller assertions. Shared by convergence and
 * lifecycle-replay certification tests.
 */
export async function certifyConvergenceWithFeatures(ctx, missionId, expeditionId, contractId, observedFeatures, { evidenceSource = "puppeteer", evidenceTimestamp = Date.now() } = {}) {
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CertifyConvergence",
    payload: {
      missionId,
      expeditionId,
      alignmentContractId: contractId,
      observedFeatures,
      artifacts: [{ kind: "artifact", id: "homepage", path: "/homepage.html", description: "Homepage implementation" }],
      runtimeEvidence: [{ kind: "runtime", id: "render", source: evidenceSource, observation: "Workspace renders", timestamp: evidenceTimestamp }],
      executionEvidence: [{ kind: "execution", id: "build", eventIds: ["e1"], summary: "Build passed" }],
    },
  })
  return result
}
