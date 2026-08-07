// ============================================================
// E3: Unified Invocation Layer — synth govern router tests
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

function makeTempProjectRoot() {
  return fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "govern-router-test-")))
}

function runSynth(args, cwd) {
  return spawnSync("node", [CLI_PATH, ...args], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, NODE_ENV: "test" },
  })
}

function parseJson(stdout) {
  const objects = []
  let start = -1
  let depth = 0
  let inString = false
  let escape = false
  for (let i = 0; i < stdout.length; i++) {
    const ch = stdout[i]
    if (inString) {
      if (escape) {
        escape = false
      } else if (ch === "\\") {
        escape = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }
    if (ch === '"') {
      inString = true
    } else if (ch === "{") {
      if (depth === 0) start = i
      depth++
    } else if (ch === "}") {
      depth--
      if (depth === 0 && start !== -1) {
        try {
          objects.push(JSON.parse(stdout.slice(start, i + 1)))
        } catch {
          // Ignore malformed JSON segments.
        }
        start = -1
      }
    }
  }
  return objects
}

test("synth govern routes uninitialized project without intent to first-contact onboard:detect", { concurrency: false }, async () => {
  const dir = makeTempProjectRoot()
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "govern-detect" }))

  const result = runSynth(["govern"], dir)
  assert.strictEqual(result.status, 0, result.stderr)
  const outputs = parseJson(result.stdout)
  const routed = outputs.find((o) => o.kind === "GovernRouted")
  assert.ok(routed, "should emit GovernRouted")
  assert.strictEqual(routed.reason, "uninitialized_project")
  assert.strictEqual(routed.route, "first-contact onboard:detect")
})

test("synth govern routes uninitialized project with intent to first-contact start", { concurrency: false }, async () => {
  const dir = makeTempProjectRoot()
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "govern-intent" }))

  const result = runSynth(["govern", "build a task manager"], dir)
  assert.strictEqual(result.status, 0, result.stderr)
  const outputs = parseJson(result.stdout)
  const routed = outputs.find((o) => o.kind === "GovernRouted")
  assert.ok(routed, "should emit GovernRouted")
  assert.strictEqual(routed.reason, "uninitialized_project_with_intent")
  assert.strictEqual(routed.route, "first-contact start")
  assert.strictEqual(routed.intent, "build a task manager")
})

test("synth govern routes initialized but ungoverned project to bootstrap", { concurrency: false }, async () => {
  const dir = makeTempProjectRoot()
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "govern-bootstrap" }))
  fs.mkdirSync(path.join(dir, ".synth"), { recursive: true })
  fs.writeFileSync(
    path.join(dir, ".synth", "manifest.json"),
    JSON.stringify({ projectName: "govern-bootstrap", governanceVersion: "2.1" })
  )

  const result = runSynth(["govern"], dir)
  // Bootstrap runs the full pipeline in an empty project; it may fail on govern step,
  // but the routing decision is emitted first.
  const outputs = parseJson(result.stdout)
  const routed = outputs.find((o) => o.kind === "GovernRouted")
  assert.ok(routed, "should emit GovernRouted")
  assert.strictEqual(routed.reason, "initialized_not_governed")
  assert.strictEqual(routed.route, "bootstrap --approve")
})

test("synth govern --pipeline delegates to npm run govern", { concurrency: false }, async () => {
  const dir = makeTempProjectRoot()
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "govern-pipeline" }))

  const result = runSynth(["govern", "--pipeline"], dir)
  const outputs = parseJson(result.stdout)
  const routed = outputs.find((o) => o.kind === "GovernRouted")
  assert.strictEqual(routed, undefined, "should not emit GovernRouted in pipeline mode")

  const delegated = outputs.find((o) => o.kind === "GovernResult")
  assert.ok(delegated, "should emit GovernResult in pipeline mode")
  assert.strictEqual(delegated.condition, "missing-govern-script", "should fall back to internal governance when script is missing")
})
