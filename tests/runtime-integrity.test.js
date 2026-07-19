// ============================================================
// Runtime Integrity Tests
// ============================================================
// Regression guards for EXP-DISC-005: `synth doctor` verifies installed
// dist/ hashes against a build-time manifest.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")
const DIST_MANIFEST_PATH = path.resolve(process.cwd(), "dist", "dist-manifest.json")

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

async function testDoctorVerifiesDistIntegrity() {
  const { stdout, status } = runSynth(["doctor"])
  assert(status === 0 || status === 1, "doctor should produce a structured exit")
  const output = parseJson(stdout)
  assert(output.runtimeHealth, "doctor output should include runtimeHealth")
  assert(output.runtimeHealth.distIntegrity, "doctor output should include runtime distIntegrity check")
  assert(output.runtimeHealth.distIntegrity.ok === true, `distIntegrity should be ok, got: ${output.runtimeHealth.distIntegrity.detail}`)
  assert(output.runtimeHealth.distIntegrity.detail.includes("verified"), "distIntegrity detail should mention verified files")
  console.log("[PASS] synth doctor verifies dist integrity when manifest matches")
}

async function testDoctorDetectsTamperedDistFile() {
  // Find a non-critical dist file to mutate temporarily.
  const manifest = JSON.parse(await fs.readFile(DIST_MANIFEST_PATH, "utf-8"))
  const files = Object.keys(manifest.files)
  const targetRel = files.find((f) => f.endsWith(".js") && !f.includes("cli")) || files[0]
  assert(targetRel, "manifest should contain at least one file")
  const targetPath = path.resolve(process.cwd(), "dist", targetRel)

  const original = await fs.readFile(targetPath, "utf-8")
  try {
    await fs.writeFile(targetPath, original + "\n// TAMPERED\n", "utf-8")
    const { stdout } = runSynth(["doctor"])
    const output = parseJson(stdout)
    assert(output.status === "warning", "doctor should report warning status when dist is tampered")
    assert(output.runtimeHealth.distIntegrity.ok === false, "distIntegrity should fail when a file is modified")
    assert(output.runtimeHealth.distIntegrity.detail.includes("modified"), "distIntegrity detail should mention modified files")
  } finally {
    await fs.writeFile(targetPath, original, "utf-8")
  }
  console.log("[PASS] synth doctor detects a modified dist file")
}

async function main() {
  try {
    await fs.access(CLI_PATH)
    await fs.access(DIST_MANIFEST_PATH)
  } catch {
    console.error("[SKIP] CLI or dist manifest not built. Run 'npm run build' first.")
    process.exit(0)
  }

  await testDoctorVerifiesDistIntegrity()
  await testDoctorDetectsTamperedDistFile()

  console.log("\n[RUNTIME INTEGRITY] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
