#!/usr/bin/env node
// ============================================================
// SYNTH: Core Boundary Audit (ADR-017)
// ============================================================
// Static scan enforcing ADR-006 §7: no component in the named
// Core directories may directly import environment-specific
// modules. All environment interaction must flow through the
// Environment Layer.
//
// crypto is not forbidden: it is deterministic pure computation
// (hashing, HMAC), not environment interaction.
//
// Usage: node scripts/audit-core-boundary.js [rootDir]
// Exit 0 = clean, Exit 1 = violations found
// ============================================================

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = process.argv[2] ?? path.join(__dirname, "..", "src")

// Core directories named in ADR-006 §7
const CORE_DIRECTORIES = [
  "core",
  "runtime",
  "control",
  "domain",
  "mission-studio",
  "genesis",
  "planning",
]

// Environment modules the Core must never touch directly
const FORBIDDEN_MODULES = [
  "fs",
  "fs/promises",
  "child_process",
  "os",
  "path",
  "net",
  "http",
  "https",
  "process",
  "worker_threads",
  "cluster",
  "dgram",
  "dns",
  "tls",
]

const moduleGroup = FORBIDDEN_MODULES.map((m) => m.replace("/", "\\/")).join("|")
const IMPORT_PATTERN = new RegExp(
  `(?:import|export)[^\\n]*?from\\s*["'](?:node:)?(?:${moduleGroup})["']|require\\(\\s*["'](?:node:)?(?:${moduleGroup})["']\\s*\\)`,
)

function scanFile(filePath) {
  const findings = []
  const content = fs.readFileSync(filePath, "utf-8")
  const lines = content.split("\n")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue
    if (IMPORT_PATTERN.test(line)) {
      findings.push({ file: filePath, line: i + 1, code: trimmed })
    }
  }
  return findings
}

function scanDir(dir) {
  const findings = []
  if (!fs.existsSync(dir)) return findings
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      findings.push(...scanDir(fullPath))
    } else if (entry.endsWith(".ts") || entry.endsWith(".js")) {
      findings.push(...scanFile(fullPath))
    }
  }
  return findings
}

// ============================================================
// RUN AUDIT
// ============================================================

console.log("\n═══════════════════════════════════════════════════")
console.log("  SYNTH CORE BOUNDARY AUDIT")
console.log("  Scanning Core directories for environment imports...")
console.log("═══════════════════════════════════════════════════\n")

const findings = []
for (const directory of CORE_DIRECTORIES) {
  findings.push(...scanDir(path.join(ROOT, directory)))
}

if (findings.length === 0) {
  console.log("  ✅ Core boundary clean")
  console.log("  No direct environment imports in Core directories")
  console.log(`  Directories: ${CORE_DIRECTORIES.join(", ")}`)
  console.log("\n═══════════════════════════════════════════════════\n")
  process.exit(0)
} else {
  console.log(`  ❌ ${findings.length} CORE BOUNDARY VIOLATION(S):\n`)
  for (const finding of findings) {
    console.log(`    ${path.relative(ROOT, finding.file)}:${finding.line}`)
    console.log(`      ${finding.code.slice(0, 90)}`)
  }
  console.log("")
  console.log("═══════════════════════════════════════════════════")
  console.log("  FIX: Route environment interaction through the")
  console.log("  Environment Layer capability providers (ADR-006 §7)")
  console.log("═══════════════════════════════════════════════════\n")
  process.exit(1)
}
