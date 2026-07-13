// ============================================================
// ADAPTER: GitHub — Types
// ============================================================

import type { AdapterState, AdapterHealth } from "../../types/index.js"

export type GitHubConfig = {
  owner: string
  repo: string
  token: string
  baseUrl?: string
  defaultBranch?: string
}

export type GitHubIssue = {
  number: number
  title: string
  state: string
  url: string
}

export type GitHubPullRequest = {
  number: number
  title: string
  state: string
  url: string
  head: string
  base: string
  mergeCommitSha?: string
}

export type GitHubRelease = {
  id: number
  tagName: string
  url: string
}

export type GitHubRepositoryStatus = {
  owner: string
  repo: string
  defaultBranch: string
  openIssues: number
  openPullRequests: number
  adapterEnabled: boolean
  state: AdapterState
}

export type GitHubRepositoryHealth = {
  healthy: boolean
  checks: {
    authenticated: boolean
    repositoryReachable: boolean
    defaultBranchExists: boolean
  }
  message: string
}

export type CreateIssueResult = {
  success: boolean
  issue?: GitHubIssue
  message: string
}

export type CreatePullRequestResult = {
  success: boolean
  pullRequest?: GitHubPullRequest
  message: string
}

export type MergePullRequestResult = {
  success: boolean
  pullRequest?: GitHubPullRequest
  mergeCommitSha?: string
  message: string
}

export type CreateReleaseResult = {
  success: boolean
  release?: GitHubRelease
  message: string
}

export interface GitHubAdapter {
  readonly metadata: {
    name: string
    version: string
    kind: "github"
    category: "integration"
    description: string
  }
  readonly state: AdapterState
  readonly health: AdapterHealth
  readonly config?: GitHubConfig

  initialize(): Promise<AdapterState>
  configure(config: Record<string, unknown>): Promise<AdapterState>
  validate(): Promise<AdapterState>
  enable(): Promise<AdapterState>
  disable(): Promise<AdapterState>
  healthCheck(): Promise<AdapterState>

  status(): Promise<GitHubRepositoryStatus>
  checkHealth(): Promise<GitHubRepositoryHealth>

  createIssue(title: string, body?: string): Promise<CreateIssueResult>
  updateIssue(number: number, updates: Partial<GitHubIssue>): Promise<CreateIssueResult>
  closeIssue(number: number): Promise<CreateIssueResult>

  createPullRequest(title: string, head: string, base: string, body?: string): Promise<CreatePullRequestResult>
  reviewPullRequest(number: number, event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT", body?: string): Promise<CreatePullRequestResult>
  mergePullRequest(number: number): Promise<MergePullRequestResult>

  createRelease(tagName: string, name: string, body?: string): Promise<CreateReleaseResult>

  syncRepository(): Promise<AdapterState>
}
