// ============================================================
// First Contact CLI Tests
// ============================================================
// Regression guards for EXP-AIFC-008:
//  - synth first-contact help surface works.
//  - start creates a draft proposal without materializing a project.
//  - clarify exposes questions and applies answers deterministically.
//  - project, verify, approve, materialize --dry-run, and materialize --approve
//    form a complete greenfield onboarding workflow.
//  - status reports state at each stage.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

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

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function withTempDir(fn) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-first-contact-cli-test-"))
  try {
    return await fn(tmpDir)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testHelpListsFirstContact() {
  const { stdout, status } = runSynth(["--help"])
  assert(status === 0, "help should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "help status should be ok")
  assert(
    output.commands.some((c) => c.name === "first-contact"),
    "help should list first-contact command",
  )
  console.log("[PASS] synth --help lists first-contact")
}

async function testNamespaceHelp() {
  const { stdout, status } = runSynth(["first-contact", "--help"])
  assert(status === 0, "first-contact --help should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "namespace help status should be ok")
  assert(output.namespace === "first-contact", "namespace should be first-contact")
  assert(Array.isArray(output.subcommands), "namespace help should list subcommands")
  assert(output.subcommands.some((s) => s.name.includes("start")), "help should include start")
  assert(output.subcommands.some((s) => s.name.includes("materialize")), "help should include materialize")
  console.log("[PASS] synth first-contact --help lists subcommands")
}

async function testStartCreatesDraft() {
  await withTempDir(async (tmpDir) => {
    const { stdout, status } = runSynth(["first-contact", "start", "Let's build a space mission tracker in TypeScript for the web."], tmpDir)
    assert(status === 0, "start should exit 0")
    const output = parseJson(stdout)
    assert(output.status === "ok", "start status should be ok")
    assert(output.kind === "FirstContactDraft", "start should return FirstContactDraft")
    assert(typeof output.draftPath === "string", "start should report draftPath")
    assert(output.intent.includes("space mission tracker"), "start should preserve intent")

    const draft = JSON.parse(await fs.readFile(output.draftPath, "utf-8"))
    assert(draft.schema === "synth-first-contact-draft-v1", "draft should use correct schema")
    assert(draft.status === "draft", "draft should have status draft")
    assert(draft.artifact.environment.targetRuntime === "web", "draft should detect web runtime")
    assert(draft.artifact.environment.languagePreferences.includes("typescript"), "draft should detect TypeScript")

    const manifestPath = path.join(tmpDir, ".synth", "manifest.json")
    let hasManifest = false
    try {
      await fs.access(manifestPath)
      hasManifest = true
    } catch {
      hasManifest = false
    }
    assert(!hasManifest, "start should not create manifest")
  })
  console.log("[PASS] synth first-contact start creates a proposal draft without materializing")
}

async function testClarifyFlow() {
  await withTempDir(async (tmpDir) => {
    runSynth(["first-contact", "start", "Let's build a space mission tracker in TypeScript for the web."], tmpDir)

    const { stdout, status } = runSynth(["first-contact", "clarify"], tmpDir)
    assert(status === 0, "clarify should exit 0")
    const output = parseJson(stdout)
    assert(output.status === "ok", "clarify status should be ok")
    assert(output.kind === "FirstContactClarification", "clarify should return FirstContactClarification")
    assert(Array.isArray(output.questions), "clarify should return questions")
    assert(output.questions.length > 0, "clarify should have open questions")

    const primaryUsersQuestion = output.questions.find((q) => q.field === "audience.primaryUsers")
    assert(primaryUsersQuestion, "clarify should ask about primary users")

    const applyResult = runSynth(
      ["first-contact", "clarify", "--field", "audience.primaryUsers", "--answer", "space enthusiasts, mission controllers"],
      tmpDir,
    )
    assert(applyResult.status === 0, "clarify --answer should exit 0")
    const applyOutput = parseJson(applyResult.stdout)
    assert(applyOutput.kind === "FirstContactClarificationApplied", "applied clarification should return correct kind")
    assert(typeof applyOutput.remainingQuestions === "number", "applied clarification should report remaining questions")
  })
  console.log("[PASS] synth first-contact clarify exposes and applies questions")
}

async function testProjectAndVerify() {
  await withTempDir(async (tmpDir) => {
    runSynth(["first-contact", "start", "Let's build a space mission tracker in TypeScript for the web."], tmpDir)
    runSynth(["first-contact", "clarify", "--field", "audience.primaryUsers", "--answer", "space enthusiasts"], tmpDir)
    runSynth(["first-contact", "clarify", "--field", "audience.stakeholders", "--answer", "mission controllers"], tmpDir)

    const { stdout, status } = runSynth(["first-contact", "project"], tmpDir)
    assert(status === 0, "project should exit 0")
    const output = parseJson(stdout)
    assert(output.kind === "FirstContactArchitectureProjection", "project should return FirstContactArchitectureProjection")
    assert(Array.isArray(output.candidates), "project should list candidates")
    assert(output.recommended, "project should have a recommended candidate")

    const verifyResult = runSynth(["first-contact", "verify"], tmpDir)
    assert(verifyResult.status === 0, "verify should exit 0")
    const verifyOutput = parseJson(verifyResult.stdout)
    assert(verifyOutput.kind === "FirstContactCapabilityVerification", "verify should return FirstContactCapabilityVerification")
    assert(verifyOutput.report.status === "passed", "verify should pass for Node assumption")
  })
  console.log("[PASS] synth first-contact project and verify work after clarification")
}

async function testApproveAndMaterialize() {
  await withTempDir(async (tmpDir) => {
    runSynth(["first-contact", "start", "Let's build a space mission tracker in TypeScript for the web."], tmpDir)
    runSynth(["first-contact", "clarify", "--field", "audience.primaryUsers", "--answer", "space enthusiasts"], tmpDir)
    runSynth(["first-contact", "clarify", "--field", "audience.stakeholders", "--answer", "mission controllers"], tmpDir)

    const { stdout, status } = runSynth(["first-contact", "approve"], tmpDir)
    assert(status === 0, "approve should exit 0")
    const output = parseJson(stdout)
    assert(output.kind === "FirstContactApproved", "approve should return FirstContactApproved")
    assert(typeof output.approvedPath === "string", "approve should report approvedPath")
    assert(typeof output.artifactHash === "string", "approve should report artifactHash")

    const dryRun = runSynth(["first-contact", "materialize", "--dry-run"], tmpDir)
    assert(dryRun.status === 0, "materialize --dry-run should exit 0")
    const dryRunOutput = parseJson(dryRun.stdout)
    assert(dryRunOutput.kind === "FirstContactMaterializationPreview", "dry-run should return preview")
    assert(Array.isArray(dryRunOutput.wouldCreate), "dry-run should list wouldCreate")

    const manifestBefore = path.join(tmpDir, ".synth", "manifest.json")
    let hasManifestBefore = false
    try {
      await fs.access(manifestBefore)
      hasManifestBefore = true
    } catch {
      hasManifestBefore = false
    }
    assert(!hasManifestBefore, "dry-run should not create manifest")

    const materializeResult = runSynth(["first-contact", "materialize", "--approve"], tmpDir)
    assert(materializeResult.status === 0, "materialize --approve should exit 0")
    const materializeOutput = parseJson(materializeResult.stdout)
    assert(materializeOutput.kind === "FirstContactMaterialized", "materialize should return FirstContactMaterialized")
    assert(typeof materializeOutput.manifestPath === "string", "materialize should report manifestPath")

    const manifest = JSON.parse(await fs.readFile(materializeOutput.manifestPath, "utf-8"))
    assert(manifest.schema === "synth-bootstrap-manifest-v1", "manifest should have correct schema")
    assert(manifest.source === "first-contact", "manifest should record first-contact source")

    const events = (await fs.readFile(materializeOutput.eventLogPath, "utf-8")).trim().split("\n").map(JSON.parse)
    assert(events[0].type === "FIRST_CONTACT_STARTED", "first event should be FIRST_CONTACT_STARTED")
  })
  console.log("[PASS] synth first-contact approve, dry-run, and materialize form a greenfield workflow")
}

async function testStatusReportsState() {
  await withTempDir(async (tmpDir) => {
    const emptyStatus = runSynth(["first-contact", "status"], tmpDir)
    assert(emptyStatus.status === 0, "status in empty dir should exit 0")
    const emptyOutput = parseJson(emptyStatus.stdout)
    assert(emptyOutput.kind === "FirstContactStatus", "status should return FirstContactStatus")
    assert(emptyOutput.state === "not-started", "status should be not-started")

    runSynth(["first-contact", "start", "Let's build a space mission tracker in TypeScript for the web."], tmpDir)
    const draftStatus = runSynth(["first-contact", "status"], tmpDir)
    const draftOutput = parseJson(draftStatus.stdout)
    assert(draftOutput.state === "draft", "status should be draft after start")

    runSynth(["first-contact", "clarify", "--field", "audience.primaryUsers", "--answer", "space enthusiasts"], tmpDir)
    runSynth(["first-contact", "clarify", "--field", "audience.stakeholders", "--answer", "mission controllers"], tmpDir)
    runSynth(["first-contact", "approve"], tmpDir)

    const approvedStatus = runSynth(["first-contact", "status"], tmpDir)
    const approvedOutput = parseJson(approvedStatus.stdout)
    assert(approvedOutput.state === "approved", "status should be approved after approve")
    assert(typeof approvedOutput.artifactHash === "string", "approved status should include artifactHash")
  })
  console.log("[PASS] synth first-contact status reports state transitions")
}

async function testGenesisAliasHelp() {
  const { stdout, status } = runSynth(["genesis", "--help"])
  assert(status === 0, "genesis --help should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "genesis help status should be ok")
  assert(output.namespace === "first-contact", "genesis help should report first-contact namespace")
  assert(Array.isArray(output.subcommands), "genesis help should list subcommands")
  console.log("[PASS] synth genesis --help lists subcommands")
}

async function testGenesisAliasStartCreatesDraft() {
  await withTempDir(async (tmpDir) => {
    const { stdout, status } = runSynth(["genesis", "start", "Let's build a markdown editor in TypeScript."], tmpDir)
    assert(status === 0, "genesis start should exit 0")
    const output = parseJson(stdout)
    assert(output.status === "ok", "genesis start status should be ok")
    assert(output.kind === "FirstContactDraft", "genesis start should return FirstContactDraft")
    assert(output.intent.includes("markdown editor"), "genesis start should preserve intent")

    const draftPath = path.join(tmpDir, ".synth", "first-contact", "draft.json")
    const draft = JSON.parse(await fs.readFile(draftPath, "utf-8"))
    assert(draft.schema === "synth-first-contact-draft-v1", "genesis draft should use correct schema")

    const manifestPath = path.join(tmpDir, ".synth", "manifest.json")
    let hasManifest = false
    try {
      await fs.access(manifestPath)
      hasManifest = true
    } catch {
      hasManifest = false
    }
    assert(!hasManifest, "genesis start should not create manifest")
  })
  console.log("[PASS] synth genesis start creates a proposal draft without materializing")
}

async function testDiscoveryModeRejectsMaterialize() {
  await withTempDir(async (tmpDir) => {
    runSynth(["first-contact", "start", "Let's build a space mission tracker in TypeScript for the web."], tmpDir)
    const result = runSynth(["--discovery-mode", "first-contact", "materialize", "--approve"], tmpDir)
    assert(result.status !== 0, "materialize --approve should be rejected in discovery mode")
    const output = parseJson(result.stdout)
    assert(output.status === "error", "discovery mode should return error status")
    assert(output.error.includes("MUTATING"), "error should mention MUTATING command")
  })
  console.log("[PASS] synth first-contact materialize --approve is rejected in discovery mode")
}

async function main() {
  try {
    await fs.access(CLI_PATH)
  } catch {
    console.error(`[SKIP] CLI not built. Run 'npm run build' first.`)
    process.exit(0)
  }

  await testHelpListsFirstContact()
  await testNamespaceHelp()
  await testGenesisAliasHelp()
  await testGenesisAliasStartCreatesDraft()
  await testStartCreatesDraft()
  await testClarifyFlow()
  await testProjectAndVerify()
  await testApproveAndMaterialize()
  await testStatusReportsState()
  await testDiscoveryModeRejectsMaterialize()

  console.log("\n[FIRST CONTACT CLI] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
