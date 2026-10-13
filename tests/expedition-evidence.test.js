import { makeTempDirSync } from "./helpers/workspace.js"
// ============================================================
// EXP-EVIDENCE-001 — Automatic Expedition Evidence Capture
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "node:fs"
import os from "os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { runSynth, parseJson, readEventLog } from "./helpers/cli-harness.js"
import { seedEventLog } from "./helpers/seed-event-log.js"
import { seedEvent, seedGenesisEvents } from "./helpers/kernel-event-fixtures.js"
import { runGit } from "./helpers/workspace.js"


function makeTempProjectRoot() {
  return fs.realpathSync.native(makeTempDirSync("evidence-test-"))
}

/** Fresh project with seeded events + committed tracked.txt. */
async function setupTrackedProject() {
  const dir = makeTempProjectRoot()
  await seedEvents(dir)
  initGitIdentity(dir)
  fs.writeFileSync(path.join(dir, "tracked.txt"), "content")
  spawnSync("git", ["add", "."], { cwd: dir })
  spawnSync("git", ["commit", "-m", "initial"], { cwd: dir })
  return dir
}

/** Attach --git-diff evidence and return the parsed output. */
function attachGitDiff(dir) {
  const result = runSynth(["expedition", "evidence", "--id", "e1", "--git-diff"], dir)
  assert.strictEqual(result.status, 0, result.stderr)
  const output = parseJson(result.stdout)
  assert.strictEqual(output.kind, "EvidenceAttached")
  return output
}
/** Init a git repo with test identity (add/commit stay at call sites). */
function initGitIdentity(dir) {
  runGit(["init"], dir)
  runGit(["config", "user.email", "test@test.com"], dir)
  runGit(["config", "user.name", "Test"], dir)
}

async function seedEvents(projectRoot, opts = {}) {
  const dataDir = path.join(projectRoot, ".synth", "data")
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(path.join(projectRoot, ".synth", "manifest.json"), "{}\n")

  const events = [
    ...seedGenesisEvents("Evidence Test", "evidence-test"),
    seedEvent("evt-3", "MISSION_CREATED", 3,
      {
        mission: {
          id: "m1",
          name: "Mission m1",
          purpose: "test",
          status: "active",
          expeditions: [],
          metadata: {},
          createdAt: 3,
          updatedAt: 3,
        },
      }),
    seedEvent("evt-4", "EXPEDITION_CREATED", 4,
      {
        expedition: {
          id: "e1",
          missionId: "m1",
          name: "Evidence Expedition",
          goal: "capture evidence",
          status: "executing",
          objectives: [],
          discoveries: [],
          decisions: [],
          dependsOn: [],
          metadata: opts.baselineCommit ? { baselineCommit: opts.baselineCommit } : {},
          createdAt: 4,
          updatedAt: 4,
        },
      }),
  ]

  await seedEventLog(projectRoot, events)
}



test("expedition evidence --git-diff captures patch and appends EVIDENCE_ATTACHED", { concurrency: false }, async () => {
  const dir = makeTempProjectRoot()
  await seedEvents(dir)
  fs.writeFileSync(path.join(dir, "tracked.txt"), "change")
  initGitIdentity(dir)
  runGit(["add", "."], dir)
  runGit(["commit", "-m", "initial"], dir)
  fs.writeFileSync(path.join(dir, "tracked.txt"), "changed")

  const result = runSynth(["expedition", "evidence", "--id", "e1", "--git-diff", "--note", "git diff capture"], dir)
  assert.strictEqual(result.status, 0, result.stderr)
  const output = parseJson(result.stdout)
  assert.strictEqual(output.kind, "EvidenceAttached")
  assert.strictEqual(output.expeditionId, "e1")

  const patchPath = path.join(dir, "proof", "expeditions", "e1", "git-diff.patch")
  assert.ok(fs.existsSync(patchPath), "git-diff.patch should exist")
  const patchContent = fs.readFileSync(patchPath, "utf-8")
  assert.ok(patchContent.includes("changed"), "patch should contain diff")

  const manifestPath = path.join(dir, "proof", "expeditions", "e1", "manifest.json")
  assert.ok(fs.existsSync(manifestPath), "manifest.json should exist")
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"))
  assert.strictEqual(manifest.expeditionId, "e1")
  assert.strictEqual(manifest.note, "git diff capture")
  assert.strictEqual(manifest.attachments.length, 1)
  assert.strictEqual(manifest.attachments[0].kind, "git-diff")

  const events = await readEventLog(dir)
  const evidenceEvent = events.find((e) => e.type === "EVIDENCE_ATTACHED")
  assert.ok(evidenceEvent, "EVIDENCE_ATTACHED event should be appended")
  assert.strictEqual(evidenceEvent.payload.expeditionId, "e1")
  assert.strictEqual(evidenceEvent.payload.attachments[0].kind, "git-diff")
})

test("expedition evidence --attach copies explicit files", { concurrency: false }, async () => {
  const dir = makeTempProjectRoot()
  await seedEvents(dir)
  fs.writeFileSync(path.join(dir, "artifact.txt"), "artifact content")

  const result = runSynth(["expedition", "evidence", "--id", "e1", "--attach", "artifact.txt"], dir)
  assert.strictEqual(result.status, 0, result.stderr)

  const attachedPath = path.join(dir, "proof", "expeditions", "e1", "attachments", "artifact.txt")
  assert.ok(fs.existsSync(attachedPath), "attached file should be copied")
  assert.strictEqual(fs.readFileSync(attachedPath, "utf-8"), "artifact content")
})

test("expedition evidence is idempotent across repeated invocations", { concurrency: false }, async () => {
  const dir = makeTempProjectRoot()
  await seedEvents(dir)
  fs.writeFileSync(path.join(dir, "a.txt"), "a")

  const first = runSynth(["expedition", "evidence", "--id", "e1", "--attach", "a.txt"], dir)
  const second = runSynth(["expedition", "evidence", "--id", "e1", "--attach", "a.txt"], dir)
  assert.strictEqual(first.status, 0, first.stderr)
  assert.strictEqual(second.status, 0, second.stderr)

  const events = await readEventLog(dir)
  const evidenceEvents = events.filter((e) => e.type === "EVIDENCE_ATTACHED")
  assert.strictEqual(evidenceEvents.length, 2, "each invocation should append an event")

  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "proof", "expeditions", "e1", "manifest.json"), "utf-8"))
  assert.strictEqual(manifest.attachments.length, 1, "the manifest should mirror runtime attachment de-duplication")
})

test("expedition evidence manifest accumulates distinct attachments across invocations", { concurrency: false }, async () => {
  const dir = makeTempProjectRoot()
  await seedEvents(dir)
  fs.writeFileSync(path.join(dir, "first.txt"), "first")
  fs.writeFileSync(path.join(dir, "second.txt"), "second")

  const first = runSynth(["expedition", "evidence", "--id", "e1", "--attach", "first.txt", "--note", "first capture"], dir)
  const second = runSynth(["expedition", "evidence", "--id", "e1", "--attach", "second.txt", "--note", "second capture"], dir)
  assert.strictEqual(first.status, 0, first.stderr)
  assert.strictEqual(second.status, 0, second.stderr)

  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "proof", "expeditions", "e1", "manifest.json"), "utf-8"))
  assert.strictEqual(manifest.expeditionId, "e1")
  assert.strictEqual(manifest.note, "second capture", "the manifest should retain the latest capture note")
  assert.deepStrictEqual(
    manifest.attachments.map((attachment) => path.basename(attachment.path)).sort(),
    ["first.txt", "second.txt"],
    "manifest must retain attachments captured by both invocations",
  )
})

test("expedition evidence --git-diff falls back to baseline..HEAD when working tree is clean", { concurrency: false }, async () => {
  const dir = makeTempProjectRoot()
  await seedEvents(dir)
  fs.writeFileSync(path.join(dir, "tracked.txt"), "initial")
  initGitIdentity(dir)
  spawnSync("git", ["add", "."], { cwd: dir })
  spawnSync("git", ["commit", "-m", "initial"], { cwd: dir })

  fs.writeFileSync(path.join(dir, "tracked.txt"), "committed change")
  spawnSync("git", ["add", "."], { cwd: dir })
  spawnSync("git", ["commit", "-m", "change"], { cwd: dir })

  const initialCommit = runGit(["rev-parse", "HEAD~1"], dir)

  const result = runSynth(["expedition", "evidence", "--id", "e1", "--git-diff", "--baseline", initialCommit], dir)
  assert.strictEqual(result.status, 0, result.stderr)
  const output = parseJson(result.stdout)
  assert.strictEqual(output.kind, "EvidenceAttached")
  assert.ok(Array.isArray(output.warnings), "should include warnings")
  assert.ok(output.warnings.some((w) => String(w).includes("baseline")), "should warn about baseline fallback")

  const patchPath = path.join(dir, "proof", "expeditions", "e1", "git-diff.patch")
  const patchContent = fs.readFileSync(patchPath, "utf-8")
  assert.ok(patchContent.includes("committed change"), "patch should contain committed change via baseline fallback")
})

test("expedition evidence --git-diff warns when patch is empty", { concurrency: false }, async () => {
  const dir = await setupTrackedProject()

  const output = attachGitDiff(dir)
  assert.ok(Array.isArray(output.warnings), "should include warnings")
  assert.ok(output.warnings.some((w) => String(w).includes("empty")), "should warn about empty patch")
})

test("expedition evidence --git-diff captures untracked source files and restores the index", { concurrency: false }, async () => {
  const dir = await setupTrackedProject()
  fs.writeFileSync(path.join(dir, "new-source.ts"), "const brandNew = true\n")
  fs.writeFileSync(path.join(dir, ".synth", "data", "canonical-state.json"), "derived")

  const output = attachGitDiff(dir)

  const patchPath = path.join(dir, "proof", "expeditions", "e1", "git-diff.patch")
  assert.ok(fs.existsSync(patchPath), "git-diff.patch should exist")
  const patchContent = fs.readFileSync(patchPath, "utf-8")
  assert.ok(patchContent.includes("new-source.ts"), "patch should include untracked source file")
  assert.ok(patchContent.includes("brandNew"), "patch should include untracked file content")
  assert.ok(!patchContent.includes("canonical-state"), "patch should exclude derived state")

  const porcelain = runGit(["status", "--porcelain"], dir)
  assert.ok(porcelain.includes("?? new-source.ts"), "untracked file should remain untracked after capture")
  assert.ok(!porcelain.includes("A  new-source.ts"), "intent-to-add entry should be restored")
  assert.ok(!(output.warnings || []).some((w) => String(w).includes("empty")), "patch should not be empty")
})

