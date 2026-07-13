#!/usr/bin/env node
// ============================================================
// Documentation Projection Verification
// ============================================================
// Verifies that docs/generated/ is a pure function of docs/.
// Regenerates documentation into a temp directory and compares
// each file to the committed output. Any mismatch fails the build,
// preventing hand-edits of generated documentation.
//
// Usage: node scripts/verify-documentation-projection.js
// ============================================================

import { promises as fs } from "fs"
import path from "path"
import { spawnSync } from "child_process"
import os from "os"

const KNOWLEDGE_BASE_DIR = path.join(process.cwd(), "docs")
const COMMITTED_DIR = path.join(process.cwd(), "docs", "generated")
const CLI_PATH = path.join(process.cwd(), "dist", "cli", "synth.js")

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

async function main() {
  console.log("Verifying documentation projection...")

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-docs-projection-"))
  const generatedDir = path.join(tmpDir, "generated")

  try {
    // Force source links to resolve as if the output were committed to
    // docs/generated/, so the comparison is independent of the temp path.
    const linkPrefix = path.relative(COMMITTED_DIR, KNOWLEDGE_BASE_DIR).replace(/\\/g, "/")
    const result = spawnSync(
      "node",
      [CLI_PATH, "docs", "generate", "--out-dir", generatedDir, "--knowledge-base", KNOWLEDGE_BASE_DIR, "--link-prefix", linkPrefix],
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

    const committed = await readDirFiles(COMMITTED_DIR)
    const generated = await readDirFiles(generatedDir)

    const committedNames = Object.keys(committed).sort()
    const generatedNames = Object.keys(generated).sort()

    const missing = committedNames.filter((name) => !(name in generated))
    const extra = generatedNames.filter((name) => !(name in committed))
    const mismatched = []

    for (const name of generatedNames) {
      if (name in committed && committed[name] !== generated[name]) {
        mismatched.push(name)
      }
    }

    if (missing.length === 0 && extra.length === 0 && mismatched.length === 0) {
      console.log(`✅ docs/generated/ matches fresh projection (${committedNames.length} file(s)).`)
      process.exit(0)
    }

    console.log("❌ Documentation projection is out of sync.")
    if (missing.length > 0) {
      console.log("  Missing from generated output:")
      for (const name of missing) console.log(`    - ${name}`)
    }
    if (extra.length > 0) {
      console.log("  Extra files in generated output:")
      for (const name of extra) console.log(`    - ${name}`)
    }
    if (mismatched.length > 0) {
      console.log("  Mismatched files (regenerate with npm run docs:generate):")
      for (const name of mismatched) console.log(`    - ${name}`)
    }
    process.exit(1)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
