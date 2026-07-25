// ============================================================
// SYNTH Agent SDK Tests (EXP-DIST-004)
// ============================================================
// Verifies that the @synth-framework/agent-sdk package exports
// the expected protocol and metadata functions.
// ============================================================

import {
  parseSynthCommand,
  isMutatingCommand,
  isProposalOnlyCommand,
  deriveProtocol,
  resolveRepositoryContext,
} from "../packages/synth-agent-sdk/dist/index.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

function testParseSynthCommand() {
  const command = parseSynthCommand("synth mission create --subject X --purpose Y")
  assert(command.namespace === "mission", "namespace should be mission")
  assert(command.subcommand === "create", "subcommand should be create")
  assert(command.flags.subject === "X", "subject flag should be X")
  assert(command.flags.purpose === "Y", "purpose flag should be Y")
  console.log("[PASS] parseSynthCommand parses namespace, subcommand, and flags")
}

function testMutatingCommandDetection() {
  assert(isMutatingCommand(parseSynthCommand("synth mission approve --draft-id 1")), "mission approve is mutating")
  assert(isMutatingCommand(parseSynthCommand("synth expedition start --expedition-id 1")), "expedition start is mutating")
  assert(!isMutatingCommand(parseSynthCommand("synth mission decisions")), "mission decisions is read-only")
  assert(!isMutatingCommand(parseSynthCommand("synth discover")), "discover is read-only")
  console.log("[PASS] isMutatingCommand classifies commands correctly")
}

function testProposalOnlyCommandDetection() {
  assert(isProposalOnlyCommand(parseSynthCommand("synth mission create --subject X --purpose Y")), "mission create is proposal-only")
  assert(!isProposalOnlyCommand(parseSynthCommand("synth mission approve --draft-id 1")), "mission approve is not proposal-only")
  console.log("[PASS] isProposalOnlyCommand classifies proposal commands correctly")
}

function testDeriveProtocol() {
  const protocol = deriveProtocol({
    repositoryType: "brownfield",
    lifecyclePhase: "initialized",
    mutationPolicy: "READ_ONLY",
  })
  assert(protocol.version === "1.0.0", "protocol version should be 1.0.0")
  assert(protocol.repositoryType === "brownfield", "repositoryType should be brownfield")
  assert(protocol.lifecyclePhase === "initialized", "lifecyclePhase should be initialized")
  assert(protocol.mutationPolicy === "READ_ONLY", "mutationPolicy should be READ_ONLY")
  assert(typeof protocol.nextCommand === "string", "nextCommand should be defined")
  console.log("[PASS] deriveProtocol produces a valid GenesisProtocol")
}

async function testResolveRepositoryContextMissingRepo() {
  const context = await resolveRepositoryContext("/tmp/synth-nonexistent-repo-12345")
  assert(context.isSynthGoverned === false, "nonexistent repo should not be governed")
  assert(context.repositoryType === "unknown", "repositoryType should be unknown")
  assert(context.mutationPolicy === "READ_ONLY", "default mutation policy should be READ_ONLY")
  console.log("[PASS] resolveRepositoryContext handles missing repositories gracefully")
}

async function main() {
  console.log("Running agent-sdk tests...")
  testParseSynthCommand()
  testMutatingCommandDetection()
  testProposalOnlyCommandDetection()
  testDeriveProtocol()
  await testResolveRepositoryContextMissingRepo()
  console.log("\nAll agent-sdk tests passed.")
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
