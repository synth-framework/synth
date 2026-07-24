// Regression guards for EXP-TRUST-004 (Decision Events).
//
// Approval decisions must be durable: every approval outcome is
// persisted in an append-only, hash-chained planning-layer record
// (data/decisions.jsonl), and a draft's approval state derives
// from that record — never from the editable approvalState field.

import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { bootstrap } from "../dist/core/bootstrap.js"
import { createAlignedContract } from "./helpers/alignment-fixture.js"

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "synth-decisions-"))
  const init = runCli(dir, ["init", "--name", "Decision Events Test"])
  if (init.status !== 0) {
    throw new Error(`synth init failed in test workspace: ${init.output}`)
  }
  return dir
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
    timeout: 30000,
    encoding: "utf8",
    killSignal: "SIGKILL",
  })
  return {
    status: res.status,
    output: `${res.stdout || ""}${res.stderr || ""}`,
    timedOut: Boolean(res.error && res.error.code === "ETIMEDOUT"),
  }
}

function createDraft(dir) {
  const r = runCli(dir, ["mission", "create", "--subject", "Fixture Mission", "--purpose", "Demonstrate deterministic planning."])
  return r.output.match(/"draftId":\s*"([^"]+)"/)?.[1]
}

function evidenceAdd(dir, draftId, subject) {
  const r = runCli(dir, ["mission", "evidence", "add", "--draft-id", draftId, "--subject", subject])
  return r.output.match(/"draftId":\s*"([^"]+)"/)?.[1]
}

async function approve(dir, draftId) {
  // Phase 2 governance: Mission approval requires an aligned Alignment Contract.
  // The CLI operator workflow for creating this contract is not yet implemented,
  // so tests construct it directly through the governance capabilities.
  const dataDir = path.join(dir, ".synth", "data")
  const gateCtx = await bootstrap({
    skipGenesis: true,
    infra: {
      eventLogPath: path.join(dataDir, "event-log.jsonl"),
      statePath: path.join(dataDir, "canonical-state.json"),
    },
  })
  const { contractId } = await createAlignedContract(gateCtx)

  return runCli(dir, ["mission", "approve", "--draft-id", draftId, "--alignment-contract-id", contractId])
}

function readDecisions(dir) {
  const file = path.join(dir, ".synth", "data", "decisions.jsonl")
  try {
    return fs
      .readFileSync(file, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  } catch {
    return []
  }
}

async function main() {
  if (!fs.existsSync(DIST_SYNTH)) {
    console.error("dist/cli/synth.js not found; run `npm run build` first.")
    process.exit(1)
  }

  // 1. N9 verbatim: a rejection must survive the shell.
  {
    const dir = makeWorkspace()
    try {
      const draftId = createDraft(dir)
      const r = await approve(dir, draftId)
      assert(!r.output.includes('"approved": true'), "N9 fixture: below-threshold draft is rejected")
      const decisions = readDecisions(dir)
      const rejection = decisions.find((d) => d.type === "MISSION_APPROVAL_REJECTED" && d.draftId === draftId)
      assert(Boolean(rejection), "N9 fixture: the rejection is persisted in the decision record")
      assert(typeof rejection?.confidence === "number" && rejection.confidence < 0.7, "N9 fixture: persisted confidence is the computed value")
      assert(/threshold/i.test(String(rejection?.reason)), "N9 fixture: persisted reason names the confidence gate")
    } finally {
      cleanup(dir)
    }
  }

  // 2. Approvals are persisted too, with the computed confidence.
  {
    const dir = makeWorkspace()
    try {
      let draftId = createDraft(dir)
      draftId = evidenceAdd(dir, draftId, "Operator domain knowledge")
      draftId = evidenceAdd(dir, draftId, "Operational constraints")
      const r = await approve(dir, draftId)
      assert(r.output.includes('"approved": true'), "Approval fixture: sufficiently evidenced draft approves")
      const decisions = readDecisions(dir)
      const approval = decisions.find((d) => d.type === "MISSION_APPROVAL_APPROVED" && d.draftId === draftId)
      assert(Boolean(approval), "Approval fixture: the approval is persisted in the decision record")
      assert(typeof approval?.confidence === "number" && approval.confidence >= 0.7, "Approval fixture: persisted confidence is the computed value")
    } finally {
      cleanup(dir)
    }
  }

  // 3. Integrity rejections are persisted.
  {
    const dir = makeWorkspace()
    try {
      const draftId = createDraft(dir)
      const file = path.join(dir, ".synth", "data", "drafts", `${draftId}.json`)
      const draft = JSON.parse(fs.readFileSync(file, "utf8"))
      draft.confidence.overall = 0.95
      fs.writeFileSync(file, JSON.stringify(draft, null, 2))
      await approve(dir, draftId)
      const decisions = readDecisions(dir)
      const rejection = decisions.find((d) => d.type === "MISSION_DRAFT_INTEGRITY_REJECTED" && d.draftId === draftId)
      assert(Boolean(rejection), "Integrity fixture: the integrity rejection is persisted")
    } finally {
      cleanup(dir)
    }
  }

  // 4. Re-approval is idempotent and prescriptive — never a duplicate snapshot.
  {
    const dir = makeWorkspace()
    try {
      let draftId = createDraft(dir)
      draftId = evidenceAdd(dir, draftId, "Operator domain knowledge")
      draftId = evidenceAdd(dir, draftId, "Operational constraints")
      await approve(dir, draftId)
      const second = await approve(dir, draftId)
      assert(/already approved/i.test(second.output), "Idempotency: re-approval says the draft is already approved")
      const approvals = readDecisions(dir).filter((d) => d.type === "MISSION_APPROVAL_APPROVED" && d.draftId === draftId)
      assert(approvals.length === 1, `Idempotency: exactly one approval decision recorded (found ${approvals.length})`)
    } finally {
      cleanup(dir)
    }
  }

  // 5. The editable approvalState field is never consulted.
  {
    const dir = makeWorkspace()
    try {
      const draftId = createDraft(dir)
      const file = path.join(dir, ".synth", "data", "drafts", `${draftId}.json`)
      const draft = JSON.parse(fs.readFileSync(file, "utf8"))
      draft.approvalState = "approved"
      fs.writeFileSync(file, JSON.stringify(draft, null, 2))
      const r = await approve(dir, draftId)
      assert(!/already approved/i.test(r.output), "Field forgery: approvalState in the draft is ignored")
      assert(!r.output.includes('"approved": true'), "Field forgery: no approval from an editable field")
    } finally {
      cleanup(dir)
    }
  }

  // 6. The decisions read surface lists and filters.
  {
    const dir = makeWorkspace()
    try {
      const first = createDraft(dir)
      await approve(dir, first)
      const second = createDraft(dir)
      await approve(dir, second)
      const all = runCli(dir, ["mission", "decisions"])
      assert((all.output.match(/MISSION_APPROVAL_REJECTED/g) || []).length >= 2, "Read surface: lists every recorded decision")
      const filtered = runCli(dir, ["mission", "decisions", "--draft-id", first])
      assert(filtered.output.includes(first), "Read surface: filtered output names the draft")
      assert(!filtered.output.includes(second), "Read surface: filter excludes other drafts")
    } finally {
      cleanup(dir)
    }
  }

  // 7. A broken chain is detected loudly.
  {
    const dir = makeWorkspace()
    try {
      const first = createDraft(dir)
      await approve(dir, first)
      const second = createDraft(dir)
      await approve(dir, second)
      const file = path.join(dir, ".synth", "data", "decisions.jsonl")
      const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean)
      fs.writeFileSync(file, [...lines.slice(1), ""].join("\n"))
      const r = runCli(dir, ["mission", "decisions"])
      assert(r.status !== 0, "Chain break: decisions command fails")
      assert(/chain/i.test(r.output), "Chain break: failure names the broken chain")
    } finally {
      cleanup(dir)
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
