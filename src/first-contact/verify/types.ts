// ============================================================
// FIRST CONTACT: Capability Verification Types
// ============================================================
// Shared types for the Capability Verification Framework (EXP-AIFC-006).
// ============================================================

export type CapabilityStatus = "MISSING" | "DEGRADED" | "UNAVAILABLE" | "AVAILABLE"

export interface CapabilityAssumption {
  capability: string
  requirement?: string
}

export interface CapabilityBlocker {
  capability: string
  status: CapabilityStatus
  message: string
}

export interface CapabilityVerificationReport {
  status: "passed" | "blocked" | "overridden"
  blockers: CapabilityBlocker[]
  checks: CapabilityCheck[]
  reportHash: string
}

export interface CapabilityCheck {
  capability: string
  status: CapabilityStatus
  message: string
}

export interface CapabilityVerifier {
  readonly version: string
  verify(assumptions: string[]): CapabilityVerificationReport
}
