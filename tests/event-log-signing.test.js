// ============================================================
// EVENT LOG SIGNING TESTS (EXP-SIGN-001)
// ============================================================
// Verifies Ed25519 event signatures, Merkle roots, and the
// synth verify signatures command.
// ============================================================

import { strict as assert } from "assert"
import fs from "fs/promises"
import path from "path"
import os from "os"
import crypto from "crypto"
import {
  generateSigningKeyPair,
  signEvent,
  signEventBatch,
  computeMerkleRoot,
  buildMerkleRoot,
  signMerkleRoot,
  verifyEventSignature,
  verifyMerkleRoot,
  verifyEventLogSignatures,
} from "../dist/signing/index.js"

function createTestEvent(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    type: "TEST_EVENT",
    timestamp: Date.now(),
    transactionId: "tx-test",
    capability: "test",
    actor: "test-actor",
    payload: { metadata: { identity: { agentId: "test-agent", sessionId: "test-session" } } },
    previousHash: "genesis",
    eventHash: crypto.randomUUID(),
    ...overrides,
  }
}

async function withTempKeys(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-signing-"))
  const privateKeyPath = path.join(dir, "event-signing.key")
  const publicKeyPath = path.join(dir, "event-signing.pub")
  const pair = generateSigningKeyPair()
  await fs.writeFile(privateKeyPath, pair.privateKey, { mode: 0o600 })
  await fs.writeFile(publicKeyPath, pair.publicKey, { mode: 0o644 })
  try {
    return await fn({ dir, privateKeyPath, publicKeyPath, pair })
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
}

async function testSignEventVerifies() {
  await withTempKeys(async ({ privateKeyPath, publicKeyPath, pair }) => {
    const event = createTestEvent()
    const signed = signEvent(event, pair.privateKey, pair.fingerprint)
    assert.ok(signed.signature, "expected signature to be set")
    assert.equal(signed.signingKeyFingerprint, pair.fingerprint)

    const result = verifyEventSignature(signed, pair.publicKey)
    assert.equal(result.status, "VALID", `expected signature to verify: ${result.reason}`)
  })
}

async function testTamperedEventFailsVerification() {
  await withTempKeys(async ({ pair }) => {
    const event = createTestEvent()
    const signed = signEvent(event, pair.privateKey, pair.fingerprint)
    signed.payload = { tampered: true }
    const result = verifyEventSignature(signed, pair.publicKey)
    assert.equal(result.status, "INVALID", "expected tampered payload to fail verification")
  })
}

async function testBatchSigning() {
  await withTempKeys(async ({ privateKeyPath, publicKeyPath, pair }) => {
    const events = [createTestEvent(), createTestEvent(), createTestEvent()]
    const signed = await signEventBatch(events, { privateKeyPath, publicKeyPath })
    assert.equal(signed.length, 3)
    for (const event of signed) {
      assert.ok(event.signature, "expected batch event to be signed")
      assert.equal(event.signingKeyFingerprint, pair.fingerprint)
      const result = verifyEventSignature(event, pair.publicKey)
      assert.equal(result.status, "VALID", `batch event did not verify: ${result.reason}`)
    }
  })
}

async function testUnsignedEventsReportUnsigned() {
  const events = [createTestEvent(), createTestEvent()]
  const report = await verifyEventLogSignatures(events)
  assert.equal(report.status, "UNSIGNED")
  assert.equal(report.unsigned, 2)
  assert.equal(report.valid, 0)
}

async function testUnknownFingerprintReportsKeyUnknown() {
  await withTempKeys(async ({ pair }) => {
    const event = createTestEvent()
    const signed = signEvent(event, pair.privateKey, pair.fingerprint)
    const report = await verifyEventLogSignatures([signed])
    assert.equal(report.status, "KEY_UNKNOWN")
    assert.equal(report.keyUnknown, 1)
  })
}

async function testMerkleRoot() {
  await withTempKeys(async ({ pair }) => {
    const events = [createTestEvent(), createTestEvent(), createTestEvent()]
    const signed = events.map((e) => signEvent(e, pair.privateKey, pair.fingerprint))
    const root = buildMerkleRoot(signed, 0, signed.length - 1)
    assert.ok(root.root, "expected non-empty Merkle root")

    const signature = signMerkleRoot(root, pair.privateKey)
    const result = verifyMerkleRoot(root, signature, pair.fingerprint, pair.publicKey)
    assert.equal(result.status, "VALID", `Merkle root did not verify: ${result.reason}`)

    // Tampered root should fail
    const tampered = { ...root, root: "deadbeef" }
    const tamperedResult = verifyMerkleRoot(tampered, signature, pair.fingerprint, pair.publicKey)
    assert.equal(tamperedResult.status, "INVALID", "expected tampered Merkle root to fail")
  })
}

async function testKeyRotationProducesValidSignatures() {
  await withTempKeys(async ({ dir, privateKeyPath, publicKeyPath, pair }) => {
    // Sign first event with original key
    const event1 = createTestEvent()
    const signed1 = signEvent(event1, pair.privateKey, pair.fingerprint)
    assert.equal(verifyEventSignature(signed1, pair.publicKey).status, "VALID")

    // Generate new key pair and rotate (simulate by overwriting files)
    const newPair = generateSigningKeyPair()
    await fs.writeFile(privateKeyPath, newPair.privateKey, { mode: 0o600 })
    await fs.writeFile(publicKeyPath, newPair.publicKey, { mode: 0o644 })

    // Sign second event with new key
    const event2 = createTestEvent()
    const signed2 = signEvent(event2, newPair.privateKey, newPair.fingerprint)
    assert.equal(verifyEventSignature(signed2, newPair.publicKey).status, "VALID")

    // Old signature still verifies against old public key
    assert.equal(verifyEventSignature(signed1, pair.publicKey).status, "VALID")
  })
}

async function main() {
  await testSignEventVerifies()
  await testTamperedEventFailsVerification()
  await testBatchSigning()
  await testUnsignedEventsReportUnsigned()
  await testUnknownFingerprintReportsKeyUnknown()
  await testMerkleRoot()
  await testKeyRotationProducesValidSignatures()
  console.log("event-log-signing: all tests passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
