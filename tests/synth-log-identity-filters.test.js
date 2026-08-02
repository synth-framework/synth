// ============================================================
// SYNTH LOG IDENTITY FILTERS TESTS (EXP-IDENTITY-001)
// ============================================================
// Verifies that synth log supports --session-id and --approval-mode
// identity filters in addition to --agent-id.
// ============================================================

import { strict as assert } from "assert"
import fs from "fs/promises"
import path from "path"
import { runSynth, parseJson, withTempDir, assertCliBuilt } from "./helpers/cli-harness.js"

async function readEventLog(targetDir) {
  const logPath = path.join(targetDir, ".synth", "data", "event-log.jsonl")
  const raw = await fs.readFile(logPath, "utf-8")
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

async function testSynthLogSessionIdFilter() {
  await withTempDir("synth-log-session-id-", async (targetDir) => {
    const env = {
      ...process.env,
      SYNTH_AGENT_ID: "test-agent",
      SYNTH_SESSION_ID: "test-session",
      SYNTH_APPROVAL_MODE: "human-approved",
    }

    const runResult = runSynth(["first-contact", "--approve"], targetDir, { env, timeout: 120000 })
    assert.equal(runResult.status, 0, `first-contact --approve failed: ${runResult.stderr}`)

    const logResult = runSynth(["log", "--session-id", "test-session"], targetDir, { env, timeout: 120000 })
    assert.equal(logResult.status, 0, `synth log --session-id failed: ${logResult.stderr}`)
    const logOutput = parseJson(logResult.stdout)
    assert.ok(logOutput.matched > 0, "expected log filter to match at least one event")
    assert.ok(
      logOutput.events.every((event) => event.payload?.metadata?.identity?.sessionId === "test-session"),
      "every returned event should belong to test-session",
    )
  })
}

async function testSynthLogApprovalModeFilter() {
  await withTempDir("synth-log-approval-mode-", async (targetDir) => {
    const env = {
      ...process.env,
      SYNTH_AGENT_ID: "test-agent",
      SYNTH_SESSION_ID: "test-session",
      SYNTH_APPROVAL_MODE: "human-approved",
    }

    const runResult = runSynth(["first-contact", "--approve"], targetDir, { env, timeout: 120000 })
    assert.equal(runResult.status, 0, `first-contact --approve failed: ${runResult.stderr}`)

    const logResult = runSynth(["log", "--approval-mode", "human-approved"], targetDir, { env, timeout: 120000 })
    assert.equal(logResult.status, 0, `synth log --approval-mode failed: ${logResult.stderr}`)
    const logOutput = parseJson(logResult.stdout)
    assert.ok(logOutput.matched > 0, "expected log filter to match at least one event")
    assert.ok(
      logOutput.events.every((event) => event.payload?.metadata?.identity?.approvalMode === "human-approved"),
      "every returned event should have approvalMode human-approved",
    )
  })
}

async function testSynthLogExpeditionIdFilter() {
  await withTempDir("synth-log-expedition-id-", async (targetDir) => {
    const env = {
      ...process.env,
      SYNTH_AGENT_ID: "test-agent",
      SYNTH_SESSION_ID: "test-session",
      SYNTH_APPROVAL_MODE: "human-approved",
    }

    const runResult = runSynth(["first-contact", "--approve"], targetDir, { env, timeout: 120000 })
    assert.equal(runResult.status, 0, `first-contact --approve failed: ${runResult.stderr}`)

    const events = await readEventLog(targetDir)
    const expeditionEvent = events.find((event) => event.payload?.expeditionId)
    if (!expeditionEvent) {
      console.log("synth-log-expedition-id: skipped (no expedition event in first-contact log)")
      return
    }

    const expeditionId = expeditionEvent.payload.expeditionId
    const logResult = runSynth(["log", "--expedition-id", expeditionId], targetDir, { env, timeout: 120000 })
    assert.equal(logResult.status, 0, `synth log --expedition-id failed: ${logResult.stderr}`)
    const logOutput = parseJson(logResult.stdout)
    assert.ok(logOutput.matched > 0, "expected log filter to match at least one event")
    assert.ok(
      logOutput.events.every(
        (event) => event.payload?.expeditionId === expeditionId || event.payload?.parentExpeditionId === expeditionId,
      ),
      "every returned event should reference the expedition id",
    )
  })
}

async function main() {
  await assertCliBuilt()
  await testSynthLogSessionIdFilter()
  await testSynthLogApprovalModeFilter()
  await testSynthLogExpeditionIdFilter()
  console.log("synth-log-identity-filters: all tests passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
