// ============================================================
// ADAPTER: Repository — Types
// ============================================================

import type { AdapterState, ObservationBatch } from "../../types/index.js"

export type PromotionMode = "direct" | "staged"

export type SnapshotPolicy = "disabled" | "tag-only" | "commit-and-tag"

export type RepositoryConfig = {
  path: string
  remote: string
  defaultBranch: string
  promotionBranch?: string
  promotionMode: PromotionMode
  username?: string
  email?: string
  signingKey?: string
  snapshotPolicy?: SnapshotPolicy
  autoTagOnComplete?: boolean
  autoCommitOnStateChange?: boolean
  autoTagMerkleRoot?: boolean
  includeProofs?: boolean
}

export type RepositoryStatus = {
  initialized: boolean
  branch: string
  uncommittedChanges: boolean
  remoteConfigured: boolean
  hooksInstalled: boolean
  proofGenerated: boolean
  adapterEnabled: boolean
  state: AdapterState
}

export type RepositoryHealth = {
  healthy: boolean
  checks: {
    initialized: boolean
    remoteReachable: boolean
    hooksInstalled: boolean
    branchValid: boolean
    proofCurrent: boolean
  }
  message: string
}

export type PromotionResult = {
  success: boolean
  sourceBranch: string
  targetBranch: string
  commit?: string
  proofId?: string
  replayHash?: string
  auditPassed: boolean
  determinismPassed: boolean
  message: string
}

export type MergeResult = {
  success: boolean
  sourceBranch: string
  targetBranch: string
  commit?: string
  message: string
}

export type SnapshotOptions = {
  trigger: "EXPEDITION_COMPLETED" | "SNAPSHOT_REQUESTED" | "GOVERNANCE_STATE_CHANGED" | "MERKLE_ROOT_PUBLISHED" | "post-commit"
  expeditionId?: string
  message?: string
  tagName?: string
  includeProofs?: boolean
  actor?: string
  sessionId?: string
  stateHash?: string
  eventOffset?: number
}

export type SnapshotResult = {
  ok: boolean
  snapshotId: string
  commitHash?: string
  tagName?: string
  eventOffset: number
  stateHash: string
  trigger: string
  reason?: string
}

export type SnapshotEntry = {
  tagName: string
  commitHash: string
  snapshotId?: string
  trigger?: string
  eventOffset?: number
  stateHash?: string
  createdAt?: string
}

export type VerifyResult = {
  ok: boolean
  tagName: string
  commitHash: string
  consistent: boolean
  eventCount: number
  replayHash: string
  reason?: string
}

export interface RepositoryAdapter {
  readonly metadata: {
    name: string
    version: string
    kind: "repository"
    category: "integration"
    description: string
  }
  readonly state: AdapterState
  readonly config?: RepositoryConfig

  initialize(): Promise<AdapterState>
  configure(config: RepositoryConfig): Promise<AdapterState>
  status(): Promise<RepositoryStatus>
  checkHealth(): Promise<RepositoryHealth>

  createBranch(name: string): Promise<AdapterState>
  checkout(name: string): Promise<AdapterState>
  commit(message: string): Promise<AdapterState>

  createSnapshot(options: SnapshotOptions): Promise<SnapshotResult>
  listSnapshots(limit?: number): Promise<SnapshotEntry[]>
  verifySnapshot(tagName: string): Promise<VerifyResult>

  promote(branch: string): Promise<PromotionResult>
  merge(source: string, target: string): Promise<MergeResult>

  push(remote?: string): Promise<AdapterState>
  pull(remote?: string): Promise<AdapterState>

  installHooks(): Promise<AdapterState>

  /** Emit canonical observations about the repository without mutating state */
  observe(): Promise<ObservationBatch>
}
