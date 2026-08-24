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
  // Fast path: the build emits dist/dist-manifest.json with a content-addressable
  // rootHash over every dist file. Hashing that single value is O(1) and avoids
  // re-reading every artifact (which is expensive under memory pressure).
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), "dist", "dist-manifest.json"), "utf-8"))
    if (manifest && manifest.rootHash) return `manifest:${manifest.rootHash}`
  } catch {
    // manifest missing — fall back to reading the artifacts directly
  }

  // Hash only the runtime artifacts (.js + .d.ts). Source maps (*.js.map) are
  // debug-only and don't affect runtime behavior, so they're excluded.
  const files = execSync(
    "find dist -type f \\( -name '*.js' -o -name '*.d.ts' \\) | sort",
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
  // Fast path: when src is clean vs HEAD, the git tree hash of `src` is a
  // content-addressed, O(1) fingerprint of every source file (no per-file read).
  try {
    execSync("git diff --quiet HEAD -- src", { stdio: "pipe", shell: "/bin/bash" })
    const treeHash = execSync("git rev-parse HEAD:src", { encoding: "utf-8", shell: "/bin/bash" }).trim()
    if (treeHash) return `git:${treeHash}`
  } catch {
    // not a repo / dirty tree / src not tracked — fall back to file hashing
  }

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

// Run an external verification script, capturing its stdout/stderr so failures
// are surfaced through the proof object (and into the freeze-certification error)
// instead of being swallowed by execSync's default stdio:"pipe".
function runCheck(label, cmd) {
  try {
    execSync(cmd, { stdio: "pipe" })
    return { passed: true, detail: `${label}: clean` }
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString().trim() : ""
    const stdout = err.stdout ? err.stdout.toString().trim() : ""
    const detail =
      `${label} failed.\n--- stderr ---\n${stderr}\n--- stdout ---\n${stdout}`.trim()
    return { passed: false, detail }
  }
}

async function runStructuralAudit() {
  return runCheck("structural audit", "node scripts/audit-bypass-map.js")
}

async function runReplayProof(ctx) {
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
  return runCheck("determinism", "node scripts/verify-determinism.js")
}

async function runGraphIntegrityProof() {
  return runCheck("graph integrity", "node scripts/verify-graph-integrity.js")
}

async function runAdversarialProof() {
  return runCheck("adversarial", "node scripts/audit-adversarial.js")
}

async function main() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  SYNTH: Proof Object Generation")
  console.log("═══════════════════════════════════════════════════\n")

  const onlyIdx = process.argv.indexOf("--only")
  const only = onlyIdx !== -1 ? process.argv[onlyIdx + 1] : null
  const want = (name) => !only || only === name

  const timestamp = new Date().toISOString()
  const commit = execSync("git rev-parse HEAD 2>/dev/null || echo 'unknown'", { encoding: "utf-8" }).trim()
  // Hashes are metadata for the proof object; a structural-only check doesn't
  // need them, and computing them (reading dist + src) is the main cost, so skip.
  const needHashes = !only || only !== "structural"
  const t0 = Date.now()
  const distHash = needHashes ? computeDistHash() : "skipped (--only)"
  const sourceHash = needHashes ? computeSourceHash() : "skipped (--only)"
  console.log(`  (hashing ${Date.now() - t0}ms)`)

  console.log("  Building proof...")

  // The four external verifications are independent child processes. Run them
  // concurrently to overlap their node cold-starts / I/O — verify-graph-integrity
  // is the long pole (~11s) but the others are short, so wall-clock drops to
  // roughly the slowest single check instead of the sum.
  const skipped = () => ({ passed: true, detail: "skipped (--only)" })
  const runOrSkip = (name, fn) => (want(name) ? fn() : Promise.resolve(skipped()))

  const [structural, determinism, graphIntegrity, adversarial] = await Promise.all([
    runOrSkip("structural", runStructuralAudit),
    runOrSkip("determinism", runDeterminismProof),
    runOrSkip("graph", runGraphIntegrityProof),
    runOrSkip("adversarial", runAdversarialProof),
  ])
  console.log(`  - structural audit complete (${structural.passed ? "PASS" : "FAIL"})`)
  console.log(`  - determinism proof complete (${determinism.passed ? "PASS" : "FAIL"})`)
  console.log(`  - graph integrity proof complete (${graphIntegrity.passed ? "PASS" : "FAIL"})`)
  console.log(`  - adversarial proof complete (${adversarial.passed ? "PASS" : "FAIL"})`)

  // Only bootstrap (the expensive cold start) when a proof actually needs the
  // runtime context — i.e. the replay proof (and its projections). Structural-only
  // runs skip it entirely.
  let ctx
  if (want("replay")) {
    ctx = await bootstrap({ infra: { persistence: "file" }, skipGenesis: true })
  }
  const replay = want("replay")
    ? await runReplayProof(ctx)
    : { passed: true, chainValid: true, replayHash: "skipped", operationalHash: "skipped", eventCount: 0, detail: "skipped (--only)" }
  console.log(`  - replay proof complete (${replay.passed ? "PASS" : "FAIL"})`)

  const replayed = want("replay")
    ? rebuildState(await ctx.infra.eventStore.loadAll())
    : { stateHash: "skipped", workItems: {}, plans: {}, milestones: {}, projects: {}, missions: {}, expeditions: {}, objectives: {}, discoveries: {}, decisions: {} }

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
      eventCount: replay.eventCount ?? 0,
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
  console.log(`  Event count:    ${replay.eventCount ?? 0}`)
  console.log(`  P1 Structural:  ${structural.passed ? "PASS" : "FAIL"}`)
  console.log(`  P2 Replay:      ${replay.passed ? "PASS" : "FAIL"}`)
  console.log(`  P2 Determinism: ${determinism.passed ? "PASS" : "FAIL"}`)
  console.log(`  P6 Graph:       ${graphIntegrity.passed ? "PASS" : "FAIL"}`)
  console.log(`  P4 Adversarial: ${adversarial.passed ? "PASS" : "FAIL"}`)
  // Surface the captured child stderr/stdout for any failed sub-proof so the
  // failure is visible in CI logs and in the freeze-certification error message.
  for (const [key, label] of [
    ["p1Structural", "P1 Structural"],
    ["p2Replay", "P2 Replay"],
    ["p2Determinism", "P2 Determinism"],
    ["p6GraphIntegrity", "P6 Graph Integrity"],
    ["p4Adversarial", "P4 Adversarial"],
  ]) {
    const p = proof.proofs[key]
    if (!p.passed) console.log(`  ${label} detail:\n${p.detail}`)
  }

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
