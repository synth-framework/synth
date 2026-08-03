// ============================================================
// First Contact Recommendation Tests
// ============================================================
// Regression guards for EXP-AIFC-011:
//  - Adapter scoring is deterministic and respects the 0.25 floor.
//  - Required capabilities boost confidence.
//  - Workflow template selection maps stacks correctly.
//  - Dry-run does not persist adapters to the manifest.
//  - Approve persists recommended adapters in the manifest.
//  - MISSION_MATERIALIZED event payload includes recommendations.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"
import { recommendAdapters, selectWorkflowTemplate } from "../dist/first-contact/materialize/index.js"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

function runSynth(args, cwd = process.cwd()) {
  const result = spawnSync("node", [CLI_PATH, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 30000,
  })
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  }
}

function parseJson(stdout) {
  try {
    return JSON.parse(stdout.trim())
  } catch (err) {
    throw new Error(`Failed to parse CLI output as JSON: ${stdout}\nError: ${err.message}`)
  }
}

async function withTempDir(fn) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-recommendation-test-"))
  try {
    return await fn(tmpDir)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

function baseOptions(overrides = {}) {
  return {
    projectRoot: "/tmp/synth-recommendation",
    approvedArtifact: {
      id: "artifact-test",
      intent: {
        description: overrides.description ?? "Build a sample project",
        goals: ["deliver value"],
        successCriteria: ["it works"],
      },
      audience: {
        primaryUsers: ["operators"],
        stakeholders: ["team"],
      },
      environment: {
        targetRuntime: overrides.targetRuntime ?? "web",
        languagePreferences: overrides.languagePreferences ?? ["typescript"],
        platformConstraints: overrides.platformConstraints ?? [],
      },
      capabilities: {
        required: overrides.requiredCapabilities ?? [],
        optional: overrides.optionalCapabilities ?? [],
      },
      constraints: {
        functional: [],
        nonFunctional: [],
      },
      unknowns: [],
      confidence: { overall: 1, byField: {} },
      transcript: [],
    },
    selectedArchitecture: {
      id: overrides.architectureId ?? "arch-web-nextjs",
      name: overrides.architectureName ?? "Next.js + Vercel static app",
      description: "Test architecture",
      rationale: "Test",
      tradeoffs: { advantages: [], disadvantages: [] },
      assumptions: [],
      recommended: true,
      confidence: 0.85,
    },
    verificationReport: {
      status: "passed",
      blockers: [],
      checks: [],
      reportHash: "test-hash",
    },
  }
}

function testAdapterScoringDeterminism() {
  const options = baseOptions({
    requiredCapabilities: ["testing"],
    platformConstraints: ["git"],
  })
  const first = recommendAdapters(options)
  const second = recommendAdapters(options)
  assert(JSON.stringify(first) === JSON.stringify(second), "recommendations should be deterministic for equivalent inputs")
  console.log("[PASS] adapter scoring is deterministic")
}

function testRequiredCapabilityBoostsConfidence() {
  const options = baseOptions({
    requiredCapabilities: ["testing"],
  })
  const adapters = recommendAdapters(options)
  const tdd = adapters.find((a) => a.adapterId === "tdd")
  assert(tdd, "tdd adapter should be recommended when testing is required")
  assert(tdd.confidence >= 0.4, "tdd confidence should be boosted by required capability match")
  assert(tdd.required === true, "tdd should be marked required")
  console.log("[PASS] required capability boosts tdd confidence")
}

function testLowConfidenceAdaptersAreDropped() {
  const options = baseOptions({
    targetRuntime: "unknown-runtime",
    languagePreferences: ["unknown-language"],
    requiredCapabilities: [],
    optionalCapabilities: [],
    platformConstraints: [],
  })
  const adapters = recommendAdapters(options)
  assert(adapters.every((a) => a.confidence >= 0.25), "no adapter should be below the 0.25 threshold")
  console.log("[PASS] adapters below 0.25 are dropped")
}

function testWorkflowSelectionForNextjs() {
  const options = baseOptions({
    architectureId: "arch-web-nextjs",
    architectureName: "Next.js + Vercel static app",
    targetRuntime: "web",
    languagePreferences: ["typescript"],
  })
  const template = selectWorkflowTemplate(options)
  assert(template.id === "nextjs-chatbot", "web/TypeScript should select the Next.js chatbot template")
  assert(template.phases.length > 0, "template should have phases")
  console.log("[PASS] workflow selection picks Next.js template")
}

function testWorkflowSelectionForPythonCli() {
  const options = baseOptions({
    architectureId: "arch-cli-python",
    architectureName: "Python CLI with Click + Jinja2",
    targetRuntime: "cli",
    languagePreferences: ["python"],
  })
  const template = selectWorkflowTemplate(options)
  assert(template.id === "python-cli", "python CLI should select the Python CLI template")
  console.log("[PASS] workflow selection picks Python CLI template")
}

function testWorkflowSelectionForGenericGreenfield() {
  const options = baseOptions({
    architectureId: "arch-fallback",
    architectureName: "General application in preferred language",
    targetRuntime: "embedded",
    languagePreferences: ["rust"],
  })
  const template = selectWorkflowTemplate(options)
  assert(template.id === "generic-greenfield", "unknown stack should fall back to generic greenfield")
  console.log("[PASS] workflow selection falls back to generic greenfield")
}

async function testDryRunDoesNotWriteAdaptersToManifest() {
  await withTempDir(async (tmpDir) => {
    runSynth(["first-contact", "start", "Let's build a space mission tracker in TypeScript for the web."], tmpDir)
    runSynth(["first-contact", "clarify", "--field", "audience.primaryUsers", "--answer", "space enthusiasts"], tmpDir)
    runSynth(["first-contact", "clarify", "--field", "audience.stakeholders", "--answer", "mission controllers"], tmpDir)
    runSynth(["first-contact", "approve"], tmpDir)

    const { stdout, status } = runSynth(["first-contact", "materialize", "--dry-run"], tmpDir)
    assert(status === 0, "materialize --dry-run should exit 0")
    const output = parseJson(stdout)
    assert(output.kind === "FirstContactMaterializationPreview", "dry-run should return preview")
    assert(Array.isArray(output.recommendedAdapters), "dry-run should include recommendedAdapters")
    assert(output.recommendedAdapters.length > 0, "dry-run should recommend at least one adapter")
    assert(
      output.recommendedAdapters.every((a) => a.status === "pending approval"),
      "dry-run adapters should be labeled pending approval",
    )
    assert(output.workflowTemplate, "dry-run should include workflowTemplate")

    const manifestPath = path.join(tmpDir, ".synth", "manifest.json")
    let hasManifest = false
    try {
      await fs.access(manifestPath)
      hasManifest = true
    } catch {
      hasManifest = false
    }
    assert(!hasManifest, "dry-run should not create manifest")
  })
  console.log("[PASS] dry-run previews adapters without persisting them")
}

async function testApprovePersistsRecommendedAdaptersInManifest() {
  await withTempDir(async (tmpDir) => {
    runSynth(["first-contact", "start", "Let's build a space mission tracker in TypeScript for the web."], tmpDir)
    runSynth(["first-contact", "clarify", "--field", "audience.primaryUsers", "--answer", "space enthusiasts"], tmpDir)
    runSynth(["first-contact", "clarify", "--field", "audience.stakeholders", "--answer", "mission controllers"], tmpDir)
    runSynth(["first-contact", "approve"], tmpDir)

    const { stdout, status } = runSynth(["first-contact", "materialize", "--approve"], tmpDir)
    assert(status === 0, "materialize --approve should exit 0")
    const output = parseJson(stdout)
    assert(output.kind === "FirstContactMaterialized", "approve should return FirstContactMaterialized")
    assert(Array.isArray(output.recommendedAdapters), "approve response should include recommendedAdapters")
    assert(output.workflowTemplate, "approve response should include workflowTemplate")

    const manifest = JSON.parse(await fs.readFile(output.manifestPath, "utf-8"))
    assert(Array.isArray(manifest.recommendedAdapters), "manifest should contain recommendedAdapters")
    assert(manifest.recommendedAdapters.length > 0, "manifest should persist at least one adapter")
    assert(
      manifest.recommendedAdapters.every((a) => typeof a.adapterId === "string"),
      "manifest adapters should have adapterId",
    )
  })
  console.log("[PASS] approve persists recommended adapters in manifest")
}

async function testMissionMaterializedEventIncludesRecommendations() {
  await withTempDir(async (tmpDir) => {
    runSynth(["first-contact", "start", "Let's build a space mission tracker in TypeScript for the web."], tmpDir)
    runSynth(["first-contact", "clarify", "--field", "audience.primaryUsers", "--answer", "space enthusiasts"], tmpDir)
    runSynth(["first-contact", "clarify", "--field", "audience.stakeholders", "--answer", "mission controllers"], tmpDir)
    runSynth(["first-contact", "approve"], tmpDir)

    const { stdout, status } = runSynth(["first-contact", "materialize", "--approve"], tmpDir)
    assert(status === 0, "materialize --approve should exit 0")
    const output = parseJson(stdout)

    const events = (await fs.readFile(output.eventLogPath, "utf-8")).trim().split("\n").map(JSON.parse)
    const materialized = events.find((e) => e.type === "MISSION_MATERIALIZED")
    assert(materialized, "event log should contain MISSION_MATERIALIZED")
    assert(Array.isArray(materialized.payload.recommendedAdapters), "MISSION_MATERIALIZED should include recommendedAdapters")
    assert(materialized.payload.workflowTemplate, "MISSION_MATERIALIZED should include workflowTemplate")
  })
  console.log("[PASS] MISSION_MATERIALIZED event payload includes recommendations")
}

async function main() {
  try {
    await fs.access(CLI_PATH)
  } catch {
    console.error("[SKIP] CLI not built. Run 'npm run build' first.")
    process.exit(0)
  }

  testAdapterScoringDeterminism()
  testRequiredCapabilityBoostsConfidence()
  testLowConfidenceAdaptersAreDropped()
  testWorkflowSelectionForNextjs()
  testWorkflowSelectionForPythonCli()
  testWorkflowSelectionForGenericGreenfield()
  await testDryRunDoesNotWriteAdaptersToManifest()
  await testApprovePersistsRecommendedAdaptersInManifest()
  await testMissionMaterializedEventIncludesRecommendations()

  console.log("\n[FIRST CONTACT RECOMMENDATION] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
