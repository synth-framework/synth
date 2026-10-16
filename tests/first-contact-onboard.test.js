// ============================================================
// EXP-ONBOARD-001 — Guided First-Contact Onboard Command
// ============================================================
// Verifies that bare `synth first-contact` detects repository state and
// guides the operator through the correct initialization path.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import { runSynth, parseJson, withTempDir, writeManifest, readEventLog, CLI_PATH } from "./helpers/cli-harness.js"
import { assert } from "./helpers/assert.js"

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
    assert(Array.isArray(output.taskPlan), "taskPlan should be an array")
    assert(output.taskPlan.includes("onboarding:init"), "taskPlan should include onboarding:init")
    assert(output.taskPlan.includes("onboarding:mission"), "taskPlan should include onboarding:mission")
    assert(Array.isArray(output.wouldCreate), "wouldCreate should be an array")
    assert(output.wouldCreate.includes(".synth/manifest.json"), "wouldCreate should include manifest")
    assert(output.sourceHandoff.sourceStatus === "not-ingested", "an empty workspace must not pretend it has source evidence")
    assert(output.sourceHandoff.files.length === 0 && output.sourceHandoff.nextSteps.length === 0, "greenfield should begin with the idea, not invented file paths")

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
    assert(Array.isArray(output.taskPlan), "taskPlan should be an array")
    assert(output.taskPlan.includes("onboarding:bootstrap"), "taskPlan should include onboarding:bootstrap")
    assert(output.wouldRun.includes("synth bootstrap --approve"), "plan should include bootstrap")
  })
  console.log("[PASS] synth first-contact on brownfield directory returns bootstrap plan")
}

async function testSourceHandoffBeforeApproval() {
  await withTempDir("synth-guided-sources-", async (tmpDir) => {
    for (const directory of ["docs", "knowledge", "src", "tests"]) {
      await fs.mkdir(path.join(tmpDir, directory))
    }
    await fs.writeFile(path.join(tmpDir, "docs", "board.md"), "# Specimen boards\nUse portable tokens.\n")
    await fs.writeFile(path.join(tmpDir, "knowledge", "constraints.md"), "# Collaboration\nSources must stay local; shared editing is also requested.\n")
    await fs.writeFile(path.join(tmpDir, "src", "board.js"), "export const renderBoard = () => '<svg/>'\n")
    await fs.writeFile(path.join(tmpDir, "tests", "board.test.js"), "// Existing board test\n")

    const result = runSynth(["first-contact", "--dry-run"], tmpDir)
    assert(result.status === 0, `source preview should exit 0: ${result.stdout}\n${result.stderr}`)
    const output = parseJson(result.stdout)
    const handoff = output.sourceHandoff
    assert(handoff?.sourceStatus === "not-ingested", "inventory must not claim the documents were read or approved")
    assert(handoff.files.includes("src/board.js") && handoff.files.includes("tests/board.test.js"), "brownfield source/test paths must be visible")
    assert(handoff.files.includes("docs/board.md") && handoff.files.includes("knowledge/constraints.md"), "both possible documentation roots must be visible")
    assert(handoff.nextSteps.includes("synth discover . --export"), "brownfield must show the actual discovery handoff")
    assert(handoff.nextSteps.includes("synth docs generate --knowledge-base ./knowledge"), "knowledge/ must not silently route to ./docs")
    assert(handoff.selectionRequired === true, "two document roots must require explicit source selection")
    assert(output.nextStep.includes("choose the intended source"), "do not silently select docs/ or knowledge/ or suggest approval before review")
    assert(!handoff.nextSteps.some((s) => s.includes("alignment prepare")), "source inventory must not fabricate an approved reviewer")
    assert(!(await fs.readdir(tmpDir)).includes(".synth"), "dry-run must not write governance files")
  })
  console.log("[PASS] first-contact preview inventories sources without claiming ingestion or human choice")
}

async function testDocsOnlyHandoff() {
  await withTempDir("synth-guided-docs-", async (tmpDir) => {
    await fs.mkdir(path.join(tmpDir, "docs"))
    await fs.mkdir(path.join(tmpDir, "knowledge", "specs"), { recursive: true })
    await fs.writeFile(path.join(tmpDir, "knowledge", "specs", "atlas.md"), "# Synthetic atlas\nComponent states are not yet specified.\n")
    const result = runSynth(["first-contact", "--dry-run"], tmpDir)
    assert(result.status === 0, `knowledge-only preview should exit 0: ${result.stdout}\n${result.stderr}`)
    const output = parseJson(result.stdout)
    const handoff = output.sourceHandoff
    assert(handoff.files.includes("knowledge/specs/atlas.md"), "nested knowledge source path must be reported")
    assert(handoff.nextSteps.includes("synth docs generate --knowledge-base ./knowledge"), "explicit knowledge route required")
    assert(!handoff.nextSteps.includes("synth docs generate --knowledge-base ./docs"), "empty docs/ must not be treated as an ingested source")
    assert(handoff.selectionRequired === false, "one populated source root should not require a root choice")
    assert(handoff.sourceStatus === "not-ingested", "preview must not claim parsing or conflict resolution")
    assert(output.nextStep === "synth docs generate --knowledge-base ./knowledge", "knowledge-only guidance should not say to apply governance before reading sources")
  })
  console.log("[PASS] knowledge-only preview gives the correct explicit docs source")
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

    // The authoritative event store is partitioned on current builds; a
    // monolithic event-log.jsonl is only a legacy fallback.
    const events = await readEventLog(tmpDir)
    assert(events.some((event) => event.type === "PROJECT_INITIALIZED"), "project initialization should be recorded in the event stream")
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

async function testApproveThroughSymlink() {
  await withTempDir("synth-onboard-symlink-", async (tmpDir) => {
    const binDir = path.join(tmpDir, "bin")
    await fs.mkdir(binDir, { recursive: true })
    const symlinkPath = path.join(binDir, "synth")
    await fs.symlink(CLI_PATH, symlinkPath)

    const result = spawnSync("node", [symlinkPath, "first-contact", "--approve", "--name", "Symlink Test Project"], {
      cwd: tmpDir,
      encoding: "utf-8",
      timeout: 120000,
    })
    assert(result.status === 0, `approve through symlink should exit 0, got ${result.status}\n${result.stdout}\n${result.stderr}`)
    const output = parseJson(result.stdout)
    assert(output.status === "ok", `status should be ok, got ${output.status}`)
    assert(output.kind === "FirstContactOnboardCompleted", `kind should be FirstContactOnboardCompleted, got ${output.kind}`)

    const manifestPath = path.join(tmpDir, ".synth", "manifest.json")
    assert(await fs.access(manifestPath).then(() => true).catch(() => false), "manifest should be created")
  })
  console.log("[PASS] synth first-contact --approve works through a symlinked global install")
}

async function testOnboardingGovernTaskRunsProjectGovern() {
  await withTempDir("synth-onboard-govern-task-", async (tmpDir) => {
    await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "onboard-govern", version: "1.0.0", scripts: {} }), "utf-8")

    let result = runSynth(["first-contact", "--approve", "--name", "Onboard Govern Test"], tmpDir)
    assert(result.status === 0, `first-contact --approve should exit 0: ${result.stdout}\n${result.stderr}`)

    result = runSynth(["task", "run", "onboarding:govern"], tmpDir)
    assert(result.status === 0, `task run onboarding:govern should exit 0: ${result.stdout}\n${result.stderr}`)
    const output = parseJson(result.stdout)
    assert(output.status === "ok", `onboarding:govern status should be ok, got ${output.status}`)
  })
  console.log("[PASS] task run onboarding:govern delegates to project npm run govern")
}

async function main() {
  await testDryRunOnEmptyDirectory()
  await testPlanOnBrownfieldDirectory()
  await testSourceHandoffBeforeApproval()
  await testDocsOnlyHandoff()
  await testAlreadyInitializedV2()
  await testApproveOnEmptyDirectory()
  await testLegacyStateArchivedAndBootstrapped()
  await testDiscoveryModeBlocksApprove()
  await testDiscoveryModeAllowsDryRun()
  await testGenesisAliasWorks()
  await testApproveThroughSymlink()
  await testOnboardingGovernTaskRunsProjectGovern()
  console.log("\n[FIRST-CONTACT ONBOARD] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
