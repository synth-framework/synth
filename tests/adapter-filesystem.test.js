// ============================================================
// ADAPTER TESTS — Filesystem Adapter
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createFilesystemAdapter } from "../dist/adapters/filesystem/adapter.js"
import { createAdapterRegistry } from "../dist/adapters/registry.js"
import fs from "fs"
import path from "path"

const FIXTURES_DIR = path.join(process.cwd(), "tests", "filesystem-adapter-fixtures")

function cleanFixtures() {
  fs.rmSync(FIXTURES_DIR, { recursive: true, force: true })
  fs.mkdirSync(FIXTURES_DIR, { recursive: true })
}

function writeFixture(relativePath, content) {
  const fullPath = path.join(FIXTURES_DIR, relativePath)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, content)
}

test("AdapterRegistry lists filesystem adapter", () => {
  const registry = createAdapterRegistry()
  assert.ok(registry.list().includes("filesystem"))
})

test("FilesystemAdapter starts in discovered state", () => {
  const adapter = createFilesystemAdapter()
  assert.strictEqual(adapter.state, "discovered")
  assert.strictEqual(adapter.metadata.category, "integration")
  assert.strictEqual(adapter.metadata.kind, "filesystem")
})

test("FilesystemAdapter transitions through lifecycle", async () => {
  cleanFixtures()
  const adapter = createFilesystemAdapter()
  await adapter.configure({ rootDirectory: FIXTURES_DIR })
  assert.strictEqual(adapter.state, "configured")
  await adapter.validate()
  assert.strictEqual(adapter.state, "validated")
  await adapter.enable()
  assert.strictEqual(adapter.state, "enabled")
  await adapter.disable()
  assert.strictEqual(adapter.state, "disabled")
})

test("FilesystemAdapter emits evidence observation for JSON config", async () => {
  cleanFixtures()
  writeFixture("config/app.json", '{"port": 3000, "env": "production"}')

  const adapter = createFilesystemAdapter()
  await adapter.configure({ rootDirectory: FIXTURES_DIR })
  await adapter.enable()
  const result = await adapter.observe()
  assert.strictEqual(result.errors.length, 0)
  assert.strictEqual(result.observations.length, 1)

  const obs = result.observations[0]
  assert.strictEqual(obs.category, "evidence")
  assert.strictEqual(obs.subject, "app.json")
  assert.strictEqual(obs.confidence, "high")
  assert.strictEqual(obs.source.adapter, "filesystem")
  assert.ok(obs.evidence[0].snippet.includes("port"))
  assert.strictEqual(obs.metadata.kind, "text")
})

test("FilesystemAdapter scans nested directories", async () => {
  cleanFixtures()
  writeFixture("schemas/user.sql", "CREATE TABLE users (id UUID PRIMARY KEY);")
  writeFixture("assets/logo.png", "fake-binary")

  const adapter = createFilesystemAdapter()
  await adapter.configure({ rootDirectory: FIXTURES_DIR })
  await adapter.enable()
  const result = await adapter.observe()
  assert.strictEqual(result.observations.length, 2)

  const sqlObs = result.observations.find((o) => o.subject === "user.sql")
  assert.ok(sqlObs, "Expected SQL observation")
  assert.strictEqual(sqlObs.confidence, "high")
  assert.strictEqual(sqlObs.metadata.kind, "text")

  const binaryObs = result.observations.find((o) => o.subject === "logo.png")
  assert.ok(binaryObs, "Expected binary placeholder observation")
  assert.strictEqual(binaryObs.confidence, "unknown")
  assert.strictEqual(binaryObs.metadata.kind, "binary")
})

test("FilesystemAdapter scans explicit file list", async () => {
  cleanFixtures()
  writeFixture("a.txt", "Alpha")
  writeFixture("b.txt", "Beta")

  const adapter = createFilesystemAdapter()
  await adapter.configure({ files: [path.join(FIXTURES_DIR, "a.txt")] })
  await adapter.enable()
  const result = await adapter.observe()
  assert.strictEqual(result.observations.length, 1)
  assert.strictEqual(result.observations[0].subject, "a.txt")
})

test("FilesystemAdapter excludes hidden files by default", async () => {
  cleanFixtures()
  writeFixture("visible.txt", "visible")
  writeFixture(".hidden.txt", "hidden")

  const adapter = createFilesystemAdapter()
  await adapter.configure({ rootDirectory: FIXTURES_DIR })
  await adapter.enable()
  const result = await adapter.observe()
  assert.strictEqual(result.observations.length, 1)
  assert.strictEqual(result.observations[0].subject, "visible.txt")
})

test("FilesystemAdapter includes hidden files when configured", async () => {
  cleanFixtures()
  writeFixture("visible.txt", "visible")
  writeFixture(".hidden.txt", "hidden")

  const adapter = createFilesystemAdapter()
  await adapter.configure({ rootDirectory: FIXTURES_DIR, includeHidden: true })
  await adapter.enable()
  const result = await adapter.observe()
  assert.strictEqual(result.observations.length, 2)
})

test("FilesystemAdapter returns empty batch for missing directory", async () => {
  const missingDir = path.join(process.cwd(), "tests", "filesystem-adapter-missing")
  fs.rmSync(missingDir, { recursive: true, force: true })

  const adapter = createFilesystemAdapter()
  await adapter.configure({ rootDirectory: missingDir })
  await adapter.enable()
  const result = await adapter.observe()
  assert.strictEqual(result.observations.length, 0)
  assert.strictEqual(result.errors.length, 0)
})

test("FilesystemAdapter health check passes when enabled", async () => {
  const adapter = createFilesystemAdapter()
  await adapter.enable()
  await adapter.healthCheck()
  assert.strictEqual(adapter.health.state, "healthy")
})
