// ============================================================
// First Contact Mission Materialization Tests
// ============================================================
// Regression guards for EXP-AIFC-007:
//  - Materialization creates manifest, event log, state, artifact, proposals.
//  - Materialization fails if capability verification is blocked.
//  - Generated events are linked by previousHash.
//  - Mission and Expedition proposals are deterministic in shape.
// ============================================================

import fs from "fs/promises"
import os from "os"
import path from "path"
import { extractIntent } from "../dist/first-contact/extract/index.js"
import { projectArchitecture } from "../dist/first-contact/project/index.js"
import { verifyCapabilities } from "../dist/first-contact/verify/index.js"
import { materialize } from "../dist/first-contact/materialize/index.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function testMaterializesProject() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-materialize-"))
  const artifact = extractIntent("Let's build a space mission tracker in TypeScript for the web.")
  const projection = projectArchitecture(artifact)
  const verification = verifyCapabilities(projection.recommended)

  const result = await materialize({
    projectRoot: tmpDir,
    approvedArtifact: artifact,
    selectedArchitecture: projection.recommended,
    verificationReport: verification,
  })

  const manifest = JSON.parse(await fs.readFile(result.manifestPath, "utf-8"))
  assert(manifest.schema === "synth-bootstrap-manifest-v1", "manifest should have correct schema")

  const eventLog = (await fs.readFile(result.eventLogPath, "utf-8")).trim().split("\n").map(JSON.parse)
  assert(eventLog.length >= 4, "event log should contain first-contact events")
  assert(eventLog[0].type === "FIRST_CONTACT_STARTED", "first event should be FIRST_CONTACT_STARTED")
  assert(eventLog[eventLog.length - 1].type === "EXPEDITIONS_PROPOSED", "last event should be EXPEDITIONS_PROPOSED")
  assert(eventLog[1].previousHash === eventLog[0].eventHash, "events should chain hashes")

  const state = JSON.parse(await fs.readFile(result.statePath, "utf-8"))
  assert(state.lifecycle === "materialized", "state should be materialized")

  const storedArtifact = JSON.parse(await fs.readFile(result.artifactPath, "utf-8"))
  assert(storedArtifact.artifactHash.length > 0, "stored artifact should have a hash")
  assert(storedArtifact.selectedArchitecture.id === projection.recommended.id, "stored artifact should reference selected architecture")

  const mission = JSON.parse(await fs.readFile(result.missionProposalPath, "utf-8"))
  assert(mission.subject, "mission should have a subject")

  const expeditions = JSON.parse(await fs.readFile(result.expeditionProposalsPath, "utf-8"))
  assert(Array.isArray(expeditions) && expeditions.length >= 1, "expeditions should be an array")

  await fs.rm(tmpDir, { recursive: true, force: true })
  console.log("[PASS] materializes a governed project")
}

async function testBlocksOnFailedVerification() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-materialize-"))
  const artifact = extractIntent("Let's build a space mission tracker.")
  const projection = projectArchitecture(artifact)

  let error
  try {
    await materialize({
      projectRoot: tmpDir,
      approvedArtifact: artifact,
      selectedArchitecture: projection.recommended,
      verificationReport: { status: "blocked", blockers: [{ capability: "ruby", status: "MISSING", message: "Ruby missing" }], checks: [], reportHash: "abc" },
    })
  } catch (err) {
    error = err
  }

  assert(error && error.message.includes("blocked"), "should throw when verification is blocked")
  await fs.rm(tmpDir, { recursive: true, force: true })
  console.log("[PASS] blocks materialization on failed verification")
}

async function main() {
  await testMaterializesProject()
  await testBlocksOnFailedVerification()
  console.log("\n[FIRST CONTACT MATERIALIZE] All tests passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
