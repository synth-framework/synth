// ============================================================
// ADAPTER TESTS — Document Adapter
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createDocumentAdapter } from "../dist/adapters/document/adapter.js"
import { createAdapterRegistry } from "../dist/adapters/registry.js"
import fs from "fs"
import path from "path"

const FIXTURES_DIR = path.join(process.cwd(), "tests", "document-adapter-fixtures")

function cleanFixtures() {
  fs.rmSync(FIXTURES_DIR, { recursive: true, force: true })
  fs.mkdirSync(FIXTURES_DIR, { recursive: true })
}

function writeFixture(name, content) {
  fs.writeFileSync(path.join(FIXTURES_DIR, name), content)
}

test("AdapterRegistry lists document adapter", () => {
  const registry = createAdapterRegistry()
  assert.ok(registry.list().includes("document"))
})

test("DocumentAdapter starts in discovered state", () => {
  const adapter = createDocumentAdapter()
  assert.strictEqual(adapter.state, "discovered")
  assert.strictEqual(adapter.metadata.category, "integration")
  assert.strictEqual(adapter.metadata.kind, "document")
})

test("DocumentAdapter transitions through lifecycle", async () => {
  cleanFixtures()
  const adapter = createDocumentAdapter()
  await adapter.configure({ documentsDirectory: FIXTURES_DIR })
  assert.strictEqual(adapter.state, "configured")
  await adapter.validate()
  assert.strictEqual(adapter.state, "validated")
  await adapter.enable()
  assert.strictEqual(adapter.state, "enabled")
  await adapter.disable()
  assert.strictEqual(adapter.state, "disabled")
})

test("DocumentAdapter emits evidence observation for markdown", async () => {
  cleanFixtures()
  writeFixture("mission.md", "# Mission\n\nBuild a CRM for the sales team.")

  const adapter = createDocumentAdapter()
  await adapter.configure({ documentsDirectory: FIXTURES_DIR })
  await adapter.enable()
  const result = await adapter.observe()
  assert.strictEqual(result.errors.length, 0)
  assert.strictEqual(result.observations.length, 1)

  const obs = result.observations[0]
  assert.strictEqual(obs.category, "evidence")
  assert.strictEqual(obs.subject, "mission.md")
  assert.strictEqual(obs.confidence, "high")
  assert.strictEqual(obs.source.adapter, "document")
  assert.ok(obs.evidence[0].snippet.includes("Build a CRM"))
  assert.strictEqual(obs.metadata.format, "markdown")
})

test("DocumentAdapter emits evidence observation for plain text", async () => {
  cleanFixtures()
  writeFixture("notes.txt", "The system must support OAuth2 login.")

  const adapter = createDocumentAdapter()
  await adapter.configure({ documentsDirectory: FIXTURES_DIR })
  await adapter.enable()
  const result = await adapter.observe()
  assert.strictEqual(result.observations.length, 1)
  assert.strictEqual(result.observations[0].metadata.format, "text")
  assert.ok(result.observations[0].evidence[0].snippet.includes("OAuth2"))
})

test("DocumentAdapter emits evidence observation for ADR", async () => {
  cleanFixtures()
  writeFixture("decision.adr", "# ADR 001: Use PostgreSQL\n\nWe will use PostgreSQL for persistence.")

  const adapter = createDocumentAdapter()
  await adapter.configure({ documentsDirectory: FIXTURES_DIR })
  await adapter.enable()
  const result = await adapter.observe()
  assert.strictEqual(result.observations.length, 1)
  assert.strictEqual(result.observations[0].metadata.format, "adr")
})

test("DocumentAdapter reports binary PDF without parsing", async () => {
  cleanFixtures()
  fs.writeFileSync(path.join(FIXTURES_DIR, "spec.pdf"), Buffer.from("%PDF-1.4 fake pdf content"))

  const adapter = createDocumentAdapter()
  await adapter.configure({ documentsDirectory: FIXTURES_DIR })
  await adapter.enable()
  const result = await adapter.observe()
  const pdfObs = result.observations.find((o) => o.subject === "spec.pdf")
  assert.ok(pdfObs, "Expected PDF placeholder observation")
  assert.strictEqual(pdfObs.confidence, "unknown")
  assert.strictEqual(pdfObs.metadata.format, "pdf")
})

test("DocumentAdapter scans explicit file list", async () => {
  cleanFixtures()
  writeFixture("a.md", "Alpha")
  writeFixture("b.md", "Beta")

  const adapter = createDocumentAdapter()
  await adapter.configure({ files: [path.join(FIXTURES_DIR, "a.md")] })
  await adapter.enable()
  const result = await adapter.observe()
  assert.strictEqual(result.observations.length, 1)
  assert.strictEqual(result.observations[0].subject, "a.md")
})

test("DocumentAdapter returns empty batch for missing directory", async () => {
  const missingDir = path.join(process.cwd(), "tests", "document-adapter-missing")
  fs.rmSync(missingDir, { recursive: true, force: true })

  const adapter = createDocumentAdapter()
  await adapter.configure({ documentsDirectory: missingDir })
  await adapter.enable()
  const result = await adapter.observe()
  assert.strictEqual(result.observations.length, 0)
  assert.strictEqual(result.errors.length, 0)
})

test("DocumentAdapter health check passes when enabled", async () => {
  const adapter = createDocumentAdapter()
  await adapter.enable()
  await adapter.healthCheck()
  assert.strictEqual(adapter.health.state, "healthy")
})
