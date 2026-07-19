// ============================================================
// SYNTH Command Safety Tests
// ============================================================
// Verifies the Discovery Safety Model command classification.
// ============================================================

import { getCommandSafety, isSafeForDiscovery, assertSafeForDiscovery } from "../dist/cli/command-safety.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

function testReadOnlyCommands() {
  const commands = ["--help", "--version", "discover", "doctor", "status", "explain", "validate"]
  for (const command of commands) {
    const meta = getCommandSafety(command)
    assert(meta !== undefined, `getCommandSafety should return metadata for ${command}`)
    assert(meta.safety === "READ_ONLY", `${command} should be READ_ONLY, got ${meta.safety}`)
    assert(isSafeForDiscovery(command), `${command} should be safe for discovery`)
  }
  console.log("[PASS] READ_ONLY commands are correctly classified and safe for discovery")
}

function testProposalOnlyCommands() {
  const commands = ["bootstrap --dry-run", "mission create", "expedition create"]
  for (const command of commands) {
    const meta = getCommandSafety(command)
    assert(meta !== undefined, `getCommandSafety should return metadata for ${command}`)
    assert(meta.safety === "PROPOSAL_ONLY", `${command} should be PROPOSAL_ONLY, got ${meta.safety}`)
    assert(isSafeForDiscovery(command), `${command} should be safe for discovery`)
  }
  console.log("[PASS] PROPOSAL_ONLY commands are correctly classified and safe for discovery")
}

function testMutatingCommands() {
  const commands = [
    "bootstrap --approve",
    "docs generate",
    "init",
    "mission approve",
    "expedition approve",
    "expedition commit",
    "expedition start",
    "expedition complete",
    "govern",
  ]
  for (const command of commands) {
    const meta = getCommandSafety(command)
    assert(meta !== undefined, `getCommandSafety should return metadata for ${command}`)
    assert(meta.safety === "MUTATING", `${command} should be MUTATING, got ${meta.safety}`)
    assert(!isSafeForDiscovery(command), `${command} should not be safe for discovery`)
  }
  console.log("[PASS] MUTATING commands are correctly classified and rejected during discovery")
}

function testPotentiallyMutatingCommands() {
  const meta = getCommandSafety("bootstrap")
  assert(meta !== undefined, "getCommandSafety should return metadata for bootstrap")
  assert(meta.safety === "POTENTIALLY_MUTATING", `bootstrap should be POTENTIALLY_MUTATING, got ${meta.safety}`)
  assert(!isSafeForDiscovery("bootstrap"), "bootstrap should not be safe for discovery")
  console.log("[PASS] bootstrap without flags is POTENTIALLY_MUTATING and rejected during discovery")
}

function testUnknownCommands() {
  assert(getCommandSafety("unknown command") === undefined, "unknown command should return undefined")
  assert(!isSafeForDiscovery("unknown command"), "unknown command should not be safe for discovery")
  let threw = false
  try {
    assertSafeForDiscovery("unknown command")
  } catch (err) {
    threw = true
    assert(err.message.includes("Unknown command"), "assertSafeForDiscovery should mention unknown command")
  }
  assert(threw, "assertSafeForDiscovery should throw for unknown commands")
  console.log("[PASS] Unknown commands are rejected during discovery")
}

function testAssertSafeForDiscoveryErrorMessage() {
  let threw = false
  try {
    assertSafeForDiscovery("docs generate")
  } catch (err) {
    threw = true
    assert(err.message.includes("MUTATING"), "error should include MUTATING")
    assert(err.message.includes("cannot run during Discovery"), "error should mention Discovery")
    assert(err.message.includes("synth bootstrap --approve"), "error should suggest bootstrap --approve")
  }
  assert(threw, "assertSafeForDiscovery should throw for mutating commands")
  console.log("[PASS] assertSafeForDiscovery emits clear phase-boundary errors")
}

function testApprovalRequired() {
  const mutating = getCommandSafety("mission approve")
  assert(mutating.requiresApproval === true, "mission approve should require approval")
  const readOnly = getCommandSafety("discover")
  assert(readOnly.requiresApproval === undefined, "discover should not require approval")
  console.log("[PASS] Approval requirement is correctly declared")
}

async function main() {
  console.log("Running command safety tests...")
  testReadOnlyCommands()
  testProposalOnlyCommands()
  testMutatingCommands()
  testPotentiallyMutatingCommands()
  testUnknownCommands()
  testAssertSafeForDiscoveryErrorMessage()
  testApprovalRequired()
  console.log("\nAll command safety tests passed.")
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
