// Regression guards for EXP-TRUST-002 (Draft Integrity & Computed Confidence).
//
// Mission drafts are plain JSON under data/drafts/. Approval must never
// trust the editable artifact it grades: confidence is recomputed from
// the draft's evidence, and every draft carries an immutable, chained
// integrity record. Forgery (the TaskPRO chronology: overall 0.67→0.85)
// must produce a prescriptive rejection, never approval.

import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { MissionStudio } from "../dist/mission-studio/engine.js"

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const DIST_SYNTH = path.join(REPO_ROOT, "dist", "cli", "synth.js")

const TAMPER_PATTERN = /integrity (record|violation)|tamper|divergen/i

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
  return fs.mkdtempSync(path.join(os.tmpdir(), "synth-draft-"))
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
  const match = r.output.match(/"draftId":\s*"([^"]+)"/)
  return { draftId: match ? match[1] : undefined, result: r }
}

function draftPath(dir, draftId) {
  return path.join(dir, "data", "drafts", `${draftId}.json`)
}

function readDraft(dir, draftId) {
  return JSON.parse(fs.readFileSync(draftPath(dir, draftId), "utf8"))
}

function writeDraft(dir, draftId, data) {
  fs.writeFileSync(draftPath(dir, draftId), JSON.stringify(data, null, 2))
}

function approve(dir, draftId) {
  return runCli(dir, ["mission", "approve", "--draft-id", draftId])
}

function makeObservation(overrides = {}) {
  return {
    id: "obs-fixture-1",
    sourceAdapter: "fixture",
    type: "mission",
    payload: { subject: "Engine Fixture", purpose: "Prove computed confidence." },
    evidenceReference: "evidence-fixture-1",
    confidence: "high",
    timestamp: 1,
    ...overrides,
  }
}

function main() {
  if (!fs.existsSync(DIST_SYNTH)) {
    console.error("dist/cli/synth.js not found; run `npm run build` first.")
    process.exit(1)
  }

  // 1. TaskPRO forgery, verbatim: edit confidence overall upward.
  {
    const dir = makeWorkspace()
    try {
      const { draftId } = createDraft(dir)
      assert(Boolean(draftId), "Forgery fixture: draft created")
      const draft = readDraft(dir, draftId)
      draft.confidence.overall = 0.95
      writeDraft(dir, draftId, draft)
      const r = approve(dir, draftId)
      assert(!r.output.includes('"approved": true'), "Forgery fixture: forged confidence is not approved")
      assert(TAMPER_PATTERN.test(r.output), "Forgery fixture: rejection names the integrity violation")
    } finally {
      cleanup(dir)
    }
  }

  // 2. Untouched draft keeps rc.2 behavior exactly (below-threshold rejection, guard silent).
  {
    const dir = makeWorkspace()
    try {
      const { draftId } = createDraft(dir)
      const r = approve(dir, draftId)
      assert(!r.output.includes('"approved": true'), "Untouched draft: not approved (rc.2 parity)")
      assert(/threshold|confidence/i.test(r.output), "Untouched draft: rejection is the confidence gate, not integrity")
      assert(!TAMPER_PATTERN.test(r.output), "Untouched draft: integrity guard stays silent")
    } finally {
      cleanup(dir)
    }
  }

  // 3. Hand-crafted draft with no integrity record is uncertifiable.
  {
    const dir = makeWorkspace()
    try {
      const { draftId } = createDraft(dir)
      const draft = readDraft(dir, draftId)
      const forgedId = "handcrafted-forged"
      draft.id = forgedId
      draft.confidence.overall = 0.95
      writeDraft(dir, forgedId, draft)
      const r = approve(dir, forgedId)
      assert(!r.output.includes('"approved": true'), "Hand-crafted draft: not approved")
      assert(/integrity record/i.test(r.output), "Hand-crafted draft: rejection cites the missing integrity record")
    } finally {
      cleanup(dir)
    }
  }

  // 4. Editing draft inputs (not just the score) is detected.
  {
    const dir = makeWorkspace()
    try {
      const { draftId } = createDraft(dir)
      const draft = readDraft(dir, draftId)
      draft.observations[0].payload.purpose = "Rewritten after creation."
      writeDraft(dir, draftId, draft)
      const r = approve(dir, draftId)
      assert(!r.output.includes('"approved": true'), "Input edit: not approved")
      assert(TAMPER_PATTERN.test(r.output), "Input edit: rejection names the integrity violation")
    } finally {
      cleanup(dir)
    }
  }

  // 5a. Engine: approval gates on recomputed confidence, not the stored field.
  {
    const studio = new MissionStudio()
    const session = studio.startSession([makeObservation()])
    session.confidence.overall = 0.95
    const result = studio.approve(session)
    assert(!result.success, "Engine: forged stored confidence does not approve")
    assert(!String(result.error).includes("0.95"), "Engine: decision cites the recomputed score, not the forged one")
  }

  // 5b. Engine: forging confidence does not bypass blocking unknowns.
  {
    const studio = new MissionStudio()
    const session = studio.startSession([makeObservation()])
    session.unknowns.push({
      id: "unknown-blocking",
      description: "Blocking unknown injected by fixture",
      blocking: true,
      confidenceImpact: 0.3,
      status: "open",
    })
    session.confidence.overall = 0.95
    const result = studio.approve(session)
    assert(!result.success, "Engine: blocking unknown prevents approval despite forged confidence")
    assert(/unknown/i.test(String(result.error)), "Engine: rejection names the blocking unknown")
  }

  // 6. Breaking the integrity chain invalidates successors.
  {
    const dir = makeWorkspace()
    try {
      const first = createDraft(dir)
      const second = createDraft(dir)
      fs.rmSync(path.join(dir, "data", "drafts", `${first.draftId}.integrity.json`), { force: true })
      const r = approve(dir, second.draftId)
      assert(!r.output.includes('"approved": true'), "Chain break: successor draft not approved")
      assert(/integrity violation/i.test(r.output), "Chain break: rejection cites the broken integrity chain")
    } finally {
      cleanup(dir)
    }
  }

  // 7. Round-trip determinism: recomputing an untouched draft reproduces its stored score.
  {
    const studio = new MissionStudio()
    const session = studio.startSession([makeObservation()])
    const recomputed = studio.computeConfidence(session.observations, session.evidence, session.unknowns)
    assert(
      recomputed.overall === session.confidence.overall,
      "Determinism: recompute reproduces the stored score for an untouched draft",
    )
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main()
