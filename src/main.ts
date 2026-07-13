#!/usr/bin/env node
// ============================================================
// SYNTH v2 — Main Entrypoint (Control Boundary Architecture)
// ============================================================
// Architecture:
//   API → ExecutionGate → Runtime → Domain → EventStore
//   Genesis → ExecutionGate → Runtime → Domain → EventStore
//   (NO OTHER MUTATION PATHS EXIST)
// ============================================================

import { bootstrap } from "./core/bootstrap.js"
import { buildTypedIR } from "./compiler/type-checker.js"

async function main() {
  console.log("")
  console.log("  \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557")
  console.log("  \u2551                                         \u2551")
  console.log("  \u2551  SYNTH v2 \u2014 Deterministic Execution System  \u2551")
  console.log("  \u2551  Control Boundary Architecture            \u2551")
  console.log("  \u2551                                         \u2551")
  console.log("  \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d")
  console.log("")

  // Bootstrap the system with Control Boundary
  const ctx = await bootstrap({
    infra: {
      persistence: "file",
      partitionCount: 4,
      gitEnabled: false,
    },
    runtime: {
      usePartitions: false,
    },
    genesis: {
      projectName: "Synth v2 System",
      systemId: "synth-v2-default",
      initialProjects: [
        {
          id: "proj-1",
          name: "Initial Project",
          goal: "Demonstrate Synth v2 system",
        },
      ],
      initialWorkItems: [
        { id: "W-1", name: "First Work Item" },
        { id: "W-2", name: "Second Work Item" },
      ],
      partitions: 4,
    },
  })

  console.log("\n--- Architecture ---")
  console.log("Mutation path: API → ExecutionGate → Runtime → Domain → EventStore")
  console.log(`Single mutation authority: ExecutionGate`)
  console.log(`Capabilities registered: ${ctx.capabilityRegistry.size()}`)
  console.log(`Events in log: ${await ctx.runtime.getEventCount()}`)

  // Verify state
  const state = await ctx.runtime.getState()
  console.log(`\n--- State ---`)
  console.log(`  Version: ${state.version}`)
  console.log(`  Hash: ${state.stateHash}`)
  console.log(`  WorkItems: ${Object.keys(state.workItems).length}`)
  console.log(`  Projects: ${Object.keys(state.projects).length}`)

  // === DEMO: Capabilities through the ExecutionGate ===
  console.log("\n--- Demo: Capabilities through ExecutionGate ---")

  const r1 = await ctx.api.handleIntent({
    actor: "demo-user",
    capability: "StartWorkItem",
    payload: { id: "W-1" },
  })
  console.log(`StartWorkItem W-1: ${JSON.stringify(r1, null, 2)}`)

  const r2 = await ctx.api.handleIntent({
    actor: "demo-user",
    capability: "CompleteWorkItem",
    payload: { id: "W-1" },
  })
  console.log(`CompleteWorkItem W-1: ${JSON.stringify(r2, null, 2)}`)

  const r3 = await ctx.api.handleIntent({
    actor: "demo-user",
    capability: "StartWorkItem",
    payload: { id: "W-2" },
  })
  console.log(`StartWorkItem W-2: ${JSON.stringify(r3, null, 2)}`)

  const r4 = await ctx.api.handleIntent({
    actor: "demo-user",
    capability: "CreateWorkItem",
    payload: { id: "W-3", name: "Dynamic Work Item" },
  })
  console.log(`CreateWorkItem W-3: ${JSON.stringify(r4, null, 2)}`)

  const r5 = await ctx.api.handleIntent({
    actor: "demo-user",
    capability: "CreateProject",
    payload: { id: "proj-2", name: "Second Project", goal: "Test" },
  })
  console.log(`CreateProject proj-2: ${JSON.stringify(r5, null, 2)}`)

  // State after execution
  const finalState = await ctx.runtime.getState()
  console.log("\n--- Final State ---")
  console.log(`  Events: ${await ctx.runtime.getEventCount()}`)
  console.log(`  WorkItems: ${Object.keys(finalState.workItems).length}`)
  console.log(`  Projects: ${Object.keys(finalState.projects).length}`)
  console.log(`  Hash: ${finalState.stateHash}`)

  // === DEMO: Policy enforcement through gate ===
  console.log("\n--- Demo: Policy Enforcement (through gate) ---")
  const denied = await ctx.api.handleIntent({
    actor: "demo-user",
    capability: "StartWorkItem",
    payload: { id: "W-1" }, // already completed
  })
  console.log(`StartWorkItem W-1 (completed → denied): ${JSON.stringify(denied, null, 2)}`)

  // === DEMO: Validation failure at gate ===
  console.log("\n--- Demo: Validation Failure (at gate) ---")
  const invalid = await ctx.api.handleIntent({
    actor: "demo-user",
    capability: "StartWorkItem",
    payload: {}, // missing id
  })
  console.log(`StartWorkItem (missing id): ${JSON.stringify(invalid, null, 2)}`)

  // === DEMO: State Replay ===
  console.log("\n--- Demo: Deterministic Replay ---")
  const { rebuildState } = await import("./runtime/replay.js")
  const events = await ctx.runtime.loadEvents()
  const replayed = rebuildState(events)
  const consistent = finalState.stateHash === replayed.stateHash
  console.log(`Events: ${events.length}`)
  console.log(`Replayed hash: ${replayed.stateHash}`)
  console.log(`Runtime hash:  ${finalState.stateHash}`)
  console.log(`Consistency: ${consistent ? "PASS ✓" : "FAIL ✗"}`)

  // === DEMO: Type Check ===
  console.log("\n--- Demo: Formal Type Check ---")
  const caps = Array.from(ctx.capabilityRegistry.list())
    .map((name) => ctx.capabilityRegistry.resolve(name))
    .filter((c): c is NonNullable<typeof c> => c !== undefined)
  const ir = buildTypedIR(caps)
  console.log(`Type check: ${ir.validity.valid ? "VALID ✓" : "INVALID ✗"}`)
  console.log(`  Capabilities: ${ir.capabilities.length}`)
  console.log(`  Events: ${ir.events.length}`)
  console.log(`  States: ${ir.states.length}`)
  console.log(`  Transitions: ${ir.transitions.length}`)
  if (ir.validity.warnings.length > 0) {
    console.log(`  Warnings: ${ir.validity.warnings.length}`)
  }

  // === DEMO: Governance ===
  console.log("\n--- Demo: Governance ---")
  const proposal = ctx.governance.submit({
    id: "prop-1",
    type: "capability_add",
    description: "Add analytics capability",
    payload: { name: "AnalyticsCapability" },
    proposedBy: "demo-user",
  })
  ctx.governance.approve(proposal.id, "admin")
  console.log(`Governance: ${JSON.stringify(ctx.governance.getStats())}`)

  console.log("")
  console.log("  \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557")
  console.log("  \u2551                                         \u2551")
  console.log("  \u2551  Synth v2 — All Systems Operational       \u2551")
  console.log("  \u2551  Control Boundary: ENFORCED              \u2551")
  console.log("  \u2551                                         \u2551")
  console.log("  \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d")
  console.log("")
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
