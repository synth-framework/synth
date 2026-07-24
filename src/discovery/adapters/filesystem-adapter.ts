// ============================================================
// DISCOVERY ADAPTER: Filesystem
// ============================================================
// Produces immutable observations about a local filesystem directory.
//
// This adapter does not interpret, synthesize, or emit findings. It
// only reports what exists. It uses the FilesystemProvider capability
// so it remains environment-agnostic and testable.
// ============================================================

import {
  createPosixFilesystemProvider,
  type FilesystemProvider,
} from "../../infra/filesystem-provider.js"
import type { DiscoveryAdapter, DiscoveryContext, DiscoverySource, Observation } from "../types.js"

export const FILESYSTEM_ADAPTER_ID = "discovery:filesystem"
export const FILESYSTEM_ADAPTER_VERSION = "1.0.0"

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  ".synth",
  ".synth-discovery",
  "dist",
  "build",
  "coverage",
])

async function walkTopLevel(
  fs: FilesystemProvider,
  dir: string,
): Promise<{
  entries: string[]
  fileCount: number
  directoryCount: number
}> {
  const entries = await fs.listDirectory(dir)
  let fileCount = 0
  let directoryCount = 0

  for (const entry of entries) {
    if (entry.startsWith(".") || EXCLUDED_DIRS.has(entry)) continue
    const relative = dir ? `${dir}/${entry}` : entry
    const isDir = await fs.isDirectory(relative)
    if (isDir) {
      directoryCount++
    } else {
      fileCount++
    }
  }

  return { entries, fileCount, directoryCount }
}

async function listFilesRecursively(
  fs: FilesystemProvider,
  dir: string,
): Promise<string[]> {
  const files: string[] = []
  const entries = await fs.listDirectory(dir)
  for (const entry of entries) {
    if (entry.startsWith(".") || EXCLUDED_DIRS.has(entry)) continue
    const relative = dir ? `${dir}/${entry}` : entry
    const isDir = await fs.isDirectory(relative)
    if (isDir) {
      files.push(...await listFilesRecursively(fs, relative))
    } else {
      files.push(relative)
    }
  }
  return files
}

async function readPackageJsonDependencies(
  fs: FilesystemProvider,
  path: string,
): Promise<string[]> {
  const content = await fs.readFile(`${path}/package.json`)
  if (!content) return []
  try {
    const pkg = JSON.parse(content)
    const deps = Object.keys(pkg.dependencies || {})
    const devDeps = Object.keys(pkg.devDependencies || {})
    return [...deps, ...devDeps].sort()
  } catch {
    return []
  }
}

function createObservation(
  source: DiscoverySource,
  fact: string,
  payload?: Record<string, unknown>,
): Observation {
  return {
    id: "", // assigned by engine
    adapterId: FILESYSTEM_ADAPTER_ID,
    adapterVersion: FILESYSTEM_ADAPTER_VERSION,
    source,
    fact,
    payload,
    // Deterministic marker: the adapter is deterministic, so observations
    // must be reproducible across runs.
    timestamp: 1,
  }
}

/**
 * Create a filesystem discovery adapter backed by an arbitrary
 * FilesystemProvider. Useful for testing.
 */
export function createFilesystemDiscoveryAdapterWithProvider(
  fs: FilesystemProvider,
): DiscoveryAdapter {
  return {
    id: FILESYSTEM_ADAPTER_ID,
    version: FILESYSTEM_ADAPTER_VERSION,
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
        return [
          createObservation(source, "filesystem path does not exist", {
            path,
          }),
        ]
      }

      const isDir = await fs.isDirectory(path)
      if (!isDir) {
        return [
          createObservation(source, "filesystem path is not a directory", {
            path,
          }),
        ]
      }

      const { entries, fileCount, directoryCount } = await walkTopLevel(fs, path)
      const allFiles = await listFilesRecursively(fs, path)
      const totalFiles = allFiles.length

      const extensions = new Set<string>()
      for (const filePath of allFiles) {
        const basename = filePath.split("/").pop() ?? ""
        const dot = basename.lastIndexOf(".")
        if (dot > 0) {
          extensions.add(basename.slice(dot + 1).toLowerCase())
        }
      }

      const observations: Observation[] = [
        createObservation(source, "filesystem directory exists", {
          path,
          entryCount: entries.length,
        }),
        createObservation(source, "filesystem top-level entries observed", {
          path,
          entries,
        }),
        createObservation(source, "filesystem file count observed", {
          path,
          topLevelFileCount: fileCount,
          topLevelDirectoryCount: directoryCount,
          recursiveFileCount: totalFiles,
        }),
        createObservation(source, "File extension observed", {
          path,
          extensions: Array.from(extensions).sort(),
        }),
      ]

      const dirChecks = [
        { name: "src", kind: "implementation" },
        { name: "tests", kind: "tests" },
        { name: "test", kind: "tests" },
        { name: "docs", kind: "docs" },
        { name: "knowledge", kind: "knowledge" },
        { name: "architecture", kind: "architecture" },
      ]

      for (const check of dirChecks) {
        if (entries.includes(check.name)) {
          observations.push(
            createObservation(source, "directory exists", {
              path: `${path}/${check.name}`,
              kind: check.kind,
            }),
          )
        }
      }

      const manifestChecks = [
        { name: "package.json", type: "node" },
        { name: "Cargo.toml", type: "cargo" },
        { name: "pyproject.toml", type: "python" },
        { name: "requirements.txt", type: "python" },
        { name: "Pipfile", type: "python" },
        { name: "go.mod", type: "go" },
      ]

      for (const check of manifestChecks) {
        if (entries.includes(check.name)) {
          observations.push(
            createObservation(source, "manifest detected", {
              path: `${path}/${check.name}`,
              type: check.type,
            }),
          )
        }
      }

      if (entries.includes("package.json")) {
        const dependencies = await readPackageJsonDependencies(fs, path)
        if (dependencies.length > 0) {
          observations.push(
            createObservation(source, "manifest dependencies observed", {
              path: `${path}/package.json`,
              dependencies,
            }),
          )
        }
      }

      for (const filePath of allFiles) {
        const payload: Record<string, unknown> = { path: filePath }
        if (filePath.endsWith("/README.md") || filePath === "README.md") {
          payload.kind = "readme"
        }
        observations.push(createObservation(source, "file exists", payload))
      }

      return observations
    },
  }
}

/**
 * Create a filesystem discovery adapter.
 *
 * The adapter is deterministic: running it against the same directory
 * produces the same observations.
 */
export function createFilesystemDiscoveryAdapter(
  root: string = process.cwd(),
): DiscoveryAdapter {
  return createFilesystemDiscoveryAdapterWithProvider(createPosixFilesystemProvider(root))
}
