// ============================================================
// Extraction Reporting Tests
// ============================================================
// Regression guards for EXP-DISC-002: `synth docs generate` must report
// extraction counts and warn loudly when files matched but zero concepts
// were extracted.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

function runSynth(args, cwd = process.cwd()) {
  const result = spawnSync("node", [CLI_PATH, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 30000,
  })
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  }
}

function parseJson(stdout) {
  try {
    return JSON.parse(stdout.trim())
  } catch (err) {
    throw new Error(`Failed to parse CLI output as JSON: ${stdout}\nError: ${err.message}`)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function testNormalExtractionReportsOk() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-extraction-ok-"))
  try {
    const initResult = runSynth(["init", "--name", "Extraction OK Test"], tmpDir)
    assert(initResult.status === 0, "init should succeed")

    const docsDir = path.join(tmpDir, "docs")
    await fs.mkdir(docsDir, { recursive: true })
    await fs.writeFile(
      path.join(docsDir, "intro.md"),
      "# Introduction\n\nSYNTH is a deterministic execution system.\n\n## Concepts\n\n- Mission\n- Expedition\n- Replay\n",
      "utf-8",
    )

    const { stdout, status } = runSynth(["docs", "generate", "--knowledge-base", "./docs"], tmpDir)
    assert(status === 0, "docs generate should exit 0")
    const output = parseJson(stdout)
    assert(output.status === "ok", `status should be ok, got ${output.status}`)
    assert(output.summary, "summary should be present")
    assert(output.summary.filesScanned > 0, "filesScanned should be > 0")
    assert(output.summary.filesMatched > 0, "filesMatched should be > 0")
    assert(output.summary.conceptsExtracted > 0, "conceptsExtracted should be > 0")
    assert(output.summary.projectionsGenerated > 0, "projectionsGenerated should be > 0")
    assert(output.summary.zeroExtractionWarning === false, "zeroExtractionWarning should be false")
    assert(Array.isArray(output.projections) && output.projections.length > 0, "projections should be present")
    console.log("[PASS] docs generate reports ok with counts for normal docs")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testEmptyMarkdownWarns() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-extraction-warning-"))
  try {
    const initResult = runSynth(["init", "--name", "Extraction Warning Test"], tmpDir)
    assert(initResult.status === 0, "init should succeed")

    const docsDir = path.join(tmpDir, "docs")
    await fs.mkdir(docsDir, { recursive: true })
    await fs.writeFile(
      path.join(docsDir, "empty.md"),
      "This file contains no headings, lists, or identifiable concepts.\n",
      "utf-8",
    )

    const { stdout, status } = runSynth(["docs", "generate", "--knowledge-base", "./docs"], tmpDir)
    assert(status === 0, "docs generate should exit 0 even with warning")
    const output = parseJson(stdout)
    assert(output.status === "warning", `status should be warning, got ${output.status}`)
    assert(output.summary, "summary should be present")
    assert(output.summary.filesScanned > 0, "filesScanned should be > 0")
    assert(output.summary.filesMatched > 0, "filesMatched should be > 0")
    assert(output.summary.conceptsExtracted === 0, "conceptsExtracted should be 0")
    assert(output.summary.zeroExtractionWarning === true, "zeroExtractionWarning should be true")
    assert(typeof output.warning === "string" && output.warning.length > 0, "warning message should be present")
    console.log("[PASS] docs generate warns loudly when markdown files yield zero concepts")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function main() {
  try {
    await fs.access(CLI_PATH)
  } catch {
    console.error("[SKIP] CLI not built. Run 'npm run build' first.")
    process.exit(0)
  }

  await testNormalExtractionReportsOk()
  await testEmptyMarkdownWarns()

  console.log("\n[EXTRACTION REPORTING] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
