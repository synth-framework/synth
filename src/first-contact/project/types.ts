// ============================================================
// FIRST CONTACT: Architecture Projection Types
// ============================================================
// Shared types for the Architecture Projection Engine (EXP-AIFC-005).
// ============================================================

export interface ArchitectureTradeoffs {
  advantages: string[]
  disadvantages: string[]
}

export interface ArchitectureCandidate {
  id: string
  name: string
  description: string
  rationale: string
  tradeoffs: ArchitectureTradeoffs
  assumptions: string[]
  recommended: boolean
  confidence: number
}

export interface ArchitectureProjectionResult {
  candidates: ArchitectureCandidate[]
  recommended?: ArchitectureCandidate
}

export interface ArchitectureProjectionAdapter {
  readonly version: string
  project(artifact: {
    intent: { description: string; goals: string[]; successCriteria: string[] }
    audience: { primaryUsers: string[]; stakeholders: string[] }
    environment: { targetRuntime: string; languagePreferences: string[]; platformConstraints: string[] }
    capabilities: { required: string[]; optional: string[] }
    constraints: { functional: string[]; nonFunctional: string[] }
  }): ArchitectureProjectionResult
}
