// ============================================================
// ENVIRONMENT: Versioning Capability
// ============================================================
// Generic repository-versioning capability contract. This module
// contains only types; implementations are provider-specific and
// belong in separate expeditions (EXP-VCS-002, EXP-VCS-003, ...).
//
// The Core must never invoke Git or any other versioning tool
// directly. All repository mutations flow through this capability
// as governed capability invocations.
// ============================================================

import type { ObservationContext } from "./types.js"

/** Remote locator for a versioned repository */
export type VersioningRemote = {
  name: string
  url: string
}

/** Description of a repository revision */
export type VersioningRevisionDescriptor = {
  system: string
  root: string
  branch?: string
  commit: string
  message?: string
  author?: string
  timestamp?: string
  parents: string[]
}

/** Description of a repository as observed by a versioning provider */
export type VersioningRepositoryDescriptor = {
  system: string
  root: string
  present: boolean
  branch?: string
  commit?: string
  remotes: VersioningRemote[]
  clean: boolean
}

/** Divergence between local and remote history */
export type VersioningDivergenceDescriptor = {
  ahead: number
  behind: number
  hasConflict: boolean
}

/** Result of a revision integration operation */
export type VersioningIntegrationResult = {
  success: boolean
  target: VersioningRevisionDescriptor
  source: VersioningRevisionDescriptor
  resultCommit?: string
  conflictedFiles?: string[]
  reason?: string
}

/** Result of publishing a revision to a remote */
export type VersioningPublishResult = {
  success: boolean
  source: string
  remote: string
  publishedCommit?: string
  reason?: string
}

/** Lightweight snapshot of working tree state */
export type VersioningSnapshotDescriptor = {
  id: string
  system: string
  root: string
  commit?: string
  label?: string
  timestamp: number
}

/** Comparison between two revisions */
export type VersioningRevisionComparison = {
  a: VersioningRevisionDescriptor
  b: VersioningRevisionDescriptor
  changedFiles: string[]
  addedFiles: string[]
  removedFiles: string[]
}

/** A single entry in revision history */
export type VersioningRevisionEntry = {
  commit: string
  message: string
  author?: string
  timestamp?: string
  parents: string[]
}

/** Result of synchronizing with a remote */
export type VersioningSynchronizeResult = {
  success: boolean
  remote?: string
  fetchedRefs?: string[]
  integratedCommits?: string[]
  divergence?: VersioningDivergenceDescriptor
  reason?: string
}

/** Options for creating a new revision */
export type VersioningCreateRevisionOptions = {
  message: string
  author?: string
  branch?: string
  includeUntracked?: boolean
}

/** Options for switching to a revision */
export type VersioningSwitchRevisionOptions = {
  branch?: string
  commit?: string
  createBranch?: boolean
}

/** Options for integrating one revision into another */
export type VersioningIntegrateRevisionOptions = {
  strategy?: "merge" | "rebase" | "fast-forward"
  message?: string
  author?: string
}

/** Options for publishing a revision */
export type VersioningPublishRevisionOptions = {
  remote?: string
  force?: boolean
}

/** Options for creating a snapshot */
export type VersioningCreateSnapshotOptions = {
  label?: string
  includeUntracked?: boolean
}

/** Options for enumerating history */
export type VersioningHistoryOptions = {
  maxCount?: number
  path?: string
}

/** Generic repository-versioning capability contract */
export interface VersioningCapability {
  readonly name: string
  readonly version: string

  /** Create a new versioned repository at the given root. */
  initializeRepository(ctx: ObservationContext, root: string): Promise<VersioningRepositoryDescriptor>

  /** Capture a new point in history from the working tree. */
  createRevision(
    ctx: ObservationContext,
    root: string,
    options: VersioningCreateRevisionOptions,
  ): Promise<VersioningRevisionDescriptor>

  /** Move the working tree to a named or anonymous revision. */
  switchRevision(
    ctx: ObservationContext,
    root: string,
    options: VersioningSwitchRevisionOptions,
  ): Promise<VersioningRevisionDescriptor>

  /** Combine two lines of history. */
  integrateRevision(
    ctx: ObservationContext,
    root: string,
    source: string,
    target: string,
    options?: VersioningIntegrateRevisionOptions,
  ): Promise<VersioningIntegrationResult>

  /** Send local history to a remote. */
  publishRevision(
    ctx: ObservationContext,
    root: string,
    source: string,
    options?: VersioningPublishRevisionOptions,
  ): Promise<VersioningPublishResult>

  /** Capture a lightweight, possibly labeled, working tree state. */
  createSnapshot(
    ctx: ObservationContext,
    root: string,
    options?: VersioningCreateSnapshotOptions,
  ): Promise<VersioningSnapshotDescriptor>

  /** Compute differences between two revisions. */
  compareRevisions(
    ctx: ObservationContext,
    root: string,
    a: string,
    b: string,
  ): Promise<VersioningRevisionComparison>

  /** Enumerate ancestors of the current revision. */
  history(ctx: ObservationContext, root: string, options?: VersioningHistoryOptions): Promise<VersioningRevisionEntry[]>

  /** Fetch remote state and reconcile local state. */
  synchronize(
    ctx: ObservationContext,
    root: string,
    remote?: string,
    options?: Record<string, unknown>,
  ): Promise<VersioningSynchronizeResult>
}

// ============================================================
// Observation types emitted by versioning adapters
// ============================================================

export type VersioningRepositoryObservation = {
  name: "versioning.repository"
  value: VersioningRepositoryDescriptor
}

export type VersioningBranchObservation = {
  name: "versioning.branch"
  value: {
    current: string
    others: string[]
    divergence: VersioningDivergenceDescriptor
  }
}

export type VersioningCommitObservation = {
  name: "versioning.commit"
  value: VersioningRevisionDescriptor
}

export type VersioningRemoteObservation = {
  name: "versioning.remote"
  value: {
    name: string
    url: string
    access: "read" | "write" | "none"
  }
}

export type VersioningPullRequestObservation = {
  name: "versioning.pullRequest"
  value: {
    number: number
    title: string
    source: string
    target: string
    state: "open" | "closed" | "merged"
  }
}

export type VersioningDivergenceObservation = {
  name: "versioning.divergence"
  value: VersioningDivergenceDescriptor
}

/** Union of all versioning observations */
export type VersioningObservation =
  | VersioningRepositoryObservation
  | VersioningBranchObservation
  | VersioningCommitObservation
  | VersioningRemoteObservation
  | VersioningPullRequestObservation
  | VersioningDivergenceObservation
