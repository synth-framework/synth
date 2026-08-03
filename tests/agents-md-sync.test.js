// ============================================================
// EXP-AGENTS-001 — AGENTS.md Synchronization
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "node:fs"
import os from "os"
import path from "node:path"
import { spawnSync } from "node:child_process"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

function makeTempProjectRoot() {
  return fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "agents-sync-test-")))
}

function runSynth(args, cwd) {
  return spawnSync("node", [CLI_PATH, ...args], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, NODE_ENV: "test" },
  })
}

function parseJson(stdout) {
  return JSON.parse(stdout.trim())
}

test("synth project AGENTS.md generates AGENTS.md from baseline", { concurrency: false }, async () => {
  const dir = makeTempProjectRoot()
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "test-project" }))

  const result = runSynth(["project", "AGENTS.md"], dir)
  assert.strictEqual(result.status, 0, result.stderr)
  const output = parseJson(result.stdout)
  assert.strictEqual(output.kind, "AgentsContractGenerated")
  assert.strictEqual(output.wrote, true)

  const agentsPath = path.join(dir, "AGENTS.md")
  assert.ok(fs.existsSync(agentsPath), "AGENTS.md should exist")
  const content = fs.readFileSync(agentsPath, "utf-8")
  assert.ok(content.includes("test-project"), "should include project name")
  assert.ok(content.includes("synth project AGENTS.md"), "should include provenance")
})

test("synth project AGENTS.md merges subdirectory fragments", { concurrency: false }, async () => {
  const dir = makeTempProjectRoot()
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "frag-project" }))
  fs.mkdirSync(path.join(dir, "packages", "alpha"), { recursive: true })
  fs.writeFileSync(path.join(dir, "packages", "alpha", "AGENTS.md"), "# Alpha Package\n\nAlpha-specific rule.")

  const result = runSynth(["project", "AGENTS.md"], dir)
  assert.strictEqual(result.status, 0, result.stderr)
  const output = parseJson(result.stdout)
  assert.strictEqual(output.fragmentCount, 1)

  const content = fs.readFileSync(path.join(dir, "AGENTS.md"), "utf-8")
  assert.ok(content.includes("Alpha Package"), "should include fragment content")
  assert.ok(content.includes("packages/alpha/AGENTS.md"), "should include fragment source")
})

test("synth project AGENTS.md --check detects stale output", { concurrency: false }, async () => {
  const dir = makeTempProjectRoot()
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "check-project" }))
  fs.writeFileSync(path.join(dir, "AGENTS.md"), "stale content")

  const result = runSynth(["project", "AGENTS.md", "--check"], dir)
  assert.notStrictEqual(result.status, 0, "should exit non-zero when stale")
  const output = parseJson(result.stdout)
  assert.strictEqual(output.stale, true)
})

test("synth project AGENTS.md --check passes when output is fresh", { concurrency: false }, async () => {
  const dir = makeTempProjectRoot()
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "fresh-project" }))

  runSynth(["project", "AGENTS.md"], dir)
  const result = runSynth(["project", "AGENTS.md", "--check"], dir)
  assert.strictEqual(result.status, 0, result.stderr)
  const output = parseJson(result.stdout)
  assert.strictEqual(output.stale, false)
})

test("synth project AGENTS.md preserves existing baseline content", { concurrency: false }, async () => {
  const dir = makeTempProjectRoot()
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "preserve-project" }))
  fs.writeFileSync(path.join(dir, "AGENTS.md"), "# Custom baseline\n\nCustom rule.")

  const result = runSynth(["project", "AGENTS.md"], dir)
  assert.strictEqual(result.status, 0, result.stderr)

  const content = fs.readFileSync(path.join(dir, "AGENTS.md"), "utf-8")
  assert.ok(content.includes("Custom baseline"), "should preserve baseline")
  assert.ok(content.includes("Custom rule"), "should preserve baseline rules")
  assert.ok(content.includes("preserve-project"), "should add provenance")
})

test("synth project AGENTS.md preserves user content outside the SYNTH block", { concurrency: false }, async () => {
  const dir = makeTempProjectRoot()
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "section-merge-project" }))
  fs.writeFileSync(
    path.join(dir, "AGENTS.md"),
    "# User guide\n\nThis is user-owned content.\n\n<!-- SYNTH:contract:start -->\nold generated content\n<!-- SYNTH:contract:end -->\n\n## User appendix\n\nMore user content."
  )

  const result = runSynth(["project", "AGENTS.md"], dir)
  assert.strictEqual(result.status, 0, result.stderr)

  const content = fs.readFileSync(path.join(dir, "AGENTS.md"), "utf-8")
  assert.ok(content.includes("# User guide"), "should preserve content before SYNTH block")
  assert.ok(content.includes("This is user-owned content."), "should preserve user body before SYNTH block")
  assert.ok(content.includes("## User appendix"), "should preserve content after SYNTH block")
  assert.ok(content.includes("More user content."), "should preserve user body after SYNTH block")
  assert.ok(!content.includes("old generated content"), "should replace stale SYNTH block")
  assert.ok(content.includes("section-merge-project"), "should include fresh provenance")
})

test("synth project AGENTS.md regenerates only the SYNTH block on second run", { concurrency: false }, async () => {
  const dir = makeTempProjectRoot()
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "idempotent-project" }))
  fs.writeFileSync(path.join(dir, "AGENTS.md"), "# User preamble\n\n<!-- SYNTH:contract:start -->\nold\n<!-- SYNTH:contract:end -->")

  runSynth(["project", "AGENTS.md"], dir)
  const afterFirst = fs.readFileSync(path.join(dir, "AGENTS.md"), "utf-8")

  const result = runSynth(["project", "AGENTS.md"], dir)
  assert.strictEqual(result.status, 0, result.stderr)
  const output = parseJson(result.stdout)
  assert.strictEqual(output.wrote, false, "should not rewrite when fresh")
  assert.strictEqual(output.stale, false, "should report not stale")

  const afterSecond = fs.readFileSync(path.join(dir, "AGENTS.md"), "utf-8")
  assert.strictEqual(afterFirst, afterSecond, "content should be identical across fresh runs")
  assert.ok(afterSecond.includes("# User preamble"), "should keep user preamble")
  assert.ok(!afterSecond.includes("old\n<!-- SYNTH:contract:end -->"), "should not keep old block content")
})
