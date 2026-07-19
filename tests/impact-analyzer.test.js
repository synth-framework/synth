// ============================================================
// Impact Analyzer Tests
// ============================================================
// Verifies the impact analyzer classifies changed files into
// capabilities, Protected Assets, and risk levels.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

const ANALYZER_PATH = path.resolve(process.cwd(), "dist", "governance", "impact-analyzer.js")

async function loadAnalyzer() {
  return await import(ANALYZER_PATH)
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function testAnalyzeFiles() {
  const { analyzeFiles } = await loadAnalyzer()

  const report = analyzeFiles([
    "src/adapters/tdd/adapter.ts",
    "tests/adapter-tdd.test.js",
  ])

  assert(report.affectedCapabilities.includes("TddAdapter"), "should detect TddAdapter")
  assert(report.affectedCapabilities.includes("Tests"), "should detect Tests capability")
  assert(report.affectedClasses.includes("compiler"), `expected compiler class, got ${report.affectedClasses.join(", ")}`)
  assert(report.affectedClasses.includes("tests"), `expected tests class, got ${report.affectedClasses.join(", ")}`)
  assert(report.artifactTypes.includes("source"), `expected source artifact type, got ${report.artifactTypes.join(", ")}`)
  assert(report.protectedAssets.length === 0, "should not flag Protected Assets")
  assert(report.risk === "medium", `expected medium risk, got ${report.risk}`)
  assert(report.promotionRisk === "medium", `expected medium promotion risk, got ${report.promotionRisk}`)
  assert(report.files.length === 2, "should preserve both files")
  console.log("[PASS] analyzeFiles classifies adapter and test files")
}

async function testProtectedAssetEscalation() {
  const { analyzeFiles } = await loadAnalyzer()

  const report = analyzeFiles(["src/mission-studio/engine.ts"])

  assert(report.affectedCapabilities.includes("MissionStudio"), "should detect MissionStudio")
  assert(report.protectedAssets.includes("Mission Studio"), "should flag Mission Studio as Protected Asset")
  assert(report.risk === "high", `expected high risk, got ${report.risk}`)
  console.log("[PASS] Protected Asset change escalates to high risk")
}

async function testRuntimeHighRisk() {
  const { analyzeFiles } = await loadAnalyzer()

  const report = analyzeFiles(["src/runtime/executor.ts"])

  assert(report.affectedCapabilities.includes("Runtime"), "should detect Runtime")
  assert(report.protectedAssets.includes("Runtime"), "should flag Runtime as Protected Asset")
  assert(report.risk === "high", `expected high risk, got ${report.risk}`)
  console.log("[PASS] Runtime change is high risk")
}

async function testDocumentationLowRisk() {
  const { analyzeFiles } = await loadAnalyzer()

  const report = analyzeFiles(["README.md", "docs/getting-started/README.md", "website/index.html"])

  assert(report.affectedCapabilities.includes("Documentation"), "should detect Documentation")
  assert(report.affectedCapabilities.includes("Website"), "should detect Website")
  assert(report.protectedAssets.length === 0, "docs should not flag Protected Assets")
  assert(report.risk === "low", `expected low risk, got ${report.risk}`)
  console.log("[PASS] Documentation-only change is low risk")
}

async function testParseDiffNameStatus() {
  const { parseDiff } = await loadAnalyzer()

  const diffText = [
    "M\tsrc/cli/synth.ts",
    "A\tscripts/verify-expedition-governance.js",
    "D\tlegacy/file.js",
    "R100\told.ts\tnew.ts",
  ].join("\n")

  const files = parseDiff(diffText)

  assert(files.includes("src/cli/synth.ts"), "should parse modified file")
  assert(files.includes("scripts/verify-expedition-governance.js"), "should parse added file")
  assert(files.includes("new.ts"), "should parse renamed file destination")
  assert(!files.includes("legacy/file.js"), "should ignore deleted files")
  console.log("[PASS] parseDiff handles git name-status output")
}

async function testAnalyzeDiff() {
  const { analyzeDiff } = await loadAnalyzer()

  const diffText = [
    "M\tsrc/adapters/repository/adapter.ts",
    "M\tdocs/getting-started/README.md",
  ].join("\n")

  const report = analyzeDiff(diffText)

  assert(report.affectedCapabilities.includes("RepositoryAdapter"), "should detect RepositoryAdapter from diff")
  assert(report.affectedCapabilities.includes("Documentation"), "should detect Documentation from diff")
  assert(report.risk === "medium", `expected medium risk, got ${report.risk}`)
  console.log("[PASS] analyzeDiff produces report from diff text")
}

async function testWorkingTreeDiff() {
  const { getWorkingTreeDiff } = await loadAnalyzer()

  const diffText = getWorkingTreeDiff()
  assert(typeof diffText === "string", "getWorkingTreeDiff should return a string")
  console.log("[PASS] getWorkingTreeDiff returns git diff output")
}

async function main() {
  try {
    await fs.access(ANALYZER_PATH)
  } catch {
    console.error(`[SKIP] Impact analyzer not built. Run 'npm run build' first.`)
    process.exit(0)
  }

  await testAnalyzeFiles()
  await testProtectedAssetEscalation()
  await testRuntimeHighRisk()
  await testDocumentationLowRisk()
  await testParseDiffNameStatus()
  await testAnalyzeDiff()
  await testWorkingTreeDiff()

  console.log("\n[IMPACT ANALYZER] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
