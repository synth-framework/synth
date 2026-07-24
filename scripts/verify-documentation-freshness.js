#!/usr/bin/env node
// ============================================================
// Documentation Freshness Verifier (EXP-DOC-002, M9)
// ============================================================
// Regenerates all projections to a temp directory and compares
// against the committed docs/generated/ files. Exits with code 0
// if all files match, code 1 if any file is stale.
//
// Usage: node scripts/verify-documentation-freshness.js
// ============================================================

import { promises as fs } from "fs"
import path from "path"
import os from "os"

const KNOWLEDGE_BASE_DIR = path.join(process.cwd(), "docs")
const GENERATED_DIR = path.join(process.cwd(), "docs", "generated")
const CLI_PATH = path.join(process.cwd(), "dist", "cli", "synth.js")

const REQUIRED_PROJECTIONS = [
  "README.md",
  "ARCHITECTURE.md",
  "API.md",
  "OPERATOR_GUIDE.md",
  "DEVELOPER_GUIDE.md",
  "ARCHITECT_GUIDE.md",
  "AI_CONTEXT.md",
]

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(full)
    } else {
      yield full
    }
  }
}

async function readDirFiles(dir) {
  const files = {}
  try {
    await fs.access(dir)
  } catch {
    return files
  }
  for await (const file of walk(dir)) {
    const relative = path.relative(dir, file)
    files[relative] = await fs.readFile(file, "utf-8")
  }
  return files
}

async function runProjection(outputDir) {
  const { spawnSync } = await import("child_process")
  const linkPrefix = path.relative(outputDir, KNOWLEDGE_BASE_DIR).replace(/\\/g, "/")
  const result = spawnSync(
    "node",
    [CLI_PATH, "docs", "generate", "--out-dir", outputDir, "--knowledge-base", KNOWLEDGE_BASE_DIR, "--link-prefix", linkPrefix],
    {
      cwd: process.cwd(),
      encoding: "utf-8",
      timeout: 120000,
    },
  )
  if (result.status !== 0) {
    console.error(result.stderr)
    throw new Error(`docs generate failed with exit code ${result.status}`)
  }
}

async function main() {
  console.log("Verifying documentation freshness...")

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-docs-freshness-"))

  try {
    await runProjection(tmpDir)
    const regenerated = await readDirFiles(tmpDir)
    const existing = await readDirFiles(GENERATED_DIR)

    const regenNames = Object.keys(regenerated).sort()
    const existingNames = Object.keys(existing).sort()

    const missing = REQUIRED_PROJECTIONS.filter((name) => !(name in regenerated))
    if (missing.length > 0) {
      console.log("❌ Required projections could not be regenerated:")
      for (const name of missing) console.log(`    - ${name}`)
      process.exit(1)
    }

    let hasDiff = false
    const allNames = new Set([...regenNames, ...existingNames])

    for (const name of allNames) {
      if (!(name in regenerated)) {
        console.log(`❌ Stale: ${name} was removed from generated output but still exists in ${GENERATED_DIR}`)
        hasDiff = true
        continue
      }
      if (!(name in existing)) {
        console.log(`❌ Stale: ${name} is newly generated but missing from ${GENERATED_DIR}`)
        hasDiff = true
        continue
      }
      if (regenerated[name] !== existing[name]) {
        console.log(`❌ Stale: ${name} content differs from regenerated output`)
        hasDiff = true
      }
    }

    if (hasDiff) {
      console.log("\n📝 Run `npm run docs:generate` to regenerate all documentation.")
      process.exit(1)
    }

    console.log(`✅ Documentation is fresh (${regenNames.length} projection(s) match committed output).`)
    process.exit(0)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
