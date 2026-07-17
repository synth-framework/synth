#!/usr/bin/env node
// ============================================================
// SYNTH: TaskPRO Regression Journey (EXP-CONT-003)
// ============================================================
// Re-runs the canonical TaskPRO first-contact scenario on the hardened
// build and asserts that every major field finding is prevented or paved.
// This script is deterministic: it simulates a zero-history agent using
// only public CLI commands and structured JSON output.
//
// Exit 0 = all assertions pass and a report is written.
// Exit 1 = at least one assertion failed.
//
// Usage:
//   node scripts/taskpro-regression.js [--out <report.json>]
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")
const TIMEOUT_MS = 30000

const COLORS = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  reset: "\x1b[0m",
}

function color(name, text) {
  return `${COLORS[name] || ""}${text}${COLORS.reset}`
}

function runSynth(args, cwd, env = {}) {
  const result = spawnSync("node", [CLI_PATH, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: TIMEOUT_MS,
    env: { ...process.env, ...env },
  })
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
    error: result.error,
  }
}

function parseJson(stdout) {
  try {
    return JSON.parse(stdout.trim())
  } catch {
    return { parseError: true, raw: stdout.slice(0, 500) }
  }
}

class RegressionHarness {
  constructor(projectDir) {
    this.projectDir = projectDir
    this.results = []
    this.failed = false
  }

  assert(name, condition, details = "") {
    if (condition) {
      this.results.push({ name, status: "PASS", details })
      console.log(color("green", `  ✓ ${name}`))
    } else {
      this.failed = true
      this.results.push({ name, status: "FAIL", details })
      console.log(color("red", `  ✗ ${name}`))
      if (details) console.log(color("red", `    ${details}`))
    }
  }

  async setupKnowledgeBase() {
    const docsDir = path.join(this.projectDir, "Docs")
    const uiDir = path.join(this.projectDir, "UI")
    await fs.mkdir(docsDir, { recursive: true })
    await fs.mkdir(uiDir, { recursive: true })

    await fs.writeFile(
      path.join(docsDir, "architecture.md.txt"),
      "# Architecture\n\nThe system uses a clean architecture with domain, application, and infrastructure layers.\n",
    )
    await fs.writeFile(
      path.join(docsDir, "api.md.txt"),
      "# API\n\nRESTful endpoints for missions, expeditions, and replay.\n",
    )
    await fs.writeFile(
      path.join(uiDir, "components.md.txt"),
      "# UI Components\n\nReact components for the mission dashboard.\n",
    )
  }

  async run() {
    console.log("\n═══════════════════════════════════════════════════")
    console.log("  SYNTH: TaskPRO Regression Journey (EXP-CONT-003)")
    console.log("═══════════════════════════════════════════════════\n")

    await this.setupKnowledgeBase()

    // Step 1 — Agent arrives cold and initializes.
    const initResult = runSynth(["init", "--name", "TaskPRO Regression"], this.projectDir)
    this.assert("N2/N8: init succeeds on first contact", initResult.status === 0, initResult.stderr)

    // Step 2 — explain identity describes the repository.
    const identityResult = runSynth(["explain", "identity"], this.projectDir)
    const identity = parseJson(identityResult.stdout)
    this.assert(
      "N5: explain identity returns kind, phase, and authority",
      identityResult.status === 0 && identity.kind && identity.phase && Array.isArray(identity.authority),
      identityResult.stdout.slice(0, 200),
    )

    // Step 3 — status answers operationally.
    const statusResult = runSynth(["status"], this.projectDir)
    const status = parseJson(statusResult.stdout)
    this.assert(
      "N5: status returns next actions and blockers",
      statusResult.status === 0 && Array.isArray(status.nextActions) && Array.isArray(status.blockers),
      statusResult.stdout.slice(0, 200),
    )

    // Step 4 — docs generate warns on zero extraction (.md.txt filter).
    const docsResult = runSynth(["docs", "generate"], this.projectDir)
    const docs = parseJson(docsResult.stdout)
    this.assert(
      "N4: docs generate reports zero concept extraction",
      docsResult.status === 0 &&
        (docs.warnings?.length > 0 ||
          docs.summary?.conceptsExtracted === 0 ||
          docs.summary?.zeroExtractionWarning === true),
      docsResult.stdout.slice(0, 300),
    )

    // Step 5 — doctor verifies installed runtime integrity.
    const doctorResult = runSynth(["doctor"], this.projectDir)
    const doctor = parseJson(doctorResult.stdout)
    this.assert(
      "N6: doctor verifies dist hashes",
      doctorResult.status === 0 && doctor.status === "ok" && doctor.healthy === true && doctor.checks?.distIntegrity?.ok === true,
      doctorResult.stdout.slice(0, 200),
    )

    // Step 6 — create a mission draft.
    const createResult = runSynth(
      ["mission", "create", "--subject", "TaskPRO Core Development", "--purpose", "Transform knowledge into a specification"],
      this.projectDir,
    )
    const draft = parseJson(createResult.stdout)
    this.assert("N2/N3: mission create produces a draft", createResult.status === 0 && draft.draftId, createResult.stdout.slice(0, 200))

    // Step 7 — rejection path is executable: add evidence until approval threshold is met.
    let currentDraftId = draft.draftId
    let evidence = null
    const evidenceSubjects = [
      "Knowledge base covers architecture and API",
      "UI component specifications are documented",
      "Data model and integration points are defined",
    ]
    for (const subject of evidenceSubjects) {
      const evidenceResult = runSynth(
        ["mission", "evidence", "add", "--draft-id", currentDraftId, "--subject", subject, "--confidence", "high"],
        this.projectDir,
      )
      evidence = parseJson(evidenceResult.stdout)
      if (evidenceResult.status === 0 && evidence.draftId) {
        currentDraftId = evidence.draftId
      }
    }
    this.assert(
      "N3: evidence can be added to a rejected/low-confidence draft",
      evidence && evidence.draftId,
      evidence ? JSON.stringify(evidence).slice(0, 200) : "no evidence output",
    )

    // Step 8 — approve the successor mission draft (evidence add supersedes the original).
    const approveResult = runSynth(["mission", "approve", "--draft-id", currentDraftId], this.projectDir)
    const approval = parseJson(approveResult.stdout)
    this.assert(
      "N2/N8: mission approval succeeds and persists",
      approveResult.status === 0 && approval.decision?.approved === true && approval.snapshotPersisted === true,
      approveResult.stdout.slice(0, 300),
    )

    // Step 9 — simulate session interruption: drop any in-memory state by
    // spawning a fresh process and using only explain resume.
    const resumeResult = runSynth(["explain", "resume"], this.projectDir)
    const resume = parseJson(resumeResult.stdout)
    this.assert(
      "N8: resume reconstructs the approved mission after interruption",
      resumeResult.status === 0 &&
        resume.kind === "ResumeBriefing" &&
        resume.whatHappened.some((e) => e.type === "MISSION_APPROVED") &&
        resume.whatIsNext.some((a) => a.command.includes("synth expedition create")),
      resumeResult.stdout.slice(0, 300),
    )

    // Step 10 — create an expedition using only the resume briefing (zero-history).
    const resumeAfterApproval = parseJson(runSynth(["explain", "resume"], this.projectDir).stdout)
    const nextAction = resumeAfterApproval.whatIsNext?.find((a) => a.command.includes("synth expedition create"))
    let expeditionCreated = false
    if (nextAction) {
      // Extract the mission id from the command string.
      const missionIdMatch = nextAction.command.match(/--mission\s+(\S+)/)
      const missionId = missionIdMatch ? missionIdMatch[1] : undefined
      if (missionId) {
        const expResult = runSynth(
          ["expedition", "create", "--mission", missionId, "--subject", "Knowledge Extraction", "--goal", "Extract and classify knowledge"],
          this.projectDir,
        )
        expeditionCreated = expResult.status === 0
        this.assert("N8: expedition can be created from resumed context", expeditionCreated, expResult.stdout.slice(0, 300))
      } else {
        this.assert("N8: mission id parseable from resume next action", false, nextAction.command)
      }
    } else {
      this.assert("N8: resume points to expedition creation", false, JSON.stringify(resumeAfterApproval.whatIsNext).slice(0, 200))
    }

    // Step 11 — adapter info works without source reading.
    const adapterResult = runSynth(["adapter", "info", "filesystem"], this.projectDir)
    const adapter = parseJson(adapterResult.stdout)
    this.assert(
      "N5: adapter info returns metadata without source reading",
      adapterResult.status === 0 && (adapter.name || adapter.kind || adapter.status),
      adapterResult.stdout.slice(0, 200),
    )

    // Step 12 — cyclic govern script is refused in seconds, not minutes.
    const cyclicProject = path.join(os.tmpdir(), `synth-taskpro-cycle-${Date.now()}`)
    await fs.mkdir(cyclicProject, { recursive: true })
    await fs.writeFile(
      path.join(cyclicProject, "package.json"),
      JSON.stringify({ name: "cycle-test", version: "1.0.0", scripts: { govern: "synth govern" } }),
    )
    const cycleStart = Date.now()
    const cycleResult = runSynth(["validate", "--full"], cyclicProject)
    const cycleElapsed = Date.now() - cycleStart
    this.assert(
      "N1: cyclic govern script is refused in under 10 seconds",
      cycleElapsed < 10000 && (cycleResult.status !== 0 || cycleResult.stdout.includes("cycle") || cycleResult.stderr.includes("cycle")),
      `elapsed=${cycleElapsed}ms stdout=${cycleResult.stdout.slice(0, 200)}`,
    )
    await fs.rm(cyclicProject, { recursive: true, force: true }).catch(() => {})

    // Step 13 — clean machine output: --json has no bootstrap log noise.
    const jsonResult = runSynth(["--json", "status"], this.projectDir)
    const jsonOutput = parseJson(jsonResult.stdout)
    this.assert(
      "N5: --json output is machine-clean JSON",
      jsonResult.status === 0 && !jsonOutput.parseError && jsonOutput.status === "ok",
      jsonResult.stdout.slice(0, 200),
    )

    // Step 14 — replay and proof still pass on the regression project.
    const replayResult = runSynth(["explain", "replay"], this.projectDir)
    this.assert("N8: replay remains consistent after resumed execution", replayResult.status === 0, replayResult.stdout.slice(0, 200))

    return {
      status: this.failed ? "FAIL" : "PASS",
      assertions: this.results,
      passed: this.results.filter((r) => r.status === "PASS").length,
      failed: this.results.filter((r) => r.status === "FAIL").length,
    }
  }
}

async function main() {
  const outFlagIndex = process.argv.indexOf("--out")
  const reportPath = outFlagIndex !== -1 ? process.argv[outFlagIndex + 1] : undefined

  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-taskpro-regression-"))
  const harness = new RegressionHarness(projectDir)

  let report
  try {
    report = await harness.run()
  } finally {
    await fs.rm(projectDir, { recursive: true, force: true }).catch(() => {})
  }

  console.log("\n═══════════════════════════════════════════════════")
  if (report.status === "PASS") {
    console.log(color("green", `  ✅ REGRESSION PASS — ${report.passed}/${report.passed + report.failed} assertions`))
  } else {
    console.log(color("red", `  ❌ REGRESSION FAIL — ${report.passed} passed, ${report.failed} failed`))
  }
  console.log("═══════════════════════════════════════════════════\n")

  if (reportPath) {
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    console.log(`Report written: ${reportPath}`)
  }

  process.exit(report.status === "PASS" ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
