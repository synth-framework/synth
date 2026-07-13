// ============================================================
// BOOTSTRAP: Repository Analyzer
// ============================================================
// Analyzes a target directory using Synth adapters and produces
// observations for Mission Studio. Does not mutate the repository.
// ============================================================

import fs from "fs"
import path from "path"
import { createAdapterRegistry } from "../adapters/registry.js"
import { collectPlanningObservations } from "../mission-studio/adapter-observation-collector.js"
import type { PlanningObservation } from "../planning/observation.js"

export type RepositoryType = "empty" | "node" | "python" | "polyglot" | "brownfield" | "unknown"

export type RepositoryAnalysis = {
  repositoryType: RepositoryType
  languages: string[]
  frameworks: string[]
  hasTests: boolean
  hasPackageManager: boolean
  fileCount: number
  observations: PlanningObservation[]
  adapterErrors: string[]
}

const NODE_SIGNALS = ["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "node_modules"]
const PYTHON_SIGNALS = ["requirements.txt", "pyproject.toml", "setup.py", "Pipfile", "poetry.lock"]
const JAVA_SIGNALS = ["pom.xml", "build.gradle", "gradlew"]
const GO_SIGNALS = ["go.mod", "go.sum"]
const RUST_SIGNALS = ["Cargo.toml", "Cargo.lock"]

function detectLanguages(root: string): string[] {
  const languages = new Set<string>()
  const files = fs.readdirSync(root)

  for (const signal of NODE_SIGNALS) {
    if (files.includes(signal)) languages.add("JavaScript/TypeScript")
  }
  for (const signal of PYTHON_SIGNALS) {
    if (files.includes(signal)) languages.add("Python")
  }
  for (const signal of JAVA_SIGNALS) {
    if (files.includes(signal)) languages.add("Java")
  }
  for (const signal of GO_SIGNALS) {
    if (files.includes(signal)) languages.add("Go")
  }
  for (const signal of RUST_SIGNALS) {
    if (files.includes(signal)) languages.add("Rust")
  }

  return Array.from(languages)
}

function detectFrameworks(root: string): string[] {
  const frameworks = new Set<string>()

  try {
    const packageJsonPath = path.join(root, "package.json")
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
      const frameworkMap: Record<string, string> = {
        next: "Next.js",
        react: "React",
        express: "Express",
        "@nestjs/core": "NestJS",
        fastify: "Fastify",
        vue: "Vue",
        svelte: "Svelte",
        nuxt: "Nuxt",
      }
      for (const [dep, name] of Object.entries(frameworkMap)) {
        if (deps[dep]) frameworks.add(name)
      }
    }
  } catch {
    // ignore malformed package.json
  }

  return Array.from(frameworks)
}

function detectTests(root: string): boolean {
  const testPatterns = ["test", "tests", "__tests__", "*.test.js", "*.test.ts", "*.spec.js", "*.spec.ts"]
  return testPatterns.some((pattern) => {
    if (pattern.includes("*")) {
      // crude glob check
      const ext = pattern.slice(pattern.indexOf(".") + 1)
      const files = fs.readdirSync(root)
      return files.some((f) => f.endsWith(ext))
    }
    return fs.existsSync(path.join(root, pattern))
  })
}

function countFiles(root: string): number {
  let count = 0
  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (["node_modules", ".git", "dist", "build", ".synth", "coverage"].includes(entry.name)) continue
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name))
      } else {
        count++
      }
    }
  }
  try {
    walk(root)
  } catch {
    // ignore permission errors
  }
  return count
}

function classifyRepository(root: string, languages: string[]): RepositoryType {
  const files = fs.readdirSync(root)
  const fileCount = countFiles(root)

  if (fileCount === 0) return "empty"
  if (languages.length > 1) return "polyglot"
  if (languages.length === 0 && fileCount > 5) return "brownfield"
  if (languages.includes("JavaScript/TypeScript")) return "node"
  if (languages.includes("Python")) return "python"
  return "unknown"
}

export async function analyzeRepository(targetDir: string): Promise<RepositoryAnalysis> {
  const resolvedDir = path.resolve(targetDir)
  if (!fs.existsSync(resolvedDir)) {
    throw new Error(`Directory does not exist: ${resolvedDir}`)
  }

  const originalCwd = process.cwd()
  process.chdir(resolvedDir)

  try {
    const languages = detectLanguages(resolvedDir)
    const frameworks = detectFrameworks(resolvedDir)
    const hasTests = detectTests(resolvedDir)
    const fileCount = countFiles(resolvedDir)
    const repositoryType = classifyRepository(resolvedDir, languages)

    const registry = createAdapterRegistry()

    // Configure filesystem adapter explicitly with target directory.
    const filesystem = registry.create("filesystem")
    await filesystem.configure({ rootDirectory: resolvedDir, maxSnippetLength: 500, includeHidden: false })
    await filesystem.enable()

    // Collect observations from adapters that can observe the current directory.
    const adapterNames = ["filesystem", "architecture", "dependency", "knowledge-extraction", "specification"]
    const observations = await collectPlanningObservations(registry, { adapterNames, enrich: true })

    // Adapter errors are not exposed directly by collectPlanningObservations,
    // so we surface a generic summary if no observations were produced.
    const adapterErrors: string[] = []
    if (observations.length === 0 && fileCount > 0) {
      adapterErrors.push("No observations produced by adapters despite files present")
    }

    return {
      repositoryType,
      languages,
      frameworks,
      hasTests,
      hasPackageManager: languages.includes("JavaScript/TypeScript") || languages.includes("Python"),
      fileCount,
      observations,
      adapterErrors,
    }
  } finally {
    process.chdir(originalCwd)
  }
}
