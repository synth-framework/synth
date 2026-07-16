#!/usr/bin/env node
// ============================================================
// SYNTH: First Contact Archive A Integrity Verification
// ============================================================
// Verifies that Archive A — the pre-hardening evidence archive of the
// canonical First Contact journey — remains byte-identical to its
// pinned state (EXP-FIRSTCONTACT-009; PROGRAM-010 finding F2).
//
// Reads archive-a.sha256, recomputes each artifact's hash, and
// compares. Any missing file or hash mismatch fails the check.
//
// Exit 0 = archive intact
// Exit 1 = pin file missing, artifact missing, or hash mismatch
// ============================================================

import crypto from "crypto"
import fs from "fs"
import path from "path"

const ARCHIVE_DIR = path.resolve(
  process.cwd(),
  "examples",
  "first-contact",
  "recorded-journey",
  "evidence-archive"
)
const PIN_FILE = path.join(ARCHIVE_DIR, "archive-a.sha256")

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex")
}

function main() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  SYNTH: First Contact Archive A Integrity")
  console.log("═══════════════════════════════════════════════════\n")

  if (!fs.existsSync(PIN_FILE)) {
    console.error(`  ❌ FATAL: pin file missing: ${PIN_FILE}`)
    process.exit(1)
  }

  const entries = fs
    .readFileSync(PIN_FILE, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => {
      const [hash, name] = line.split(/\s+/)
      return { hash, name }
    })

  if (entries.length === 0) {
    console.error("  ❌ FATAL: pin file contains no hash entries")
    process.exit(1)
  }

  console.log(`  Archive: ${ARCHIVE_DIR}`)
  console.log(`  Pinned artifacts: ${entries.length}\n`)

  let failures = 0
  for (const { hash, name } of entries) {
    const filePath = path.join(ARCHIVE_DIR, name)
    if (!fs.existsSync(filePath)) {
      console.log(`  ❌ MISSING   ${name}`)
      failures++
      continue
    }
    const actual = sha256(filePath)
    if (actual === hash) {
      console.log(`  ✅ INTACT    ${name}`)
    } else {
      console.log(`  ❌ MODIFIED  ${name}`)
      console.log(`      pinned:   ${hash}`)
      console.log(`      computed: ${actual}`)
      failures++
    }
  }

  console.log()
  if (failures > 0) {
    console.log(`  ❌ ARCHIVE A INTEGRITY FAILURE: ${failures} artifact(s) failed verification`)
    console.log("  Archive A is immutable historical evidence and must not change.")
    process.exit(1)
  }
  console.log("  ✅ ARCHIVE A INTACT — all pinned artifacts byte-identical")
}

main()
