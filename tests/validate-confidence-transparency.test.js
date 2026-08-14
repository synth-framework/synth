// ============================================================
// EXP-CONFIDENCE-TRANSPARENCY — Validation confidence score transparency
// ============================================================
// Verifies that:
//   - synth validate prints a confidenceAnalysis block with score, reasons,
//     and concrete next steps.
//   - synth discover --export writes the discovered repositoryType to
//     .synth/ai/lifecycle.json.
//   - synth status surfaces the validation score.
//   - deriveRepositoryType falls back to discovery baselines on disk.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "fs/promises"
import path from "path"
import { runSynth, parseJson, withTempDir, writeManifest } from "./helpers/cli-harness.js"

const AI_METADATA_PATH = path.resolve(process.cwd(), "dist", "cli", "ai-metadata.js")

async function loadAiMetadata() {
  return await import(AI_METADATA_PATH)
}

function findJsonObject(stdout) {
  const trimmed = stdout.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const lines = stdout.split("\n")
    for (const line of lines) {
      const lineTrimmed = line.trim()
      if (lineTrimmed.startsWith("{")) {
        try {
          return JSON.parse(lineTrimmed)
        } catch {
          // continue scanning
        }
      }
    }
  }
  throw new Error(`No JSON object found in stdout:\n${stdout}`)
}

async function setupProject(dir) {
  const initResult = runSynth(["init", "--name", "Synth Test Project"], dir)
  assert.strictEqual(initResult.status, 0, `synth init failed: ${initResult.stderr}`)

  const pkg = {
    name: "test-project",
    version: "1.0.0",
    scripts: { test: "echo ok", lint: "echo ok" },
  }
  await fs.writeFile(path.join(dir, "package.json"), JSON.stringify(pkg, null, 2))

  await fs.mkdir(path.join(dir, "src"), { recursive: true })
  await fs.writeFile(path.join(dir, "src", "index.ts"), "export const x = 1\n")

  const mapDir = path.join(dir, "docs", "reference")
  await fs.mkdir(mapDir, { recursive: true })
  await fs.writeFile(
    path.join(mapDir, "capability-validation-map.json"),
    JSON.stringify({
      schema: "synth-capability-validation-map-v1",
      lintScope: [],
      typecheckScope: [],
      capabilities: {},
    }, null, 2),
  )
}

test("synth validate --dry-run includes confidenceAnalysis with score, reasons, and nextSteps", async () => {
  await withTempDir("synth-validate-confidence-", async (dir) => {
    await setupProject(dir)
    const result = runSynth(["validate", "--dry-run"], dir)
    assert.strictEqual(result.status, 0, `CLI failed: ${result.stderr}`)
    const output = findJsonObject(result.stdout)

    assert.ok(output.confidenceAnalysis, "confidenceAnalysis should be present")
    assert.strictEqual(typeof output.confidenceAnalysis.score, "number", "score should be a number")
    assert.ok(output.confidenceAnalysis.score >= 0 && output.confidenceAnalysis.score <= 1, "score should be in [0,1]")
    assert.ok(Array.isArray(output.confidenceAnalysis.reasons), "reasons should be an array")
    assert.ok(output.confidenceAnalysis.reasons.length > 0, "reasons should not be empty")
    assert.ok(Array.isArray(output.confidenceAnalysis.nextSteps), "nextSteps should be an array")
    assert.ok(output.confidenceAnalysis.nextSteps.length > 0, "nextSteps should not be empty")
  })
})

test("synth discover --export updates lifecycle.json repositoryType", async () => {
  await withTempDir("synth-discover-lifecycle-", async (dir) => {
    await setupProject(dir)

    const aiDir = path.join(dir, ".synth", "ai")
    await fs.mkdir(aiDir, { recursive: true })
    await fs.writeFile(
      path.join(aiDir, "lifecycle.json"),
      JSON.stringify({ version: "1.0.0", repositoryType: "unknown" }, null, 2),
    )

    const result = runSynth(["discover", "--export"], dir)
    assert.strictEqual(result.status, 0, `CLI failed: ${result.stderr}`)
    const output = findJsonObject(result.stdout)

    assert.ok(output.lifecyclePath, "lifecyclePath should be present")
    assert.match(output.lifecyclePath, /\.synth\/ai\/lifecycle\.json$/)

    const lifecycleRaw = await fs.readFile(path.join(aiDir, "lifecycle.json"), "utf-8")
    const lifecycle = JSON.parse(lifecycleRaw)
    assert.notStrictEqual(lifecycle.repositoryType, "unknown", "repositoryType should be updated from discovery")
    assert.ok(["greenfield", "brownfield", "hybrid"].includes(lifecycle.repositoryType), `unexpected repositoryType: ${lifecycle.repositoryType}`)
  })
})

test("synth status surfaces validation score", async () => {
  await withTempDir("synth-status-validation-", async (dir) => {
    await setupProject(dir)
    const result = runSynth(["status"], dir)
    assert.strictEqual(result.status, 0, `CLI failed: ${result.stderr}`)
    const output = findJsonObject(result.stdout)

    assert.ok(output.validation, "validation field should be present in status")
    assert.strictEqual(typeof output.validation.score, "number", "validation.score should be a number")
    assert.ok(Array.isArray(output.validation.reasons), "validation.reasons should be an array")
    assert.ok(Array.isArray(output.validation.nextSteps), "validation.nextSteps should be an array")
  })
})

test("deriveRepositoryType falls back to discovery baseline repositoryType", async () => {
  const { deriveRepositoryType, normalizeDiscoveryRepositoryType } = await loadAiMetadata()

  const state = { lifecycle: "initialized", discoveries: {} }
  assert.strictEqual(deriveRepositoryType(state), "unknown", "without baseline, unknown state stays unknown")

  assert.strictEqual(normalizeDiscoveryRepositoryType("polyglot"), "hybrid")
  assert.strictEqual(normalizeDiscoveryRepositoryType("node"), "brownfield")
  assert.strictEqual(normalizeDiscoveryRepositoryType("empty"), "greenfield")
  assert.strictEqual(normalizeDiscoveryRepositoryType("unknown"), undefined)

  assert.strictEqual(deriveRepositoryType(state, "brownfield"), "brownfield")
  assert.strictEqual(deriveRepositoryType(state, "hybrid"), "hybrid")
})

test("synth validate --dry-run reports mapped count aligned with capability-validation-map.json", async () => {
  await withTempDir("synth-validate-mapping-alignment-", async (dir) => {
    await setupProject(dir)

    // Override the empty map with one that only knows about ProjectConfig.
    const mapDir = path.join(dir, "docs", "reference")
    await fs.writeFile(
      path.join(mapDir, "capability-validation-map.json"),
      JSON.stringify({
        schema: "synth-capability-validation-map-v1",
        lintScope: [],
        typecheckScope: [],
        capabilities: {
          ProjectConfig: {
            unitTests: [],
            integrationTests: [],
            benchmarks: [],
            proofs: ["test"],
            lintScope: ["package.json"],
            typecheckScope: [],
            governanceClass: "tests",
          },
        },
      }, null, 2),
    )

    // Use a synthetic diff so we do not depend on an initialized git repo.
    const diffText = ["package.json", "tsconfig.json", ".env.example", "src/lib/helper.ts"].join("\n")

    const result = runSynth(["validate", "--dry-run", "--diff", diffText], dir)
    assert.strictEqual(result.status, 0, `CLI failed: ${result.stderr}`)
    const output = findJsonObject(result.stdout)

    assert.ok(output.confidenceAnalysis, "confidenceAnalysis should be present")
    const mappedReason = output.confidenceAnalysis.reasons.find((r) => r.includes("map to validation entries"))
    const unmappedReason = output.confidenceAnalysis.reasons.find((r) => r.includes("not mapped to validation entries"))
    assert.ok(mappedReason, `expected a mapped reason, got: ${JSON.stringify(output.confidenceAnalysis.reasons)}`)
    assert.ok(unmappedReason, `expected an unmapped reason, got: ${JSON.stringify(output.confidenceAnalysis.reasons)}`)
    assert.ok(mappedReason.includes("1 of"), `mapped reason should show aligned count: ${mappedReason}`)
    assert.ok(unmappedReason.includes("ApplicationLibrary") || unmappedReason.includes("TypeScriptConfig") || unmappedReason.includes("EnvironmentConfig"), `unmapped reason should list missing capabilities: ${unmappedReason}`)
  })
})
