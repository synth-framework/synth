#!/usr/bin/env node
// ============================================================
// SYNTH Expedition Identity Governance Validator
// ============================================================
// Ensures Program and Expedition identifiers are unique, prefixes are
// registered, and cross-references are valid. Fails `npm run govern` if
// any identity rule is violated.
// ============================================================

import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXPEDITIONS_DIR = path.resolve(__dirname, "..", "docs", "expeditions")
const REGISTRY_PATH = path.join(EXPEDITIONS_DIR, "prefix-registry.json")

const EXPEDITION_ID_PATTERN = /^EXP-[A-Z0-9-]+-\d+$/

function splitIds(value) {
  if (!value || value.trim() === "") return []
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => EXPEDITION_ID_PATTERN.test(s))
}

async function loadRegistry() {
  const data = JSON.parse(await fs.readFile(REGISTRY_PATH, "utf-8"))
  return data
}

async function scanExpeditions() {
  const files = await fs.readdir(EXPEDITIONS_DIR)
  const mdFiles = files.filter((f) => f.endsWith(".md"))
  const entries = []

  for (const file of mdFiles) {
    const filePath = path.join(EXPEDITIONS_DIR, file)
    const content = await fs.readFile(filePath, "utf-8")
    const lines = content.split("\n")

    const titleMatch = lines[0]?.match(/^#\s+(EXP-[A-Z0-9-]+)\s+—\s+(.+)$/)
    const statusMatch = content.match(/\*\*Status:\*\*\s*(\w+)/)
    const programMatch = content.match(/\*\*Program:\*\*\s*(EXP-PROGRAM-\d+)\s+—/)
    const dependsMatch = content.match(/\*\*Depends On:\*\*\s*(.+)/)
    const blocksMatch = content.match(/\*\*Blocks:\*\*\s*(.+)/)

    const id = titleMatch ? titleMatch[1] : null
    const title = titleMatch ? titleMatch[2].trim() : null
    const status = statusMatch ? statusMatch[1] : null
    const program = programMatch ? programMatch[1] : null
    const dependsOn = dependsMatch ? splitIds(dependsMatch[1]) : []
    const blocks = blocksMatch ? splitIds(blocksMatch[1]) : []

    entries.push({
      file,
      id,
      title,
      status,
      program,
      dependsOn,
      blocks,
      isProgram: id?.startsWith("EXP-PROGRAM-"),
    })
  }

  return entries
}

function validate(entries, registry) {
  const issues = []
  const idCounts = new Map()
  const programCounts = new Map()
  const programTitles = new Map()
  const idToEntry = new Map()
  const registeredPrefixes = Object.keys(registry.prefixes)

  for (const entry of entries) {
    if (!entry.id) {
      issues.push({
        file: entry.file,
        severity: "error",
        message: `Missing or malformed expedition ID in title`,
      })
      continue
    }

    idCounts.set(entry.id, (idCounts.get(entry.id) || 0) + 1)
    idToEntry.set(entry.id, entry)

    if (entry.isProgram) {
      if (entry.program) {
        issues.push({
          file: entry.file,
          severity: "error",
          message: `Program ${entry.id} must not reference another Program`,
        })
      }
      programCounts.set(entry.id, (programCounts.get(entry.id) || 0) + 1)
      programTitles.set(entry.id, entry.title)
      continue
    }

    // Validate prefix is registered
    const prefixMatch = entry.id.match(/^EXP-([A-Z0-9-]+)-\d+$/)
    const prefix = prefixMatch ? prefixMatch[1] : null
    if (!prefix || !registeredPrefixes.includes(prefix)) {
      issues.push({
        file: entry.file,
        severity: "error",
        message: `Prefix '${prefix}' of ${entry.id} is not registered in prefix-registry.json`,
      })
    }

    // Validate program reference exists
    // Legacy expeditions may lack a Program line; require it only for Active expeditions.
    if (!entry.program) {
      if (entry.status === "Active") {
        issues.push({
          file: entry.file,
          severity: "error",
          message: `${entry.id} is Active but not assigned to a Program`,
        })
      } else {
        issues.push({
          file: entry.file,
          severity: "warning",
          message: `${entry.id} is not assigned to a Program`,
        })
      }
    } else if (!idToEntry.has(entry.program) && !entries.some((e) => e.id === entry.program)) {
      issues.push({
        file: entry.file,
        severity: "error",
        message: `${entry.id} references unknown Program ${entry.program}`,
      })
    }
  }

  // Check duplicate IDs
  for (const [id, count] of idCounts) {
    if (count > 1) {
      issues.push({
        severity: "error",
        message: `Expedition/Program ID ${id} appears ${count} times`,
      })
    }
  }

  // Check duplicate program IDs (redundant with duplicate ID check, but explicit)
  for (const [id, count] of programCounts) {
    if (count > 1) {
      issues.push({
        severity: "error",
        message: `Program ID ${id} appears ${count} times`,
      })
    }
  }

  // Check cross-references in Depends On / Blocks
  for (const entry of entries) {
    if (entry.isProgram) continue
    for (const ref of [...entry.dependsOn, ...entry.blocks]) {
      if (!idToEntry.has(ref)) {
        issues.push({
          file: entry.file,
          severity: "error",
          message: `${entry.id} references unknown expedition ${ref}`,
        })
      }
    }
  }

  // Check no expedition appears in two active programs
  const activeProgramsByExpedition = new Map()
  for (const entry of entries) {
    if (entry.isProgram) continue
    if (!entry.program || !entry.status) continue
    const programEntry = idToEntry.get(entry.program)
    if (!programEntry) continue
    if (programEntry.status === "Active") {
      if (!activeProgramsByExpedition.has(entry.id)) {
        activeProgramsByExpedition.set(entry.id, [])
      }
      activeProgramsByExpedition.get(entry.id).push(entry.program)
    }
  }

  for (const [expId, programs] of activeProgramsByExpedition) {
    if (programs.length > 1) {
      issues.push({
        severity: "error",
        message: `${expId} is assigned to multiple Active programs: ${programs.join(", ")}`,
      })
    }
  }

  return { issues, programTitles }
}

async function main() {
  console.log("═══════════════════════════════════════════════════")
  console.log("  SYNTH Expedition Identity Governance")
  console.log("  Validating Program and Expedition identifiers...")
  console.log("═══════════════════════════════════════════════════")

  const registry = await loadRegistry()
  const entries = await scanExpeditions()
  const { issues } = validate(entries, registry)

  const errors = issues.filter((i) => i.severity === "error")
  const warnings = issues.filter((i) => i.severity === "warning")

  if (errors.length === 0) {
    if (warnings.length === 0) {
      console.log("\n  ✅ All identity governance rules satisfied")
    } else {
      console.log(`\n  ✅ Identity governance rules satisfied with ${warnings.length} warning(s)`)
      for (const issue of warnings) {
        const location = issue.file ? `[${issue.file}] ` : ""
        console.log(`    - ${location}${issue.message}`)
      }
    }
    console.log(`  Expeditions checked: ${entries.filter((e) => !e.isProgram).length}`)
    console.log(`  Programs checked: ${entries.filter((e) => e.isProgram).length}`)
    console.log("═══════════════════════════════════════════════════\n")
    process.exit(0)
  }

  console.log(`\n  ❌ ${errors.length} error(s):`)
  for (const issue of errors) {
    const location = issue.file ? `[${issue.file}] ` : ""
    console.log(`    - ${location}${issue.message}`)
  }

  if (warnings.length > 0) {
    console.log(`\n  ⚠️  ${warnings.length} warning(s):`)
    for (const issue of warnings) {
      const location = issue.file ? `[${issue.file}] ` : ""
      console.log(`    - ${location}${issue.message}`)
    }
  }

  console.log("═══════════════════════════════════════════════════\n")
  process.exit(1)
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
