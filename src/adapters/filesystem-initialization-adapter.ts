// ============================================================
// ADAPTER: Filesystem Initialization
// ============================================================
// First concrete InitializationAdapter.
//
// Discovers a local directory and produces governed evidence without
// using AI or inventing implementation details. It only reports what
// exists and infers a coarse lifecycle stage from directory shape.
// ============================================================

import type {
  InitializationAdapter,
  InitializationInput,
  InitializationEvidence,
  SourceType,
} from "./initialization-adapter.js"
import type { LifecycleStage, DomainModel, Constraint, ConfidenceScore } from "../initialization/project-model.js"
import { createPosixFilesystemProvider, type FilesystemProvider } from "../environment/filesystem-capability.js"

export const FILESYSTEM_ADAPTER_VERSION = "1.0.0"

const SPECIFICATION_SIGNALS = new Set([
  "knowledge",
  "docs",
  "documentation",
  "architecture",
  "requirements",
  "design",
  "spec",
  "specification",
])

const IMPLEMENTATION_SIGNALS = new Set([
  "src",
  "tests",
  "test",
  "package.json",
  "cargo.toml",
  "pyproject.toml",
  "go.mod",
  "composer.json",
  "gemfile",
])

async function walkTopLevel(fs: FilesystemProvider, dir: string): Promise<{
  entries: string[]
  fileCount: number
  directoryCount: number
  extensions: Set<string>
}> {
  const top = await fs.listDirectory(dir)
  const extensions = new Set<string>()
  let fileCount = 0
  let directoryCount = 0

  for (const entry of top) {
    if (entry.startsWith(".")) continue
    const relative = dir ? `${dir}/${entry}` : entry
    const isDir = await fs.isDirectory(relative)
    if (isDir) {
      directoryCount++
    } else {
      fileCount++
      const dot = entry.lastIndexOf(".")
      if (dot > 0) extensions.add(entry.slice(dot + 1).toLowerCase())
    }
  }

  return { entries: top, fileCount, directoryCount, extensions }
}

function inferLifecycleStage(
  entries: string[],
  fileCount: number,
  extensions: Set<string>,
): LifecycleStage {
  const lowerEntries = entries.map((e) => e.toLowerCase())

  const hasSpecSignal = lowerEntries.some((e) => SPECIFICATION_SIGNALS.has(e))
  const hasImplSignal = lowerEntries.some((e) => IMPLEMENTATION_SIGNALS.has(e))
  const mostlyMarkdown = extensions.has("md") && extensions.size <= 2 && fileCount > 0

  if (hasImplSignal) return "implementation"
  if (hasSpecSignal || mostlyMarkdown) return "specification"
  return "unknown"
}

function computeConfidence(stage: LifecycleStage): ConfidenceScore {
  if (stage === "unknown") return { value: 0, label: "none" }
  if (stage === "specification") return { value: 0.5, label: "medium" }
  return { value: 0.4, label: "medium" }
}

export function createFilesystemInitializationAdapter(root: string = process.cwd()): InitializationAdapter {
  return {
    id: "filesystem",
    version: FILESYSTEM_ADAPTER_VERSION,

    canHandle(input: InitializationInput): boolean {
      return input.sourceType === "filesystem"
    },

    async collectEvidence(input: InitializationInput): Promise<InitializationEvidence> {
      const fs = createPosixFilesystemProvider(root)
      const location = input.sourceLocation || "."

      if (!(await fs.pathExists(location))) {
        return {
          adapterId: this.id,
          adapterVersion: this.version,
          sourceType: "filesystem" as SourceType,
          intent: input.declaredIntent ?? "unknown",
          summary: `Source location ${location} does not exist`,
          confidence: { value: 0, label: "none" },
        }
      }

      const { entries, fileCount, directoryCount, extensions } = await walkTopLevel(fs, location)
      const lifecycleStage = inferLifecycleStage(entries, fileCount, extensions)
      const confidence = computeConfidence(lifecycleStage)

      const domains: DomainModel[] = []
      const constraints: Constraint[] = []

      if (entries.includes("knowledge") || entries.includes("docs")) {
        domains.push({ name: "documentation", description: "Documentation and knowledge artifacts" })
      }
      if (entries.includes("architecture")) {
        domains.push({ name: "architecture", description: "Architecture specifications" })
      }
      if (entries.includes("src") || entries.includes("tests")) {
        domains.push({ name: "implementation", description: "Implementation source and tests" })
      }

      return {
        adapterId: this.id,
        adapterVersion: this.version,
        sourceType: "filesystem" as SourceType,
        lifecycleStage,
        intent: input.declaredIntent ?? "unknown",
        domains,
        constraints,
        summary:
          `Filesystem scan of ${location}: ${fileCount} file(s), ${directoryCount} directory(s), ` +
          `extensions=[${Array.from(extensions).join(", ")}], inferred stage=${lifecycleStage}`,
        confidence,
      }
    },
  }
}
