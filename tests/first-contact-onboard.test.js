// ============================================================
// EXP-ONBOARD-001 — Guided First-Contact Onboard Command
// ============================================================
// Verifies that bare `synth first-contact` detects repository state and
// guides the operator through the correct initialization path.
// ============================================================

import fs from "fs/promises"
import path from "path"
import { runSynth, parseJson, withTempDir, writeManifest } from "./helpers/cli-harness.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function testDryRunOnEmptyDirectory() {
  await withTempDir("synth-onboard-empty-", async (tmpDir) => {
    const { stdout, status } = runSynth(["first-contact", "--dry-run"], tmpDir)
    assert(status === 0, `dry-run on empty dir should exit 0, got ${status}\n${stdout}`)
    const output = parseJson(stdout)
    assert(output.status === "pending-approval", `status should be pending-approval, got ${output.status}`)
    assert(output.kind === "FirstContactOnboardPlan", `kind should be FirstContactOnboardPlan, got ${output.kind}`)
    assert(output.detected === "empty", `detected should be empty, got ${output.detected}`)
    assert(Array.isArray(output.stages), "stages should be an array")
    assert(output.stages.some((s) => s.stage === "init"), "plan should include init stage")
    assert(output.stages.some((s) => s.stage === "mission"), "plan should include mission stage")
    assert(Array.isArray(output.wouldCreate), "wouldCreate should be an array")
    assert(output.wouldCreate.includes(".synth/manifest.json"), "wouldCreate should include manifest")

    const files = await fs.readdir(tmpDir)
    assert(files.length === 0, "dry-run should not write files")
  })
  console.log("[PASS] synth first-contact --dry-run on empty directory returns plan")
}

async function testPlanOnBrownfieldDirectory() {
  await withTempDir("synth-onboard-brownfield-", async (tmpDir) => {
    await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "brownfield", version: "1.0.0" }), "utf-8")
    const { stdout, status } = runSynth(["first-contact"], tmpDir)
    assert(status === 0, `brownfield plan should exit 0, got ${status}\n${stdout}`)
    const output = parseJson(stdout)
    assert(output.status === "pending-approval", `status should be pending-approval, got ${output.status}`)
    assert(output.kind === "FirstContactOnboardPlan", `kind should be FirstContactOnboardPlan, got ${output.kind}`)
    assert(output.detected === "brownfield", `detected should be brownfield, got ${output.detected}`)
    assert(output.stages.some((s) => s.stage === "analyze"), "plan should include analyze stage")
    assert(output.wouldRun.includes("synth bootstrap --approve"), "plan should include bootstrap")
  })
  console.log("[PASS] synth first-contact on brownfield directory returns bootstrap plan")
}

async function testAlreadyInitializedV2() {
  await withTempDir("synth-onboard-v2-", async (tmpDir) => {
    await writeManifest(tmpDir, "Already Initialized")
    const { stdout, status } = runSynth(["first-contact", "--approve"], tmpDir)
    assert(status === 0, `v2 already-initialized should exit 0, got ${status}\n${stdout}`)
    const output = parseJson(stdout)
    assert(output.status === "ok", `status should be ok, got ${output.status}`)
    assert(output.kind === "FirstContactOnboardAlreadyInitialized", `kind should be FirstContactOnboardAlreadyInitialized, got ${output.kind}`)
    assert(output.detected === "initialized-v2", `detected should be initialized-v2, got ${output.detected}`)
    assert(output.nextStep === "synth status", "nextStep should suggest synth status")
  })
  console.log("[PASS] synth first-contact --approve on v2 project reports already initialized")
}

async function testApproveOnEmptyDirectory() {
  await withTempDir("synth-onboard-empty-approve-", async (tmpDir) => {
    const { stdout, status } = runSynth(["first-contact", "--approve", "--name", "Approved Test Project"], tmpDir)
    assert(status === 0, `approve on empty dir should exit 0, got ${status}\n${stdout}`)
    const output = parseJson(stdout)
    assert(output.status === "ok", `status should be ok, got ${output.status}`)
    assert(output.kind === "FirstContactOnboardCompleted", `kind should be FirstContactOnboardCompleted, got ${output.kind}`)
    assert(output.detected === "empty", `detected should be empty, got ${output.detected}`)
    assert(output.projectName === "Approved Test Project", `projectName should match, got ${output.projectName}`)
    assert(typeof output.missionId === "string", "missionId should be a string")

    const manifestPath = path.join(tmpDir, ".synth", "manifest.json")
    assert(await fs.access(manifestPath).then(() => true).catch(() => false), "manifest should be created")
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"))
    assert(manifest.projectName === "Approved Test Project", "manifest projectName should match")

    const eventLogPath = path.join(tmpDir, ".synth", "data", "event-log.jsonl")
    assert(await fs.access(eventLogPath).then(() => true).catch(() => false), "event log should be created")
  })
  console.log("[PASS] synth first-contact --approve on empty directory initializes project")
}

async function testLegacyStateArchivedAndBootstrapped() {
  await withTempDir("synth-onboard-legacy-", async (tmpDir) => {
    const synthDir = path.join(tmpDir, ".synth")
    const dataDir = path.join(synthDir, "data")
    await fs.mkdir(dataDir, { recursive: true })
    await fs.writeFile(path.join(synthDir, "old-state.json"), JSON.stringify({ version: 1 }), "utf-8")

    const { stdout, status } = runSynth(["first-contact", "--approve"], tmpDir)
    assert(status === 0, `approve on legacy dir should exit 0, got ${status}\n${stdout}`)
    const output = parseJson(stdout)
    assert(output.status === "ok", `status should be ok, got ${output.status}`)
    assert(output.detected === "legacy" || output.detected === "brownfield", `detected should be legacy or brownfield after archive, got ${output.detected}`)

    const entries = await fs.readdir(tmpDir)
    const archiveDir = entries.find((e) => e.startsWith(".synth_bk_"))
    assert(archiveDir, "legacy .synth should be archived to .synth_bk_<timestamp>")
    assert(await fs.access(path.join(tmpDir, archiveDir, "old-state.json")).then(() => true).catch(() => false), "archived dir should contain old state")
    assert(await fs.access(path.join(tmpDir, ".synth", "manifest.json")).then(() => true).catch(() => false), "new manifest should be created")
  })
  console.log("[PASS] synth first-contact --approve on legacy state archives and bootstraps")
}

async function testDiscoveryModeBlocksApprove() {
  await withTempDir("synth-onboard-discovery-", async (tmpDir) => {
    const { stdout, status } = runSynth(["first-contact", "--approve", "--discovery-mode"], tmpDir)
    assert(status !== 0, "approve should be blocked in discovery mode")
    assert(stdout.includes("cannot run during Discovery"), `expected discovery block, got: ${stdout}`)
  })
  console.log("[PASS] synth first-contact --approve is blocked in discovery mode")
}

async function testDiscoveryModeAllowsDryRun() {
  await withTempDir("synth-onboard-discovery-dry-", async (tmpDir) => {
    const { stdout, status } = runSynth(["first-contact", "--dry-run", "--discovery-mode"], tmpDir)
    assert(status === 0, `dry-run should be allowed in discovery mode, got ${status}\n${stdout}`)
    const output = parseJson(stdout)
    assert(output.status === "pending-approval", "dry-run in discovery mode should return plan")
  })
  console.log("[PASS] synth first-contact --dry-run is allowed in discovery mode")
}

async function testGenesisAliasWorks() {
  await withTempDir("synth-onboard-genesis-", async (tmpDir) => {
    const { stdout, status } = runSynth(["genesis", "--dry-run"], tmpDir)
    assert(status === 0, `genesis dry-run should exit 0, got ${status}\n${stdout}`)
    const output = parseJson(stdout)
    assert(output.kind === "FirstContactOnboardPlan", `genesis should route to onboard plan, got ${output.kind}`)
  })
  console.log("[PASS] synth genesis --dry-run routes to first-contact onboard plan")
}

async function main() {
  await testDryRunOnEmptyDirectory()
  await testPlanOnBrownfieldDirectory()
  await testAlreadyInitializedV2()
  await testApproveOnEmptyDirectory()
  await testLegacyStateArchivedAndBootstrapped()
  await testDiscoveryModeBlocksApprove()
  await testDiscoveryModeAllowsDryRun()
  await testGenesisAliasWorks()
  console.log("\n[FIRST-CONTACT ONBOARD] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
