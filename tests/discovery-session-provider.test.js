// ============================================================
// DISCOVERY SESSION PROVIDER TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "fs/promises"
import os from "os"
import path from "path"
import {
  createDefaultDiscoverySessionProvider,
  DEFAULT_DISCOVERY_SESSION_PROVIDER_ID,
  DEFAULT_DISCOVERY_SESSION_PROVIDER_VERSION,
} from "../dist/discovery/index.js"
import { analyzeRepository } from "../dist/cli/bootstrap-analyzer.js"

test("createDefaultDiscoverySessionProvider returns a provider with id and version", () => {
  const provider = createDefaultDiscoverySessionProvider()

  assert.strictEqual(provider.id, DEFAULT_DISCOVERY_SESSION_PROVIDER_ID)
  assert.strictEqual(provider.version, DEFAULT_DISCOVERY_SESSION_PROVIDER_VERSION)
  assert.strictEqual(typeof provider.discover, "function")
})

test("discovering a directory with package.json and README.md produces a populated ProjectModel", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "discovery-provider-"))
  await fs.writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "test-project" }),
    "utf-8",
  )
  await fs.writeFile(path.join(tmpDir, "README.md"), "# Test", "utf-8")

  try {
    const provider = createDefaultDiscoverySessionProvider()
    const session = await provider.discover({ targetDir: tmpDir })

    assert.strictEqual(session.schemaVersion, "synth-discovery-session-v1")
    assert.ok(session.id, "session id is present")
    assert.ok(session.hash, "session hash is present")

    const projectModel = session.projections["project-model"]
    assert.ok(projectModel, "ProjectModel projection is present")
    assert.strictEqual(projectModel.identity.name, path.basename(tmpDir))
    assert.ok(projectModel.languages.length > 0, "languages are inferred")
    assert.ok(projectModel.fileCount > 0, "fileCount is greater than zero")
    assert.ok(projectModel.packageManager, "packageManager is detected")
    assert.strictEqual(projectModel.packageManager.name, "npm")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
})

test("discovering an empty directory produces fileCount === 0 and repositoryType empty via analyzer", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "discovery-empty-"))

  try {
    const analysis = await analyzeRepository(tmpDir)
    assert.strictEqual(analysis.fileCount, 0)
    assert.strictEqual(analysis.repositoryType, "empty")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
})

test("default provider is read-only and leaves directory stat unchanged", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "discovery-readonly-"))
  await fs.writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "test-project" }),
    "utf-8",
  )

  try {
    const before = await fs.stat(tmpDir)
    const provider = createDefaultDiscoverySessionProvider()
    await provider.discover({ targetDir: tmpDir })
    const after = await fs.stat(tmpDir)

    assert.strictEqual(before.mtimeMs, after.mtimeMs, "directory mtime must not change")
    assert.strictEqual(before.ctimeMs, after.ctimeMs, "directory ctime must not change")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
})
