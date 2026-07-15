#!/usr/bin/env node
// ============================================================
// SYNTH: Discovery Evidence Verification
// ============================================================
// Verifies that discovery evidence is replayable constitutional
// evidence (ADR-015):
//
//   1. Determinism   — two discovery runs in this environment
//                      produce identical evidence hashes.
//   2. Round-trip    — the artifact persists and reloads through
//                      the Filesystem capability unchanged.
//   3. Replay        — every derived section of the recorded
//                      evidence reproduces exactly from the
//                      recorded observations and providers.
//
// The frozen Replay engine, Event Model, and synth-proof-v1
// proof object are not involved or modified.
//
// Usage: node scripts/verify-discovery-evidence.js
// Exit 0 = verified, Exit 1 = divergence detected
// ============================================================

import { mkdtempSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import {
  createDiscoveryOrchestrator,
  createNodeObservationContext,
  createReferenceProviders,
  createPosixFilesystemProvider,
  hashDiscoveryEvidence,
  persistDiscoveryEvidence,
  loadDiscoveryEvidence,
  verifyDiscoveryReplay,
} from "../dist/environment/index.js"

async function main() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  SYNTH: Discovery Evidence Verification")
  console.log("═══════════════════════════════════════════════════\n")

  const ctx = createNodeObservationContext(process.cwd())
  const create = () => createDiscoveryOrchestrator({ providers: createReferenceProviders() })

  // 1. Determinism: two runs, identical evidence hashes
  console.log("  [1/3] Running discovery twice (determinism)...")
  const first = await create().discover(ctx)
  const second = await create().discover(ctx)
  const firstHash = hashDiscoveryEvidence(first.evidence)
  const secondHash = hashDiscoveryEvidence(second.evidence)
  if (firstHash !== secondHash) {
    console.error("  ❌ Discovery is not deterministic in this environment")
    console.error(`     run 1: ${firstHash.slice(0, 16)}...`)
    console.error(`     run 2: ${secondHash.slice(0, 16)}...`)
    process.exit(1)
  }
  console.log(`     hash: ${firstHash.slice(0, 16)}... (identical across runs)`)

  // 2. Round-trip: persist and reload through the Filesystem capability
  console.log("  [2/3] Persisting and reloading evidence artifact...")
  const tempRoot = mkdtempSync(join(tmpdir(), "synth-discovery-evidence-"))
  try {
    const fs = createPosixFilesystemProvider(tempRoot)
    await persistDiscoveryEvidence(fs, first.evidence)
    const loaded = await loadDiscoveryEvidence(fs)
    if (!loaded) {
      console.error("  ❌ Persisted artifact could not be reloaded")
      process.exit(1)
    }
    if (hashDiscoveryEvidence(loaded) !== firstHash) {
      console.error("  ❌ Reloaded artifact hash differs from the original")
      process.exit(1)
    }
    console.log("     round-trip: canonical artifact unchanged")

    // 3. Replay: derived sections reproduce from recorded evidence
    console.log("  [3/3] Replaying recorded evidence...")
    const verification = verifyDiscoveryReplay(loaded)
    if (!verification.consistent) {
      console.error("  ❌ Evidence replay diverged:")
      for (const divergence of verification.divergences) {
        console.error(`     - ${divergence}`)
      }
      process.exit(1)
    }
    console.log("     replay: all derived sections reproduce exactly")
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }

  console.log("\n  ✅ Discovery evidence is replayable constitutional evidence")
  console.log("═══════════════════════════════════════════════════\n")
  process.exit(0)
}

main().catch((err) => {
  console.error("\n  ❌ FATAL:", err.message)
  process.exit(1)
})
