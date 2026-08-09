// ============================================================
// ADAPTER CATALOG TESTS
// ============================================================
// Regression guards for the unified adapter catalog
// (EXP-ADAPTER-CATALOG-001):
//  - Default catalog seeds runtime, integration, initialization,
//    and discovery descriptors.
//  - query() matches by capability, family, runtime, language, platform.
//  - resolve() returns a descriptor by id.
//  - list() returns registered ids.
//  - createInitializationAdapter() maps descriptors to instances.
//  - createObservationCapability() maps discovery descriptors to capabilities.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import {
  createAdapterCatalog,
  createDefaultAdapterCatalog,
  createInitializationAdapter,
  createObservationCapability,
} from "../dist/adapters/adapter-catalog.js"
import { RUNTIME_ADAPTER_DESCRIPTORS } from "../dist/adapters/runtime/runtime-adapter-descriptors.js"

test("empty catalog has no descriptors", () => {
  const catalog = createAdapterCatalog()
  assert.deepStrictEqual(catalog.list(), [])
  assert.strictEqual(catalog.resolve("nextjs-runtime"), undefined)
})

test("default catalog registers runtime descriptors", () => {
  const catalog = createDefaultAdapterCatalog()

  for (const descriptor of RUNTIME_ADAPTER_DESCRIPTORS) {
    assert.ok(catalog.resolve(descriptor.id), `expected ${descriptor.id} in catalog`)
  }
})

test("default catalog registers integration adapters", () => {
  const catalog = createDefaultAdapterCatalog()

  const repository = catalog.resolve("repository")
  assert.ok(repository)
  assert.strictEqual(repository.kind, "integration")
  assert.strictEqual(repository.family, "repository")

  const github = catalog.resolve("github")
  assert.ok(github)
  assert.strictEqual(github.kind, "integration")
  assert.strictEqual(github.family, "github")
})

test("default catalog registers initialization adapters", () => {
  const catalog = createDefaultAdapterCatalog()

  const filesystem = catalog.resolve("filesystem-initialization")
  assert.ok(filesystem)
  assert.strictEqual(filesystem.family, "initialization")
  assert.strictEqual(filesystem.determinism, "deterministic")
})

test("default catalog registers discovery adapters", () => {
  const catalog = createDefaultAdapterCatalog()

  assert.ok(catalog.resolve("discovery:filesystem"))
  assert.ok(catalog.resolve("discovery:git"))
  assert.ok(catalog.resolve("discovery:operational-artifacts"))
})

test("query matches by capability", () => {
  const catalog = createDefaultAdapterCatalog()

  const testing = catalog.query({ capability: "testing" })
  assert.ok(testing.some((d) => d.id === "tdd"), "tdd should match testing capability")
  assert.ok(testing.some((d) => d.id === "bdd"), "bdd should match testing capability")

  const ui = catalog.query({ capability: "ui" })
  assert.ok(ui.some((d) => d.id === "nextjs-runtime"))
})

test("query matches by family", () => {
  const catalog = createDefaultAdapterCatalog()

  const runtimes = catalog.query({ family: "runtime" })
  assert.ok(runtimes.every((d) => d.family === "runtime"))
  assert.ok(runtimes.some((d) => d.id === "nextjs-runtime"))

  const discovery = catalog.query({ family: "discovery" })
  assert.ok(discovery.some((d) => d.id === "discovery:git"))
})

test("query matches by runtime and language", () => {
  const catalog = createDefaultAdapterCatalog()

  const nodeTypescript = catalog.query({ runtime: "node", language: "typescript" })
  assert.ok(nodeTypescript.some((d) => d.id === "nextjs-runtime"))
  assert.ok(nodeTypescript.some((d) => d.id === "api-route"))
})

test("query excludes adapter ids", () => {
  const catalog = createDefaultAdapterCatalog()

  const withoutTdd = catalog.query({ capability: "testing", excludeAdapterIds: ["tdd"] })
  assert.ok(!withoutTdd.some((d) => d.id === "tdd"))
})

test("query returns empty when no specific criteria match", () => {
  const catalog = createDefaultAdapterCatalog()

  const results = catalog.query({ capability: "nonexistent-capability" })
  assert.deepStrictEqual(results, [])
})

test("createInitializationAdapter maps filesystem descriptor", () => {
  const catalog = createDefaultAdapterCatalog()
  const descriptor = catalog.resolve("filesystem-initialization")

  const adapter = createInitializationAdapter(descriptor)
  assert.ok(adapter)
  assert.strictEqual(adapter.id, "filesystem")
  assert.strictEqual(adapter.canHandle({ sourceType: "filesystem", sourceLocation: "." }), true)
})

test("createInitializationAdapter returns undefined for unknown descriptor", () => {
  const adapter = createInitializationAdapter({
    id: "unknown",
    name: "Unknown",
    version: "1.0.0",
    kind: "integration",
    family: "initialization",
    description: "Unknown",
    capabilities: [],
    determinism: "deterministic",
  })
  assert.strictEqual(adapter, undefined)
})

test("createObservationCapability maps discovery descriptors", () => {
  const catalog = createDefaultAdapterCatalog()

  const filesystemDescriptor = catalog.resolve("discovery:filesystem")
  const filesystemCapability = createObservationCapability(filesystemDescriptor)
  assert.ok(filesystemCapability)
  assert.strictEqual(filesystemCapability.id, "discovery:filesystem")

  const gitDescriptor = catalog.resolve("discovery:git")
  const gitCapability = createObservationCapability(gitDescriptor)
  assert.ok(gitCapability)
  assert.strictEqual(gitCapability.id, "discovery:git")

  const operationalDescriptor = catalog.resolve("discovery:operational-artifacts")
  const operationalCapability = createObservationCapability(operationalDescriptor)
  assert.ok(operationalCapability)
  assert.strictEqual(operationalCapability.id, "discovery:operational-artifacts")
})

test("createObservationCapability returns undefined for non-discovery descriptor", () => {
  const capability = createObservationCapability({
    id: "repository",
    name: "Repository",
    version: "1.0.0",
    kind: "integration",
    family: "repository",
    description: "Repository adapter",
    capabilities: [],
    determinism: "contextual",
  })
  assert.strictEqual(capability, undefined)
})
