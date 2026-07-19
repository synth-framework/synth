// ============================================================
// DISCOVERY PROVIDER: Git
// ============================================================
// Abstraction over Git repository introspection.
//
// Implementations must never modify the repository. They may read
// .git/, run read-only git commands, or return synthetic state for
// testing.
// ============================================================

export type GitRemote = {
  name: string
  url: string
}

export type GitBranch = {
  name: string
  current: boolean
  ref?: string
}

export type GitTag = {
  name: string
  ref: string
}

export type GitCommit = {
  sha: string
  subject: string
  authorName: string
  authorEmail: string
  timestamp: number
}

export type GitWorkingTreeState = {
  clean: boolean
  modified: number
  added: number
  deleted: number
  untracked: number
}

export type GitRepositoryState = {
  gitDir: string
  headRef?: string
  headSha?: string
  isBare: boolean
  isShallow: boolean
  formatVersion?: number
}

export interface GitProvider {
  /** Return true if the given path is inside a Git working tree. */
  isGitRepository(path: string): Promise<boolean>

  /** Read repository identity and format metadata. */
  getRepositoryState(path: string): Promise<GitRepositoryState | undefined>

  /** List configured remotes. */
  getRemotes(path: string): Promise<GitRemote[]>

  /** List local branches. */
  getBranches(path: string): Promise<GitBranch[]>

  /** List tags. */
  getTags(path: string): Promise<GitTag[]>

  /** Read recent commits from the current branch. */
  getRecentCommits(path: string, limit: number): Promise<GitCommit[]>

  /** Report working tree cleanliness. */
  getWorkingTreeState(path: string): Promise<GitWorkingTreeState>
}

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * In-memory GitProvider for testing.
 */
export function createInMemoryGitProvider(
  repositoryState: Record<string, GitRepositoryState | undefined> = {},
  remotes: Record<string, GitRemote[]> = {},
  branches: Record<string, GitBranch[]> = {},
  tags: Record<string, GitTag[]> = {},
  commits: Record<string, GitCommit[]> = {},
  workingTreeStates: Record<string, GitWorkingTreeState> = {},
): GitProvider {
  return {
    async isGitRepository(path: string): Promise<boolean> {
      return repositoryState[path] !== undefined
    },

    async getRepositoryState(path: string): Promise<GitRepositoryState | undefined> {
      return repositoryState[path]
    },

    async getRemotes(path: string): Promise<GitRemote[]> {
      return sortByName(remotes[path] ?? [])
    },

    async getBranches(path: string): Promise<GitBranch[]> {
      return sortByName(branches[path] ?? [])
    },

    async getTags(path: string): Promise<GitTag[]> {
      return sortByName(tags[path] ?? [])
    },

    async getRecentCommits(path: string, _limit: number): Promise<GitCommit[]> {
      return commits[path] ?? []
    },

    async getWorkingTreeState(path: string): Promise<GitWorkingTreeState> {
      return (
        workingTreeStates[path] ?? {
          clean: true,
          modified: 0,
          added: 0,
          deleted: 0,
          untracked: 0,
        }
      )
    },
  }
}
