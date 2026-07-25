// ============================================================
// GOVERNANCE: Implementation Eligibility Resolver
// ============================================================
// Enforces ADR-046 — Implementation Authority Ordering.
// A mutation is implementation-eligible only when the authority chain
// that permits it is complete.
// ============================================================

import type { CanonicalState, Expedition } from "../types/index.js"
import type { AdrRegistry } from "./adr-registry.js"
import { loadExpeditionAdrDependencies } from "./expedition-authority.js"

export type ImplementationEligibility = {
  eligible: boolean
  reasons: string[]
  missingAuthority?: string[]
}

type EligibilityInput = {
  expedition: Expedition
  state: CanonicalState
  adrRegistry: AdrRegistry
}

/**
 * Resolve whether an expedition is currently implementation-eligible.
 *
 * Checks:
 * 1. Parent Mission is active.
 * 2. Expedition itself is authorized (approved/committed/executing).
 * 3. Every ADR declared in the expedition charter's Authority section is Accepted.
 */
export function resolveImplementationEligibility(
  input: EligibilityInput,
): ImplementationEligibility {
  const { expedition, state, adrRegistry } = input
  const reasons: string[] = []
  const missingAuthority: string[] = []

  // 1. Parent mission must be active.
  const mission = state.missions[expedition.missionId]
  if (!mission) {
    reasons.push(`Parent mission ${expedition.missionId} not found`)
    missingAuthority.push("approved-mission")
  } else if (mission.status !== "active") {
    reasons.push(`Parent mission ${expedition.missionId} is ${mission.status}, not active`)
    missingAuthority.push("approved-mission")
  }

  // 2. Expedition must be authorized.
  const authorizedStatuses = new Set<Expedition["status"]>([
    "approved",
    "committed",
    "executing",
  ])
  if (!authorizedStatuses.has(expedition.status)) {
    reasons.push(`Expedition ${expedition.id} is ${expedition.status}, not authorized`)
    missingAuthority.push("authorized-expedition")
  }

  // 3. Declared ADR dependencies must be Accepted.
  const adrDependencies = loadExpeditionAdrDependencies(expedition.id)
  for (const adrId of adrDependencies) {
    const status = adrRegistry[adrId] ?? "Unknown"
    if (status !== "Accepted") {
      reasons.push(`ADR dependency ${adrId} is ${status}, not Accepted`)
      missingAuthority.push(adrId)
    }
  }

  if (reasons.length > 0) {
    return {
      eligible: false,
      reasons,
      missingAuthority,
    }
  }

  return {
    eligible: true,
    reasons: ["Implementation authority is complete"],
  }
}
