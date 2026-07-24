#!/usr/bin/env node
// ============================================================
// Capability Registry Snapshot (EXP-DOC-002, M10)
// ============================================================
// Reads src/capability/registry.ts, extracts capability names
// and descriptions from createDefaultCapabilities(), and writes
// docs/reference/capability-list.json.
//
// Usage: node scripts/generate-capability-list.js
// ============================================================

import { promises as fs } from "fs"
import path from "path"

const REGISTRY_PATH = path.join(process.cwd(), "src", "capability", "registry.ts")
const OUTPUT_PATH = path.join(process.cwd(), "docs", "reference", "capability-list.json")

/**
 * Parse capability definitions from the createDefaultCapabilities()
 * function in the registry file.
 *
 * Matches patterns like:
 *   {
 *     name: "CreateExpedition",
 *     description: "Create a new expedition",
 *     ...
 *   },
 */
function extractCapabilities(source) {
  const capabilities = []
  const capRe = /\{\s*\n\s*name:\s*"([^"]+)",\s*\n\s*description:\s*"([^"]+)",/g
  let match
  while ((match = capRe.exec(source)) !== null) {
    capabilities.push({
      name: match[1],
      description: match[2],
    })
  }
  return capabilities
}

async function main() {
  const source = await fs.readFile(REGISTRY_PATH, "utf-8")
  const capabilities = extractCapabilities(source)

  if (capabilities.length === 0) {
    console.error("No capabilities found in registry. Aborting.")
    process.exit(1)
  }

  const output = {
    schema: "synth-capability-list-v1",
    description: "Auto-generated capability list extracted from src/capability/registry.ts. Baseline for verifying against the hand-authored capability-validation-map.json.",
    generatedAt: new Date().toISOString(),
    count: capabilities.length,
    capabilities: capabilities.sort((a, b) => a.name.localeCompare(b.name)),
  }

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf-8")
  console.log(`Generated ${OUTPUT_PATH} with ${capabilities.length} capabilities.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
