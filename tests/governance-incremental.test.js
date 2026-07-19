// ============================================================
// GOVERNANCE INCREMENTAL ENGINE TESTS (EXP-GOVERN-003)
// ============================================================
// Tests the proof store, fingerprint engine, and incremental cache decisions
// without running the full governance pipeline.
// ============================================================

import assert from "assert"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { ProofStore } from "../scripts/governance/proof-store.js"
import { IncrementalEngine } from "../scripts/governance/incremental-engine.js"
import { computeFingerprint } from "../scripts/governance/fingerprint.js"
import { registerCheck, resolveCheck } from "../scripts/governance/check-registry.js"

async function withTempStore(fn) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-govern-proof-"))
  const store = new ProofStore({ cacheDir: path.join(tmpDir, "cache") })
  try {
    return await fn(store, tmpDir)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testProofStoreRoundTrip() {
  await withTempStore(async (store) => {
    const proof = await store.put({
      check: "test-check",
      fingerprint: "abc123",
      dependencies: [],
      result: "PASS",
      validatorVersion: "1.0.0",
    })

    const retrieved = await store.get("test-check", "abc123")
    assert.ok(retrieved)
    assert.strictEqual(retrieved.result, "PASS")
    assert.strictEqual(retrieved.check, "test-check")
    assert.ok(store.verifyIntegrity(retrieved))
  })
  console.log("[PASS] proof store round-trip")
}

async function testProofStoreDetectsCorruption() {
  await withTempStore(async (store) => {
    const proof = await store.put({
      check: "test-check",
      fingerprint: "abc123",
      dependencies: [],
      result: "PASS",
      validatorVersion: "1.0.0",
    })

    proof.result = "FAIL"
    assert.strictEqual(store.verifyIntegrity(proof), false)
  })
  console.log("[PASS] proof store detects corruption")
}

async function testProofStoreVersionInvalidation() {
  await withTempStore(async (store) => {
    const checkBase = resolveCheck("test-check")
    const fingerprint = await computeFingerprint({
      checkId: checkBase.id,
      inputs: checkBase.inputs,
      validatorVersion: checkBase.validatorVersion,
      root: process.cwd(),
    })

    await store.put({
      check: checkBase.id,
      fingerprint,
      dependencies: [],
      result: "PASS",
      validatorVersion: "1.0.0",
    })

    const check = { ...checkBase, validatorVersion: "2.0.0" }
    const engine = new IncrementalEngine({ store, root: process.cwd() })
    const decision = await engine.decide(check, fingerprint, [])
    assert.strictEqual(decision.action, "run")
    assert.strictEqual(decision.reason, "version-mismatch")
  })
  console.log("[PASS] version mismatch invalidates proof")
}

async function testIncrementalEngineCacheMissThenHit() {
  await withTempStore(async (store, tmpDir) => {
    const check = {
      id: "my-check",
      module: "tests",
      inputs: [],
      outputs: [],
      scope: "tests",
      protectedAssets: [],
      determinism: "deterministic",
      validatorVersion: "1.0.0",
    }

    const engine = new IncrementalEngine({ store, root: tmpDir })
    const fingerprint = await computeFingerprint({
      checkId: check.id,
      inputs: check.inputs,
      validatorVersion: check.validatorVersion,
      root: tmpDir,
    })

    const miss = await engine.decide(check, fingerprint, [])
    assert.strictEqual(miss.action, "run")
    assert.strictEqual(miss.reason, "cache-miss")

    await engine.record(check, fingerprint, [], "PASS")

    const hit = await engine.decide(check, fingerprint, [])
    assert.strictEqual(hit.action, "skip")
    assert.strictEqual(hit.reason, "cache-hit")
  })
  console.log("[PASS] cache miss followed by cache hit")
}

async function testNonDeterministicCheckNeverCached() {
  await withTempStore(async (store, tmpDir) => {
    const check = {
      id: "flaky-check",
      module: "tests",
      inputs: [],
      outputs: [],
      scope: "tests",
      protectedAssets: [],
      determinism: "non-deterministic",
      validatorVersion: "1.0.0",
    }

    const engine = new IncrementalEngine({ store, root: tmpDir })
    const fingerprint = await computeFingerprint({
      checkId: check.id,
      inputs: check.inputs,
      validatorVersion: check.validatorVersion,
      root: tmpDir,
    })

    const decision = await engine.decide(check, fingerprint, [])
    assert.strictEqual(decision.action, "run")
    assert.strictEqual(decision.reason, "non-deterministic")

    await engine.record(check, fingerprint, [], "PASS")
    const stillNoCache = await store.get(check.id, fingerprint)
    assert.strictEqual(stillNoCache, null)
  })
  console.log("[PASS] non-deterministic checks are never cached")
}

async function testDependencyInvalidation() {
  await withTempStore(async (store, tmpDir) => {
    const upstream = {
      id: "upstream",
      module: "tests",
      inputs: [],
      outputs: [],
      scope: "tests",
      protectedAssets: [],
      determinism: "deterministic",
      validatorVersion: "1.0.0",
    }
    const downstream = {
      id: "downstream",
      module: "tests",
      inputs: [],
      outputs: [],
      scope: "tests",
      protectedAssets: [],
      determinism: "deterministic",
      validatorVersion: "1.0.0",
      dependencies: ["upstream"],
    }

    const engine = new IncrementalEngine({ store, root: tmpDir })
    const upFingerprint = await computeFingerprint({
      checkId: upstream.id,
      inputs: upstream.inputs,
      validatorVersion: upstream.validatorVersion,
      root: tmpDir,
    })
    const downFingerprint = await computeFingerprint({
      checkId: downstream.id,
      inputs: downstream.inputs,
      validatorVersion: downstream.validatorVersion,
      root: tmpDir,
    })

    await engine.record(upstream, upFingerprint, [], "PASS")
    await engine.record(downstream, downFingerprint, [upFingerprint], "PASS")

    const hit = await engine.decide(downstream, downFingerprint, [upFingerprint])
    assert.strictEqual(hit.action, "skip")

    const changedUpstreamFingerprint = "changed"
    const invalidated = await engine.decide(downstream, downFingerprint, [changedUpstreamFingerprint])
    assert.strictEqual(invalidated.action, "run")
    assert.strictEqual(invalidated.reason, "dependency-invalidation")
  })
  console.log("[PASS] downstream proof invalidates when upstream fingerprint changes")
}

async function main() {
  await testProofStoreRoundTrip()
  await testProofStoreDetectsCorruption()
  await testProofStoreVersionInvalidation()
  await testIncrementalEngineCacheMissThenHit()
  await testNonDeterministicCheckNeverCached()
  await testDependencyInvalidation()
  console.log("\n[GOVERNANCE INCREMENTAL] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
