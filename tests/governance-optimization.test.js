// ============================================================
// GOVERNANCE OPTIMIZATION TESTS (EXP-GOVERN-005)
// ============================================================
// Tests parallel execution, remote/shared cache backends, and proof store
// synchronization without running the full governance pipeline.
// ============================================================

import assert from "assert"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { ParallelRunner } from "../scripts/governance/parallel-runner.js"
import { ProofStore } from "../scripts/governance/proof-store.js"
import {
  LocalFileProofCacheBackend,
  CiArtifactProofCacheBackend,
} from "../scripts/governance/cache-backend.js"
import { runGovernProfile } from "../scripts/govern-profiler.js"

async function withTempDir(fn) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-govern-opt-"))
  try {
    return await fn(tmpDir)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testParallelRunnerExecutesIndependentChecksConcurrently() {
  const runner = new ParallelRunner({ concurrency: 2 })
  const plan = [
    { checkId: "a", action: "run", reason: "test", fingerprint: "a", upstreamFingerprints: [], dependencies: [] },
    { checkId: "b", action: "run", reason: "test", fingerprint: "b", upstreamFingerprints: [], dependencies: [] },
  ]

  const order = []
  const { results, failed } = await runner.run(plan, async (entry) => {
    order.push(entry.checkId + "-start")
    await new Promise((r) => setTimeout(r, 20))
    order.push(entry.checkId + "-end")
    return { status: "passed", exitCode: 0, durationMs: 20 }
  })

  assert.strictEqual(failed, false)
  assert.strictEqual(results.length, 2)
  assert.strictEqual(results[0].result.status, "passed")
  assert.strictEqual(results[1].result.status, "passed")
  // Both should have started before either ended (concurrency 2).
  assert.ok(order.indexOf("b-start") < order.indexOf("a-end") || order.indexOf("a-start") < order.indexOf("b-end"))
  console.log("[PASS] parallel runner executes independent checks concurrently")
}

async function testParallelRunnerRespectsDependencies() {
  const runner = new ParallelRunner({ concurrency: 2 })
  const plan = [
    { checkId: "a", action: "run", reason: "test", fingerprint: "a", upstreamFingerprints: [], dependencies: [] },
    { checkId: "b", action: "run", reason: "test", fingerprint: "b", upstreamFingerprints: [], dependencies: ["a"] },
  ]

  const order = []
  await runner.run(plan, async (entry) => {
    order.push(entry.checkId)
    return { status: "passed", exitCode: 0, durationMs: 1 }
  })

  assert.deepStrictEqual(order, ["a", "b"])
  console.log("[PASS] parallel runner respects dependencies")
}

async function testParallelRunnerBlocksDownstreamOnFailure() {
  const runner = new ParallelRunner({ concurrency: 2 })
  const plan = [
    { checkId: "a", action: "run", reason: "test", fingerprint: "a", upstreamFingerprints: [], dependencies: [] },
    { checkId: "b", action: "run", reason: "test", fingerprint: "b", upstreamFingerprints: [], dependencies: ["a"] },
  ]

  const { results, failed } = await runner.run(plan, async (entry) => {
    if (entry.checkId === "a") {
      return { status: "failed", exitCode: 1, durationMs: 1 }
    }
    return { status: "passed", exitCode: 0, durationMs: 1 }
  })

  assert.strictEqual(failed, true)
  const a = results.find((r) => r.entry.checkId === "a")
  const b = results.find((r) => r.entry.checkId === "b")
  assert.strictEqual(a.result.status, "failed")
  assert.strictEqual(b.result.status, "blocked")
  console.log("[PASS] parallel runner blocks downstream checks on failure")
}

async function testLocalFileBackendRoundTrip() {
  await withTempDir(async (tmpDir) => {
    const filePath = path.join(tmpDir, "proofs.jsonl")
    const backend = new LocalFileProofCacheBackend(filePath)
    const proofs = [
      { check: "a", fingerprint: "fp1", result: "PASS", validatorVersion: "1.0.0" },
      { check: "b", fingerprint: "fp2", result: "PASS", validatorVersion: "1.0.0" },
    ]

    await backend.saveProofs(proofs)
    const loaded = await backend.loadProofs()
    assert.strictEqual(loaded.length, 2)
    assert.strictEqual(loaded[0].check, "a")
    assert.strictEqual(loaded[1].check, "b")
  })
  console.log("[PASS] local file cache backend round-trips proofs")
}

async function testCiArtifactBackendRoundTrip() {
  await withTempDir(async (tmpDir) => {
    const backend = new CiArtifactProofCacheBackend(tmpDir)
    const proofs = [{ check: "x", fingerprint: "fp", result: "PASS", validatorVersion: "1.0.0" }]
    await backend.saveProofs(proofs)
    const loaded = await backend.loadProofs()
    assert.strictEqual(loaded.length, 1)
    assert.strictEqual(loaded[0].check, "x")
  })
  console.log("[PASS] CI artifact cache backend round-trips proofs")
}

async function testProofStoreSyncFromRemote() {
  await withTempDir(async (tmpDir) => {
    const localDir = path.join(tmpDir, "local")
    const remoteFile = path.join(tmpDir, "remote-proofs.jsonl")
    const localStore = new ProofStore({ cacheDir: localDir })
    const remoteBackend = new LocalFileProofCacheBackend(remoteFile)

    // Create a valid remote proof using a store so the proofHash is correct.
    const sourceDir = path.join(tmpDir, "source")
    const sourceStore = new ProofStore({ cacheDir: sourceDir })
    await sourceStore.put({
      check: "shared",
      fingerprint: "fp",
      dependencies: [],
      result: "PASS",
      validatorVersion: "1.0.0",
    })
    await sourceStore.syncTo(remoteBackend)

    await localStore.syncFrom(remoteBackend)
    const local = await localStore.get("shared", "fp")
    assert.ok(local)
    assert.strictEqual(local.result, "PASS")
  })
  console.log("[PASS] proof store syncs from remote backend")
}

async function testProofStoreSyncToRemote() {
  await withTempDir(async (tmpDir) => {
    const localDir = path.join(tmpDir, "local")
    const remoteFile = path.join(tmpDir, "remote-proofs.jsonl")
    const localStore = new ProofStore({ cacheDir: localDir })
    const remoteBackend = new LocalFileProofCacheBackend(remoteFile)

    await localStore.put({
      check: "shared",
      fingerprint: "fp",
      dependencies: [],
      result: "PASS",
      validatorVersion: "1.0.0",
    })
    await localStore.syncTo(remoteBackend)

    const remote = await remoteBackend.loadProofs()
    assert.strictEqual(remote.length, 1)
    assert.strictEqual(remote[0].check, "shared")
  })
  console.log("[PASS] proof store syncs to remote backend")
}

async function testRunGovernProfileSupportsParallelExecution() {
  await withTempDir(async (tmpDir) => {
    const pkgPath = path.join(tmpDir, "package.json")
    await fs.writeFile(
      pkgPath,
      JSON.stringify({ name: "test", scripts: { "test:all": "npm run a && npm run b" } }) + "\n",
      "utf-8",
    )

    let maxRunning = 0
    let running = 0
    const executor = async () => {
      running += 1
      maxRunning = Math.max(maxRunning, running)
      await new Promise((r) => setTimeout(r, 30))
      running -= 1
      return { status: "passed", exitCode: 0, durationMs: 30 }
    }

    const { summary, failed } = await runGovernProfile({
      root: tmpDir,
      packageJsonPath: pkgPath,
      full: true,
      silent: true,
      executor,
      maxConcurrency: 2,
    })

    assert.strictEqual(failed, false)
    assert.ok(summary.checks.length >= 2)
    assert.strictEqual(maxRunning, 2)
  })
  console.log("[PASS] runGovernProfile supports parallel execution")
}

async function main() {
  await testParallelRunnerExecutesIndependentChecksConcurrently()
  await testParallelRunnerRespectsDependencies()
  await testParallelRunnerBlocksDownstreamOnFailure()
  await testLocalFileBackendRoundTrip()
  await testCiArtifactBackendRoundTrip()
  await testProofStoreSyncFromRemote()
  await testProofStoreSyncToRemote()
  await testRunGovernProfileSupportsParallelExecution()
  console.log("\n[GOVERNANCE OPTIMIZATION] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  console.error(err)
  process.exit(1)
})
