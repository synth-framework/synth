// ============================================================
// CLI: synth approval
// ============================================================
// Request, grant, deny, list, and show two-party approvals.
// ============================================================

import crypto from "crypto"
import { bootstrap } from "../core/bootstrap.js"
import { printJson } from "./print.js"
import { captureIdentity } from "../identity/index.js"
import type { AgentIdentity } from "../identity/types.js"
import { computeApprovalFingerprint } from "../approval/fingerprint.js"

function nowIso(): string {
  return new Date().toISOString()
}

function expiresAtIso(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

async function getApi() {
  const ctx = await bootstrap({ skipGenesis: true, infra: { persistence: "file" } })
  return ctx.api
}

export async function cmdApprovalRequest(flags: Record<string, string | boolean>): Promise<void> {
  const operation = String(flags.operation ?? flags.op ?? "")
  const reason = String(flags.reason ?? "")
  const params = typeof flags.params === "string" ? flags.params : undefined
  const expiryHours = typeof flags["expiry-hours"] === "string" ? parseInt(flags["expiry-hours"], 10) : 24

  if (!operation) {
    printJson({ status: "error", message: "Missing required flag: --operation <op>" })
    process.exit(1)
  }
  if (!reason) {
    printJson({ status: "error", message: "Missing required flag: --reason <reason>" })
    process.exit(1)
  }

  const requestId = crypto.randomUUID()
  const identity = captureIdentity()
  const parsedParams = params ? JSON.parse(params) : undefined
  const operationFingerprint = computeApprovalFingerprint(operation, parsedParams)

  const api = await getApi()
  const result = await api.handleIntent({
    capability: "Approval",
    actor: identity.agentId,
    payload: {
      operation: "request",
      requestId,
      approvalOperation: operation,
      operationFingerprint,
      requestedBy: identity,
      requestedAt: nowIso(),
      reason,
      expiresAt: expiresAtIso(expiryHours),
    },
    context: { identity },
  })

  printJson(result)
}

export async function cmdApprovalGrant(flags: Record<string, string | boolean>): Promise<void> {
  const requestId = String(flags["request-id"] ?? "")
  const reason = String(flags.reason ?? "")

  if (!requestId) {
    printJson({ status: "error", message: "Missing required flag: --request-id <id>" })
    process.exit(1)
  }

  const identity = captureIdentity()
  const api = await getApi()
  const result = await api.handleIntent({
    capability: "Approval",
    actor: identity.agentId,
    payload: {
      operation: "grant",
      requestId,
      grantedBy: identity,
      grantedAt: nowIso(),
      reason,
    },
    context: { identity },
  })

  printJson(result)
}

export async function cmdApprovalDeny(flags: Record<string, string | boolean>): Promise<void> {
  const requestId = String(flags["request-id"] ?? "")
  const reason = String(flags.reason ?? "")

  if (!requestId) {
    printJson({ status: "error", message: "Missing required flag: --request-id <id>" })
    process.exit(1)
  }

  const identity = captureIdentity()
  const api = await getApi()
  const result = await api.handleIntent({
    capability: "Approval",
    actor: identity.agentId,
    payload: {
      operation: "deny",
      requestId,
      deniedBy: identity,
      deniedAt: nowIso(),
      reason,
    },
    context: { identity },
  })

  printJson(result)
}

export async function cmdApprovalList(flags: Record<string, string | boolean>): Promise<void> {
  const filterOperation = typeof flags.operation === "string" ? flags.operation : undefined
  const status = typeof flags.status === "string" ? flags.status : undefined

  const identity = captureIdentity()
  const api = await getApi()
  const result = await api.handleIntent({
    capability: "Approval",
    actor: identity.agentId,
    payload: { operation: "list", filterOperation, status },
    context: { identity },
  })

  printJson(result)
}

export async function cmdApprovalShow(flags: Record<string, string | boolean>): Promise<void> {
  const requestId = String(flags["request-id"] ?? "")

  if (!requestId) {
    printJson({ status: "error", message: "Missing required flag: --request-id <id>" })
    process.exit(1)
  }

  const identity = captureIdentity()
  const api = await getApi()
  const result = await api.handleIntent({
    capability: "Approval",
    actor: identity.agentId,
    payload: { operation: "show", requestId },
    context: { identity },
  })

  printJson(result)
}
