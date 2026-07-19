// ============================================================
// First Contact Replay Integration Tests
// ============================================================
// Regression guards for EXP-AIFC-009:
//  - Materialized first-contact events form a valid hash chain.
//  - Replay verifier reconstructs canonical state from first-contact events.
//  - Stored discovery artifact hash matches the DISCOVERY_APPROVED event.
//  - Tampering with the artifact is detected by replay.
// ============================================================

import fs from "fs/promises"
import os from "os"
import path from "path"
import { extractIntent } from "../dist/first-contact/extract/index.js"
import { projectArchitecture } from "../dist/first-contact/project/index.js"
import { verifyCapabilities } from "../dist/first-contact/verify/index.js"
import { materialize } from "../dist/first-contact/materialize/index.js"
import { EventStore } from "../dist/infra/event-store.js"
import { StateStore } from "../dist/infra/state-store.js"
import { createReplayVerifier } from "../dist/core/replay-verifier.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function testReplayVerifiesMaterializedProject() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-first-contact-replay-"))
  const artifact = extractIntent("Let's build a space mission tracker in TypeScript for the web.")
  const projection = projectArchitecture(artifact)
  const verification = verifyCapabilities(projection.recommended)

  const result = await materialize({
    projectRoot: tmpDir,
    approvedArtifact: artifact,
    selectedArchitecture: projection.recommended,
    verificationReport: verification,
  })

  const eventStore = new EventStore(result.eventLogPath)
  const stateStore = new StateStore(result.statePath)
  const verifier = createReplayVerifier(eventStore, stateStore)
  const replayResult = await verifier.verify()

  assert(replayResult.chainValid, `hash chain should be valid: ${replayResult.explanation}`)
  assert(replayResult.consistent, `replay should be consistent: ${replayResult.explanation}`)
  assert(replayResult.eventCount === 4, `should replay 4 first-contact events, got ${replayResult.eventCount}`)
  assert(
    !replayResult.divergences.some((d) => d.key.startsWith("firstContactArtifact")),
    `artifact should match: ${JSON.stringify(replayResult.divergences)}`,
  )

  const state = JSON.parse(await fs.readFile(result.statePath, "utf-8"))
  assert(state.lifecycle === "materialized", "persisted state should be materialized")
  assert(Object.keys(state.missions).length === 1, "persisted state should contain the materialized mission")
  assert(Object.keys(state.expeditions).length === 2, "persisted state should contain the proposed expeditions")

  await fs.rm(tmpDir, { recursive: true, force: true })
  console.log("[PASS] replay verifies a materialized first-contact project")
}

async function testReplayDetectsArtifactTampering() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-first-contact-replay-"))
  const artifact = extractIntent("Let's build a space mission tracker in TypeScript for the web.")
  const projection = projectArchitecture(artifact)
  const verification = verifyCapabilities(projection.recommended)

  const result = await materialize({
    projectRoot: tmpDir,
    approvedArtifact: artifact,
    selectedArchitecture: projection.recommended,
    verificationReport: verification,
  })

  // Tamper with the stored artifact hash.
  const storedArtifact = JSON.parse(await fs.readFile(result.artifactPath, "utf-8"))
  storedArtifact.artifactHash = "tampered-hash"
  await fs.writeFile(result.artifactPath, JSON.stringify(storedArtifact, null, 2), "utf-8")

  const eventStore = new EventStore(result.eventLogPath)
  const stateStore = new StateStore(result.statePath)
  const verifier = createReplayVerifier(eventStore, stateStore)
  const replayResult = await verifier.verify()

  assert(!replayResult.consistent, "replay should be inconsistent after artifact tampering")
  assert(
    replayResult.divergences.some((d) => d.key === "firstContactArtifact.hashMismatch"),
    `should report artifact hash mismatch: ${JSON.stringify(replayResult.divergences)}`,
  )

  await fs.rm(tmpDir, { recursive: true, force: true })
  console.log("[PASS] replay detects first-contact artifact tampering")
}

async function testReplayDetectsMissingArtifact() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-first-contact-replay-"))
  const artifact = extractIntent("Let's build a space mission tracker in TypeScript for the web.")
  const projection = projectArchitecture(artifact)
  const verification = verifyCapabilities(projection.recommended)

  const result = await materialize({
    projectRoot: tmpDir,
    approvedArtifact: artifact,
    selectedArchitecture: projection.recommended,
    verificationReport: verification,
  })

  await fs.rm(result.artifactPath)

  const eventStore = new EventStore(result.eventLogPath)
  const stateStore = new StateStore(result.statePath)
  const verifier = createReplayVerifier(eventStore, stateStore)
  const replayResult = await verifier.verify()

  assert(!replayResult.consistent, "replay should be inconsistent when artifact is missing")
  assert(
    replayResult.divergences.some((d) => d.key === "firstContactArtifact.missing"),
    `should report missing artifact: ${JSON.stringify(replayResult.divergences)}`,
  )

  await fs.rm(tmpDir, { recursive: true, force: true })
  console.log("[PASS] replay detects missing first-contact artifact")
}

async function main() {
  await testReplayVerifiesMaterializedProject()
  await testReplayDetectsArtifactTampering()
  await testReplayDetectsMissingArtifact()
  console.log("\n[FIRST CONTACT REPLAY] All tests passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
