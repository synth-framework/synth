#!/usr/bin/env node
// ============================================================
// npm SCRIPT → TASK MIGRATION GENERATOR (EXP-TASK-004)
// ============================================================
// Reads package.json scripts and emits canonical task definitions
// in data/tasks/*.task.json. Safe to re-run; it will not overwrite
// existing task files.
// ============================================================

import fs from "fs/promises"
import path from "path"

const packagePath = path.resolve(process.cwd(), "package.json")
const tasksDir = path.resolve(process.cwd(), "data", "tasks")

function groupForScript(name) {
  if (name === "build") return "build"
  if (name === "start") return "runtime"
  if (name === "typecheck") return "build"
  if (name.startsWith("build:")) return "build"
  if (name.startsWith("test:")) {
    const rest = name.slice(5)
    if (rest.startsWith("audit") || rest.startsWith("proof") || rest.startsWith("replay") || rest === "graph-integrity" || rest === "determinism" || rest.startsWith("adversarial") || rest === "skr" || rest === "freeze-certification" || rest === "certification-framework" || rest === "core-boundary") return "certification"
    if (rest.startsWith("documentation")) return "documentation"
    if (rest.startsWith("environment")) return "environment"
    if (rest.startsWith("installer")) return "installer"
    if (rest.startsWith("ai") || rest === "ai-benchmark") return "ai"
    if (rest.startsWith("govern") || rest.startsWith("governance") || rest === "public-vocabulary-audit" || rest === "impact-analyzer" || rest.startsWith("validation-") || rest.startsWith("protected-asset-") || rest.startsWith("execution-gate-") || rest === "expedition-governance") return "governance"
    return "runtime"
  }
  if (name.startsWith("distribution:")) return "distribution"
  if (name.startsWith("mcp:")) return "runtime"
  if (name.startsWith("ai:")) return "ai"
  if (name.startsWith("docs:")) return "documentation"
  if (name.startsWith("govern")) return "governance"
  if (name === "verify" || name === "audit:repository") return "governance"
  if (name === "proof" || name.startsWith("proof:")) return "proof"
  if (name === "version:verify") return "release"
  if (name === "adapter") return "runtime"
  if (name === "bench:interruption") return "runtime"
  if (name === "test:all") return "runtime"
  return "runtime"
}

function dependsOnForScript(name) {
  const deps = []
  if (name.startsWith("govern") && name !== "govern:ci") deps.push("build")
  if (name === "proof") deps.push("build")
  if (name === "proof:verify") deps.push("proof")
  if (name === "docs:generate") deps.push("build")
  if (name.startsWith("mcp:")) deps.push("build")
  if (name === "version:verify") deps.push("build")
  return deps
}

function tagsForScript(name, group) {
  const tags = [group]
  if (name.startsWith("test:")) tags.push("test")
  if (name.startsWith("docs:")) tags.push("docs")
  if (name.startsWith("govern")) tags.push("governance")
  return tags
}

function estimateDurationMs(name) {
  if (name === "build" || name === "typecheck") return 60000
  if (name.startsWith("govern")) return 300000
  if (name === "test:all") return 600000
  if (name.startsWith("test:")) return 30000
  if (name.startsWith("docs:")) return 15000
  if (name === "proof") return 120000
  return 10000
}

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9:-]/g, "_")
}

async function main() {
  const packageJson = JSON.parse(await fs.readFile(packagePath, "utf-8"))
  const scripts = packageJson.scripts || {}

  await fs.mkdir(tasksDir, { recursive: true })

  const generated = []
  const skipped = []

  for (const [name, command] of Object.entries(scripts)) {
    const fileName = `${sanitizeFileName(name)}.task.json`
    const filePath = path.join(tasksDir, fileName)

    try {
      await fs.access(filePath)
      skipped.push(name)
      continue
    } catch {
      // file does not exist; generate
    }

    const group = groupForScript(name)
    const task = {
      id: name,
      description: `npm script migration: ${name}`,
      command,
      group,
      dependsOn: dependsOnForScript(name),
      tags: tagsForScript(name, group),
      estimatedDurationMs: estimateDurationMs(name),
      capabilities: [],
      lifecycle: "accepted",
    }

    await fs.writeFile(filePath, JSON.stringify(task, null, 2) + "\n", "utf-8")
    generated.push(name)
  }

  console.log(JSON.stringify({
    status: "ok",
    kind: "NpmTaskMigration",
    generated,
    skipped,
    total: Object.keys(scripts).length,
  }, null, 2))
}

main().catch((err) => {
  console.error(JSON.stringify({ status: "error", error: err.message }, null, 2))
  process.exit(1)
})
