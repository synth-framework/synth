// ============================================================
// DISCOVERY ADAPTER CONTRACT TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import {
  createFilesystemDiscoveryAdapterWithProvider,
  createAdapterRegistry,
  FILESYSTEM_ADAPTER_ID,
  FILESYSTEM_ADAPTER_VERSION,
} from "../dist/discovery/index.js"
import { createInMemoryFilesystemProvider } from "../dist/environment/index.js"

test("filesystem adapter declares id, version, and determinism", () => {
  const fs = createInMemoryFilesystemProvider({})
  const adapter = createFilesystemDiscoveryAdapterWithProvider(fs)

  assert.strictEqual(adapter.id, FILESYSTEM_ADAPTER_ID)
  assert.strictEqual(adapter.version, FILESYSTEM_ADAPTER_VERSION)
  assert.strictEqual(adapter.determinism, "deterministic")
})

test("filesystem adapter canHandle returns true only for filesystem sources", () => {
  const fs = createInMemoryFilesystemProvider({})
  const adapter = createFilesystemDiscoveryAdapterWithProvider(fs)

  assert.strictEqual(adapter.canHandle({ type: "filesystem", path: "/project" }), true)
  assert.strictEqual(adapter.canHandle({ type: "git", url: "https://example.com/repo.git" }), false)
  assert.strictEqual(adapter.canHandle({ type: "api", endpoint: "https://example.com/api" }), false)
})

test("filesystem adapter returns observations with required provenance", async () => {
  const fs = createInMemoryFilesystemProvider({
    "/project/package.json": "{}",
    "/project/README.md": "# Project",
    "/project/src/index.ts": "export {}",
  })
  const adapter = createFilesystemDiscoveryAdapterWithProvider(fs)
  const source = { type: "filesystem", path: "/project" }

  const observations = await adapter.collectObservations(source, {})

  assert.ok(observations.length > 0, "observations are produced")
  for (const observation of observations) {
    assert.strictEqual(observation.adapterId, FILESYSTEM_ADAPTER_ID)
    assert.strictEqual(observation.adapterVersion, FILESYSTEM_ADAPTER_VERSION)
    assert.deepStrictEqual(observation.source, source)
    assert.strictEqual(typeof observation.fact, "string")
    assert.ok(observation.timestamp > 0, "timestamp is set")
  }
})

test("filesystem adapter reports missing paths", async () => {
  const fs = createInMemoryFilesystemProvider({})
  const adapter = createFilesystemDiscoveryAdapterWithProvider(fs)

  const observations = await adapter.collectObservations(
    { type: "filesystem", path: "/missing" },
    {},
  )

  assert.strictEqual(observations.length, 1)
  assert.strictEqual(observations[0].fact, "filesystem path does not exist")
})

test("filesystem adapter reports non-directory paths", async () => {
  const fs = createInMemoryFilesystemProvider({
    "/file.txt": "hello",
  })
  const adapter = createFilesystemDiscoveryAdapterWithProvider(fs)

  const observations = await adapter.collectObservations(
    { type: "filesystem", path: "/file.txt" },
    {},
  )

  assert.strictEqual(observations.length, 1)
  assert.strictEqual(observations[0].fact, "filesystem path is not a directory")
})

test("filesystem adapter detects package.json and README.md", async () => {
  const fs = createInMemoryFilesystemProvider({
    "/project/package.json": "{}",
    "/project/README.md": "# Project",
  })
  const adapter = createFilesystemDiscoveryAdapterWithProvider(fs)

  const observations = await adapter.collectObservations(
    { type: "filesystem", path: "/project" },
    {},
  )

  const facts = observations.map((o) => o.fact)
  assert.ok(facts.includes("manifest detected"))
  assert.ok(facts.includes("file exists"))
})

test("filesystem adapter does not modify the source filesystem", async () => {
  const fs = createInMemoryFilesystemProvider({
    "/project/package.json": "{}",
  })
  const adapter = createFilesystemDiscoveryAdapterWithProvider(fs)

  await adapter.collectObservations({ type: "filesystem", path: "/project" }, {})

  assert.strictEqual(await fs.pathExists("/project/package.json"), true)
  assert.strictEqual(await fs.pathExists("/project/.synth"), false)
  assert.strictEqual(await fs.pathExists("/project/.synth-discovery"), false)
})

test("adapter registry resolves adapters deterministically", () => {
  const fs = createInMemoryFilesystemProvider({})
  const adapterA = createFilesystemDiscoveryAdapterWithProvider(fs)
  const registry = createAdapterRegistry({ adapters: [adapterA] })

  const resolved = registry.resolve({ type: "filesystem", path: "/project" })
  assert.strictEqual(resolved.length, 1)
  assert.strictEqual(resolved[0].id, FILESYSTEM_ADAPTER_ID)
})

test("adapter registry orders adapters by id", () => {
  const fs = createInMemoryFilesystemProvider({})
  const adapterB = {
    id: "discovery:beta",
    version: "1.0.0",
    determinism: "deterministic",
    canHandle: () => true,
    collectObservations: async () => [],
  }
  const adapterA = {
    id: "discovery:alpha",
    version: "1.0.0",
    determinism: "deterministic",
    canHandle: () => true,
    collectObservations: async () => [],
  }
  const registry = createAdapterRegistry({ adapters: [adapterB, adapterA] })

  const resolved = registry.resolve({ type: "filesystem", path: "/project" })
  assert.deepStrictEqual(
    resolved.map((a) => a.id),
    ["discovery:alpha", "discovery:beta"],
  )
})

test("adapter registry list returns sorted adapter ids", () => {
  const fs = createInMemoryFilesystemProvider({})
  const adapterB = {
    id: "discovery:beta",
    version: "1.0.0",
    determinism: "deterministic",
    canHandle: () => true,
    collectObservations: async () => [],
  }
  const adapterA = createFilesystemDiscoveryAdapterWithProvider(fs)
  const registry = createAdapterRegistry({ adapters: [adapterB, adapterA] })

  assert.deepStrictEqual(registry.list(), ["discovery:beta", FILESYSTEM_ADAPTER_ID])
})
