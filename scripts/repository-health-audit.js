#!/usr/bin/env node
// ============================================================
// Repository Health Audit
// ============================================================
// Verifies that the repository layout matches the public release
// standard defined by EXP-REL-001.
//
// Usage: node scripts/repository-health-audit.js
// ============================================================

import { promises as fs } from "fs"
import path from "path"

const REQUIRED_ROOT_FILES = [
  "README.md",
  "LICENSE",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "SECURITY.md",
  "CHANGELOG.md",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
]

const REQUIRED_TOP_LEVEL_DIRS = [
  "src",
  "tests",
  "scripts",
  "docs",
  "examples",
  "data",
  "proof",
  ".github",
  ".githooks",
]

const FORBIDDEN_ROOT_FILES = [
  "architectural-constitution.md",
  "ASC-001-report.md",
  "audit-report-2026-06-29.md",
  "audit-report-2026-06-29-evidence.md",
  "AWS-001-implementation-report.md",
  "term-inventory.md",
  "term-migration-report.md",
  "trust-boundary.md",
]

const FORBIDDEN_TOP_LEVEL_DIRS = [
  "docs/adrs",
  "docs/philosophy",
  "docs/developer",
  "docs/agents",
  "docs/tutorials",
]

const REQUIRED_GITIGNORE_PATTERNS = [
  "node_modules/",
  "dist/",
  "data/",
  "data-test/",
  "proof/",
  "docs/generated/",
  ".env",
]

const REQUIRED_DOCS_SUBDIRS = [
  "docs/getting-started",
  "docs/guides",
  "docs/reference",
  "docs/architecture",
  "docs/operator",
  "docs/examples",
  "docs/expeditions",
  "docs/adr",
  "docs/generated",
  "docs/audits",
]

const CHECKS = []

function record(name, status, detail = "") {
  CHECKS.push({ name, status, detail })
  const icon = status === "PASS" ? "✓" : status === "WARN" ? "◆" : "✗"
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ""}`)
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function dirExists(dirPath) {
  try {
    const stat = await fs.stat(dirPath)
    return stat.isDirectory()
  } catch {
    return false
  }
}

async function main() {
  const root = process.cwd()
  let exitCode = 0

  console.log("Repository Health Audit")
  console.log("=======================\n")

  // Required root files
  for (const file of REQUIRED_ROOT_FILES) {
    const ok = await fileExists(path.join(root, file))
    record(`Root file: ${file}`, ok ? "PASS" : "FAIL", ok ? "present" : "missing")
    if (!ok) exitCode = 1
  }

  // Required top-level directories
  for (const dir of REQUIRED_TOP_LEVEL_DIRS) {
    const ok = await dirExists(path.join(root, dir))
    record(`Top-level directory: ${dir}`, ok ? "PASS" : "FAIL", ok ? "present" : "missing")
    if (!ok) exitCode = 1
  }

  // README in each top-level directory
  for (const dir of REQUIRED_TOP_LEVEL_DIRS) {
    if (dir.startsWith(".")) continue
    const readmePath = path.join(root, dir, "README.md")
    const ok = await fileExists(readmePath)
    record(`README in ${dir}/`, ok ? "PASS" : "FAIL", ok ? "present" : "missing")
    if (!ok) exitCode = 1
  }

  // Forbidden root files
  for (const file of FORBIDDEN_ROOT_FILES) {
    const present = await fileExists(path.join(root, file))
    record(`Obsolete root file absent: ${file}`, present ? "FAIL" : "PASS", present ? "still present" : "absent")
    if (present) exitCode = 1
  }

  // Forbidden top-level directories
  for (const dir of FORBIDDEN_TOP_LEVEL_DIRS) {
    const present = await dirExists(path.join(root, dir))
    record(`Obsolete directory absent: ${dir}/`, present ? "FAIL" : "PASS", present ? "still present" : "absent")
    if (present) exitCode = 1
  }

  // Required docs subdirectories
  for (const dir of REQUIRED_DOCS_SUBDIRS) {
    const ok = await dirExists(path.join(root, dir))
    record(`Docs subdirectory: ${dir}/`, ok ? "PASS" : "FAIL", ok ? "present" : "missing")
    if (!ok) exitCode = 1
  }

  // .gitignore checks
  const gitignorePath = path.join(root, ".gitignore")
  const gitignoreExists = await fileExists(gitignorePath)
  record(".gitignore present", gitignoreExists ? "PASS" : "FAIL")
  if (!gitignoreExists) {
    exitCode = 1
  } else {
    const gitignore = await fs.readFile(gitignorePath, "utf-8")
    for (const pattern of REQUIRED_GITIGNORE_PATTERNS) {
      const ok = gitignore.includes(pattern)
      record(`.gitignore ignores ${pattern}`, ok ? "PASS" : "FAIL", ok ? "configured" : "missing")
      if (!ok) exitCode = 1
    }
  }

  // Summary
  const pass = CHECKS.filter((c) => c.status === "PASS").length
  const fail = CHECKS.filter((c) => c.status === "FAIL").length
  const warn = CHECKS.filter((c) => c.status === "WARN").length

  console.log("\n=======================")
  console.log(`Result: ${fail === 0 ? "PASS" : "FAIL"}`)
  console.log(`  ${pass} passed, ${warn} warned, ${fail} failed`)

  process.exit(exitCode)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
