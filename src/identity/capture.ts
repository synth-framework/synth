// ============================================================
// IDENTITY: Capture Utility
// ============================================================
// Reads agent identity from the environment with sensible defaults.
// This is the single source of truth for how the CLI and subprocesses
// discover their own identity.
// ============================================================

import { randomUUID } from "node:crypto"
import type { AgentIdentity } from "./types.js"

const ALLOWED_APPROVAL_MODES = ["autonomous", "human-approved", "delegated"] as const

type ApprovalMode = (typeof ALLOWED_APPROVAL_MODES)[number]

function isValidApprovalMode(value: string | undefined): value is ApprovalMode {
  return value !== undefined && (ALLOWED_APPROVAL_MODES as readonly string[]).includes(value)
}

/**
 * Capture the current process identity from the environment.
 *
 * Environment variables read:
 *   - SYNTH_AGENT_ID
 *   - SYNTH_SESSION_ID
 *   - SYNTH_PARENT_EXPEDITION_ID
 *   - SYNTH_PARENT_MISSION_ID
 *   - SYNTH_APPROVAL_MODE
 *   - SYNTH_IDENTITY_PROVIDER
 *
 * Defaults:
 *   - agentId: `synth-cli-<pid>`
 *   - sessionId: freshly generated UUID
 *   - approvalMode: `autonomous`
 *   - issuedAt: current ISO-8601 timestamp
 */
export function captureIdentity(): AgentIdentity {
  const approvalModeEnv = process.env.SYNTH_APPROVAL_MODE

  return {
    agentId: process.env.SYNTH_AGENT_ID || `synth-cli-${process.pid}`,
    sessionId: process.env.SYNTH_SESSION_ID || randomUUID(),
    parentExpeditionId: process.env.SYNTH_PARENT_EXPEDITION_ID,
    parentMissionId: process.env.SYNTH_PARENT_MISSION_ID,
    approvalMode: isValidApprovalMode(approvalModeEnv) ? approvalModeEnv : "autonomous",
    identityProvider: process.env.SYNTH_IDENTITY_PROVIDER,
    issuedAt: new Date().toISOString(),
  }
}

/**
 * Build a deterministic metadata fragment carrying agent identity for an
 * event payload. The identity's issuedAt is overridden with the command's
 * deterministic timestamp so replay remains stable.
 *
 * Returns undefined when no identity is present so callers can conditionally
 * attach metadata without requiring identity to function.
 */
export function identityPayloadMetadata(
  identity: AgentIdentity | undefined,
  timestamp: number,
): Record<string, unknown> | undefined {
  if (!identity) return undefined
  return {
    identity: {
      ...identity,
      issuedAt: timestamp,
    },
  }
}

/**
 * Return the names of all environment variables that carry identity state.
 */
export function identityEnvVars(identity: AgentIdentity): Record<string, string> {
  const env: Record<string, string> = {
    SYNTH_AGENT_ID: identity.agentId,
    SYNTH_SESSION_ID: identity.sessionId,
    SYNTH_APPROVAL_MODE: identity.approvalMode,
  }

  if (identity.parentExpeditionId) {
    env.SYNTH_PARENT_EXPEDITION_ID = identity.parentExpeditionId
  }
  if (identity.parentMissionId) {
    env.SYNTH_PARENT_MISSION_ID = identity.parentMissionId
  }
  if (identity.identityProvider) {
    env.SYNTH_IDENTITY_PROVIDER = identity.identityProvider
  }

  return env
}
