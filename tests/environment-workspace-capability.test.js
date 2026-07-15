// ============================================================
// WORKSPACE CAPABILITY TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createFilesystemWorkspaceProvider } from "../dist/environment/index.js"

function makeContext(files = {}, dirs = {}, cwd = "/projects/my-app") {
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
    readEnv: (name) => undefined,
    execTool: async () => undefined,
    cwd,
  }
}

test("FilesystemWorkspaceProvider exposes name and version", () => {
  const provider = createFilesystemWorkspaceProvider()
  assert.strictEqual(provider.name, "filesystem-workspace")
  assert.strictEqual(provider.version, "1.0.0")
})

test("locateRoot finds workspace root by SYNTH manifest", async () => {
  const ctx = makeContext(
    { "/projects/my-app/.synth/manifest.json": JSON.stringify({ name: "my-app", version: "1.0.0" }) },
    { "/projects/my-app/.synth": [], "/projects/my-app": [".synth"] },
  )
  const provider = createFilesystemWorkspaceProvider()
  const root = await provider.locateRoot(ctx)
  assert.strictEqual(root, "/projects/my-app")
})

test("locateRoot finds workspace root by package.json", async () => {
  const ctx = makeContext(
    { "/projects/my-app/package.json": JSON.stringify({ name: "my-app" }) },
    { "/projects/my-app": ["package.json"] },
  )
  const provider = createFilesystemWorkspaceProvider()
  const root = await provider.locateRoot(ctx)
  assert.strictEqual(root, "/projects/my-app")
})

test("locateRoot searches upward until it finds a marker", async () => {
  const ctx = makeContext(
    { "/projects/package.json": JSON.stringify({ name: "root" }) },
    { "/projects": ["package.json"], "/projects/my-app": ["src"], "/projects/my-app/src": [] },
    "/projects/my-app/src",
  )
  const provider = createFilesystemWorkspaceProvider()
  const root = await provider.locateRoot(ctx)
  assert.strictEqual(root, "/projects")
})

test("locateRoot returns undefined when no marker exists", async () => {
  const ctx = makeContext({}, {}, "/tmp")
  const provider = createFilesystemWorkspaceProvider()
  const root = await provider.locateRoot(ctx)
  assert.strictEqual(root, undefined)
})

test("readManifest returns parsed SYNTH manifest", async () => {
  const ctx = makeContext(
    { "/projects/my-app/.synth/manifest.json": JSON.stringify({ name: "my-app", version: "2.0.0" }) },
    {},
  )
  const provider = createFilesystemWorkspaceProvider()
  const manifest = await provider.readManifest(ctx, "/projects/my-app")
  assert.ok(manifest)
  assert.strictEqual(manifest.name, "my-app")
  assert.strictEqual(manifest.version, "2.0.0")
})

test("readManifest returns undefined when manifest is absent", async () => {
  const ctx = makeContext({}, {})
  const provider = createFilesystemWorkspaceProvider()
  const manifest = await provider.readManifest(ctx, "/projects/my-app")
  assert.strictEqual(manifest, undefined)
})

test("listProjects returns package and synth projects", async () => {
  const ctx = makeContext(
    {
      "/projects/my-app/package.json": JSON.stringify({ name: "my-app" }),
      "/projects/my-app/.synth/manifest.json": JSON.stringify({ name: "my-app", version: "1.0.0" }),
    },
    {},
  )
  const provider = createFilesystemWorkspaceProvider()
  const projects = await provider.listProjects(ctx, "/projects/my-app")
  assert.strictEqual(projects.length, 2)
  assert.ok(projects.some((p) => p.kind === "package"))
  assert.ok(projects.some((p) => p.kind === "synth"))
})

test("discover returns full workspace descriptor", async () => {
  const ctx = makeContext(
    {
      "/projects/my-app/package.json": JSON.stringify({ name: "my-app" }),
      "/projects/my-app/.synth/manifest.json": JSON.stringify({ name: "my-app", version: "1.0.0" }),
    },
    { "/projects/my-app/.synth": [], "/projects/my-app": ["package.json", ".synth"] },
  )
  const provider = createFilesystemWorkspaceProvider()
  const descriptor = await provider.discover(ctx)
  assert.strictEqual(descriptor.root, "/projects/my-app")
  assert.strictEqual(descriptor.exists, true)
  assert.strictEqual(descriptor.hasSynthManifest, true)
  assert.strictEqual(descriptor.hasPackageManifest, true)
  assert.strictEqual(descriptor.projects.length, 2)
})

test("discover returns non-existent descriptor when no marker found", async () => {
  const ctx = makeContext({}, {}, "/tmp")
  const provider = createFilesystemWorkspaceProvider()
  const descriptor = await provider.discover(ctx)
  assert.strictEqual(descriptor.exists, false)
  assert.strictEqual(descriptor.projects.length, 0)
})

test("prepare succeeds when manifest is present", async () => {
  const ctx = makeContext(
    { "/projects/my-app/.synth/manifest.json": JSON.stringify({ name: "my-app", version: "1.0.0" }) },
    {},
  )
  const provider = createFilesystemWorkspaceProvider()
  const prepared = await provider.prepare(ctx, "/projects/my-app")
  assert.strictEqual(prepared.ready, true)
  assert.ok(prepared.manifest)
})

test("prepare fails when manifest is absent", async () => {
  const ctx = makeContext({}, {})
  const provider = createFilesystemWorkspaceProvider()
  const prepared = await provider.prepare(ctx, "/projects/my-app")
  assert.strictEqual(prepared.ready, false)
  assert.strictEqual(prepared.manifest, undefined)
})
