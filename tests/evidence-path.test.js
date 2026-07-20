// Regression guards for EXP-TRUST-003 (Evidence Path).
//
// The confidence gate must offer a legitimate path through it:
// `synth mission evidence add` creates a certified successor draft
// from the combined evidence, and every below-threshold rejection
// names the command that resolves it (TaskPRO finding N3).

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
  return fs.mkdtempSync(path.join(os.tmpdir(), "synth-evidence-"))
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
}

function initWorkspace(dir) {
  const r = runCli(dir, ["init", "--name", "Evidence Path Test"])
  assert(r.status === 0, `init should succeed: ${r.output}`)
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
  const id = r.output.match(/"draftId":\s*"([^"]+)"/)?.[1]
  const confidence = Number(r.output.match(/"overall":\s*([0-9.]+)/)?.[1])
  return { draftId: id, confidence, result: r }
}

function evidenceAdd(dir, draftId, subject, extra = []) {
  return runCli(dir, ["mission", "evidence", "add", "--draft-id", draftId, "--subject", subject, ...extra])
}

function approve(dir, draftId) {
  return runCli(dir, ["mission", "approve", "--draft-id", draftId])
}

function draftPath(dir, draftId) {
  return path.join(dir, ".synth", "data", "drafts", `${draftId}.json`)
}

function main() {
  if (!fs.existsSync(DIST_SYNTH)) {
    console.error("dist/cli/synth.js not found; run `npm run build` first.")
    process.exit(1)
  }

  // 1. N3 verbatim: the below-threshold rejection must name the evidence command.
  {
    const dir = makeWorkspace()
    initWorkspace(dir)
    try {
      const { draftId } = createDraft(dir)
      const r = approve(dir, draftId)
      assert(!r.output.includes('"approved": true'), "N3 fixture: below-threshold draft is rejected")
      assert(/mission evidence add/.test(r.output), "N3 fixture: rejection names the evidence command")
      assert(r.output.includes(draftId), "N3 fixture: rejection references the operator's draft")
    } finally {
      cleanup(dir)
    }
  }

  // 2. Happy path: evidence add certifies a successor draft with recomputed confidence.
  {
    const dir = makeWorkspace()
    initWorkspace(dir)
    try {
      const first = createDraft(dir)
      const r = evidenceAdd(dir, first.draftId, "Operator domain knowledge")
      const newId = r.output.match(/"draftId":\s*"([^"]+)"/)?.[1]
      const newConfidence = Number(r.output.match(/"overall":\s*([0-9.]+)/)?.[1])
      assert(Boolean(newId), "Evidence add: successor draft created")
      assert(newId !== first.draftId, "Evidence add: successor has a new id (drafts are immutable)")
      assert(r.output.includes(`"supersedes": "${first.draftId}"`) || r.output.includes(first.draftId), "Evidence add: names the superseded draft")
      assert(newConfidence > first.confidence, `Evidence add: confidence recomputed upward (${first.confidence} → ${newConfidence})`)
      const approval = approve(dir, newId)
      assert(!/integrity/i.test(approval.output), "Evidence add: successor draft certifies cleanly at approval")
    } finally {
      cleanup(dir)
    }
  }

  // 3. Chained successors: two evidence additions keep the integrity chain intact.
  {
    const dir = makeWorkspace()
    initWorkspace(dir)
    try {
      const first = createDraft(dir)
      const second = evidenceAdd(dir, first.draftId, "Domain knowledge")
      const secondId = second.output.match(/"draftId":\s*"([^"]+)"/)?.[1]
      const third = evidenceAdd(dir, secondId, "Operational constraints")
      const thirdId = third.output.match(/"draftId":\s*"([^"]+)"/)?.[1]
      const approval = approve(dir, thirdId)
      assert(!/integrity/i.test(approval.output), "Chained successors: integrity chain remains certifiable")
    } finally {
      cleanup(dir)
    }
  }

  // 4. A tampered source draft cannot be extended.
  {
    const dir = makeWorkspace()
    initWorkspace(dir)
    try {
      const { draftId } = createDraft(dir)
      const file = draftPath(dir, draftId)
      const draft = JSON.parse(fs.readFileSync(file, "utf8"))
      draft.confidence.overall = 0.95
      fs.writeFileSync(file, JSON.stringify(draft, null, 2))
      const r = evidenceAdd(dir, draftId, "Too late")
      assert(!/"draftId"/.test(r.output), "Tampered source: no successor produced")
      assert(/integrity violation/i.test(r.output), "Tampered source: rejection names the integrity violation")
    } finally {
      cleanup(dir)
    }
  }

  // 5. Duplicate evidence is refused prescriptively.
  {
    const dir = makeWorkspace()
    initWorkspace(dir)
    try {
      const { draftId } = createDraft(dir)
      const first = evidenceAdd(dir, draftId, "Domain knowledge")
      const firstId = first.output.match(/"draftId":\s*"([^"]+)"/)?.[1]
      const r = evidenceAdd(dir, firstId, "Domain knowledge")
      assert(/already present/i.test(r.output), "Duplicate evidence: refusal says the evidence is already present")
    } finally {
      cleanup(dir)
    }
  }

  // 6. Unknown confidence levels are refused with the valid set.
  {
    const dir = makeWorkspace()
    initWorkspace(dir)
    try {
      const { draftId } = createDraft(dir)
      const r = evidenceAdd(dir, draftId, "Domain knowledge", ["--confidence", "bogus"])
      assert(/confidence/i.test(r.output) && /high|medium|certain/.test(r.output), "Confidence flag: refusal names the valid levels")
    } finally {
      cleanup(dir)
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main()
