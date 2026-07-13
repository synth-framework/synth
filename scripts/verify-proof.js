#!/usr/bin/env node
// ============================================================
// SYNTH: Proof Verification and Reproduction
// ============================================================
// Given a proof artifact, this script:
//   1. Verifies the proof schema and required fields.
//   2. Re-runs the canonical governance pipeline.
//   3. Compares the freshly produced proof against the supplied proof.
//   4. Reports whether the proof is reproducible.
//
// Usage:
//   node scripts/verify-proof.js [path/to/proof.json]
//
// If no path is given, uses the most recent proof in proof/.
// ============================================================

import fs from "fs"
import path from "path"
import { execSync } from "child_process"

function findLatestProof() {
  const proofDir = path.join(process.cwd(), "proof")
  const files = fs.readdirSync(proofDir).filter((f) => f.startsWith("proof-") && f.endsWith(".json"))
  if (files.length === 0) throw new Error("No proof files found in proof/")
  files.sort()
  return path.join(proofDir, files[files.length - 1])
}

function loadProof(proofPath) {
  return JSON.parse(fs.readFileSync(proofPath, "utf-8"))
}

function validateSchema(proof) {
  const required = [
    "schema",
    "generatedAt",
    "trust.level",
    "baseline.constitutionVersion",
    "baseline.kernelVersion",
    "baseline.proofSchema",
    "repository.sourceHash",
    "build.distHash",
    "runtime.replayHash",
    "proofs.p1Structural.passed",
    "proofs.p2Replay.passed",
    "proofs.p2Determinism.passed",
    "proofs.p4Adversarial.passed",
    "overall.passed",
  ]

  const missing = []
  for (const key of required) {
    const parts = key.split(".")
    let current = proof
    for (const part of parts) {
      if (current === null || typeof current !== "object" || !(part in current)) {
        missing.push(key)
        break
      }
      current = current[part]
    }
  }

  if (missing.length > 0) {
    throw new Error(`Proof schema invalid. Missing fields: ${missing.join(", ")}`)
  }

  if (proof.schema !== "synth-proof-v1") {
    throw new Error(`Unsupported proof schema: ${proof.schema}`)
  }
}

function computeSourceHash() {
  const files = execSync("find src -type f -name '*.ts' | sort", { encoding: "utf-8", shell: "/bin/bash" })
    .split("\n")
    .filter(Boolean)
  const hash = require("crypto").createHash("sha256")
  for (const file of files) {
    hash.update(file)
    hash.update(fs.readFileSync(file))
  }
  return hash.digest("hex")
}

function runGovern() {
  execSync("npm run govern", { stdio: "inherit" })
}

function findFreshProof() {
  return findLatestProof()
}

function compareProofs(original, fresh) {
  const checks = {
    sourceHashMatches: original.repository.sourceHash === fresh.repository.sourceHash,
    distHashMatches: original.build.distHash === fresh.build.distHash,
    replayHashMatches: original.runtime.replayHash === fresh.runtime.replayHash,
    overallPassed: fresh.overall.passed,
    atlMatches: original.trust.level === fresh.trust.level,
  }

  const reproducible = Object.values(checks).every(Boolean)
  return { checks, reproducible }
}

async function main() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  SYNTH: Proof Verification / Reproduction")
  console.log("═══════════════════════════════════════════════════\n")

  const proofPath = process.argv[2] || findLatestProof()
  console.log(`  Verifying proof: ${proofPath}`)

  const original = loadProof(proofPath)
  validateSchema(original)

  console.log(`  Schema:           ${original.schema}`)
  console.log(`  ATL:              ${original.trust.level}`)
  console.log(`  Constitution:     ${original.baseline.constitutionVersion}`)
  console.log(`  Kernel:           ${original.baseline.kernelVersion}`)
  console.log(`  Source hash:      ${original.repository.sourceHash.slice(0, 16)}...`)
  console.log(`  Build hash:       ${original.build.distHash.slice(0, 16)}...`)
  console.log(`  Replay hash:      ${original.runtime.replayHash}`)
  console.log(`  Overall:          ${original.overall.passed ? "✅ PASS" : "❌ FAIL"}`)

  console.log("\n  Re-running canonical governance pipeline...")
  runGovern()

  const freshPath = findFreshProof()
  const fresh = loadProof(freshPath)

  console.log("\n  Comparing original proof to fresh proof...")
  const { checks, reproducible } = compareProofs(original, fresh)

  console.log(`    Source hash matches:  ${checks.sourceHashMatches ? "✅" : "❌"}`)
  console.log(`    Build hash matches:   ${checks.distHashMatches ? "✅" : "❌"}`)
  console.log(`    Replay hash matches:  ${checks.replayHashMatches ? "✅" : "❌"}`)
  console.log(`    Overall still passes: ${checks.overallPassed ? "✅" : "❌"}`)
  console.log(`    ATL unchanged:        ${checks.atlMatches ? "✅" : "❌"}`)

  console.log("\n═══════════════════════════════════════════════════")
  if (reproducible) {
    console.log("  ✅ PROOF IS REPRODUCIBLE")
  } else {
    console.log("  ❌ PROOF IS NOT REPRODUCIBLE")
  }
  console.log("═══════════════════════════════════════════════════\n")

  process.exit(reproducible ? 0 : 1)
}

main().catch((err) => {
  console.error("\n  ❌ FATAL:", err.message)
  process.exit(1)
})
