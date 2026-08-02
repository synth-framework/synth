// ============================================================
// IDENTITY IN EVENTS TESTS (EXP-IDENTITY-001)
// ============================================================
// Verifies that lifecycle events carry agent identity metadata
// and that synth log filters can query by identity fields.
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

async function testIdentityInFirstContactEvents() {
  await withTempDir("synth-identity-events-", async (targetDir) => {
    const env = {
      ...process.env,
      SYNTH_AGENT_ID: "test-agent",
      SYNTH_SESSION_ID: "test-session",
      SYNTH_APPROVAL_MODE: "human-approved",
    }

    const result = runSynth(["first-contact", "--approve"], targetDir, { env, timeout: 120000 })
    assert.equal(result.status, 0, `first-contact --approve failed: ${result.stderr}`)

    const events = await readEventLog(targetDir)
    assert.ok(events.length > 0, "expected at least one event in the log")

    const identityEvent = events.find(
      (event) => event.payload?.metadata?.identity?.agentId === "test-agent",
    )
    assert.ok(identityEvent, "expected an event with payload.metadata.identity.agentId === 'test-agent'")
    assert.equal(identityEvent.payload.metadata.identity.sessionId, "test-session")
    assert.equal(identityEvent.payload.metadata.identity.approvalMode, "human-approved")
  })
}

async function testSynthLogAgentIdFilter() {
  await withTempDir("synth-log-agent-id-", async (targetDir) => {
    const env = {
      ...process.env,
      SYNTH_AGENT_ID: "test-agent",
      SYNTH_SESSION_ID: "test-session",
      SYNTH_APPROVAL_MODE: "human-approved",
    }

    const runResult = runSynth(["first-contact", "--approve"], targetDir, { env, timeout: 120000 })
    assert.equal(runResult.status, 0, `first-contact --approve failed: ${runResult.stderr}`)

    const logResult = runSynth(["log", "--agent-id", "test-agent"], targetDir, { env })
    assert.equal(logResult.status, 0, `synth log --agent-id failed: ${logResult.stderr}`)
    const logOutput = parseJson(logResult.stdout)
    assert.equal(logOutput.kind, "EventLogQuery")
    assert.ok(logOutput.matched > 0, "expected log filter to match at least one event")
    assert.ok(
      logOutput.events.every((event) => event.payload?.metadata?.identity?.agentId === "test-agent"),
      "every returned event should belong to test-agent",
    )
  })
}

async function main() {
  await assertCliBuilt()
  await testIdentityInFirstContactEvents()
  await testSynthLogAgentIdFilter()
  console.log("identity-in-events: all tests passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
