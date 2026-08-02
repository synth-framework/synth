// ============================================================
// IDENTITY CAPTURE TESTS (EXP-IDENTITY-001)
// ============================================================
// Verifies that captureIdentity reads the environment, applies
// sensible defaults, and validates the approval mode.
// ============================================================

import { strict as assert } from "assert"
import { captureIdentity } from "../dist/identity/capture.js"

function withEnv(env, fn) {
  const original = { ...process.env }
  for (const key of Object.keys(env)) {
    if (env[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = env[key]
    }
  }
  try {
    return fn()
  } finally {
    for (const key of Object.keys(env)) {
      if (original[key] === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = original[key]
      }
    }
  }
}

function testReadsEnvironmentVariables() {
  const identity = withEnv(
    {
      SYNTH_AGENT_ID: "agent-42",
      SYNTH_SESSION_ID: "session-abc",
      SYNTH_PARENT_EXPEDITION_ID: "exp-001",
      SYNTH_PARENT_MISSION_ID: "mission-001",
      SYNTH_APPROVAL_MODE: "delegated",
      SYNTH_IDENTITY_PROVIDER: "test-provider",
    },
    () => captureIdentity(),
  )

  assert.equal(identity.agentId, "agent-42")
  assert.equal(identity.sessionId, "session-abc")
  assert.equal(identity.parentExpeditionId, "exp-001")
  assert.equal(identity.parentMissionId, "mission-001")
  assert.equal(identity.approvalMode, "delegated")
  assert.equal(identity.identityProvider, "test-provider")
  assert.ok(typeof identity.issuedAt === "string")
  assert.ok(!Number.isNaN(Date.parse(identity.issuedAt)))
}

function testDefaultsAreSensible() {
  const identity = withEnv(
    {
      SYNTH_AGENT_ID: undefined,
      SYNTH_SESSION_ID: undefined,
      SYNTH_PARENT_EXPEDITION_ID: undefined,
      SYNTH_PARENT_MISSION_ID: undefined,
      SYNTH_APPROVAL_MODE: undefined,
      SYNTH_IDENTITY_PROVIDER: undefined,
    },
    () => captureIdentity(),
  )

  assert.ok(identity.agentId.startsWith(`synth-cli-${process.pid}`), `agentId should start with synth-cli-<pid>, got ${identity.agentId}`)
  assert.match(identity.sessionId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  assert.equal(identity.approvalMode, "autonomous")
  assert.equal(identity.parentExpeditionId, undefined)
  assert.equal(identity.parentMissionId, undefined)
  assert.equal(identity.identityProvider, undefined)
  assert.ok(typeof identity.issuedAt === "string")
}

function testInvalidApprovalModeFallsBackToAutonomous() {
  const identity = withEnv(
    {
      SYNTH_APPROVAL_MODE: "superuser",
    },
    () => captureIdentity(),
  )

  assert.equal(identity.approvalMode, "autonomous")
}

async function main() {
  testReadsEnvironmentVariables()
  testDefaultsAreSensible()
  testInvalidApprovalModeFallsBackToAutonomous()
  console.log("identity-capture: all tests passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
