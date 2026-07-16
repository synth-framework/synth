#!/usr/bin/env node
// ============================================================
// SYNTH: Graph Integrity Proof (EXP-HARDEN-005)
// ============================================================
// First-class constitutional proof, equal in importance to Replay
// Integrity.
//
// The proof certifies a FRESHLY GENERATED reference execution, not the
// repository's canonical log: the canonical data/event-log.jsonl is
// gitignored local runtime state (absent in CI) and may carry
// pre-HARDEN-001 pollution preserved as immutable forensic evidence
// (checkable via scripts/verify-replay.js --strict-graph --log).
//
// Reference execution (the real pipeline through dist/, sandboxed in
// os.tmpdir() with its own event log):
//   Mission Studio session → approve → genesisFromSnapshot
//     → ExecutionGate → event log → validateGraphIntegrity
//
// A valid reference execution proves the CURRENT system produces valid
// aggregate graphs — the regression ratchet for EXP-HARDEN-001…004 —
// and is environment-independent.
//
// Exit 0 = reference execution graph fully valid, proof artifact written
// Exit 1 = any graph integrity violation
//
// Flags:
//   --out <path>   write the proof artifact here instead of the default
//                  proof/graph-integrity-proof-<timestamp>.json
//                  (tests and local runs point this at os.tmpdir())
// ============================================================

import fs from "fs"
import path from "path"
import os from "os"
import crypto from "crypto"
import { execSync } from "child_process"
import { bootstrap } from "../dist/core/bootstrap.js"
import { rebuildState } from "../dist/runtime/replay.js"
import { sha256 } from "../dist/core/hash.js"
import {
  validateGraphIntegrity,
  GRAPH_INTEGRITY_VALIDATOR_VERSION,
} from "../dist/core/graph-integrity.js"

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

function makeObservation(type, subject, overrides = {}) {
  return {
    id: `obs-${type}-${subject.toLowerCase().replace(/\s+/g, "-")}`,
    sourceAdapter: "graph-integrity-proof",
    type,
    payload: { subject, name: subject, ...overrides },
    evidenceReference: `evidence-${type}-${subject}`,
    confidence: "high",
    timestamp: 1000,
  }
}

// The reference execution: a real Mission Studio → approval → Genesis
// flow, sandboxed so no repository path is ever touched.
async function runReferenceExecution() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "synth-graph-integrity-proof-"))
  const ctx = await bootstrap({
    skipGenesis: true,
    infra: {
      persistence: "file",
      eventLogPath: path.join(dir, "event-log.jsonl"),
      statePath: path.join(dir, "canonical-state.json"),
      checkpointPath: path.join(dir, "checkpoints.json"),
      streamDir: path.join(dir, "event-stream"),
      gitEnabled: false,
    },
  })

  const session = ctx.missionStudio.startSession([
    makeObservation("mission", "Graph Integrity Reference Mission", {
      purpose: "Certify the aggregate graph produced by the current pipeline",
    }),
    makeObservation("expedition", "Graph Integrity Reference Expedition", {
      missionSubject: "Graph Integrity Reference Mission",
      goal: "Produce a valid mission/expedition/objective reference graph",
    }),
    makeObservation("objective", "Reference Objective Alpha", {
      expeditionSubject: "Graph Integrity Reference Expedition",
      title: "Reference Objective Alpha",
      description: "First objective of the reference expedition",
    }),
    makeObservation("objective", "Reference Objective Beta", {
      expeditionSubject: "Graph Integrity Reference Expedition",
      title: "Reference Objective Beta",
      description: "Second objective of the reference expedition",
    }),
  ])

  const approval = ctx.missionStudio.approve(session)
  if (!approval.success) {
    throw new Error(`Reference execution approval failed: ${approval.error}`)
  }

  const genesis = await ctx.api.genesisFromSnapshot({ snapshot: approval.data })
  if (genesis.status !== "ok") {
    throw new Error(`Reference execution genesis failed: ${genesis.error}`)
  }

  const events = await ctx.infra.eventStore.loadAll()
  return { dir, events, snapshot: approval.data }
}

async function main() {
  const outFlagIndex = process.argv.indexOf("--out")
  const outFlag = outFlagIndex !== -1 ? process.argv[outFlagIndex + 1] : undefined
  if (outFlagIndex !== -1 && !outFlag) {
    console.error("\n  ❌ FATAL: --out requires a path")
    process.exit(1)
  }

  console.log("\n═══════════════════════════════════════════════════")
  console.log("  SYNTH: Graph Integrity Proof")
  console.log("═══════════════════════════════════════════════════\n")

  const timestamp = new Date().toISOString()
  const commit = execSync("git rev-parse HEAD 2>/dev/null || echo 'unknown'", { encoding: "utf-8" }).trim()
  const distHash = computeDistHash()
  const sourceHash = computeSourceHash()

  console.log("  Running reference execution (Mission Studio → Genesis)...")
  const { dir, events, snapshot } = await runReferenceExecution()
  console.log(`  - sandbox: ${dir}`)
  console.log(`  - events:  ${events.length}`)

  const replayed = rebuildState(events)
  const report = validateGraphIntegrity(events, replayed)

  const proof = {
    schema: "synth-graph-integrity-proof-v1",
    generatedAt: timestamp,
    validator: {
      name: "graph-integrity",
      version: GRAPH_INTEGRITY_VALIDATOR_VERSION,
    },
    repository: {
      commit,
      sourceHash,
    },
    build: {
      distHash,
    },
    referenceExecution: {
      sandbox: dir,
      snapshotId: snapshot.id,
      eventCount: events.length,
      chainDigest: sha256(events.map((event) => event.eventHash)),
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
    graph: report.graph,
    invariants: report.invariants,
    violations: report.violations,
    overall: {
      passed: report.result === "valid",
      summary: report.invariants.map(
        (invariant) => `${invariant.invariant}: ${invariant.status.toUpperCase()}`,
      ),
    },
  }

  const outPath =
    outFlag ??
    path.join(
      process.cwd(),
      "proof",
      `graph-integrity-proof-${timestamp.replace(/[:.]/g, "-")}.json`,
    )
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(proof, null, 2))

  console.log(`\n  Graph:            ${report.graph.nodes} nodes, ${report.graph.edges} edges, ${report.graph.roots} root(s)`)
  console.log(`  Chain digest:     ${proof.referenceExecution.chainDigest.slice(0, 16)}...`)
  console.log(`  Replay hash:      ${replayed.stateHash}`)
  for (const invariant of report.invariants) {
    const mark =
      invariant.status === "pass" ? "✅" : invariant.status === "fail" ? "❌" : "⚠️ "
    console.log(`  ${mark} ${invariant.invariant}: ${invariant.status}`)
  }
  if (report.violations.length > 0) {
    console.log("\n  Violations:")
    for (const violation of report.violations.slice(0, 10)) {
      console.log(`    - [${violation.kind}] ${violation.message}`)
    }
    if (report.violations.length > 10) {
      console.log(`    ... and ${report.violations.length - 10} more`)
    }
  }
  console.log(`\n  Proof written: ${outPath}`)

  console.log("\n═══════════════════════════════════════════════════")
  console.log(
    `  ${proof.overall.passed ? "✅ GRAPH INTEGRITY PROOF ACCEPTED" : "❌ GRAPH INTEGRITY PROOF REJECTED"}`,
  )
  console.log("═══════════════════════════════════════════════════\n")

  process.exit(proof.overall.passed ? 0 : 1)
}

main().catch((err) => {
  console.error("\n  ❌ FATAL:", err.message)
  process.exit(1)
})
