#!/usr/bin/env node
// ============================================================
// EXP-GIT-001 — Governance Git Snapshot Tests
// ============================================================
// Verifies that SYNTH git snapshots anchor governance state to the
// repository via commits and tags, and that expedition completion
// automatically records snapshot events.
//
// Run: node tests/governance-git-snapshot.test.js
// ============================================================

import { test, describe } from "node:test"
import assert from "node:assert"
import fs from "fs/promises"
import path from "path"
import os from "os"
import { execSync } from "child_process"
import { runSynth, parseJson, writeEventLog } from "./helpers/cli-harness.js"

const TEST_TIMEOUT = 60000

function git(cwd, args) {
  return execSync(`git ${args.join(" ")}`, { cwd, encoding: "utf-8" }).trim()
}

async function createTempProject() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-git-snapshot-"))
  await fs.writeFile(path.join(dir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }), "utf-8")
  const bootstrapResult = runSynth(["bootstrap", dir, "--approve"], process.cwd())
  assert.strictEqual(bootstrapResult.status, 0, `bootstrap must succeed: ${bootstrapResult.stderr}`)

  git(dir, ["init"])
  git(dir, ["config", "user.email", "test@example.com"])
  git(dir, ["config", "user.name", "Test User"])
  git(dir, ["add", "-A"])
  git(dir, ["commit", "-m", "initial"])
  return dir
}

async function cleanup(dir) {
  await fs.rm(dir, { recursive: true, force: true })
}

async function writePolicyFile(dir, name, content) {
  const policyDir = path.join(dir, ".synth", "policy")
  await fs.mkdir(policyDir, { recursive: true })
  await fs.writeFile(path.join(policyDir, name), content, "utf-8")
}

async function readEventLog(dir) {
  const logPath = path.join(dir, ".synth", "data", "event-log.jsonl")
  try {
    const raw = await fs.readFile(logPath, "utf-8")
    return raw.split("\n").filter(Boolean).map(JSON.parse)
  } catch {
    return []
  }
}

async function makeExecutingExpedition(dir, expeditionId = "EXP-GIT-001-TEST") {
  const missionId = "M-GIT-001-TEST"
  const events = await readEventLog(dir)
  const ts = Date.now()
  const base = events.length > 0 ? events[events.length - 1].eventHash : "genesis"
  await writeEventLog(dir, [
    ...events,
    {
      id: "evt-mission-created",
      type: "MISSION_CREATED",
      timestamp: ts,
      transactionId: "tx-test-1",
      capability: "MissionStudio",
      actor: "test",
      payload: {
        mission: {
          id: missionId,
          name: "Git Snapshot Mission",
          purpose: "Test expedition completion snapshot",
          status: "active",
          expeditions: [expeditionId],
          metadata: {},
          createdAt: ts,
          updatedAt: ts,
        },
      },
    },
    {
      id: "evt-expedition-created",
      type: "EXPEDITION_CREATED",
      timestamp: ts + 1,
      transactionId: "tx-test-2",
      capability: "MissionStudio",
      actor: "test",
      payload: {
        expedition: {
          id: expeditionId,
          missionId,
          name: "Git Snapshot Expedition",
          goal: "Verify auto tagging on completion",
          status: "executing",
          objectives: [],
          discoveries: [],
          decisions: [],
          dependsOn: [],
          metadata: {},
          createdAt: ts + 1,
          updatedAt: ts + 1,
        },
      },
    },
    {
      id: "evt-expedition-started",
      type: "EXPEDITION_STARTED",
      timestamp: ts + 2,
      transactionId: "tx-test-3",
      capability: "MissionStudio",
      actor: "test",
      payload: { id: expeditionId },
    },
    {
      id: "evt-convergence-certified",
      type: "CONVERGENCE_CERTIFIED",
      timestamp: ts + 3,
      transactionId: "tx-test-4",
      capability: "CertifyConvergence",
      actor: "test",
      payload: {
        certificationId: `convergence-certification-${expeditionId}`,
        missionId,
        expeditionId,
        alignmentContractId: "alignment-contract-test",
        decision: "converged",
        confidence: 1,
        certifier: { kind: "engine", id: "convergence-certification" },
      },
    },
  ])
  return expeditionId
}

describe("EXP-GIT-001 governance git snapshots", { concurrency: false }, () => {

test("snapshot create commits governance files with custom message", { timeout: TEST_TIMEOUT }, async () => {
  const dir = await createTempProject()
  try {
    await writePolicyFile(dir, "snapshot-policy.yaml", "git:\n  snapshotPolicy: tag-only\n")

    const result = runSynth(["snapshot", "create", "--message", "Manual governance snapshot"], dir)
    assert.strictEqual(result.status, 0, `snapshot create must succeed: ${result.stderr}`)
    const output = parseJson(result.stdout)
    assert.strictEqual(output.kind, "GovernanceSnapshotCreated")
    assert.ok(output.tagName, "snapshot should produce a tag")

    const log = git(dir, ["log", "--oneline", "-1"])
    assert.ok(log.includes("Manual governance snapshot"), `commit message should match: ${log}`)

    const committedFiles = git(dir, ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"])
    assert.ok(
      committedFiles.includes(".synth/policy/snapshot-policy.yaml"),
      `governance file should be committed, got: ${committedFiles}`,
    )
  } finally {
    await cleanup(dir)
  }
})

test("expedition completion creates synth-expedition/<id> tag when autoTagOnComplete is enabled", { timeout: TEST_TIMEOUT }, async () => {
  const dir = await createTempProject()
  try {
    const expeditionId = await makeExecutingExpedition(dir)

    const completeResult = runSynth(
      ["expedition", "complete", "--id", expeditionId, "--force", "--reason", "test snapshot tagging"],
      dir,
    )
    assert.strictEqual(completeResult.status, 0, `expedition complete must succeed: ${completeResult.stderr}`)
    const completeOutput = parseJson(completeResult.stdout)
    assert.strictEqual(completeOutput.kind, "ExpeditionCompleted")

    const tags = git(dir, ["tag", "-l", `synth-expedition/${expeditionId}`])
    assert.strictEqual(tags, `synth-expedition/${expeditionId}`, "expedition completion tag should exist")
  } finally {
    await cleanup(dir)
  }
})

test("snapshot create is blocked by uncommitted source changes", { timeout: TEST_TIMEOUT }, async () => {
  const dir = await createTempProject()
  try {
    await writePolicyFile(dir, "snapshot-policy.yaml", "git:\n  snapshotPolicy: tag-only\n")
    await fs.mkdir(path.join(dir, "src"), { recursive: true })
    await fs.writeFile(path.join(dir, "src", "uncommitted.ts"), "export const x = 1\n", "utf-8")

    const result = runSynth(["snapshot", "create", "--message", "Should fail"], dir)
    assert.notStrictEqual(result.status, 0, "snapshot create should fail when source changes are present")
    const output = parseJson(result.stdout)
    assert.strictEqual(output.status, "error")
    assert.ok(
      output.error?.includes("uncommitted") || output.error?.includes("source changes") || output.reason?.includes("source changes"),
      `expected source-change blocker, got: ${JSON.stringify(output)}`,
    )
  } finally {
    await cleanup(dir)
  }
})

test("snapshot list returns synth tags", { timeout: TEST_TIMEOUT }, async () => {
  const dir = await createTempProject()
  try {
    await writePolicyFile(dir, "snapshot-policy.yaml", "git:\n  snapshotPolicy: tag-only\n")
    const createResult = runSynth(["snapshot", "create", "--message", "List test"], dir)
    assert.strictEqual(createResult.status, 0, `snapshot create must succeed: ${createResult.stderr}`)
    const createOutput = parseJson(createResult.stdout)

    const listResult = runSynth(["snapshot", "list"], dir)
    assert.strictEqual(listResult.status, 0, `snapshot list must succeed: ${listResult.stderr}`)
    const listOutput = parseJson(listResult.stdout)
    assert.strictEqual(listOutput.kind, "GovernanceSnapshotList")
    assert.ok(listOutput.entries.length > 0, "snapshot list should return entries")
    assert.ok(
      listOutput.entries.some((e) => e.tagName === createOutput.tagName),
      `list should include created tag ${createOutput.tagName}`,
    )
  } finally {
    await cleanup(dir)
  }
})

test("snapshot verify replays event log consistently", { timeout: TEST_TIMEOUT }, async () => {
  const dir = await createTempProject()
  try {
    const createResult = runSynth(["snapshot", "create", "--message", "Verify test"], dir)
    assert.strictEqual(createResult.status, 0, `snapshot create must succeed: ${createResult.stderr}`)
    const createOutput = parseJson(createResult.stdout)

    const verifyResult = runSynth(["snapshot", "verify", "--tag", createOutput.tagName], dir)
    assert.strictEqual(verifyResult.status, 0, `snapshot verify must succeed: ${verifyResult.stderr}`)
    const verifyOutput = parseJson(verifyResult.stdout)
    assert.strictEqual(verifyOutput.kind, "GovernanceSnapshotVerification")
    assert.strictEqual(verifyOutput.consistent, true, `verify should report consistent: ${verifyOutput.reason}`)
  } finally {
    await cleanup(dir)
  }
})

test("adapter install-hooks installs governance git hooks", { timeout: TEST_TIMEOUT }, async () => {
  const dir = await createTempProject()
  try {
    const result = runSynth(["adapter", "install-hooks"], dir)
    assert.strictEqual(result.status, 0, `adapter install-hooks must succeed: ${result.stderr}`)
    const output = parseJson(result.stdout)
    assert.strictEqual(output.kind, "HooksInstalled")

    const preCommit = await fs.readFile(path.join(dir, ".git", "hooks", "pre-commit"), "utf-8")
    assert.ok(preCommit.includes("synth"), "pre-commit hook should delegate to synth")

    const postCommit = await fs.readFile(path.join(dir, ".git", "hooks", "post-commit"), "utf-8")
    assert.ok(postCommit.includes("synth"), "post-commit hook should delegate to synth")

    const postMerge = await fs.readFile(path.join(dir, ".git", "hooks", "post-merge"), "utf-8")
    assert.ok(postMerge.includes("synth"), "post-merge hook should delegate to synth")
  } finally {
    await cleanup(dir)
  }
})

test("GOVERNANCE_SNAPSHOT_CREATED event is recorded after expedition complete", { timeout: TEST_TIMEOUT }, async () => {
  const dir = await createTempProject()
  try {
    const expeditionId = await makeExecutingExpedition(dir)

    const beforeEvents = await readEventLog(dir)
    const completeResult = runSynth(
      ["expedition", "complete", "--id", expeditionId, "--force", "--reason", "test event recording"],
      dir,
    )
    assert.strictEqual(completeResult.status, 0, `expedition complete must succeed: ${completeResult.stderr}`)

    const afterEvents = await readEventLog(dir)
    assert.ok(afterEvents.length > beforeEvents.length, "event log should grow after completion")

    const snapshotEvent = afterEvents.find((e) => e.type === "GOVERNANCE_SNAPSHOT_CREATED")
    assert.ok(snapshotEvent, "GOVERNANCE_SNAPSHOT_CREATED event should be recorded")
    assert.strictEqual(snapshotEvent.payload.trigger, "EXPEDITION_COMPLETED")
    assert.strictEqual(snapshotEvent.payload.expeditionId, expeditionId)
    assert.ok(snapshotEvent.payload.tagName, "snapshot event should reference a tag")
  } finally {
    await cleanup(dir)
  }
})

})
