import { makeTempDirSync } from "./helpers/workspace.js"
// ============================================================
// E3: Unified Invocation Layer — synth govern router tests
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { runSynth, parseJson, CLI_PATH } from "./helpers/cli-harness.js"


function makeTempProjectRoot() {
  return fs.realpathSync.native(makeTempDirSync("govern-router-test-"))
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
