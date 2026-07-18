// ============================================================
// DISCOVERY ADAPTER: Git
// ============================================================
// Produces immutable observations about a Git repository.
//
// This adapter does not interpret repository health, activity, or
// abandonment. It only reports what exists in .git/ and the working
// tree. It uses a GitProvider abstraction for testability and to keep
// environment interaction explicit.
// ============================================================

import type { DiscoveryAdapter, DiscoveryContext, DiscoverySource, Observation } from "../types.js"
import type { GitProvider } from "../providers/git-provider.js"
import { createProcessGitProvider } from "../providers/process-git-provider.js"

export const GIT_ADAPTER_ID = "discovery:git"
export const GIT_ADAPTER_VERSION = "1.0.0"

function createObservation(
  source: DiscoverySource,
  fact: string,
  payload?: Record<string, unknown>,
): Observation {
  return {
    id: "",
    adapterId: GIT_ADAPTER_ID,
    adapterVersion: GIT_ADAPTER_VERSION,
    source,
    fact,
    payload,
    // Deterministic marker: the adapter is deterministic, so observations
    // must be reproducible across runs.
    timestamp: 1,
  }
}

function isEnvironmentDependent(workingTreeState: { clean: boolean }): boolean {
  return !workingTreeState.clean
}

/**
 * Create a Git discovery adapter backed by an arbitrary GitProvider.
 */
export function createGitDiscoveryAdapterWithProvider(git: GitProvider): DiscoveryAdapter {
  return {
    id: GIT_ADAPTER_ID,
    version: GIT_ADAPTER_VERSION,
    determinism: "deterministic",

    canHandle(source: DiscoverySource): boolean {
      return source.type === "filesystem"
    },

    async collectObservations(
      source: DiscoverySource,
      _context: DiscoveryContext,
    ): Promise<Observation[]> {
      if (source.type !== "filesystem") {
        return []
      }

      const path = source.path || "."
      const isRepo = await git.isGitRepository(path)

      if (!isRepo) {
        return [createObservation(source, "git repository not detected", { path })]
      }

      const state = await git.getRepositoryState(path)
      if (!state) {
        return [createObservation(source, "git repository state unavailable", { path })]
      }

      const observations: Observation[] = [
        createObservation(source, "git repository detected", {
          path,
          gitDir: state.gitDir,
          headRef: state.headRef,
          headSha: state.headSha,
          isBare: state.isBare,
          isShallow: state.isShallow,
          formatVersion: state.formatVersion,
        }),
      ]

      const remotes = await git.getRemotes(path)
      for (const remote of remotes) {
        observations.push(
          createObservation(source, "remote exists", {
            name: remote.name,
            url: remote.url,
          }),
        )
      }

      const branches = await git.getBranches(path)
      for (const branch of branches) {
        observations.push(
          createObservation(source, "branch exists", {
            name: branch.name,
            current: branch.current,
            ref: branch.ref,
          }),
        )
      }

      const tags = await git.getTags(path)
      for (const tag of tags) {
        observations.push(
          createObservation(source, "tag exists", {
            name: tag.name,
            ref: tag.ref,
          }),
        )
      }

      const commits = await git.getRecentCommits(path, 10)
      for (const commit of commits) {
        observations.push(
          createObservation(source, "commit observed", {
            sha: commit.sha,
            subject: commit.subject,
            authorName: commit.authorName,
            authorEmail: commit.authorEmail,
            timestamp: commit.timestamp,
          }),
        )
      }

      const workingTreeState = await git.getWorkingTreeState(path)
      observations.push(
        createObservation(source, "working tree state observed", {
          clean: workingTreeState.clean,
          modified: workingTreeState.modified,
          added: workingTreeState.added,
          deleted: workingTreeState.deleted,
          untracked: workingTreeState.untracked,
        }),
      )

      return observations
    },
  }
}

/**
 * Create a Git discovery adapter using the process GitProvider.
 *
 * This adapter is deterministic: given the same repository state it
 * produces the same observations.
 */
export function createGitDiscoveryAdapter(): DiscoveryAdapter {
  return createGitDiscoveryAdapterWithProvider(createProcessGitProvider())
}
