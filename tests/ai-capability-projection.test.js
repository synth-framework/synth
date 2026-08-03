// ============================================================
// AI Capability Projection Tests (EXP-DIST-001, EXP-DIST-002)
// ============================================================
// Verifies that the Canonical AI Capability Model projects into
// platform-specific artifacts deterministically and that committed
// distribution artifacts remain fresh.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"
import crypto from "crypto"

const PROJECT_ROOT = process.cwd()
const PROJECTION_SCRIPT = path.resolve(PROJECT_ROOT, "scripts", "project-ai-capabilities.js")
const MODEL_PATH = path.resolve(PROJECT_ROOT, "src", "distribution", "ai-capability-model.json")
const CAPABILITY_LIST_PATH = path.resolve(PROJECT_ROOT, "docs", "reference", "capability-list.json")
const DISTRIBUTION_DIR = path.resolve(PROJECT_ROOT, "distribution")

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

function hashString(input) {
  return crypto.createHash("sha256").update(input, "utf-8").digest("hex")
}

function runProjection(cwd, extraArgs = []) {
  const args = [PROJECTION_SCRIPT, "--out-dir", path.join(cwd, "distribution"), ...extraArgs]
  const result = spawnSync("node", args, {
    cwd,
    encoding: "utf-8",
    timeout: 120000,
  })
  return {
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  }
}

async function readDirFiles(dir) {
  const files = {}
  try {
    await fs.access(dir)
  } catch {
    return files
  }

  async function* walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        yield* walk(full)
      } else {
        yield full
      }
    }
  }

  for await (const file of walk(dir)) {
    const relative = path.relative(dir, file)
    files[relative] = await fs.readFile(file, "utf-8")
  }
  return files
}

async function testCanonicalModelExists() {
  const content = await fs.readFile(MODEL_PATH, "utf-8")
  const model = JSON.parse(content)
  assert(model["$schema"] === "synth-ai-capability-model-v1", "Canonical model must use expected schema")
  assert(typeof model.version === "string", "Canonical model must declare a version")
  assert(Array.isArray(model.publicVocabulary?.concepts), "Canonical model must declare public vocabulary")
  assert(model.publicVocabulary.concepts.length === 7, "Public vocabulary must contain exactly seven concepts")
  assert(Array.isArray(model.commandSafety?.commands), "Canonical model must declare command safety")
  assert(Array.isArray(model.protectedAssets?.assets), "Canonical model must declare protected assets")
  console.log("[PASS] Canonical AI Capability Model exists and has required structure")
}

async function testProjectionGeneratesAtLeastThreeSurfaces() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-ai-capability-"))
  try {
    const result = runProjection(tmpDir)
    assert(result.status === 0, `Projection engine must succeed:\n${result.stdout}\n${result.stderr}`)

    const generatedDir = path.join(tmpDir, "distribution")
    const files = await readDirFiles(generatedDir)
    const names = Object.keys(files)

    assert(names.includes("agent-skills/claude.md"), "Claude skill must be generated")
    assert(names.includes("agent-skills/codex.md"), "Codex instructions must be generated")
    assert(names.includes("agent-skills/chatgpt.md"), "ChatGPT skill must be generated")
    assert(names.includes("agent-skills/gemini.md"), "Gemini skill must be generated")
    assert(names.includes("ide-rules/.cursor/rules.mdc"), "Cursor rules must be generated")
    assert(names.includes("ide-rules/.clinerules"), "Cline rules must be generated")
    assert(names.includes("ide-rules/.windsurfrules"), "Windsurf rules must be generated")
    assert(names.includes("ide-rules/.roorules"), "Roo rules must be generated")
    assert(names.includes("ide-rules/.aider-instructions.md"), "Aider instructions must be generated")
    assert(names.includes("ide-rules/.continue/rules.md"), "Continue.dev rules must be generated")
    assert(names.includes("mcp/manifest.json"), "MCP manifest must be generated")
    assert(names.length >= 11, `Expected at least 11 projections, got ${names.length}`)

    const mcp = JSON.parse(files["mcp/manifest.json"])
    assert(Array.isArray(mcp.tools), "MCP manifest must expose tools")
    assert(mcp.tools.length > 0, "MCP manifest must expose at least one tool")
    assert(mcp.public_vocabulary.length === 7, "MCP manifest must include seven public vocabulary concepts")
    console.log("[PASS] Projection engine generates agent skills, IDE rules, and distribution surfaces")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testProjectionsAreDeterministic() {
  const run1 = await fs.mkdtemp(path.join(os.tmpdir(), "synth-ai-det-1-"))
  const run2 = await fs.mkdtemp(path.join(os.tmpdir(), "synth-ai-det-2-"))
  try {
    const result1 = runProjection(run1)
    const result2 = runProjection(run2)
    assert(result1.status === 0, "First projection run must succeed")
    assert(result2.status === 0, "Second projection run must succeed")

    const files1 = await readDirFiles(path.join(run1, "distribution"))
    const files2 = await readDirFiles(path.join(run2, "distribution"))

    assert(Object.keys(files1).length === Object.keys(files2).length, "Deterministic runs must produce same file count")

    for (const name of Object.keys(files1)) {
      assert(name in files2, `Deterministic runs must both produce ${name}`)
      assert(files1[name] === files2[name], `Deterministic runs must produce identical content for ${name}`)
    }

    const hash1 = hashString(Object.keys(files1).sort().map((n) => `${n}:${hashString(files1[n])}`).join("\n"))
    const hash2 = hashString(Object.keys(files2).sort().map((n) => `${n}:${hashString(files2[n])}`).join("\n"))
    assert(hash1 === hash2, "Aggregate projection hash must match across deterministic runs")

    console.log("[PASS] Projection output is deterministic across runs")
  } finally {
    await fs.rm(run1, { recursive: true, force: true })
    await fs.rm(run2, { recursive: true, force: true })
  }
}

async function testCommittedProjectionsAreFresh() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-ai-fresh-"))
  try {
    const result = runProjection(tmpDir)
    assert(result.status === 0, "Projection engine must succeed for freshness check")

    const regenerated = await readDirFiles(path.join(tmpDir, "distribution"))
    const committed = await readDirFiles(DISTRIBUTION_DIR)

    const regenNames = Object.keys(regenerated).sort()
    const committedNames = Object.keys(committed).sort()

    assert(regenNames.length === committedNames.length, "Committed projections must match generated count")

    for (const name of regenNames) {
      assert(name in committed, `Committed projections must include ${name}`)
      assert(regenerated[name] === committed[name], `Committed projection ${name} is stale`)
    }

    console.log("[PASS] Committed distribution projections are fresh")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function readCapabilityList() {
  const content = await fs.readFile(CAPABILITY_LIST_PATH, "utf-8")
  const list = JSON.parse(content)
  assert(list.schema === "synth-capability-list-v1", "Capability list must use expected schema")
  assert(Array.isArray(list.capabilities), "Capability list must declare capabilities array")
  return list.capabilities
}

async function testCheckModeDetectsDrift() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-ai-drift-"))
  try {
    const result = runProjection(tmpDir)
    assert(result.status === 0, "Projection engine must succeed in drift test setup")

    const filePath = path.join(tmpDir, "distribution", "agent-skills", "claude.md")
    const original = await fs.readFile(filePath, "utf-8")
    await fs.writeFile(filePath, original + "\n<!-- drift -->\n", "utf-8")

    const checkResult = runProjection(tmpDir, ["--check"])
    assert(checkResult.status !== 0, "--check must fail when a projection is stale")
    assert(checkResult.stdout.includes("Stale") || checkResult.stdout.includes("stale"), "--check must report stale projection")

    console.log("[PASS] --check mode detects projection drift")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testCapabilitiesProjected() {
  const capabilities = await readCapabilityList()
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-ai-cap-"))
  try {
    const result = runProjection(tmpDir)
    assert(result.status === 0, `Projection engine must succeed:\n${result.stdout}\n${result.stderr}`)

    const generatedDir = path.join(tmpDir, "distribution")
    const files = await readDirFiles(generatedDir)

    const mcp = JSON.parse(files["mcp/manifest.json"])
    assert(Array.isArray(mcp.capabilities), "MCP manifest must expose capabilities array")
    assert(mcp.capabilities.length === capabilities.length, `MCP manifest must expose ${capabilities.length} capabilities, got ${mcp.capabilities.length}`)

    const claudeSkill = files["agent-skills/claude.md"]
    assert(claudeSkill.includes("## Capabilities"), "Claude skill must include a capabilities section")

    for (const capability of capabilities) {
      assert(mcp.capabilities.includes(capability.name), `MCP manifest must include capability ${capability.name}`)
      assert(claudeSkill.includes(capability.name), `Claude skill must mention capability ${capability.name}`)
    }

    console.log(`[PASS] Projections include all ${capabilities.length} capabilities from capability-list.json`)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function main() {
  console.log("Running AI capability projection tests...")
  await testCanonicalModelExists()
  await testProjectionGeneratesAtLeastThreeSurfaces()
  await testProjectionsAreDeterministic()
  await testCommittedProjectionsAreFresh()
  await testCheckModeDetectsDrift()
  await testCapabilitiesProjected()
  console.log("\nAll AI capability projection tests passed.")
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
