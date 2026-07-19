// ============================================================
// First Contact Certification Tests
// ============================================================
// Certification and UX validation for EXP-AIFC-010.
// Validates that the first-contact greenfield onboarding workflow is
// deterministic, replayable, and discoverable by both operators and agents.
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
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-first-contact-cert-"))
  try {
    return await fn(tmpDir)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testOperatorJourneyEndToEnd() {
  await withTempDir(async (tmpDir) => {
    const intent = "Let's build a space mission tracker in TypeScript for the web."

    const start = parseJson(runSynth(["first-contact", "start", intent], tmpDir).stdout)
    assert(start.kind === "FirstContactDraft", "start produces a draft")

    const clarify1 = parseJson(runSynth(["first-contact", "clarify"], tmpDir).stdout)
    assert(clarify1.questions.length > 0, "clarify exposes questions")

    runSynth(["first-contact", "clarify", "--field", "audience.primaryUsers", "--answer", "space enthusiasts"], tmpDir)
    runSynth(["first-contact", "clarify", "--field", "audience.stakeholders", "--answer", "mission controllers"], tmpDir)

    const clarify2 = parseJson(runSynth(["first-contact", "clarify"], tmpDir).stdout)
    assert(clarify2.canApprove, "draft becomes approvable after clarification")

    const project = parseJson(runSynth(["first-contact", "project"], tmpDir).stdout)
    assert(project.recommended, "project recommends an architecture")

    const verify = parseJson(runSynth(["first-contact", "verify"], tmpDir).stdout)
    assert(verify.report.status === "passed", "verify passes")

    const approve = parseJson(runSynth(["first-contact", "approve"], tmpDir).stdout)
    assert(approve.kind === "FirstContactApproved", "approve succeeds")

    const dryRun = parseJson(runSynth(["first-contact", "materialize", "--dry-run"], tmpDir).stdout)
    assert(dryRun.kind === "FirstContactMaterializationPreview", "dry-run previews materialization")

    const materialize = parseJson(runSynth(["first-contact", "materialize", "--approve"], tmpDir).stdout)
    assert(materialize.kind === "FirstContactMaterialized", "materialize succeeds")

    const replay = parseJson(runSynth(["explain", "replay"], tmpDir).stdout)
    assert(replay.consistent === true, "replay is consistent after materialization")
  })
  console.log("[CERTIFIED] operator journey: start → clarify → project → verify → approve → materialize → replay")
}

async function testAgentDerivesWorkflowFromHelp() {
  const help = parseJson(runSynth(["first-contact", "--help"]).stdout)
  assert(help.status === "ok", "namespace help is available")
  assert(help.subcommands.some((s) => s.name.includes("start")), "help lists start")
  assert(help.subcommands.some((s) => s.name.includes("clarify")), "help lists clarify")
  assert(help.subcommands.some((s) => s.name.includes("project")), "help lists project")
  assert(help.subcommands.some((s) => s.name.includes("verify")), "help lists verify")
  assert(help.subcommands.some((s) => s.name.includes("approve")), "help lists approve")
  assert(help.subcommands.some((s) => s.name.includes("materialize")), "help lists materialize")
  assert(help.subcommands.some((s) => s.name.includes("status")), "help lists status")
  console.log("[CERTIFIED] agent can derive first-contact workflow from help")
}

async function testDeterministicPipeline() {
  const intent = "Let's build a space mission tracker in TypeScript for the web."

  const run1Artifact = await withTempDir(async (tmpDir) => {
    runSynth(["first-contact", "start", intent], tmpDir)
    runSynth(["first-contact", "clarify", "--field", "audience.primaryUsers", "--answer", "space enthusiasts"], tmpDir)
    runSynth(["first-contact", "clarify", "--field", "audience.stakeholders", "--answer", "mission controllers"], tmpDir)
    runSynth(["first-contact", "approve"], tmpDir)
    return JSON.parse(await fs.readFile(path.join(tmpDir, ".synth", "first-contact", "approved-artifact.json"), "utf-8"))
  })

  const run2Artifact = await withTempDir(async (tmpDir) => {
    runSynth(["first-contact", "start", intent], tmpDir)
    runSynth(["first-contact", "clarify", "--field", "audience.primaryUsers", "--answer", "space enthusiasts"], tmpDir)
    runSynth(["first-contact", "clarify", "--field", "audience.stakeholders", "--answer", "mission controllers"], tmpDir)
    runSynth(["first-contact", "approve"], tmpDir)
    return JSON.parse(await fs.readFile(path.join(tmpDir, ".synth", "first-contact", "approved-artifact.json"), "utf-8"))
  })

  assert(run1Artifact.artifactHash === run2Artifact.artifactHash, "approved artifact hash is deterministic for identical input and answers")
  console.log("[CERTIFIED] first-contact pipeline is deterministic")
}

async function testMutationSafety() {
  await withTempDir(async (tmpDir) => {
    runSynth(["first-contact", "start", "Let's build a space mission tracker in TypeScript for the web."], tmpDir)

    const result = runSynth(["--discovery-mode", "first-contact", "materialize", "--approve"], tmpDir)
    assert(result.status !== 0, "materialize --approve is rejected in discovery mode")
    const output = parseJson(result.stdout)
    assert(output.status === "error", "discovery mode returns error status")
    assert(output.error.includes("MUTATING"), "error classifies command as MUTATING")
  })
  console.log("[CERTIFIED] mutation safety: discovery mode rejects materialization")
}

async function testStatusTransitions() {
  await withTempDir(async (tmpDir) => {
    const s0 = parseJson(runSynth(["first-contact", "status"], tmpDir).stdout)
    assert(s0.state === "not-started", "initial status is not-started")

    runSynth(["first-contact", "start", "Let's build a space mission tracker in TypeScript for the web."], tmpDir)
    const s1 = parseJson(runSynth(["first-contact", "status"], tmpDir).stdout)
    assert(s1.state === "draft", "status is draft after start")

    runSynth(["first-contact", "clarify", "--field", "audience.primaryUsers", "--answer", "space enthusiasts"], tmpDir)
    runSynth(["first-contact", "clarify", "--field", "audience.stakeholders", "--answer", "mission controllers"], tmpDir)
    runSynth(["first-contact", "approve"], tmpDir)

    const s2 = parseJson(runSynth(["first-contact", "status"], tmpDir).stdout)
    assert(s2.state === "approved", "status is approved after approve")
    assert(typeof s2.artifactHash === "string", "approved status includes artifact hash")
  })
  console.log("[CERTIFIED] status transitions are observable and accurate")
}

async function testReplayConsistencyAfterMaterialization() {
  await withTempDir(async (tmpDir) => {
    runSynth(["first-contact", "start", "Let's build a space mission tracker in TypeScript for the web."], tmpDir)
    runSynth(["first-contact", "clarify", "--field", "audience.primaryUsers", "--answer", "space enthusiasts"], tmpDir)
    runSynth(["first-contact", "clarify", "--field", "audience.stakeholders", "--answer", "mission controllers"], tmpDir)
    runSynth(["first-contact", "approve"], tmpDir)
    runSynth(["first-contact", "materialize", "--approve"], tmpDir)

    const replay = parseJson(runSynth(["explain", "replay"], tmpDir).stdout)
    assert(replay.consistent === true, "replay is consistent")
    assert(replay.chainValid === true, "hash chain is valid")
    assert(replay.eventCount === 4, "event log contains 4 first-contact events")
  })
  console.log("[CERTIFIED] materialized project passes replay verification")
}

async function main() {
  try {
    await fs.access(CLI_PATH)
  } catch {
    console.error(`[SKIP] CLI not built. Run 'npm run build' first.`)
    process.exit(0)
  }

  await testAgentDerivesWorkflowFromHelp()
  await testOperatorJourneyEndToEnd()
  await testDeterministicPipeline()
  await testMutationSafety()
  await testStatusTransitions()
  await testReplayConsistencyAfterMaterialization()

  console.log("\n[FIRST CONTACT CERTIFICATION] All certifications passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
