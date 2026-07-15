// ============================================================
// PROCESS & TOOL CAPABILITY TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createLocalShellProvider } from "../dist/environment/index.js"
import { mkdtemp, realpath, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const node = process.execPath

test("LocalShellProvider runs a process and captures stdout", async () => {
  const shell = createLocalShellProvider()
  const result = await shell.run({ command: node, args: ["-e", "console.log('hello')"] })
  assert.strictEqual(result.exitCode, 0)
  assert.strictEqual(result.stdout.trim(), "hello")
  assert.strictEqual(result.timedOut, false)
  assert.ok(result.durationMs >= 0)
  assert.strictEqual(result.command, node)
  assert.deepStrictEqual(result.args, ["-e", "console.log('hello')"])
})

test("LocalShellProvider captures stderr and non-zero exit code", async () => {
  const shell = createLocalShellProvider()
  const result = await shell.run({
    command: node,
    args: ["-e", "console.error('oops'); process.exit(3)"],
  })
  assert.strictEqual(result.exitCode, 3)
  assert.strictEqual(result.stderr.trim(), "oops")
})

test("LocalShellProvider reports missing commands as data, not exceptions", async () => {
  const shell = createLocalShellProvider()
  const result = await shell.run({ command: "synth-definitely-not-a-real-command-xyz", args: [] })
  assert.strictEqual(result.exitCode, -1)
  assert.ok(result.stderr.length > 0)
})

test("LocalShellProvider passes stdin to the process", async () => {
  const shell = createLocalShellProvider()
  const result = await shell.run({
    command: node,
    args: ["-e", "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(d.toUpperCase()))"],
    stdin: "synth",
  })
  assert.strictEqual(result.exitCode, 0)
  assert.strictEqual(result.stdout.trim(), "SYNTH")
})

test("LocalShellProvider enforces timeouts", async () => {
  const shell = createLocalShellProvider()
  const result = await shell.run({
    command: node,
    args: ["-e", "setTimeout(() => {}, 10000)"],
    timeoutMs: 200,
  })
  assert.strictEqual(result.timedOut, true)
  assert.ok(result.durationMs < 5000)
})

test("LocalShellProvider respects cwd", async () => {
  const shell = createLocalShellProvider()
  const dir = await mkdtemp(join(tmpdir(), "synth-process-test-"))
  const realDir = await realpath(dir)
  const result = await shell.run({
    command: node,
    args: ["-e", "console.log(process.cwd())"],
    cwd: dir,
  })
  assert.strictEqual(result.exitCode, 0)
  assert.strictEqual(result.stdout.trim(), realDir)
  await rm(dir, { recursive: true, force: true })
})

test("LocalShellProvider locates available tools", async () => {
  const shell = createLocalShellProvider()
  const location = await shell.locate("node")
  assert.ok(location !== undefined)
  assert.ok(location.includes("node"))
  assert.strictEqual(await shell.isAvailable("node"), true)
})

test("LocalShellProvider reports missing tools as unavailable", async () => {
  const shell = createLocalShellProvider()
  assert.strictEqual(await shell.isAvailable("synth-definitely-not-a-real-tool-xyz"), false)
  assert.strictEqual(await shell.locate("synth-definitely-not-a-real-tool-xyz"), undefined)
})

test("LocalShellProvider runs tools through the Tool capability", async () => {
  const shell = createLocalShellProvider()
  const result = await shell.runTool("node", ["--version"])
  assert.strictEqual(result.exitCode, 0)
  assert.match(result.stdout.trim(), /^v\d+\.\d+\.\d+/)
})
