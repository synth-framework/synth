// ============================================================
// First Operator Experience Certification
// ============================================================
// Certifies that a first-time operator can complete the full
// install → initialize → discover → govern workflow through the
// public CLI without prior repository knowledge.
//
// This is the final implementation expedition test (EXP-INSTALL-012).
// It produces evidence for Program 042 — Release Certification.
// ============================================================

import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const DIST_SYNTH = path.join(REPO_ROOT, "dist", "cli", "synth.js")

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    passed++
    console.log(`✓ ${message}`)
  } else {
    failed++
    console.error(`✗ ${message}`)
  }
}

function makeWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "synth-first-operator-"))
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
}

function runCli(dir, args) {
  const env = { ...process.env }
  delete env.SYNTH_GOVERN_DEPTH
  const res = spawnSync(process.execPath, [DIST_SYNTH, ...args], {
    cwd: dir,
    env,
    timeout: 60000,
    encoding: "utf8",
    killSignal: "SIGKILL",
  })
  let stdout = res.stdout || ""
  let stderr = res.stderr || ""
  // Bootstrap logs are written to stderr; structured JSON responses are on
  // stdout. We expose both but provide a helper that parses only stdout.
  return {
    status: res.status,
    stdout,
    stderr,
    output: `${stdout}${stderr}`,
    timedOut: Boolean(res.error && res.error.code === "ETIMEDOUT"),
  }
}

function parseResponse(r) {
  // Bootstrap logs are emitted on stderr. Structured command responses are
  // emitted on stdout, often as multi-line JSON. We only parse stdout, and we
  // look for the largest valid JSON value starting from the beginning of the
  // stdout stream.
  const text = r.stdout.trim()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    /* fall through to partial parsing */
  }

  // Try each candidate JSON object starting at a '{'.
  const starts = []
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") starts.push(i)
  }
  // Prefer the earliest start that yields valid JSON (usually the response).
  for (const start of starts) {
    for (let end = text.length; end > start; end--) {
      if (text[end - 1] !== "}") continue
      const candidate = text.slice(start, end)
      try {
        return JSON.parse(candidate)
      } catch {
        /* continue shrinking */
      }
    }
  }

  return null
}

function requireResponse(r, label) {
  const parsed = parseResponse(r)
  assert(parsed !== null, `${label} produces parseable JSON output`)
  return parsed
}

// ============================================================
// Phase 1 — Installation
// ============================================================
function testVersionAndDoctor() {
  const dir = makeWorkspace()
  try {
    const version = runCli(dir, ["--version"])
    const versionBody = parseResponse(version)
    assert(version.status === 0, "synth --version exits 0")
    assert(versionBody?.status === "ok", "synth --version returns status ok")
    assert(typeof versionBody?.version === "string", "synth --version returns a version string")

    const doctor = runCli(dir, ["doctor"])
    const doctorBody = parseResponse(doctor)
    assert(doctor.status === 0, "synth doctor exits 0 in a clean workspace")
    assert(doctorBody?.status === "warning", "synth doctor reports warning before init (no manifest)")
    assert(doctorBody?.healthy === false, "synth doctor reports healthy=false before init")
    assert(doctorBody?.runtimeHealth?.binary?.ok === true, "synth doctor binary check passes")
    assert(doctorBody?.runtimeHealth?.node?.ok === true, "synth doctor node check passes")
    assert(doctorBody?.projectHealth?.manifest?.ok === false, "synth doctor manifest check fails before init")
    assert(Array.isArray(doctorBody?.nextSteps), "synth doctor provides nextSteps")
    assert(
      doctorBody.nextSteps.some((s) => typeof s === "string" && s.includes("synth init")),
      "synth doctor nextSteps guides operator to init",
    )
    assert(
      doctorBody.checks?.manifest?.nextStep?.includes("synth init"),
      "synth doctor manifest check names the init command",
    )
  } finally {
    cleanup(dir)
  }
}

// ============================================================
// Phase 2 — First Contact
// ============================================================
function testInitProvidesNextSteps() {
  const dir = makeWorkspace()
  try {
    const init = runCli(dir, ["init", "--name", "First Operator Test"])
    const initBody = parseResponse(init)
    assert(init.status === 0, "synth init exits 0")
    assert(initBody?.status === "ok", "synth init returns status ok")
    assert(initBody?.lifecycle === "initialized", "synth init reports lifecycle initialized")
    assert(fs.existsSync(path.join(dir, ".synth", "manifest.json")), "synth init creates manifest")
    assert(fs.existsSync(path.join(dir, ".synth", "data")), "synth init creates data directory")
    assert(Array.isArray(initBody?.nextSteps), "synth init provides nextSteps")
    assert(
      initBody.nextSteps.some((s) => s.includes("synth mission create")),
      "synth init nextSteps guides operator to mission create",
    )

    const doctorAfterInit = runCli(dir, ["doctor"])
    const doctorBody = parseResponse(doctorAfterInit)
    assert(doctorAfterInit.status === 0, "synth doctor exits 0 after init")
    assert(doctorBody?.status === "ok", "synth doctor reports ok after init")
    assert(doctorBody?.healthy === true, "synth doctor reports healthy=true after init")
    assert(doctorBody?.projectHealth?.manifest?.ok === true, "synth doctor manifest check passes after init")
  } finally {
    cleanup(dir)
  }
}

// ============================================================
// Phase 3 — Brownfield Discovery
// ============================================================
function testDiscoveryIsReadOnlyAndInformative() {
  const dir = makeWorkspace()
  try {
    runCli(dir, ["init", "--name", "Discovery Test"])

    const discover = runCli(dir, ["discover"])
    const discoverBody = parseResponse(discover)
    assert(discover.status === 0, "synth discover exits 0")
    assert(discoverBody?.status === "ok", "synth discover returns status ok")
    assert(discoverBody?.kind === "DiscoveryResult", "synth discover returns DiscoveryResult")
    assert(discoverBody?.exported === false, "synth discover default mode does not export")
    assert(typeof discoverBody?.repositoryType === "string", "synth discover reports repositoryType")
    assert(discoverBody?.analysis?.observationCount >= 0, "synth discover reports observationCount")
    assert(discoverBody?.agentContext?.repositoryType === "greenfield", "synth discover classifies empty repo as greenfield")

    // Verify read-only: no new files appear after default discover.
    const filesBefore = fs.readdirSync(dir)
    runCli(dir, ["discover"])
    const filesAfter = fs.readdirSync(dir)
    assert(filesBefore.length === filesAfter.length, "synth discover default mode writes no files")
  } finally {
    cleanup(dir)
  }
}

// ============================================================
// Phase 4 — First Mission
// ============================================================
function testFirstMissionEndToEnd() {
  const dir = makeWorkspace()
  try {
    runCli(dir, ["init", "--name", "First Mission Test"])

    const create = runCli(dir, [
      "mission",
      "create",
      "--subject",
      "First Governed Mission",
      "--purpose",
      "Certify the first operator experience end-to-end.",
    ])
    const createBody = parseResponse(create)
    assert(create.status === 0, "synth mission create exits 0")
    assert(createBody?.status === "ok", "synth mission create returns status ok")
    assert(createBody?.kind === "MissionDraft", "synth mission create returns MissionDraft")
    const draftId = createBody?.draftId
    assert(typeof draftId === "string" && draftId.length > 0, "synth mission create returns a draftId")
    assert(
      createBody?.nextStep?.includes("synth mission approve") || createBody?.nextStep?.includes("synth mission evidence"),
      "synth mission create guides operator to the next governance step",
    )

    const align = runCli(dir, ["alignment", "prepare"])
    const alignBody = parseResponse(align)
    assert(align.status === 0, "synth alignment prepare exits 0")
    assert(alignBody?.status === "ok", "synth alignment prepare returns status ok")
    const contractId = alignBody?.contractId
    assert(typeof contractId === "string" && contractId.length > 0, "synth alignment prepare returns a contractId")

    // Add evidence until confidence crosses the approval threshold.
    let currentDraftId = draftId
    let attempts = 0
    let approvalBody = null
    while (attempts < 5) {
      const approve = runCli(dir, [
        "mission",
        "approve",
        "--draft-id",
        currentDraftId,
        "--alignment-contract-id",
        contractId,
      ])
      approvalBody = parseResponse(approve)

      // Approval succeeds.
      if (approve.status === 0 && approvalBody?.status === "ok" && approvalBody?.runtime?.approved) {
        assert(approvalBody?.runtime?.missionId, "synth mission approve returns a runtime missionId")
        break
      }

      // Approval blocked by low confidence — follow the CLI guidance and add evidence.
      const nextStep = approvalBody?.nextStep || ""
      if (nextStep.includes("mission evidence add")) {
        const evidence = runCli(dir, [
          "mission",
          "evidence",
          "add",
          "--draft-id",
          currentDraftId,
          "--subject",
          `Evidence ${attempts + 1}`,
          "--purpose",
          "Supporting the first governed mission",
          "--confidence",
          "high",
        ])
        const evidenceBody = parseResponse(evidence)
        assert(evidence.status === 0, "synth mission evidence add exits 0")
        assert(evidenceBody?.status === "ok", "synth mission evidence add returns status ok")
        assert(evidenceBody?.draftId !== currentDraftId, "synth mission evidence add creates a successor draft")
        currentDraftId = evidenceBody?.draftId
        assert(typeof currentDraftId === "string", "successor draft has a draftId")
      } else {
        assert(false, `synth mission approve blocked unexpectedly: ${approvalBody?.error || approvalBody?.nextStep}`)
        break
      }
      attempts++
    }

    assert(attempts < 5, `approval succeeded within evidence attempt limit (attempts: ${attempts + 1})`)

    const status = runCli(dir, ["status"])
    const statusBody = parseResponse(status)
    assert(status.status === 0, "synth status exits 0 after approved mission")
    assert(statusBody?.status === "ok", "synth status returns status ok")
    assert(statusBody?.phase === "approved", "synth status reports phase approved")
    assert(statusBody?.missions?.length === 1, "synth status lists one approved mission")
    assert(statusBody?.missions[0]?.status === "active", "approved mission status is active")
    assert(Array.isArray(statusBody?.nextActions), "synth status provides nextActions after approval")
    assert(
      statusBody?.nextActions?.some((a) => a.command?.includes("synth expedition create")),
      "synth status guides operator to create an expedition",
    )
    assert(statusBody?.blockers?.length === 0, "synth status reports no blockers after approval")
  } finally {
    cleanup(dir)
  }
}

// ============================================================
// Phase 5 — Recovery
// ============================================================
function testRecoveryPathsGuideTheOperator() {
  const dir = makeWorkspace()
  try {
    runCli(dir, ["init", "--name", "Recovery Test"])

    // Missing required flag.
    const missingSubject = runCli(dir, ["mission", "create"])
    assert(missingSubject.status !== 0, "synth mission create without --subject exits non-zero")
    assert(
      missingSubject.output.includes("--subject") || missingSubject.output.includes("required"),
      "missing --subject error names the required flag",
    )

    // Approve before alignment contract exists.
    const create = runCli(dir, ["mission", "create", "--subject", "Recovery Mission", "--purpose", "Test recovery."])
    const createBody = parseResponse(create)
    const draftId = createBody?.draftId
    const noContract = runCli(dir, ["mission", "approve", "--draft-id", draftId])
    const noContractBody = parseResponse(noContract)
    assert(noContract.status !== 0, "synth mission approve without alignment contract exits non-zero")
    assert(noContractBody?.status === "error", "approval without contract returns status error")
    assert(
      noContractBody?.kind === "LifecycleBlocked" || noContractBody?.code === "LifecycleBlocked" ||
      noContractBody?.kind === "MissingAlignmentContractId" || noContractBody?.code === "MissingAlignmentContractId",
      "approval without contract returns LifecycleBlocked or MissingAlignmentContractId error kind",
    )
    assert(
      (noContractBody?.suggestion || "").toLowerCase().includes("alignment contract") ||
        (noContractBody?.requiredAction || "").toLowerCase().includes("alignment contract"),
      "approval without contract guides operator to create an Alignment Contract",
    )

    // Invalid draft id.
    const invalidDraft = runCli(dir, ["mission", "approve", "--draft-id", "nonexistent"])
    assert(invalidDraft.status !== 0, "synth mission approve with invalid draft exits non-zero")
    // The error may be about missing alignment contract first, or about draft not found
    assert(
      invalidDraft.output.includes("Draft not found") ||
      invalidDraft.output.includes("not found") ||
      invalidDraft.output.includes("Alignment Contract") ||
      invalidDraft.output.includes("alignment-contract-id"),
      "invalid draft error names the problem or requires alignment contract"
    )

    // Discovery remains safe in an uninitialized directory (no manifest).
    const freshDir = makeWorkspace()
    try {
      const discover = runCli(freshDir, ["discover"])
      assert(discover.status === 0, "synth discover succeeds without init (read-only)")
    } finally {
      cleanup(freshDir)
    }
  } finally {
    cleanup(dir)
  }
}

function testDoctorGuidesThroughFailures() {
  const dir = makeWorkspace()
  try {
    const doctor = runCli(dir, ["doctor"])
    const body = parseResponse(doctor)
    assert(body?.status === "warning", "doctor reports warning in uninitialized directory")
    assert(body?.projectHealth?.manifest?.ok === false, "manifest check fails")
    assert(typeof body?.projectHealth?.manifest?.nextStep === "string", "manifest check includes nextStep")
    assert(body?.projectHealth?.manifest?.nextStep.includes("synth init"), "manifest check guides operator to init")
  } finally {
    cleanup(dir)
  }
}

// ============================================================
// Entry point
// ============================================================
function main() {
  if (!fs.existsSync(DIST_SYNTH)) {
    console.error("dist/cli/synth.js not found; run `npm run build` first.")
    process.exit(1)
  }

  console.log("Phase 1 — Installation")
  testVersionAndDoctor()

  console.log("\nPhase 2 — First Contact")
  testInitProvidesNextSteps()

  console.log("\nPhase 3 — Brownfield Discovery")
  testDiscoveryIsReadOnlyAndInformative()

  console.log("\nPhase 4 — First Mission")
  testFirstMissionEndToEnd()

  console.log("\nPhase 5 — Recovery")
  testRecoveryPathsGuideTheOperator()
  testDoctorGuidesThroughFailures()

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main()
