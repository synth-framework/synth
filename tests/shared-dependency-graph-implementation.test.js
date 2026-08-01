// ============================================================
// EXP-GRAPH-001 — Shared Dependency-Graph Primitive Validation
// ============================================================
// Verifies that the shared dependency-graph primitive is chartered,
// referenced by both consuming program trackers, and registered with
// a canonical prefix.
// ============================================================

import fs from "fs/promises"
import path from "path"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

const ROOT = process.cwd()
const CHARTER = path.join(ROOT, "docs", "expeditions", "EXP-GRAPH-001.md")
const PREFIX_REGISTRY = path.join(ROOT, "docs", "expeditions", "prefix-registry.json")
const PROGRAM_031 = path.join(ROOT, "docs", "expeditions", "EXP-PROGRAM-031.md")
const PROGRAM_034 = path.join(ROOT, "docs", "expeditions", "EXP-PROGRAM-034.md")
const DESIGN_CONTRACT = path.join(ROOT, "docs", "design", "shared-dependency-graph.md")

async function testGraphPrefixRegistered() {
  const registry = JSON.parse(await fs.readFile(PREFIX_REGISTRY, "utf-8"))
  assert(registry.prefixes?.GRAPH, "GRAPH prefix must be registered")
  assert(typeof registry.prefixes.GRAPH.name === "string", "GRAPH prefix must have a name")
  console.log("[PASS] GRAPH prefix is registered")
}

async function testGraphCharterExists() {
  const content = await fs.readFile(CHARTER, "utf-8")
  assert(content.includes("EXP-GRAPH-001"), "charter must reference EXP-GRAPH-001")
  assert(content.includes("shared-dependency-graph.md"), "charter must reference design contract")
  assert(content.includes("EXP-PROGRAM-031"), "charter must reference Program 031")
  assert(content.includes("EXP-PROGRAM-034"), "charter must reference Program 034")
  assert(content.includes("topologicalSort"), "charter must reference topologicalSort")
  assert(content.includes("detectCycles"), "charter must reference detectCycles")
  console.log("[PASS] EXP-GRAPH-001 charter exists")
}

async function testProgram031ReferencesGraphImplementation() {
  const content = await fs.readFile(PROGRAM_031, "utf-8")
  assert(content.includes("EXP-GRAPH-001"), "Program 031 tracker must reference EXP-GRAPH-001")
  assert(content.includes("Shared Dependency-Graph Primitive"), "Program 031 tracker must reference shared primitive")
  console.log("[PASS] Program 031 tracker references EXP-GRAPH-001")
}

async function testProgram034ReferencesGraphImplementation() {
  const content = await fs.readFile(PROGRAM_034, "utf-8")
  assert(content.includes("EXP-GRAPH-001"), "Program 034 tracker must reference EXP-GRAPH-001")
  assert(content.includes("shared-dependency-graph.md"), "Program 034 tracker must reference design contract")
  console.log("[PASS] Program 034 tracker references EXP-GRAPH-001")
}

async function testDesignContractStillReferenced() {
  const content = await fs.readFile(DESIGN_CONTRACT, "utf-8")
  assert(content.includes("src/graph/dependency-graph.ts"), "design contract must define implementation target")
  console.log("[PASS] Shared dependency-graph design contract is intact")
}

async function main() {
  await testGraphPrefixRegistered()
  await testGraphCharterExists()
  await testProgram031ReferencesGraphImplementation()
  await testProgram034ReferencesGraphImplementation()
  await testDesignContractStillReferenced()
  console.log("\n[SHARED DEPENDENCY GRAPH] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  console.error(err.stack)
  process.exit(1)
})
