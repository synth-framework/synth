import { makeTempDir } from "./helpers/workspace.js"
// ============================================================
// Governance Resolver Tests
// ============================================================
// Regression guards for EXP-GOV-007: the Governance Resolver is the
// sole reader of durable governance artifacts and produces a versioned,
// immutable ResolvedGovernanceContext.
// ============================================================

import fs from "fs/promises"
import path from "path"
import os from "os"
import { assert } from "./helpers/assert.js"
import { makeManifest } from "./helpers/test-fixtures.js"
import { makeApprovedMissionEvents, makeExecutingExpeditionEvents, makeBrokenDecisionRecords } from "./helpers/event-fixtures.js"
import { loadResolver, loadComputeEventHash, writeEventLog } from "./helpers/state-fixtures.js"

const RESOLVER_MODULE_PATH = path.resolve(process.cwd(), "dist", "runtime", "governance-resolver.js")

async function writeBrokenDecisionLog(dir) {
  const dataDir = path.join(dir, ".synth", "data")
  await fs.mkdir(dataDir, { recursive: true })
  await fs.writeFile(path.join(dataDir, "decisions.jsonl"), makeBrokenDecisionRecords())
}

async function testUninitialized() {
  const tmpDir = await makeTempDir("synth-gov-resolver-uninit-")
  try {
    const { resolveGovernanceContext, isGovernanceResolutionFailure } = await loadResolver()
    const result = await resolveGovernanceContext(tmpDir)
    assert(!isGovernanceResolutionFailure(result), "should not fail for uninitialized dir")
    assert(result.schemaVersion === 1, "context should be versioned")
    assert(result.authoritative.manifestExists === false, "manifest should not exist")
    assert(result.authoritative.events.length === 0, "events should be empty")
    assert(result.derived.phase === "uninitialized", `phase should be uninitialized, got ${result.derived.phase}`)
    assert(result.derived.activeMission === null, "active mission should be null")
    assert(result.derived.activeExpedition === null, "active expedition should be null")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] uninitialized directory resolves to phase uninitialized")
}

// ------------------------------------------------------------
// Fixture: initialized, no mission yet
// ------------------------------------------------------------
async function testInitializedNoMission() {
  const tmpDir = await makeTempDir("synth-gov-resolver-init-")
  try {
    await makeManifest(tmpDir)
    const { resolveGovernanceContext, isGovernanceResolutionFailure } = await loadResolver()
    const result = await resolveGovernanceContext(tmpDir)
    assert(!isGovernanceResolutionFailure(result), "should not fail for initialized project")
    assert(result.derived.phase === "planning", `phase should be planning, got ${result.derived.phase}`)
    assert(result.derived.latestDraft === null || result.derived.latestDraft === undefined, "should have no draft")
    assert(result.authoritative.events.length === 0, "events should be empty")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] initialized project without mission resolves to phase planning")
}

// ------------------------------------------------------------
// Fixture: approved mission, no expeditions
// ------------------------------------------------------------
async function testApprovedNoExpeditions() {
  const tmpDir = await makeTempDir("synth-gov-resolver-approved-")
  try {
    await makeManifest(tmpDir)
    const missionId = "M-GOV-1"
    await writeEventLog(tmpDir, makeApprovedMissionEvents({ systemId: "gov-test", missionId }))

    const { resolveGovernanceContext, isGovernanceResolutionFailure } = await loadResolver()
    const result = await resolveGovernanceContext(tmpDir)
    assert(!isGovernanceResolutionFailure(result), "should not fail for approved mission")
    assert(result.derived.phase === "approved", `phase should be approved, got ${result.derived.phase}`)
    assert(result.derived.activeMission?.id === missionId, "active mission should match")
    assert(result.derived.activeExpedition === null, "active expedition should be null")
    assert(result.authoritative.events.length === 3, "should have three events")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] approved mission with no expeditions resolves to phase approved")
}

async function testExecuting() {
  const tmpDir = await makeTempDir("synth-gov-resolver-executing-")
  try {
    await makeManifest(tmpDir)
    const missionId = "M-GOV-2"
    const expeditionId = "E-GOV-2"
    await writeEventLog(tmpDir, makeExecutingExpeditionEvents({ systemId: "gov-test", missionId, expeditionId }))

    const { resolveGovernanceContext, isGovernanceResolutionFailure } = await loadResolver()
    const result = await resolveGovernanceContext(tmpDir)
    assert(!isGovernanceResolutionFailure(result), "should not fail for executing expedition")
    assert(result.derived.phase === "executing", `phase should be executing, got ${result.derived.phase}`)
    assert(result.derived.activeExpedition?.id === expeditionId, "active expedition should match")
    assert(result.derived.activeExpedition?.status === "executing", "expedition should be executing")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] executing expedition resolves to phase executing")
}

// ------------------------------------------------------------
// Fixture: broken decision log surfaces as warning divergence
// ------------------------------------------------------------
async function testBrokenDecisionLogWarning() {
  const tmpDir = await makeTempDir("synth-gov-resolver-decision-")
  try {
    await makeManifest(tmpDir)
    await writeBrokenDecisionLog(tmpDir)

    const { resolveGovernanceContext, isGovernanceResolutionFailure } = await loadResolver()
    const result = await resolveGovernanceContext(tmpDir)
    assert(!isGovernanceResolutionFailure(result), "broken decision chain should be a warning, not a failure")
    const warning = result.derived.divergences.find((d) => d.kind === "decision-chain-broken")
    assert(warning, "should report decision-chain-broken divergence")
    assert(warning.severity === "warning", "decision chain divergence should be a warning")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] broken decision log is surfaced as a warning divergence")
}

async function main() {
  try {
    await fs.access(RESOLVER_MODULE_PATH)
  } catch {
    console.error("[SKIP] Runtime not built. Run 'npm run build' first.")
    process.exit(0)
  }

  await testUninitialized()
  await testInitializedNoMission()
  await testApprovedNoExpeditions()
  await testExecuting()
  await testBrokenDecisionLogWarning()

  console.log("\n[GOVERNANCE RESOLVER] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
