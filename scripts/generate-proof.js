#!/usr/bin/env node
// ============================================================
// SYNTH: Proof Object Generator
// ============================================================
// Produces a machine-verifiable audit artifact.
//
// The proof object is evidence that, at a specific commit and build,
// the implementation satisfied the architectural constitution.
//
// Output: proof/proof-YYYY-MM-DD-HHMMSS.json
// ============================================================

import fs from "fs"
import path from "path"
import crypto from "crypto"
import { execSync } from "child_process"
import { bootstrap } from "../dist/core/bootstrap.js"
import { createReplayVerifier } from "../dist/core/replay-verifier.js"
import { rebuildState } from "../dist/runtime/replay.js"

function computeDistHash() {
  const files = execSync(
    "find dist -type f \\( -name '*.js' -o -name '*.d.ts' -o -name '*.js.map' \\) | sort",
    { encoding: "utf-8", shell: "/bin/bash" }
  )
    .split("\n")
    .filter(Boolean)

  const hash = crypto.createHash("sha256")
  for (const file of files) {
    hash.update(file)
    hash.update(fs.readFileSync(file))
  }
  return hash.digest("hex")
}

function computeSourceHash() {
  const files = execSync(
    "find src -type f -name '*.ts' | sort",
    { encoding: "utf-8", shell: "/bin/bash" }
  )
    .split("\n")
    .filter(Boolean)

  const hash = crypto.createHash("sha256")
  for (const file of files) {
    hash.update(file)
    hash.update(fs.readFileSync(file))
  }
  return hash.digest("hex")
}

async function runStructuralAudit() {
  try {
    execSync("node scripts/audit-bypass-map.js", { stdio: "pipe" })
    return { passed: true, detail: "No mutation bypass paths detected" }
  } catch {
    return { passed: false, detail: "Mutation bypass paths detected" }
  }
}

async function runReplayProof() {
  const ctx = await bootstrap({ infra: { persistence: "file" }, skipGenesis: true })
  const verifier = createReplayVerifier(ctx.infra.eventStore, ctx.infra.stateStore)
  const result = await verifier.verify()
  return {
    passed: result.consistent,
    chainValid: result.chainValid,
    replayHash: result.replayHash,
    operationalHash: result.liveHash,
    eventCount: result.eventCount,
    detail: result.explanation,
  }
}

async function runDeterminismProof() {
  try {
    execSync("node scripts/verify-determinism.js", { stdio: "pipe" })
    return { passed: true, detail: "Paired execution produced identical results" }
  } catch {
    return { passed: false, detail: "Nondeterminism detected" }
  }
}

async function runGraphIntegrityProof() {
  try {
    execSync("node scripts/verify-graph-integrity.js", { stdio: "pipe" })
    return { passed: true, detail: "Reference execution produced a fully valid aggregate graph" }
  } catch {
    return { passed: false, detail: "Graph integrity violations detected in reference execution" }
  }
}

async function runAdversarialProof() {
  try {
    execSync("node scripts/audit-adversarial.js", { stdio: "pipe" })
    return { passed: true, detail: "All attacks blocked" }
  } catch {
    return { passed: false, detail: "At least one attack succeeded" }
  }
}

async function main() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  SYNTH: Proof Object Generation")
  console.log("═══════════════════════════════════════════════════\n")

  const timestamp = new Date().toISOString()
  const commit = execSync("git rev-parse HEAD 2>/dev/null || echo 'unknown'", { encoding: "utf-8" }).trim()
  const distHash = computeDistHash()
  const sourceHash = computeSourceHash()

  console.log("  Building proof...")
  const structural = await runStructuralAudit()
  console.log("  - structural audit complete")
  const replay = await runReplayProof()
  console.log("  - replay proof complete")
  const determinism = await runDeterminismProof()
  console.log("  - determinism proof complete")
  const graphIntegrity = await runGraphIntegrityProof()
  console.log("  - graph integrity proof complete")
  const adversarial = await runAdversarialProof()
  console.log("  - adversarial proof complete")

  const ctx = await bootstrap({ infra: { persistence: "file" }, skipGenesis: true })
  const events = await ctx.infra.eventStore.loadAll()
  const replayed = rebuildState(events)

  const proof = {
    schema: "synth-proof-v1",
    generatedAt: timestamp,
    trust: {
      level: "ATL-7",
      target: "ATL-7",
      assessmentDate: timestamp,
    },
    baseline: {
      constitutionVersion: "1.0",
      kernelVersion: "1.0",
      languageVersion: "1.0",
      proofSchema: "synth-proof-v1",
    },
    repository: {
      commit,
      sourceHash,
    },
    build: {
      distHash,
    },
    runtime: {
      eventCount: events.length,
      replayHash: replayed.stateHash,
      projections: {
        workItems: Object.keys(replayed.workItems).length,
        plans: Object.keys(replayed.plans).length,
        milestones: Object.keys(replayed.milestones).length,
        projects: Object.keys(replayed.projects).length,
        missions: Object.keys(replayed.missions).length,
        expeditions: Object.keys(replayed.expeditions).length,
        objectives: Object.keys(replayed.objectives).length,
        discoveries: Object.keys(replayed.discoveries).length,
        decisions: Object.keys(replayed.decisions).length,
      },
    },
    proofs: {
      p1Structural: structural,
      p2Replay: replay,
      p2Determinism: determinism,
      p6GraphIntegrity: graphIntegrity,
      p4Adversarial: adversarial,
    },
    reproduction: {
      command: "npm run govern",
      expectedSourceHash: sourceHash,
      expectedDistHash: distHash,
      expectedReplayHash: replayed.stateHash,
      note: "Run from a clean checkout at the referenced commit. Timestamps and file paths are expected to differ; hashes must match.",
    },
    overall: {
      passed: structural.passed && replay.passed && determinism.passed && graphIntegrity.passed && adversarial.passed,
      summary: [
        `P1 Structural: ${structural.passed ? "PASS" : "FAIL"}`,
        `P2 Replay: ${replay.passed ? "PASS" : "FAIL"}`,
        `P2 Determinism: ${determinism.passed ? "PASS" : "FAIL"}`,
        `P6 Graph Integrity: ${graphIntegrity.passed ? "PASS" : "FAIL"}`,
        `P4 Adversarial: ${adversarial.passed ? "PASS" : "FAIL"}`,
      ],
    },
  }

  const outDir = path.join(process.cwd(), "proof")
  fs.mkdirSync(outDir, { recursive: true })
  const fileName = `proof-${timestamp.replace(/[:.]/g, "-")}.json`
  const outPath = path.join(outDir, fileName)
  fs.writeFileSync(outPath, JSON.stringify(proof, null, 2))

  console.log(`  Source hash:    ${sourceHash.slice(0, 16)}...`)
  console.log(`  Build hash:     ${distHash.slice(0, 16)}...`)
  console.log(`  Replay hash:    ${replayed.stateHash}`)
  console.log(`  Event count:    ${events.length}`)
  console.log(`  P1 Structural:  ${structural.passed ? "PASS" : "FAIL"}`)
  console.log(`  P2 Replay:      ${replay.passed ? "PASS" : "FAIL"}`)
  console.log(`  P2 Determinism: ${determinism.passed ? "PASS" : "FAIL"}`)
  console.log(`  P6 Graph:       ${graphIntegrity.passed ? "PASS" : "FAIL"}`)
  console.log(`  P4 Adversarial: ${adversarial.passed ? "PASS" : "FAIL"}`)
  console.log(`\n  Proof written: ${outPath}`)

  console.log("\n═══════════════════════════════════════════════════")
  console.log(`  ${proof.overall.passed ? "✅ PROOF ACCEPTED" : "❌ PROOF REJECTED"}`)
  console.log("═══════════════════════════════════════════════════\n")

  process.exit(proof.overall.passed ? 0 : 1)
}

main().catch((err) => {
  console.error("\n  ❌ FATAL:", err.message)
  process.exit(1)
})
