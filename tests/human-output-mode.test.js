// ============================================================
// EXP-CLI-002 — Human-Readable CLI Output Mode
// ============================================================
// Verifies that --human emits prose on stdout, default mode emits
// a single JSON object, and diagnostic logs go to stderr.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "node:fs"
import os from "os"
import path from "node:path"
import { spawnSync } from "child_process"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

function runSynth(args, cwd) {
  const result = spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 60000,
  })
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  }
}

function makeTempDir() {
  return fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "human-output-test-")))
}

function isSingleJsonObject(text) {
  const trimmed = text.trim()
  if (trimmed.length === 0) return false
  try {
    const parsed = JSON.parse(trimmed)
    return parsed !== null && typeof parsed === "object"
  } catch {
    return false
  }
}

function countJsonObjects(text) {
  // First check whether the entire stdout is a single pretty-printed JSON object.
  if (isSingleJsonObject(text)) return 1
  // Otherwise fall back to line-delimited JSON counting.
  const lines = text.trim().split("\n").filter((line) => line.trim().length > 0)
  let count = 0
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line)
      if (parsed && typeof parsed === "object") count++
    } catch {
      // not JSON
    }
  }
  return count
}

test("default status emits a single JSON object on stdout", () => {
  const result = runSynth(["status"], process.cwd())
  assert.strictEqual(result.status, 0, result.stderr)
  const jsonCount = countJsonObjects(result.stdout)
  assert.strictEqual(jsonCount, 1, `expected exactly one JSON object on stdout, got ${jsonCount}`)
})

test("status --human emits prose and no JSON on stdout", () => {
  const result = runSynth(["status", "--human"], process.cwd())
  assert.strictEqual(result.status, 0, result.stderr)
  const jsonCount = countJsonObjects(result.stdout)
  assert.strictEqual(jsonCount, 0, `expected no JSON on stdout in human mode, got ${jsonCount}`)
  assert.ok(result.stdout.includes("Status:"), "expected human status summary")
  assert.ok(result.stdout.includes("Phase:"), "expected phase line")
})

test("status logs go to stderr so stdout stays clean", () => {
  const result = runSynth(["status"], process.cwd())
  assert.ok(result.stderr.includes("Resolving governance context"), "expected INFO log on stderr")
})

test("bootstrap --approve emits exactly one JSON object on stdout", () => {
  const dir = makeTempDir()
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "human-test", version: "1.0.0" }))
  const result = runSynth(["bootstrap", ".", "--approve"], dir)
  assert.strictEqual(result.status, 0, result.stderr)
  const jsonCount = countJsonObjects(result.stdout)
  assert.strictEqual(jsonCount, 1, `expected exactly one JSON object on stdout, got ${jsonCount}: ${result.stdout}`)
})

test("bootstrap --approve --human emits no JSON on stdout", () => {
  const dir = makeTempDir()
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "human-test-2", version: "1.0.0" }))
  const result = runSynth(["bootstrap", ".", "--approve", "--human"], dir)
  assert.strictEqual(result.status, 0, result.stderr)
  const jsonCount = countJsonObjects(result.stdout)
  assert.strictEqual(jsonCount, 0, `expected no JSON on stdout in human mode, got ${jsonCount}: ${result.stdout}`)
})

test("human error output includes suggestion and next step", () => {
  const result = runSynth(["mission", "create", "--human"], process.cwd())
  assert.notStrictEqual(result.status, 0)
  assert.ok(result.stdout.includes("Error:"), "expected human error prefix")
  assert.ok(result.stdout.includes("Suggestion:") || result.stdout.includes("Next step:"), "expected actionable hint")
})
