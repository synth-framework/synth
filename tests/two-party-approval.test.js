// ============================================================
// TWO-PARTY APPROVAL TESTS (EXP-APPROVAL-001)
// ============================================================
// Verifies that destructive operations require two distinct
// approvals, that approval events are replayable, and that the
// ExecutionGate enforces fingerprint binding.
// ============================================================

import { strict as assert } from "assert"
import crypto from "crypto"
import { bootstrap } from "../dist/core/bootstrap.js"
import { ExecutionGateError } from "../dist/control/execution-gate.js"
import { computeApprovalFingerprint } from "../dist/approval/fingerprint.js"
import { rebuildState } from "../dist/runtime/replay.js"

function makeIdentity(agentId) {
  return {
    agentId,
    sessionId: crypto.randomUUID(),
    approvalMode: "autonomous",
    issuedAt: new Date().toISOString(),
  }
}

function nowIso() {
  return new Date().toISOString()
}

function expiresAtIso(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

async function registerRuntimeCapabilities(ctx) {
  for (const name of ctx.capabilityRegistry.list()) {
    const cap = ctx.capabilityRegistry.resolve(name)
    if (cap) ctx.runtime.registerCapability(cap)
  }
}

async function registerTestDestructiveCapability(ctx) {
  ctx.capabilityRegistry.register({
    name: "Bootstrap",
    description: "Test destructive capability",
    inputSchema: { required: ["operation"], types: { operation: "string" } },
    outputSchema: { events: [], resultType: "BootstrapResult" },
    preconditions: [],
    postconditions: [],
    invariantsChecked: [],
    sideEffects: false,
    executionClass: "sync",
    handler: () => ({ events: [], result: { approved: true } }),
  })
  const cap = ctx.capabilityRegistry.resolve("Bootstrap")
  if (cap) ctx.runtime.registerCapability(cap)
}

async function setupContext() {
  const ctx = await bootstrap({ infra: { persistence: "memory" }, skipGenesis: true })
  await registerRuntimeCapabilities(ctx)
  await registerTestDestructiveCapability(ctx)
  return ctx
}

function makeDestructiveInvocation() {
  return {
    actor: "agent-a",
    capability: "Bootstrap",
    payload: { operation: "approve" },
  }
}

function makeRequestPayload(requestId, operationId, requestedBy, params, expiresAt) {
  const destructive = { actor: "ignored", capability: "Bootstrap", payload: params }
  return {
    operation: "request",
    requestId,
    approvalOperation: operationId,
    operationFingerprint: computeApprovalFingerprint(operationId, params),
    requestedBy,
    requestedAt: nowIso(),
    reason: "test approval",
    expiresAt,
  }
}

function makeGrantPayload(requestId, grantedBy) {
  return {
    operation: "grant",
    requestId,
    grantedBy,
    grantedAt: nowIso(),
    reason: "approved by second party",
  }
}

async function testBlockedWithoutApproval() {
  const ctx = await setupContext()
  const invocation = makeDestructiveInvocation()

  try {
    await ctx.gate.execute(invocation)
    assert.fail("destructive operation must be blocked without approval")
  } catch (err) {
    assert.ok(err instanceof ExecutionGateError, `expected ExecutionGateError, got ${err}`)
    assert.strictEqual(err.phase, "POLICY_CHECK", "block must occur at policy check")
    assert.ok(err.message.includes("APPROVAL_REQUIRED"), `reason should cite approval required: ${err.message}`)
  }

  console.log("[PASS] destructive operation blocked without approval")
}

async function testRequestGrantAllowsExecution() {
  const ctx = await setupContext()
  const requestId = crypto.randomUUID()
  const destructive = makeDestructiveInvocation()
  const operationId = "bootstrap"
  const requestedBy = makeIdentity("agent-a")
  const grantedBy = makeIdentity("agent-b")

  const requestResult = await ctx.gate.execute({
    actor: requestedBy.agentId,
    capability: "Approval",
    payload: makeRequestPayload(requestId, operationId, requestedBy, destructive.payload, expiresAtIso(1)),
  })
  assert.strictEqual(requestResult.contract.finalState, "COMMITTED", "approval request must commit")

  let events = await ctx.infra.eventStore.loadAll()
  const requestedEvent = events.find((e) => e.type === "APPROVAL_REQUESTED")
  assert.ok(requestedEvent, "APPROVAL_REQUESTED event must be persisted")
  assert.strictEqual(requestedEvent.payload.requestId, requestId)
  assert.strictEqual(requestedEvent.payload.operation, operationId)
  assert.ok(requestedEvent.payload.operationFingerprint, "request must carry operation fingerprint")

  const grantResult = await ctx.gate.execute({
    actor: grantedBy.agentId,
    capability: "Approval",
    payload: makeGrantPayload(requestId, grantedBy),
  })
  assert.strictEqual(grantResult.contract.finalState, "COMMITTED", "approval grant must commit")

  const stateBeforeExecute = await ctx.runtime.getState()
  assert.strictEqual(stateBeforeExecute.approvals[requestId]?.status, "granted", "request must be granted")

  const executeResult = await ctx.gate.execute(destructive)
  assert.strictEqual(executeResult.contract.finalState, "COMMITTED", "destructive operation must execute after approval")

  events = await ctx.infra.eventStore.loadAll()
  const executedEvent = events.find((e) => e.type === "APPROVAL_EXECUTED")
  assert.ok(executedEvent, "APPROVAL_EXECUTED event must be persisted")
  assert.strictEqual(executedEvent.payload.requestId, requestId)
  assert.strictEqual(executedEvent.payload.operation, operationId)

  const stateAfterExecute = await ctx.runtime.getState()
  assert.strictEqual(stateAfterExecute.approvals[requestId]?.status, "executed", "request must be marked executed")

  console.log("[PASS] request/grant flow allows execution and emits APPROVAL_EXECUTED")
}

async function testSelfApprovalRejected() {
  const ctx = await setupContext()
  const requestId = crypto.randomUUID()
  const operationId = "bootstrap"
  const identity = makeIdentity("agent-solo")

  await ctx.gate.execute({
    actor: identity.agentId,
    capability: "Approval",
    payload: makeRequestPayload(requestId, operationId, identity, { operation: "approve" }, expiresAtIso(1)),
  })

  try {
    await ctx.gate.execute({
      actor: identity.agentId,
      capability: "Approval",
      payload: makeGrantPayload(requestId, identity),
    })
    assert.fail("self-approval must be rejected")
  } catch (err) {
    assert.ok(err instanceof ExecutionGateError, `expected ExecutionGateError, got ${err}`)
    assert.ok(err.message.includes("APPROVAL_SELF_GRANT"), `reason should cite self-grant: ${err.message}`)
  }

  console.log("[PASS] self-approval is rejected")
}

async function testExpiredRequestRejected() {
  const ctx = await setupContext()
  const requestId = crypto.randomUUID()
  const operationId = "bootstrap"
  const requestedBy = makeIdentity("agent-a")
  const grantedBy = makeIdentity("agent-b")

  await ctx.gate.execute({
    actor: requestedBy.agentId,
    capability: "Approval",
    payload: makeRequestPayload(
      requestId,
      operationId,
      requestedBy,
      { operation: "approve" },
      new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    ),
  })

  try {
    await ctx.gate.execute({
      actor: grantedBy.agentId,
      capability: "Approval",
      payload: makeGrantPayload(requestId, grantedBy),
    })
    assert.fail("expired approval request must be rejected")
  } catch (err) {
    assert.ok(err instanceof ExecutionGateError, `expected ExecutionGateError, got ${err}`)
    assert.ok(err.message.includes("APPROVAL_EXPIRED"), `reason should cite expiration: ${err.message}`)
  }

  console.log("[PASS] expired approval request is rejected")
}

async function testMismatchedFingerprintRejected() {
  const ctx = await setupContext()
  const requestId = crypto.randomUUID()
  const operationId = "bootstrap"
  const requestedBy = makeIdentity("agent-a")
  const grantedBy = makeIdentity("agent-b")

  await ctx.gate.execute({
    actor: requestedBy.agentId,
    capability: "Approval",
    payload: makeRequestPayload(requestId, operationId, requestedBy, { operation: "approve" }, expiresAtIso(1)),
  })

  await ctx.gate.execute({
    actor: grantedBy.agentId,
    capability: "Approval",
    payload: makeGrantPayload(requestId, grantedBy),
  })

  const mutatedInvocation = {
    actor: "agent-a",
    capability: "Bootstrap",
    payload: { operation: "approve", force: true },
  }

  try {
    await ctx.gate.execute(mutatedInvocation)
    assert.fail("destructive operation with mismatched fingerprint must be blocked")
  } catch (err) {
    assert.ok(err instanceof ExecutionGateError, `expected ExecutionGateError, got ${err}`)
    assert.ok(err.message.includes("APPROVAL_REQUIRED"), `reason should cite missing approval: ${err.message}`)
  }

  console.log("[PASS] mismatched operation fingerprint is rejected")
}

async function testApprovalEventsReplayable() {
  const ctx = await setupContext()
  const requestId = crypto.randomUUID()
  const operationId = "bootstrap"
  const requestedBy = makeIdentity("agent-a")
  const grantedBy = makeIdentity("agent-b")

  await ctx.gate.execute({
    actor: requestedBy.agentId,
    capability: "Approval",
    payload: makeRequestPayload(requestId, operationId, requestedBy, { operation: "approve" }, expiresAtIso(1)),
  })

  await ctx.gate.execute({
    actor: grantedBy.agentId,
    capability: "Approval",
    payload: makeGrantPayload(requestId, grantedBy),
  })

  await ctx.gate.execute(makeDestructiveInvocation())

  const events = await ctx.infra.eventStore.loadAll()
  const replayed = rebuildState(events)

  assert.ok(replayed.approvals[requestId], "replayed state must contain approval")
  assert.strictEqual(replayed.approvals[requestId].status, "executed", "replayed approval status must be executed")
  assert.strictEqual(replayed.approvals[requestId].operation, operationId)
  assert.ok(replayed.approvals[requestId].operationFingerprint, "replayed approval must retain fingerprint")

  console.log("[PASS] approval events are replayable")
}

async function main() {
  await testBlockedWithoutApproval()
  await testRequestGrantAllowsExecution()
  await testSelfApprovalRejected()
  await testExpiredRequestRejected()
  await testMismatchedFingerprintRejected()
  await testApprovalEventsReplayable()

  console.log("\n[TWO-PARTY APPROVAL] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  if (err.stack) console.error(err.stack)
  process.exit(1)
})
