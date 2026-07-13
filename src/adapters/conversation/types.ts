// ============================================================
// ADAPTER: Conversation — Evidence Adapter Types
// ============================================================
// Canonical types for the Conversation Adapter.
// The adapter reads natural-language operator input and emits
// Observations for Mission Studio.
// ============================================================

import type { Observation, ObservationBatch } from "../../types/index.js"

export type ConversationRole = "operator" | "system" | "assistant"

export type ConversationTurn = {
  role: ConversationRole
  text: string
  timestamp: number
}

export type ConversationConfig = {
  /** Default actor name attached to observations */
  actorName?: string
  /** Optional initial transcript */
  turns?: ConversationTurn[]
}

export interface ConversationAdapter {
  readonly metadata: {
    name: string
    version: string
    kind: string
    category: "integration"
    description: string
  }

  /** Append a conversation turn */
  submitTurn(role: ConversationRole, text: string): void

  /** Read all stored turns and emit observations */
  observe(): Promise<ObservationBatch>
}

export type ConversationObservationResult = {
  success: boolean
  observations: Observation[]
  message: string
}
