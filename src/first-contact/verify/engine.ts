// ============================================================
// FIRST CONTACT: Capability Verification Engine
// ============================================================
// Entry point for verifying the assumptions of a selected architecture
// candidate before Mission materialization (EXP-AIFC-006).
// ============================================================

import type { ArchitectureCandidate } from "../project/types.js"
import type { CapabilityVerificationReport, CapabilityVerifier } from "./types.js"
import { RuleBasedCapabilityVerifier } from "./adapters/rule-based-verifier.js"

export type { CapabilityVerificationReport, CapabilityVerifier }

const defaultVerifier = new RuleBasedCapabilityVerifier()

/**
 * Verify the assumptions of the selected architecture candidate.
 *
 * @param candidate Selected architecture candidate with assumptions.
 * @param verifier Optional verifier; defaults to rule-based.
 */
export function verifyCapabilities(
  candidate: ArchitectureCandidate,
  verifier: CapabilityVerifier = defaultVerifier,
): CapabilityVerificationReport {
  return verifier.verify(candidate.assumptions)
}
