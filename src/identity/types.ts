// ============================================================
// IDENTITY: Agent Identity Types
// ============================================================
// Canonical identity metadata carried across process boundaries.
// This transport-layer contract is independent of the SynthEvent envelope.
// ============================================================

/** Identity of the agent executing a Synth command or capability. */
export type AgentIdentity = {
  /** Unique identifier for the running agent process. */
  agentId: string

  /** Logical session identifier shared across a single operator/agent session. */
  sessionId: string

  /** Optional expedition that originated this invocation chain. */
  parentExpeditionId?: string

  /** Optional mission that originated this invocation chain. */
  parentMissionId?: string

  /** Approval mode governing how this agent may mutate state. */
  approvalMode: "autonomous" | "human-approved" | "delegated"

  /** Optional identity provider that issued or validated this identity. */
  identityProvider?: string

  /** ISO-8601 timestamp at which this identity was captured. */
  issuedAt?: string
}
