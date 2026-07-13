// ============================================================
// ADAPTER: TDD — Types
// ============================================================

import type { AdapterState, AdapterHealth } from "../../types/index.js"

export type TddConfig = {
  testDirectory: string
  sourceDirectory: string
  coverageEnabled: boolean
}

export type TddWorkflowState =
  | "requirement"
  | "test-generated"
  | "failing"
  | "passing"
  | "refactored"

export type TddTestSpec = {
  name: string
  targetModule: string
  functionName: string
  status: "missing" | "generated" | "failing" | "passing"
}

export type TddEvidence = {
  requirement: string
  workflowState: TddWorkflowState
  tests: TddTestSpec[]
  coverage?: {
    lines: number
    functions: number
    branches: number
  }
  timeline: {
    phase: TddWorkflowState
    timestamp: number
  }[]
  message: string
}

export type GenerateTestResult = {
  success: boolean
  generatedFiles: string[]
  message: string
}

export type RunTestsResult = {
  success: boolean
  passing: number
  failing: number
  message: string
}

export type VerifyFailureResult = {
  success: boolean
  failingTests: string[]
  message: string
}

export type VerifyImplementationResult = {
  success: boolean
  passingTests: string[]
  message: string
}

export type CoverageResult = {
  success: boolean
  lines?: number
  functions?: number
  branches?: number
  message: string
}

export type GenerateEvidenceResult = {
  success: boolean
  evidence?: TddEvidence
  message: string
}

export interface TddAdapter {
  readonly metadata: {
    name: string
    version: string
    kind: "tdd"
    category: "methodology"
    description: string
  }
  readonly state: AdapterState
  readonly health: AdapterHealth
  readonly config?: TddConfig

  initialize(): Promise<AdapterState>
  configure(config: Record<string, unknown>): Promise<AdapterState>
  validate(): Promise<AdapterState>
  enable(): Promise<AdapterState>
  disable(): Promise<AdapterState>
  healthCheck(): Promise<AdapterState>

  status(): Promise<{ workflowState: TddWorkflowState; tests: TddTestSpec[]; state: AdapterState }>
  checkHealth(): Promise<{ healthy: boolean; message: string }>

  generateTest(requirement: string, targetModule: string, functionName: string): Promise<GenerateTestResult>
  runTests(): Promise<RunTestsResult>
  verifyFailure(): Promise<VerifyFailureResult>
  verifyImplementation(): Promise<VerifyImplementationResult>
  measureCoverage(): Promise<CoverageResult>
  generateEvidence(requirement: string): Promise<GenerateEvidenceResult>
}
