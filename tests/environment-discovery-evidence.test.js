// ============================================================
// DISCOVERY EVIDENCE & REPLAY INTEGRATION TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import {
  createDiscoveryOrchestrator,
  createReferenceProviders,
  createInMemoryFilesystemProvider,
  canonicalizeEvidence,
  hashDiscoveryEvidence,
  replayDiscoveryEvidence,
  verifyDiscoveryReplay,
  persistDiscoveryEvidence,
  loadDiscoveryEvidence,
  DISCOVERY_EVIDENCE_PATH,
} from "../dist/environment/index.js"

function makeInMemoryContext(files = {}, dirs = {}, env = {}, cwd = "/test") {
  const fileMap = { ...files }
  const directoryMap = { ...dirs }
  function resolve(path) {
    if (path.startsWith("/")) return path
    return `${cwd}/${path}`
  }
  return {
    readFile: async (path) => fileMap[resolve(path)],
    listDirectory: async (path) => directoryMap[resolve(path)] || [],
    pathExists: async (path) => resolve(path) in fileMap || resolve(path) in directoryMap,
    readEnv: (name) => env[name],
    execTool: async (command, args) => env[`${command} ${args.join(" ")}`],
    cwd,
  }
}

async function produceEvidence() {
  const ctx = makeInMemoryContext(
    {
      "/test/package.json": JSON.stringify({ name: "test-project" }),
      "/test/.synth/manifest.json": JSON.stringify({ name: "test" }),
    },
    { "/test": ["package.json", ".synth"], "/test/.synth": ["manifest.json"] },
    { "node --version": "v20.11.0", "npm --version": "10.2.4" },
  )
  const orchestrator = createDiscoveryOrchestrator({ providers: createReferenceProviders() })
  const result = await orchestrator.discover(ctx)
  return result.evidence
}

test("canonicalizeEvidence is deterministic", async () => {
  const evidence = await produceEvidence()
  assert.strictEqual(canonicalizeEvidence(evidence), canonicalizeEvidence(evidence))
  // keys are sorted
  const canonical = canonicalizeEvidence({ schema: "synth-discovery-evidence-v1", timestamp: 0, environment: { platform: "p", workspaceRoot: "w", classification: "bare" }, observations: [], capabilities: [], providers: [], assumptions: [], compatibility: [], provenance: { rulesExecuted: [], providersEvaluated: [] } })
  assert.ok(canonical.indexOf('"assumptions"') < canonical.indexOf('"capabilities"'))
})

test("hashDiscoveryEvidence ignores volatile timestamps", async () => {
  const evidence = await produceEvidence()
  const clone = JSON.parse(JSON.stringify(evidence))
  clone.timestamp = clone.timestamp + 999999
  for (const obs of clone.observations) obs.timestamp = obs.timestamp + 999999
  assert.strictEqual(hashDiscoveryEvidence(evidence), hashDiscoveryEvidence(clone))
})

test("hashDiscoveryEvidence changes when content changes", async () => {
  const evidence = await produceEvidence()
  const tampered = JSON.parse(JSON.stringify(evidence))
  tampered.environment.classification = "ci"
  assert.notStrictEqual(hashDiscoveryEvidence(evidence), hashDiscoveryEvidence(tampered))
})

test("verifyDiscoveryReplay confirms freshly produced evidence", async () => {
  const evidence = await produceEvidence()
  const verification = verifyDiscoveryReplay(evidence)
  assert.strictEqual(verification.consistent, true)
  assert.deepStrictEqual(verification.divergences, [])
})

test("replayDiscoveryEvidence reproduces derived sections", async () => {
  const evidence = await produceEvidence()
  const replayed = replayDiscoveryEvidence(evidence)
  assert.strictEqual(replayed.environment.classification, evidence.environment.classification)
  assert.strictEqual(replayed.environment.platform, evidence.environment.platform)
  assert.deepStrictEqual(replayed.capabilities, evidence.capabilities)
  assert.deepStrictEqual(replayed.assumptions, evidence.assumptions)
  assert.deepStrictEqual(replayed.compatibility, evidence.compatibility)
})

test("verifyDiscoveryReplay detects tampered capabilities", async () => {
  const evidence = await produceEvidence()
  const tampered = JSON.parse(JSON.stringify(evidence))
  tampered.capabilities = tampered.capabilities.map((cap) => ({ ...cap, available: !cap.available }))
  const verification = verifyDiscoveryReplay(tampered)
  assert.strictEqual(verification.consistent, false)
  assert.ok(verification.divergences.some((d) => d.startsWith("capabilities:")))
})

test("verifyDiscoveryReplay detects tampered classification", async () => {
  const evidence = await produceEvidence()
  const tampered = JSON.parse(JSON.stringify(evidence))
  tampered.environment.classification = "ci"
  const verification = verifyDiscoveryReplay(tampered)
  assert.strictEqual(verification.consistent, false)
  assert.ok(verification.divergences.some((d) => d.startsWith("environment.classification:")))
})

test("persist and load round-trip through the Filesystem capability", async () => {
  const evidence = await produceEvidence()
  const fs = createInMemoryFilesystemProvider()
  await persistDiscoveryEvidence(fs, evidence)
  const loaded = await loadDiscoveryEvidence(fs)
  assert.ok(loaded !== undefined)
  assert.strictEqual(hashDiscoveryEvidence(loaded), hashDiscoveryEvidence(evidence))
  assert.strictEqual(verifyDiscoveryReplay(loaded).consistent, true)
})

test("loadDiscoveryEvidence returns undefined for missing or invalid artifacts", async () => {
  const fs = createInMemoryFilesystemProvider()
  assert.strictEqual(await loadDiscoveryEvidence(fs), undefined)

  const badSchema = createInMemoryFilesystemProvider({
    [`/${DISCOVERY_EVIDENCE_PATH}`]: JSON.stringify({ schema: "other", observations: [], providers: [] }),
  })
  assert.strictEqual(await loadDiscoveryEvidence(badSchema), undefined)

  const notJson = createInMemoryFilesystemProvider({
    [`/${DISCOVERY_EVIDENCE_PATH}`]: "not json",
  })
  assert.strictEqual(await loadDiscoveryEvidence(notJson), undefined)
})
