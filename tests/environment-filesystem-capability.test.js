// ============================================================
// FILESYSTEM CAPABILITY TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import {
  createPosixFilesystemProvider,
  createInMemoryFilesystemProvider,
} from "../dist/environment/index.js"
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

test("InMemoryFilesystemProvider reads initial files", async () => {
  const fs = createInMemoryFilesystemProvider({ "/data/config.json": "{}" })
  const content = await fs.readFile("/data/config.json")
  assert.strictEqual(content, "{}")
})

test("InMemoryFilesystemProvider writes and reads files", async () => {
  const fs = createInMemoryFilesystemProvider()
  await fs.writeFile("/docs/readme.md", "# Hello")
  const content = await fs.readFile("/docs/readme.md")
  assert.strictEqual(content, "# Hello")
})

test("InMemoryFilesystemProvider lists directories", async () => {
  const fs = createInMemoryFilesystemProvider({
    "/src/a.ts": "",
    "/src/b.ts": "",
    "/src/nested/c.ts": "",
  })
  const entries = await fs.listDirectory("/src")
  assert.deepStrictEqual(entries.sort(), ["a.ts", "b.ts", "nested"])
})

test("InMemoryFilesystemProvider checks existence", async () => {
  const fs = createInMemoryFilesystemProvider({ "/file.txt": "x" })
  assert.strictEqual(await fs.pathExists("/file.txt"), true)
  assert.strictEqual(await fs.pathExists("/missing.txt"), false)
})

test("InMemoryFilesystemProvider checks directory", async () => {
  const fs = createInMemoryFilesystemProvider({ "/dir/file.txt": "x" })
  assert.strictEqual(await fs.isDirectory("/dir"), true)
  assert.strictEqual(await fs.isDirectory("/dir/file.txt"), false)
})

test("InMemoryFilesystemProvider ensures directory", async () => {
  const fs = createInMemoryFilesystemProvider()
  await fs.ensureDirectory("/new/deep/dir")
  assert.strictEqual(await fs.isDirectory("/new/deep/dir"), true)
})

test("InMemoryFilesystemProvider deletes files", async () => {
  const fs = createInMemoryFilesystemProvider({ "/temp.txt": "x" })
  await fs.deleteFile("/temp.txt")
  assert.strictEqual(await fs.pathExists("/temp.txt"), false)
})

test("PosixFilesystemProvider reads and writes files", async () => {
  const dir = await mkdtemp(join(tmpdir(), "synth-fs-test-"))
  const fs = createPosixFilesystemProvider(dir)
  await fs.writeFile("test.txt", "hello")
  const content = await fs.readFile("test.txt")
  assert.strictEqual(content, "hello")
  await rm(dir, { recursive: true, force: true })
})

test("PosixFilesystemProvider lists directories", async () => {
  const dir = await mkdtemp(join(tmpdir(), "synth-fs-test-"))
  const fs = createPosixFilesystemProvider(dir)
  await mkdir(join(dir, "sub"))
  await writeFile(join(dir, "sub", "file.txt"), "x")
  await writeFile(join(dir, "root.txt"), "y")
  const entries = await fs.listDirectory(".")
  assert.ok(entries.includes("sub"))
  assert.ok(entries.includes("root.txt"))
  await rm(dir, { recursive: true, force: true })
})

test("PosixFilesystemProvider checks existence and directory", async () => {
  const dir = await mkdtemp(join(tmpdir(), "synth-fs-test-"))
  const fs = createPosixFilesystemProvider(dir)
  await mkdir(join(dir, "folder"))
  await writeFile(join(dir, "file.txt"), "x")
  assert.strictEqual(await fs.pathExists("folder"), true)
  assert.strictEqual(await fs.pathExists("file.txt"), true)
  assert.strictEqual(await fs.isDirectory("folder"), true)
  assert.strictEqual(await fs.isDirectory("file.txt"), false)
  await rm(dir, { recursive: true, force: true })
})
