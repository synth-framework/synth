// ============================================================
// DISCOVERY: Session Provider
// ============================================================
// Provides a session-centric abstraction over the Discovery compiler.
//
// The default provider runs the Discovery engine against a target
// directory in a read-only, deterministic way. Future providers may
// load cached, remote, persisted, replayed, or signed sessions without
// changing Bootstrap.
// ============================================================

import fs from "fs/promises"
import path from "path"
import { createDefaultDiscoveryEngine } from "./engine.js"
import { createFilesystemObservationCapability } from "./capabilities/filesystem-capability.js"
import { createGitObservationCapability } from "./capabilities/git-capability.js"
import { createOperationalArtifactObservationCapability } from "./capabilities/operational-artifact-capability.js"
import type {
  DiscoveryInput,
  DiscoveryOptions,
  DiscoverySession,
  DiscoverySource,
} from "./types.js"

export type DiscoveryProviderContext = {
  targetDir?: string
  declaredIntent?: string
  options?: DiscoveryOptions
  // intentionally extensible for future providers
}

export interface DiscoverySessionProvider {
  id: string
  version: string
  /**
   * Produce a DiscoverySession from the supplied provider context.
   *
   * Must be read-only and deterministic for the same inputs.
   */
  discover(context: DiscoveryProviderContext): Promise<DiscoverySession>
}

export const DEFAULT_DISCOVERY_SESSION_PROVIDER_ID = "discovery:default-session-provider"
export const DEFAULT_DISCOVERY_SESSION_PROVIDER_VERSION = "1.0.0"

/**
 * Create the default DiscoverySessionProvider.
 *
 * The provider resolves the target directory, configures a filesystem
 * source, optionally enables the Git observation capability when a `.git`
 * directory is present, and returns a full DiscoverySession produced by
 * the default Discovery engine.
 */
export function createDefaultDiscoverySessionProvider(): DiscoverySessionProvider {
  return {
    id: DEFAULT_DISCOVERY_SESSION_PROVIDER_ID,
    version: DEFAULT_DISCOVERY_SESSION_PROVIDER_VERSION,

    async discover(context: DiscoveryProviderContext): Promise<DiscoverySession> {
      if (!context.targetDir) {
        throw new Error("targetDir is required")
      }

      const targetDir = path.resolve(context.targetDir)

      try {
        const stat = await fs.stat(targetDir)
        if (!stat.isDirectory()) {
          throw new Error(`Not a directory: ${targetDir}`)
        }
      } catch (error) {
        throw new Error(`Directory does not exist: ${targetDir}`)
      }

      const sources: DiscoverySource[] = [
        {
          type: "filesystem",
          path: targetDir,
        },
      ]

      let hasGitDirectory = false
      try {
        const gitStat = await fs.stat(path.join(targetDir, ".git"))
        hasGitDirectory = gitStat.isDirectory()
      } catch {
        // .git is not present; leave Git capability disabled.
      }

      const observationCapabilities = [
        createFilesystemObservationCapability(),
        createOperationalArtifactObservationCapability(),
      ]
      if (hasGitDirectory) {
        observationCapabilities.push(createGitObservationCapability())
      }

      const input: DiscoveryInput = {
        sources,
        declaredIntent: context.declaredIntent,
        options: context.options,
      }

      const engine = createDefaultDiscoveryEngine({ observationCapabilities })
      return engine.discover(input)
    },
  }
}
