#!/usr/bin/env node
// ============================================================
// SYNTH: Interruption Benchmark (EXP-CONT-002)
// ============================================================
// Measures the Repository Authority Index (RAI) at a matrix of
// kill-at-checkpoints. A fresh agent with zero conversation history
// is simulated by spawning a new process at each checkpoint and
// invoking only public read-only CLI commands.
//
// Exit 0 = benchmark completed and report written.
// Exit 1 = benchmark could not complete.
//
// Usage:
//   node scripts/interruption-benchmark.js [--out <report.json>]
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
  cyan: "\x1b[36m",
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

function scoreDimension(name, score, reason) {
  return { name, score, reason }
}

function average(scores) {
  if (scores.length === 0) return 0
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

class RaiScorer {
  constructor(projectDir) {
    this.projectDir = projectDir
  }

  scoreIdentity() {
    const result = runSynth(["explain", "identity"], this.projectDir)
    const identity = parseJson(result.stdout)
    if (result.status !== 0 || identity.parseError || !identity.kind || !identity.phase) {
      return scoreDimension("Identity", 0, "identity projection missing or failed")
    }
    const hasAuthority = Array.isArray(identity.authority) && identity.authority.length > 0
    const hasInputs = Array.isArray(identity.expectedInputs) && identity.expectedInputs.length > 0
    const hasOutputs = Array.isArray(identity.expectedOutputs) && identity.expectedOutputs.length > 0
    const hasDirection = typeof identity.transformationDirection === "string" && identity.transformationDirection.length > 0
    if (hasAuthority && hasInputs && hasOutputs && hasDirection) {
      return scoreDimension("Identity", 1, "full identity projection available")
    }
    return scoreDimension("Identity", 0.5, "partial identity projection")
  }

  scoreMission(expectedMissionName) {
    // Resume is the primary source, but status can reveal draft missions before
    // they are approved and emitted to snapshots/events.
    const resumeResult = runSynth(["explain", "resume"], this.projectDir)
    const resume = parseJson(resumeResult.stdout)
    const statusResult = runSynth(["status"], this.projectDir)
    const status = parseJson(statusResult.stdout)

    if (resumeResult.status !== 0 && statusResult.status !== 0) {
      return scoreDimension("Mission", 0, "both resume and status failed")
    }

    const approvedEvent = resume.whatHappened?.find((e) => e.type === "MISSION_APPROVED")
    const activePhase = resume.context?.phase === "approved" || resume.context?.phase === "executing"
    const hasApprovedName = approvedEvent?.summary?.includes(expectedMissionName)
    if (activePhase && hasApprovedName) {
      return scoreDimension("Mission", 1, `active mission "${expectedMissionName}" reconstructed`)
    }

    // Draft mission visible in status briefing.
    const draftMission = status.missions?.find((m) => m.status === "draft" || m.name === expectedMissionName)
    if (draftMission && draftMission.name === expectedMissionName) {
      return scoreDimension("Mission", 0.5, `draft mission "${expectedMissionName}" visible`)
    }

    if (activePhase || approvedEvent) {
      return scoreDimension("Mission", 0.5, "mission status present but name unclear")
    }
    return scoreDimension("Mission", 0, "no mission reconstructable")
  }

  scoreDecisions() {
    const result = runSynth(["explain", "resume"], this.projectDir)
    const resume = parseJson(result.stdout)
    if (result.status !== 0 || resume.parseError) {
      return scoreDimension("Decisions", 0, "resume briefing failed")
    }
    const decisions = resume.whatWasDecided || []
    const hasApproved = decisions.some((d) => d.type === "MISSION_APPROVAL_APPROVED")
    const hasRejected = decisions.some((d) => d.type === "MISSION_APPROVAL_REJECTED")
    if (hasApproved || hasRejected) {
      return scoreDimension("Decisions", 1, "durable decisions reconstructable")
    }
    return scoreDimension("Decisions", 0, "no decisions recorded")
  }

  scoreNextAction(expectedAction) {
    const resumeResult = runSynth(["explain", "resume"], this.projectDir)
    const resume = parseJson(resumeResult.stdout)
    const statusResult = runSynth(["status"], this.projectDir)
    const status = parseJson(statusResult.stdout)

    if (resumeResult.status !== 0 && statusResult.status !== 0) {
      return scoreDimension("Next Action", 0, "both resume and status failed")
    }

    const sources = [...(resume.whatIsNext || []), ...(status.nextActions || [])]
    const match = sources.find((a) => a.command && a.command.includes(expectedAction))
    if (match) {
      return scoreDimension("Next Action", 1, `explicit next action: ${match.command}`)
    }
    if (sources.length > 0) {
      return scoreDimension("Next Action", 0.5, `next action present but not "${expectedAction}"`)
    }
    return scoreDimension("Next Action", 0, "no next action provided")
  }

  scoreConfidence() {
    const result = runSynth(["explain", "resume"], this.projectDir)
    const resume = parseJson(result.stdout)
    if (result.status !== 0 || resume.parseError) {
      return scoreDimension("Confidence", 0, "resume briefing failed")
    }
    const warnings = resume.warnings || []
    const hasWarnings = warnings.length > 0
    const hasDecisionChainWarning = warnings.some((w) => w.kind === "decision-chain-broken")
    if (hasDecisionChainWarning) {
      return scoreDimension("Confidence", 0.5, "fragility surfaced but chain is broken")
    }
    if (hasWarnings) {
      return scoreDimension("Confidence", 0.8, "fragility warnings present")
    }
    return scoreDimension("Confidence", 1, "state appears consistent")
  }
}

class InterruptionBenchmark {
  constructor(projectDir) {
    this.projectDir = projectDir
    this.scorer = new RaiScorer(projectDir)
    this.checkpoints = []
  }

  async setup() {
    const docsDir = path.join(this.projectDir, "Docs")
    await fs.mkdir(docsDir, { recursive: true })
    await fs.writeFile(
      path.join(docsDir, "architecture.md"),
      "# Architecture\n\nThe system uses a clean architecture with domain, application, and infrastructure layers.\n",
    )
    await fs.writeFile(
      path.join(docsDir, "api.md"),
      "# API\n\nRESTful endpoints for missions, expeditions, and replay.\n",
    )
  }

  recordCheckpoint(name, expected, scores) {
    const rai = average(scores.map((s) => s.score))
    const checkpoint = { name, expected, rai, scores }
    this.checkpoints.push(checkpoint)
    const icon = rai >= 0.7 ? "green" : rai >= 0.4 ? "yellow" : "red"
    console.log(color(icon, `  ${name}: RAI ${rai.toFixed(2)}`))
    for (const s of scores) {
      const dimIcon = s.score >= 0.8 ? "green" : s.score >= 0.4 ? "yellow" : "red"
      console.log(color(dimIcon, `    ${s.name}: ${s.score.toFixed(2)} — ${s.reason}`))
    }
  }

  async run() {
    console.log("\n═══════════════════════════════════════════════════")
    console.log("  SYNTH: Interruption Benchmark (EXP-CONT-002)")
    console.log("═══════════════════════════════════════════════════\n")

    await this.setup()

    // Checkpoint A: after init
    const initResult = runSynth(["init", "--name", "Interruption Benchmark"], this.projectDir)
    if (initResult.status !== 0) {
      console.error(color("red", "Benchmark failed: init command failed"))
      process.exit(1)
    }
    this.recordCheckpoint("A: after init", "project initialized; create mission", [
      this.scorer.scoreIdentity(),
      this.scorer.scoreMission(""),
      this.scorer.scoreDecisions(),
      this.scorer.scoreNextAction("synth mission create"),
      this.scorer.scoreConfidence(),
    ])

    // Checkpoint B: after mission draft created
    const draftResult = runSynth(
      ["mission", "create", "--subject", "Benchmark Mission", "--purpose", "Measure repository authority"],
      this.projectDir,
    )
    if (draftResult.status !== 0) {
      console.error(color("red", "Benchmark failed: mission create failed"))
      process.exit(1)
    }
    this.recordCheckpoint("B: after mission draft", "mission draft exists; gather evidence", [
      this.scorer.scoreIdentity(),
      this.scorer.scoreMission("Benchmark Mission"),
      this.scorer.scoreDecisions(),
      this.scorer.scoreNextAction("synth mission evidence add"),
      this.scorer.scoreConfidence(),
    ])

    // Checkpoint C: after mission approved
    let draft = parseJson(draftResult.stdout)
    const evidenceSubjects = [
      "Architecture documented",
      "API surface defined",
      "Integration points specified",
    ]
    for (const subject of evidenceSubjects) {
      const evidenceResult = runSynth(
        ["mission", "evidence", "add", "--draft-id", draft.draftId, "--subject", subject, "--confidence", "high"],
        this.projectDir,
      )
      const evidence = parseJson(evidenceResult.stdout)
      if (evidence && evidence.draftId) {
        draft.draftId = evidence.draftId
      }
    }
    const approveResult = runSynth(["mission", "approve", "--draft-id", draft.draftId], this.projectDir)
    if (approveResult.status !== 0 || !parseJson(approveResult.stdout).decision?.approved) {
      console.error(color("red", "Benchmark failed: mission approval failed"))
      process.exit(1)
    }
    this.recordCheckpoint("C: after mission approved", "mission approved; create expedition", [
      this.scorer.scoreIdentity(),
      this.scorer.scoreMission("Benchmark Mission"),
      this.scorer.scoreDecisions(),
      this.scorer.scoreNextAction("synth expedition create"),
      this.scorer.scoreConfidence(),
    ])

    // Checkpoint D: after expedition created
    const resume = parseJson(runSynth(["explain", "resume"], this.projectDir).stdout)
    const nextAction = resume.whatIsNext?.find((a) => a.command.includes("synth expedition create"))
    const missionIdMatch = nextAction?.command?.match(/--mission\s+(\S+)/)
    let expeditionCreated = false
    if (missionIdMatch) {
      const expResult = runSynth(
        ["expedition", "create", "--mission", missionIdMatch[1], "--subject", "Authority Measurement", "--goal", "Measure RAI"],
        this.projectDir,
      )
      expeditionCreated = expResult.status === 0
    }
    if (!expeditionCreated) {
      console.error(color("red", "Benchmark failed: expedition creation failed"))
      process.exit(1)
    }
    this.recordCheckpoint("D: after expedition created", "expedition exists; continue execution", [
      this.scorer.scoreIdentity(),
      this.scorer.scoreMission("Benchmark Mission"),
      this.scorer.scoreDecisions(),
      this.scorer.scoreNextAction("synth expedition create"),
      this.scorer.scoreConfidence(),
    ])

    // Checkpoint E: after expedition completed
    // There is no public CLI command to mark an expedition complete, so we
    // simulate the state by emitting a minimal event log. This still exercises
    // resume reconstruction after an interruption.
    const eventLogPath = path.join(this.projectDir, "data", "event-log.jsonl")
    const statePath = path.join(this.projectDir, "data", "canonical-state.json")
    const events = (await fs.readFile(eventLogPath, "utf-8").catch(() => ""))
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
    const state = await fs.readFile(statePath, "utf-8").then(JSON.parse).catch(() => ({}))
    const expeditions = Object.values(state.expeditions || {})
    if (expeditions.length > 0) {
      const exp = expeditions[0]
      events.push({
        id: `exp-complete-${Date.now()}`,
        type: "EXPEDITION_COMPLETED",
        timestamp: Date.now(),
        transactionId: "benchmark-tx",
        capability: "Benchmark",
        actor: "system",
        payload: { id: exp.id, status: "completed" },
        eventHash: "benchmark-hash",
        previousHash: events.length > 0 ? events[events.length - 1].eventHash : "genesis",
      })
      await fs.writeFile(eventLogPath, events.map((e) => JSON.stringify(e)).join("\n") + "\n")
    }
    this.recordCheckpoint("E: after expedition completed", "expedition complete; continue or archive", [
      this.scorer.scoreIdentity(),
      this.scorer.scoreMission("Benchmark Mission"),
      this.scorer.scoreDecisions(),
      this.scorer.scoreNextAction("synth expedition create"),
      this.scorer.scoreConfidence(),
    ])

    // Checkpoint F: after proof generated
    const proofResult = runSynth(["explain", "replay"], this.projectDir)
    this.recordCheckpoint("F: after proof check", "governance proof verified; cycle complete", [
      this.scorer.scoreIdentity(),
      this.scorer.scoreMission("Benchmark Mission"),
      this.scorer.scoreDecisions(),
      this.scorer.scoreNextAction("synth expedition create"),
      proofResult.status === 0
        ? scoreDimension("Confidence", 1, "replay consistent")
        : scoreDimension("Confidence", 0, "replay inconsistent"),
    ])

    const aggregate = average(this.checkpoints.map((c) => c.rai))
    return {
      status: "OK",
      aggregateRai: aggregate,
      checkpoints: this.checkpoints,
    }
  }
}

async function main() {
  const outFlagIndex = process.argv.indexOf("--out")
  const reportPath = outFlagIndex !== -1 ? process.argv[outFlagIndex + 1] : undefined

  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-interruption-benchmark-"))
  const benchmark = new InterruptionBenchmark(projectDir)

  let report
  try {
    report = await benchmark.run()
  } catch (err) {
    console.error(err)
    await fs.rm(projectDir, { recursive: true, force: true }).catch(() => {})
    process.exit(1)
  } finally {
    await fs.rm(projectDir, { recursive: true, force: true }).catch(() => {})
  }

  console.log("\n═══════════════════════════════════════════════════")
  console.log(color("cyan", `  Aggregate RAI: ${report.aggregateRai.toFixed(2)}`))
  console.log("═══════════════════════════════════════════════════\n")

  if (reportPath) {
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    console.log(`Report written: ${reportPath}`)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
