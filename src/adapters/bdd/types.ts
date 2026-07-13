// ============================================================
// ADAPTER: BDD — Types
// ============================================================

import type { AdapterState, AdapterHealth } from "../../types/index.js"

export type BddConfig = {
  featuresDirectory: string
  testsDirectory: string
  sourceDirectory: string
}

export type BddScenario = {
  id: string
  name: string
  given: string[]
  when: string
  then: string[]
  status: "draft" | "implemented" | "verified"
}

export type BddFeature = {
  id: string
  missionId?: string
  name: string
  description: string
  scenarios: BddScenario[]
  status: "draft" | "active" | "complete"
}

export type BddAcceptanceReport = {
  featureId: string
  scenarioId: string
  passed: boolean
  message: string
}

export type BddTraceabilityMatrix = {
  missionId?: string
  featureId: string
  scenarioId: string
  testFile?: string
  verified: boolean
}

export type BddEvidence = {
  features: BddFeature[]
  acceptanceReports: BddAcceptanceReport[]
  traceabilityMatrix: BddTraceabilityMatrix[]
  coverage: {
    features: number
    scenarios: number
    verified: number
  }
  message: string
}

export type CreateFeatureResult = {
  success: boolean
  feature?: BddFeature
  message: string
}

export type CreateScenarioResult = {
  success: boolean
  scenario?: BddScenario
  message: string
}

export type GenerateAcceptanceTestsResult = {
  success: boolean
  generatedFiles: string[]
  message: string
}

export type VerifyBehaviorResult = {
  success: boolean
  reports: BddAcceptanceReport[]
  message: string
}

export type GenerateBehaviorEvidenceResult = {
  success: boolean
  evidence?: BddEvidence
  message: string
}

export interface BddAdapter {
  readonly metadata: {
    name: string
    version: string
    kind: "bdd"
    category: "methodology"
    description: string
  }
  readonly state: AdapterState
  readonly health: AdapterHealth
  readonly config?: BddConfig

  initialize(): Promise<AdapterState>
  configure(config: Record<string, unknown>): Promise<AdapterState>
  validate(): Promise<AdapterState>
  enable(): Promise<AdapterState>
  disable(): Promise<AdapterState>
  healthCheck(): Promise<AdapterState>

  status(): Promise<{ features: number; scenarios: number; verified: number; state: AdapterState }>
  checkHealth(): Promise<{ healthy: boolean; message: string }>

  createFeature(missionId: string | undefined, name: string, description: string): Promise<CreateFeatureResult>
  createScenario(featureId: string, name: string, given: string[], when: string, then: string[]): Promise<CreateScenarioResult>
  generateAcceptanceTests(featureId?: string): Promise<GenerateAcceptanceTestsResult>
  verifyBehavior(featureId?: string): Promise<VerifyBehaviorResult>
  generateBehaviorEvidence(): Promise<GenerateBehaviorEvidenceResult>
}
