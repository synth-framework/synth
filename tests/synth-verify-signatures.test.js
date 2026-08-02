// ============================================================
// SYNTH VERIFY SIGNATURES CLI TESTS (EXP-SIGN-001)
// ============================================================
// End-to-end tests for `synth verify signatures`.
// ============================================================

import { strict as assert } from "assert"
import fs from "fs/promises"
import path from "path"
import { runSynth, parseJson, withTempDir, assertCliBuilt } from "./helpers/cli-harness.js"

async function testVerifySignaturesUnsigned() {
  await withTempDir("synth-verify-signatures-", async (targetDir) => {
    const env = { ...process.env }

    // Initialize project — this generates the signing key pair.
    const initResult = runSynth(["init", "--name", "SignatureTest"], targetDir, { env, timeout: 120000 })
    assert.equal(initResult.status, 0, `synth init failed: ${initResult.stderr}`)

    // After init, the event log contains genesis/system events.
    const verifyResult = runSynth(["verify", "signatures"], targetDir, { env })
    assert.equal(verifyResult.status, 0, `synth verify signatures failed: ${verifyResult.stderr}`)
    const report = parseJson(verifyResult.stdout)
    assert.ok(report.status === "VALID" || report.status === "UNSIGNED", `unexpected status: ${report.status}`)
    assert.ok(report.checked > 0, "expected at least one event to be checked")
  })
}

async function testVerifySignaturesSignedAfterStateChange() {
  await withTempDir("synth-verify-signatures-state-", async (targetDir) => {
    const env = { ...process.env }

    const initResult = runSynth(["init", "--name", "SignatureTest"], targetDir, { env, timeout: 120000 })
    assert.equal(initResult.status, 0, `synth init failed: ${initResult.stderr}`)

    // Create a mission to produce a state event.
    const missionResult = runSynth(
      ["mission", "create", "--subject", "Test Mission", "--purpose", "test signatures"],
      targetDir,
      { env, timeout: 120000 },
    )
    assert.equal(missionResult.status, 0, `synth mission create failed: ${missionResult.stderr}`)

    const verifyResult = runSynth(["verify", "signatures"], targetDir, { env })
    assert.equal(verifyResult.status, 0, `synth verify signatures failed: ${verifyResult.stderr}`)
    const report = parseJson(verifyResult.stdout)
    assert.ok(report.status === "VALID" || report.status === "UNSIGNED", `unexpected status: ${report.status}`)

    // If the project has a signing key, at least one event should be signed.
    const publicKeyPath = path.join(targetDir, ".synth", "keys", "event-signing.pub")
    try {
      await fs.access(publicKeyPath)
      assert.ok(report.valid > 0, "expected at least one signed event when a public key is present")
    } catch {
      // No public key configured — UNSIGNED is acceptable.
      assert.equal(report.status, "UNSIGNED")
    }
  })
}

async function main() {
  await assertCliBuilt()
  await testVerifySignaturesUnsigned()
  await testVerifySignaturesSignedAfterStateChange()
  console.log("synth-verify-signatures: all tests passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
