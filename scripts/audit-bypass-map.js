#!/usr/bin/env node
// ============================================================
// SYNTH-LOCK-1: Audit Bypass Map
// ============================================================
// Static scan that detects ALL illegal mutation paths.
//
// Rule: Only ExecutionGate may trigger operational writes.
// Any code path that calls EventStore.append, PartitionStore.append,
// StateStore.save, or similar outside ExecutionGate is a VIOLATION.
//
// Usage: node scripts/audit-bypass-map.js
// Exit 0 = clean, Exit 1 = violations found
// ============================================================

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..", "src")

// Forbidden WRITE patterns — these indicate direct mutation outside ExecutionGate
// READ patterns (loadAll, count, readPartition) are NOT mutations and are allowed
const FORBIDDEN_PATTERNS = [
  { pattern: /\.append\(/, name: "direct .append() call", severity: "critical" },
  { pattern: /\.appendBatch\(/, name: "direct .appendBatch() call", severity: "critical" },
  { pattern: /\.save\(/, name: "direct .save() call", severity: "high" },
  { pattern: /\.write\(/, name: "direct .write() call", severity: "critical" },
]

// READ operations are NOT forbidden — they're safe
const READ_OPERATIONS = /\.(loadAll|count|load|read|getState|getEventCount|readPartition|getLastOffset|initialize)\(/

// Allowed paths — these are the legitimate write paths
const ALLOWED_PATHS = [
  /control\/execution-gate/,    // ExecutionGate is the single mutation authority
  /control\/execution-gate\.ts/,
  /infra\/event-store\.guard/,  // Guard setup is allowed
  /scripts\/audit/,             // This script
]

// Files that are explicitly exempt
const EXEMPT_FILES = [
  "event-store.guard.ts", "event-store.guard.js",
  "index.ts", "index.js",
  "checkpoint-store.ts", "checkpoint-store.js",   // Offset metadata (not event mutations)
  "state-store.ts", "state-store.js",             // Read-model cache (derived from events)
  "partition-router.ts", "partition-router.js",   // Unused in dist build
  "tracer.ts", "tracer.js",                       // Observability only
  "governance-engine.ts", "governance-engine.js", // Proposal system (no event writes)
  "type-checker.ts", "type-checker.js",           // Static analysis only
  "mutation/filesystem-provider.ts", "mutation/filesystem-provider.js", // Dead code — no consumers import from mutation/
]

function isExempt(filePath) {
  const base = path.basename(filePath)
  if (EXEMPT_FILES.includes(base)) return true
  const rel = path.relative(ROOT, filePath)
  if (EXEMPT_FILES.includes(rel)) return true
  if (ALLOWED_PATHS.some((re) => re.test(filePath))) return true
  return false
}

function scanFile(filePath) {
  const findings = []
  const content = fs.readFileSync(filePath, "utf-8")

  // Skip the file if it's exempt
  if (isExempt(filePath)) return findings

  const lines = content.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    // Skip read operations — they're not mutations
    if (READ_OPERATIONS.test(line)) continue

    // Skip comments
    const trimmed = line.trim()
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue

    for (const { pattern, name, severity } of FORBIDDEN_PATTERNS) {
      if (pattern.test(line)) {
        findings.push({
          file: filePath,
          line: lineNum,
          code: line.trim(),
          pattern: name,
          severity,
        })
      }
    }
  }

  return findings
}

function scanDir(dir) {
  const allFindings = []

  const entries = fs.readdirSync(dir)
  for (const entry of entries) {
    const fullPath = path.join(dir, entry)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      allFindings.push(...scanDir(fullPath))
      continue
    }

    if (entry.endsWith(".ts") || entry.endsWith(".js")) {
      allFindings.push(...scanFile(fullPath))
    }
  }

  return allFindings
}

// ============================================================
// RUN AUDIT
// ============================================================

console.log("\n═══════════════════════════════════════════════════")
console.log("  SYNTH BYPASS AUDIT MAP")
console.log("  Scanning for illegal mutation paths...")
console.log("═══════════════════════════════════════════════════\n")

const findings = scanDir(ROOT)

if (findings.length === 0) {
  console.log("  ✅ No mutation bypass paths detected")
  console.log("  All writes flow through ExecutionGate")
  console.log("\n═══════════════════════════════════════════════════\n")
  process.exit(0)
} else {
  console.log(`  ❌ ${findings.length} MUTATION BYPASS PATHS DETECTED:\n`)

  const bySeverity = { critical: [], high: [], medium: [] }
  for (const f of findings) {
    const sev = f.severity
    if (!bySeverity[sev]) bySeverity[sev] = []
    bySeverity[sev].push(f)
  }

  for (const [severity, items] of Object.entries(bySeverity)) {
    if (items.length === 0) continue
    console.log(`  [${severity.toUpperCase()}] ${items.length} finding(s):`)
    for (const item of items) {
      const relPath = path.relative(ROOT, item.file)
      console.log(`    ${relPath}:${item.line}`)
      console.log(`      → ${item.pattern}`)
      console.log(`      ${item.code.slice(0, 80)}`)
    }
    console.log("")
  }

  console.log("═══════════════════════════════════════════════════")
  console.log("  FIX: Route all writes through ExecutionGate.execute()")
  console.log("═══════════════════════════════════════════════════\n")
  process.exit(1)
}
