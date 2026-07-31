// tests/docs-provenance.test.js
// EXP-WARN-001 — Stable Warning IDs and Actionable Fixes

import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import { promises as fs } from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { execSync } from "child_process"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const synth = path.join(root, "dist", "cli", "synth.js")
const projectDir = path.join(root, "data-test-docs-provenance")
const synthDir = path.join(projectDir, ".synth")
const dataDir = path.join(synthDir, "data")
const docsDir = path.join(projectDir, "docs")
const generatedDir = path.join(docsDir, "generated")

async function setupProject() {
  await fs.mkdir(dataDir, { recursive: true })
  await fs.writeFile(
    path.join(synthDir, "manifest.json"),
    JSON.stringify({ name: "Docs Provenance Test", version: "2.4.1" }),
  )
  // Minimal knowledge base so the docs generator has something to project.
  await fs.mkdir(docsDir, { recursive: true })
  await fs.writeFile(
    path.join(docsDir, "index.md"),
    "# Test Project\n\nThis is a test project for docs provenance.\n",
  )
}

async function cleanup() {
  try {
    await fs.rm(projectDir, { recursive: true, force: true })
  } catch {
    // ignore
  }
}

function run(args, cwd = projectDir) {
  return execSync(`node ${synth} ${args}`, {
    cwd,
    env: { ...process.env, SYNTH_QUIET_LOGS: "1" },
    encoding: "utf-8",
  })
}

function runAllowError(args, cwd = projectDir) {
  try {
    return { exitCode: 0, stdout: run(args, cwd) }
  } catch (err) {
    return { exitCode: err.status, stdout: err.stdout }
  }
}

describe("docs provenance", () => {
  before(async () => {
    await cleanup()
    await setupProject()
  })

  after(async () => {
    await cleanup()
  })

  it("synth docs generate produces files with provenance metadata", async () => {
    run(`docs generate`)
    const readme = await fs.readFile(path.join(generatedDir, "README.md"), "utf-8")
    assert.ok(readme.includes("sourceStateHash:"))
    assert.ok(readme.includes("computedAt:"))
    assert.ok(readme.includes("schemaVersion:"))
  })

  it("synth docs generate --provenance is accepted and regenerates docs", async () => {
    const out = run(`docs generate --provenance`)
    const result = JSON.parse(out)
    assert.equal(result.status, "ok")
    assert.equal(result.provenance, true)
    const readme = await fs.readFile(path.join(generatedDir, "README.md"), "utf-8")
    assert.ok(readme.includes("sourceStateHash:"))
    assert.ok(readme.includes("computedAt:"))
    assert.ok(readme.includes("schemaVersion:"))
  })

  it("synth docs generate --help includes --provenance", () => {
    const out = run(`docs generate --help`)
    const result = JSON.parse(out)
    assert.ok(result.subcommands.some((s) => s.name.includes("--provenance")))
  })

  it("synth verify reports WARN-DOCS-001 when provenance is missing", async () => {
    run(`docs generate`)
    const readmePath = path.join(generatedDir, "README.md")
    const original = await fs.readFile(readmePath, "utf-8")
    // Strip provenance markers to simulate stale generated docs.
    const stale = original.replace(/sourceStateHash:.*/g, "").replace(/computedAt:.*/g, "").replace(/schemaVersion:.*/g, "")
    await fs.writeFile(readmePath, stale)
    try {
      const { exitCode, stdout } = runAllowError(`verify`, projectDir)
      const result = JSON.parse(stdout)
      const projectionCheck = result.checks?.find((r) => r.name === "ProjectionConsistency")
      assert.ok(projectionCheck, "ProjectionConsistency check missing")
      const warning = projectionCheck.violations?.find((v) => v.code === "WARN-DOCS-001")
      assert.ok(warning, "WARN-DOCS-001 not reported")
      assert.ok(warning.fixCommand?.includes("synth docs generate --provenance"))
      assert.ok(warning.nextStep?.includes("synth docs generate"))
    } finally {
      await fs.writeFile(readmePath, original)
    }
  })
})
