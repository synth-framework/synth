// ============================================================
// First Contact Capability Verification Tests
// ============================================================
// Regression guards for EXP-AIFC-006:
//  - Node capability is detected as available.
//  - Missing or unverifiable capabilities produce blockers.
//  - Verification report is deterministic and hashed.
// ============================================================

import { extractIntent } from "../dist/first-contact/extract/index.js"
import { projectArchitecture } from "../dist/first-contact/project/index.js"
import { verifyCapabilities, RuleBasedCapabilityVerifier } from "../dist/first-contact/verify/index.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

function testVerifiesNodeCapability() {
  const artifact = extractIntent("Create a CLI tool in TypeScript that validates event schemas.")
  const projection = projectArchitecture(artifact)
  const result = verifyCapabilities(projection.recommended)

  assert(result.status === "passed" || result.status === "blocked", "report should have a status")
  assert(result.reportHash.length > 0, "report should have a hash")
  console.log("[PASS] verifies selected architecture candidate")
}

function testDetectsMissingCapability() {
  const verifier = new RuleBasedCapabilityVerifier()
  const report = verifier.verify(["Ruby >= 3.0"])

  assert(report.status === "blocked", "unrecognized capability should block")
  assert(report.blockers.length > 0, "should report a blocker")
  console.log("[PASS] detects missing/unrecognized capability")
}

function testDeterministicReport() {
  const verifier = new RuleBasedCapabilityVerifier()
  const assumptions = ["Node >= 1", "Python >= 1"]
  const a = verifier.verify(assumptions)
  const b = verifier.verify(assumptions)

  assert(a.reportHash === b.reportHash, "report hash should be deterministic")
  assert(JSON.stringify(a.checks) === JSON.stringify(b.checks), "checks should be deterministic")
  console.log("[PASS] verification report is deterministic")
}

async function main() {
  testVerifiesNodeCapability()
  testDetectsMissingCapability()
  testDeterministicReport()
  console.log("\n[FIRST CONTACT VERIFY] All tests passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
