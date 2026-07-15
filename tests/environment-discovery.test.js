// ============================================================
// ENVIRONMENT DISCOVERY TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import {
  createDiscoveryOrchestrator,
  createDefaultDiscoveryRules,
  createReferenceProviders,
  createNodeObservationContext,
  getNodeEnvironmentMetadata,
} from "../dist/environment/index.js"

function makeInMemoryContext(files = {}, dirs = {}, env = {}, cwd = "/test") {
  const fileMap = { ...files }
  const directoryMap = { ...dirs }
  function resolve(path) {
    if (path.startsWith("/")) return path
    return `${cwd}/${path}`
  }
  return {
    readFile: async (path) => fileMap[resolve(path)],
    listDirectory: async (path) => directoryMap[resolve(path)] || [],
    pathExists: async (path) => resolve(path) in fileMap || resolve(path) in directoryMap,
    readEnv: (name) => env[name],
    execTool: async (command, args) => {
      const key = `${command} ${args.join(" ")}`
      return env[key]
    },
    cwd,
  }
}

test("createDiscoveryOrchestrator exposes a discover method", () => {
  const orchestrator = createDiscoveryOrchestrator()
  assert.strictEqual(typeof orchestrator.discover, "function")
})

test("default rules cover all expected capability families", () => {
  const rules = createDefaultDiscoveryRules()
  const families = new Set(rules.map((r) => r.family))
  assert.ok(families.has("Environment"))
  assert.ok(families.has("Workspace"))
  assert.ok(families.has("Filesystem"))
  assert.ok(families.has("Revision"))
  assert.ok(families.has("Package"))
  assert.ok(families.has("Runtime"))
  assert.ok(families.has("Process"))
  assert.ok(families.has("Tool"))
  assert.ok(families.has("Forge"))
})

test("discovery produces a canonical evidence artifact", async () => {
  const ctx = makeInMemoryContext(
    {
      "/test/package.json": JSON.stringify({ name: "test-project", packageManager: "npm@10" }),
    },
    {
      "/test": ["package.json"],
    },
    {
      "node --version": "v20.0.0",
      "npm --version": "10.0.0",
    },
  )

  const orchestrator = createDiscoveryOrchestrator()
  const result = await orchestrator.discover(ctx)

  assert.strictEqual(result.evidence.schema, "synth-discovery-evidence-v1")
  assert.ok(result.evidence.timestamp > 0)
  assert.strictEqual(result.evidence.environment.workspaceRoot, "/test")
  assert.ok(Array.isArray(result.evidence.observations))
  assert.ok(result.evidence.observations.length > 0)
  assert.ok(result.durationMs >= 0)
})

test("workspace classification detects project", async () => {
  const ctx = makeInMemoryContext(
    {
      "/test/package.json": JSON.stringify({ name: "test-project" }),
    },
    {
      "/test": ["package.json"],
    },
    {
      "node --version": "v20.0.0",
      "npm --version": "10.0.0",
    },
  )

  const orchestrator = createDiscoveryOrchestrator()
  const result = await orchestrator.discover(ctx)

  assert.strictEqual(result.evidence.environment.classification, "project")
})

test("revision detection identifies git repository", async () => {
  const ctx = makeInMemoryContext(
    {},
    {
      "/test": [".git"],
      "/test/.git": [],
    },
    {
      "node --version": "v20.0.0",
    },
  )

  const orchestrator = createDiscoveryOrchestrator()
  const result = await orchestrator.discover(ctx)

  const revisionObs = result.evidence.observations.find((o) => o.name === "revisionSystem")
  assert.ok(revisionObs)
  assert.ok(revisionObs.value.includes("git"))
})

test("package manager detection reads packageManager field", async () => {
  const ctx = makeInMemoryContext(
    {
      "/test/package.json": JSON.stringify({ packageManager: "pnpm@9" }),
    },
    {
      "/test": ["package.json"],
    },
    {
      "node --version": "v20.0.0",
    },
  )

  const orchestrator = createDiscoveryOrchestrator()
  const result = await orchestrator.discover(ctx)

  const packageObs = result.evidence.observations.find((o) => o.name === "packageManager")
  assert.ok(packageObs)
  assert.strictEqual(packageObs.value.declared, "pnpm")
})

test("reference providers resolve against evidence", async () => {
  const ctx = makeInMemoryContext(
    {
      "/test/package.json": JSON.stringify({ name: "test-project" }),
    },
    {
      "/test": ["package.json", ".git"],
      "/test/.git": [],
    },
    {
      "node --version": "v20.0.0",
      "npm --version": "10.0.0",
      "git --version": "git version 2.40.0",
    },
  )

  const orchestrator = createDiscoveryOrchestrator({
    providers: createReferenceProviders(),
  })
  const result = await orchestrator.discover(ctx)

  const fsProvider = result.evidence.providers.find((p) => p.family === "Filesystem")
  assert.ok(fsProvider)
  assert.strictEqual(fsProvider.providerName, "node-filesystem")

  const revisionProvider = result.evidence.providers.find((p) => p.family === "Revision")
  assert.ok(revisionProvider)
  assert.strictEqual(revisionProvider.providerName, "git-revision")
})

test("provider override selects explicit provider", async () => {
  const ctx = makeInMemoryContext(
    {},
    { "/test": [] },
    { "node --version": "v20.0.0" },
  )

  const orchestrator = createDiscoveryOrchestrator({
    providers: createReferenceProviders(),
    overrides: [{ family: "Package", providerName: "npm-package" }],
  })
  const result = await orchestrator.discover(ctx)

  const packageProvider = result.evidence.providers.find((p) => p.family === "Package")
  assert.ok(packageProvider)
  assert.strictEqual(packageProvider.providerName, "npm-package")
  assert.strictEqual(packageProvider.confidence, "certain")
})

test("rule errors are captured as observations without crashing", async () => {
  const failingRule = {
    id: "test.failing",
    family: "Environment",
    description: "Always fails",
    observe: async () => {
      throw new Error("intentional failure")
    },
  }

  const ctx = makeInMemoryContext({}, { "/test": [] }, { "node --version": "v20.0.0" })
  const orchestrator = createDiscoveryOrchestrator({ rules: [failingRule] })
  const result = await orchestrator.discover(ctx)

  const errorObs = result.evidence.observations.find((o) => o.name === "ruleError")
  assert.ok(errorObs)
  assert.ok(errorObs.value.includes("intentional failure"))
})

test("compatibility decisions reflect provider availability", async () => {
  const ctx = makeInMemoryContext(
    {},
    { "/test": [] },
    { "node --version": "v20.0.0" },
  )

  const orchestrator = createDiscoveryOrchestrator({ providers: createReferenceProviders() })
  const result = await orchestrator.discover(ctx)

  const filesystemCompat = result.evidence.compatibility.find((c) => c.family === "Filesystem")
  assert.ok(filesystemCompat)
  assert.strictEqual(filesystemCompat.decision, "supported")

  const forgeCompat = result.evidence.compatibility.find((c) => c.family === "Forge")
  assert.ok(forgeCompat)
  assert.strictEqual(forgeCompat.decision, "unsupported")
})

test("Node observation context can be created", () => {
  const ctx = createNodeObservationContext()
  assert.strictEqual(typeof ctx.readFile, "function")
  assert.strictEqual(typeof ctx.listDirectory, "function")
  assert.strictEqual(typeof ctx.pathExists, "function")
  assert.strictEqual(typeof ctx.readEnv, "function")
  assert.strictEqual(typeof ctx.execTool, "function")
  assert.strictEqual(ctx.cwd, process.cwd())
})

test("Node environment metadata exposes platform info", () => {
  const meta = getNodeEnvironmentMetadata()
  assert.strictEqual(typeof meta.platform, "string")
  assert.strictEqual(typeof meta.platformVersion, "string")
})
