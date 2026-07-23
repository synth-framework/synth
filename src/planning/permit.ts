// ============================================================
// PLANNING: PlanningPermit — Cryptographic authorization
// ============================================================
// Signed authorization token for planning-domain ledger writes.
// Mirrors InvocationPermit. Created by PlanningEngine, validated
// by PlanningCoordinator, then committed through ExecutionGate.
// ============================================================

import crypto from "crypto"

export type PlanningIntent = {
  actor: string
  capability: string
  payload: Record<string, unknown>
  context?: Record<string, unknown>
}

export class PlanningPermit {
  public readonly txId: string
  public readonly planningIntent: PlanningIntent
  public readonly timestamp: number
  public readonly signature: string

  constructor(txId: string, planningIntent: PlanningIntent, timestamp: number, signature: string) {
    this.txId = txId
    this.planningIntent = planningIntent
    this.timestamp = timestamp
    this.signature = signature
    Object.freeze(this)
  }

  static create(txId: string, planningIntent: PlanningIntent, planningKey: string, timestamp?: number): PlanningPermit {
    const now = timestamp ?? Date.now()
    const payload = `${txId}:${planningIntent.capability}:${planningIntent.actor}:${now}`
    const signature = crypto.createHmac("sha256", planningKey).update(payload).digest("hex")
    return new PlanningPermit(txId, planningIntent, now, signature)
  }

  static verify(permit: PlanningPermit, planningKey: string): boolean {
    const payload = `${permit.txId}:${permit.planningIntent.capability}:${permit.planningIntent.actor}:${permit.timestamp}`
    const expected = crypto.createHmac("sha256", planningKey).update(payload).digest("hex")
    return permit.signature === expected
  }
}
