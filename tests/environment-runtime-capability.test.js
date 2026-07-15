// ============================================================
// RUNTIME & PACKAGE CAPABILITY TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import {
  createNodeRuntimeProvider,
  createNpmPackageProvider,
} from "../dist/environment/index.js"

/** Scripted ToolProvider fake: records invocations, returns canned results */
function createFakeTools({ locatedPaths = {}, runResults = [] } = {}) {
  const calls = []
  return {
    name: "fake-tools",
    version: "1.0.0",
    calls,
    async isAvailable(tool) {
      return locatedPaths[tool] !== undefined
    },
    async locate(tool) {
      return locatedPaths[tool]
    },
    async runTool(tool, args = [], options = {}) {
      calls.push({ tool, args, options })
      const next = runResults.length > 0 ? runResults.shift() : {}
      return {
        command: tool,
        args,
        exitCode: next.exitCode ?? 0,
        stdout: next.stdout ?? "",
        stderr: next.stderr ?? "",
        durationMs: 1,
        timedOut: false,
      }
    },
  }
}

test("NodeRuntimeProvider detects the node runtime", async () => {
  const provider = createNodeRuntimeProvider()
  const info = await provider.detectRuntime("node")
  assert.ok(info !== undefined)
  assert.strictEqual(info.name, "node")
  assert.match(info.version, /^v\d+\.\d+\.\d+/)
  assert.ok(info.path.includes("node"))
})

test("NodeRuntimeProvider returns undefined for missing runtimes", async () => {
  const provider = createNodeRuntimeProvider()
  const info = await provider.detectRuntime("synth-definitely-not-a-runtime-xyz")
  assert.strictEqual(info, undefined)
})

test("NodeRuntimeProvider lists only available runtimes", async () => {
  const provider = createNodeRuntimeProvider()
  const list = await provider.listRuntimes(["node", "npm", "synth-definitely-not-a-runtime-xyz"])
  assert.strictEqual(list.length, 2)
  assert.deepStrictEqual(list.map((r) => r.name).sort(), ["node", "npm"])
})

test("NodeRuntimeProvider reports path even when version query fails", async () => {
  const tools = createFakeTools({
    locatedPaths: { fakert: "/usr/bin/fakert" },
    runResults: [{ exitCode: 1, stdout: "", stderr: "boom" }],
  })
  const provider = createNodeRuntimeProvider(tools)
  const info = await provider.detectRuntime("fakert")
  assert.deepStrictEqual(info, { name: "fakert", path: "/usr/bin/fakert" })
})

test("NpmPackageProvider builds install commands through the Tool capability", async () => {
  const tools = createFakeTools()
  const provider = createNpmPackageProvider(tools)
  const result = await provider.install({ packages: ["pkg-a", "pkg-b"], cwd: "/work" })
  assert.strictEqual(result.exitCode, 0)
  assert.strictEqual(tools.calls.length, 1)
  assert.strictEqual(tools.calls[0].tool, "npm")
  assert.deepStrictEqual(tools.calls[0].args, ["install", "pkg-a", "pkg-b"])
  assert.strictEqual(tools.calls[0].options.cwd, "/work")
})

test("NpmPackageProvider builds remove commands through the Tool capability", async () => {
  const tools = createFakeTools()
  const provider = createNpmPackageProvider(tools)
  await provider.remove({ packages: ["pkg-a"] })
  assert.deepStrictEqual(tools.calls[0].args, ["uninstall", "pkg-a"])
})

test("NpmPackageProvider parses installed packages from npm ls JSON", async () => {
  const tools = createFakeTools({
    runResults: [{
      stdout: JSON.stringify({
        dependencies: {
          "js-yaml": { version: "4.1.0" },
          argparse: { version: "2.0.1" },
        },
      }),
    }],
  })
  const provider = createNpmPackageProvider(tools)
  const list = await provider.listInstalled("/work")
  assert.deepStrictEqual(list, [
    { name: "js-yaml", version: "4.1.0" },
    { name: "argparse", version: "2.0.1" },
  ])
  assert.deepStrictEqual(tools.calls[0].args, ["ls", "--depth=0", "--json"])
})

test("NpmPackageProvider tolerates missing dependencies key", async () => {
  const tools = createFakeTools({ runResults: [{ stdout: "{}" }] })
  const provider = createNpmPackageProvider(tools)
  assert.deepStrictEqual(await provider.listInstalled(), [])
})

test("NpmPackageProvider returns empty list on unparseable output", async () => {
  const tools = createFakeTools({ runResults: [{ exitCode: 1, stdout: "not json" }] })
  const provider = createNpmPackageProvider(tools)
  assert.deepStrictEqual(await provider.listInstalled(), [])
})
