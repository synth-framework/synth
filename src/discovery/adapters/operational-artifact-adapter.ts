// ============================================================
// DISCOVERY ADAPTER: Operational Artifacts
// ============================================================
// Produces immutable observations about operational configuration
// artifacts checked into a repository.
//
// This adapter does not contact live systems. It only reports what
// operational files and directories exist. It uses the FilesystemProvider
// abstraction so it remains environment-agnostic and testable.
// ============================================================

import {
  createPosixFilesystemProvider,
  type FilesystemProvider,
} from "../../infra/filesystem-provider.js"
import type { DiscoveryAdapter, DiscoveryContext, DiscoverySource, Observation } from "../types.js"

export const OPERATIONAL_ARTIFACT_ADAPTER_ID = "discovery:operational-artifacts"
export const OPERATIONAL_ARTIFACT_ADAPTER_VERSION = "1.0.0"

type OperationalArtifactType = "container" | "deployment" | "database" | "cicd" | "infrastructure"

type OperationalPattern = {
  artifactType: OperationalArtifactType
  kind: string
  match: (entry: string, isDir: boolean, relativePath: string) => boolean
}

const OPERATIONAL_PATTERNS: OperationalPattern[] = [
  // Container
  {
    artifactType: "container",
    kind: "Dockerfile",
    match: (entry, _isDir) => /^Dockerfile(?:\.\w+)?$/i.test(entry),
  },
  {
    artifactType: "container",
    kind: "Containerfile",
    match: (entry, _isDir) => /^Containerfile(?:\.\w+)?$/i.test(entry),
  },
  {
    artifactType: "container",
    kind: "docker-compose",
    match: (entry, _isDir) => /^docker-compose\.(yml|yaml)$/i.test(entry),
  },
  {
    artifactType: "container",
    kind: "dockerignore",
    match: (entry, _isDir) => entry === ".dockerignore",
  },

  // Deployment
  {
    artifactType: "deployment",
    kind: "kubernetes-manifest",
    match: (entry, _isDir, relativePath) =>
      /\.(yaml|yml)$/i.test(entry) &&
      /(?:^|\/)(k8s|kubernetes|manifests|deploy|deployment|deployments)\//i.test(relativePath),
  },
  {
    artifactType: "deployment",
    kind: "helm-chart",
    match: (entry, isDir) => isDir && entry === "helm",
  },

  // Database
  {
    artifactType: "database",
    kind: "sql-schema",
    match: (entry, _isDir) => /^schema\.sql$/i.test(entry),
  },
  {
    artifactType: "database",
    kind: "prisma-schema",
    match: (entry, _isDir) => /^schema\.prisma$/i.test(entry),
  },
  {
    artifactType: "database",
    kind: "migration-directory",
    match: (entry, isDir) =>
      isDir && /^(migrations|migrate|db-migrations|schema-migrations)$/i.test(entry),
  },
  {
    artifactType: "database",
    kind: "knex-config",
    match: (entry, _isDir) => /^knexfile\.(js|ts)$/i.test(entry),
  },

  // CI/CD
  {
    artifactType: "cicd",
    kind: "github-workflow",
    match: (_entry, _isDir, relativePath) => /^\.github\/workflows\//i.test(relativePath),
  },
  {
    artifactType: "cicd",
    kind: "gitlab-ci",
    match: (entry, _isDir) => /^\.gitlab-ci\.(yml|yaml)$/i.test(entry),
  },
  {
    artifactType: "cicd",
    kind: "circleci-config",
    match: (entry, _isDir, relativePath) =>
      /^\.circleci\/config\.yml$/i.test(relativePath) || entry === ".circleci",
  },
  {
    artifactType: "cicd",
    kind: "jenkins-pipeline",
    match: (entry, _isDir) => /^Jenkinsfile(?:\.\w+)?$/i.test(entry),
  },
  {
    artifactType: "cicd",
    kind: "azure-pipelines",
    match: (entry, _isDir) => /^azure-pipelines\.(yml|yaml)$/i.test(entry),
  },

  // Infrastructure
  {
    artifactType: "infrastructure",
    kind: "terraform",
    match: (entry, _isDir) => /\.tf$/i.test(entry),
  },
  {
    artifactType: "infrastructure",
    kind: "terragrunt",
    match: (entry, _isDir) => /^terragrunt\.hcl$/i.test(entry),
  },
  {
    artifactType: "infrastructure",
    kind: "serverless-framework",
    match: (entry, _isDir) => /^serverless\.(yml|yaml|json|ts)$/i.test(entry),
  },
  {
    artifactType: "infrastructure",
    kind: "pulumi",
    match: (entry, _isDir) => /^Pulumi\.(yaml|yml)$/i.test(entry),
  },
  {
    artifactType: "infrastructure",
    kind: "cdktf",
    match: (entry, _isDir) => /^cdktf\.json$/i.test(entry),
  },
]

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  ".synth",
  ".synth-discovery",
  "dist",
  "build",
  "coverage",
])

async function walkOperationalArtifacts(
  fs: FilesystemProvider,
  dir: string,
  relativePrefix: string,
  depth: number,
  maxDepth: number,
  found: Array<{ artifactType: OperationalArtifactType; kind: string; path: string }>,
): Promise<void> {
  if (depth > maxDepth) return

  let entries: string[]
  try {
    entries = await fs.listDirectory(dir)
  } catch {
    return
  }

  for (const entry of entries) {
    if (entry.startsWith(".") && entry !== ".github" && entry !== ".circleci" && entry !== ".gitlab-ci.yml") {
      continue
    }
    if (EXCLUDED_DIRS.has(entry)) continue

    const relative = relativePrefix ? `${relativePrefix}/${entry}` : entry
    const fullPath = dir ? `${dir}/${entry}` : entry
    const isDir = await fs.isDirectory(fullPath)

    for (const pattern of OPERATIONAL_PATTERNS) {
      if (pattern.match(entry, isDir, relative)) {
        found.push({ artifactType: pattern.artifactType, kind: pattern.kind, path: relative })
      }
    }

    if (isDir) {
      await walkOperationalArtifacts(fs, fullPath, relative, depth + 1, maxDepth, found)
    }
  }
}

function createObservation(
  source: DiscoverySource,
  fact: string,
  payload?: Record<string, unknown>,
): Observation {
  return {
    id: "",
    adapterId: OPERATIONAL_ARTIFACT_ADAPTER_ID,
    adapterVersion: OPERATIONAL_ARTIFACT_ADAPTER_VERSION,
    source,
    fact,
    payload,
    timestamp: 1,
  }
}

/**
 * Create an operational artifact discovery adapter backed by an arbitrary
 * FilesystemProvider.
 */
export function createOperationalArtifactDiscoveryAdapterWithProvider(
  fs: FilesystemProvider,
): DiscoveryAdapter {
  return {
    id: OPERATIONAL_ARTIFACT_ADAPTER_ID,
    version: OPERATIONAL_ARTIFACT_ADAPTER_VERSION,
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
      const exists = await fs.pathExists(path)

      if (!exists) {
        return [createObservation(source, "operational artifact scan path does not exist", { path })]
      }

      const isDir = await fs.isDirectory(path)
      if (!isDir) {
        return [
          createObservation(source, "operational artifact scan path is not a directory", { path }),
        ]
      }

      const found: Array<{ artifactType: OperationalArtifactType; kind: string; path: string }> = []
      await walkOperationalArtifacts(fs, path, "", 0, 3, found)

      const observations: Observation[] = [
        createObservation(source, "operational artifact scan completed", {
          path,
          artifactCount: found.length,
        }),
      ]

      const families = new Set<OperationalArtifactType>()
      for (const artifact of found) {
        families.add(artifact.artifactType)
        observations.push(
          createObservation(source, "operational artifact detected", {
            artifactType: artifact.artifactType,
            kind: artifact.kind,
            path: artifact.path,
          }),
        )
      }

      for (const family of Array.from(families).sort()) {
        observations.push(
          createObservation(source, "operational artifact family observed", {
            artifactType: family,
          }),
        )
      }

      return observations
    },
  }
}

/**
 * Create the default operational artifact discovery adapter.
 *
 * The adapter is deterministic: running it against the same directory
 * produces the same observations.
 */
export function createOperationalArtifactDiscoveryAdapter(
  root: string = process.cwd(),
): DiscoveryAdapter {
  return createOperationalArtifactDiscoveryAdapterWithProvider(createPosixFilesystemProvider(root))
}
