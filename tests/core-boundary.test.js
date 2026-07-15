// ============================================================
// CORE BOUNDARY AUDIT TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { spawnSync } from "node:child_process"
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const AUDIT_SCRIPT = join(process.cwd(), "scripts", "audit-core-boundary.js")

function runAudit(root) {
  const result = spawnSync("node", [AUDIT_SCRIPT, root], {
    encoding: "utf-8",
    timeout: 60000,
  })
  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

test("audit passes on this repository", () => {
  const { status, output } = runAudit(join(process.cwd(), "src"))
  assert.strictEqual(status, 0, output)
  assert.ok(output.includes("Core boundary clean"))
})

test("audit detects forbidden environment imports in Core directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "synth-boundary-test-"))
  try {
    await mkdir(join(root, "mission-studio"), { recursive: true })
    await writeFile(
      join(root, "mission-studio", "violating.ts"),
      'import fs from "fs/promises"\nimport path from "path"\nexport const x = 1\n',
    )
    const { status, output } = runAudit(root)
    assert.strictEqual(status, 1)
    assert.ok(output.includes("CORE BOUNDARY VIOLATION"))
    assert.ok(output.includes("mission-studio/violating.ts:1"))
    assert.ok(output.includes("mission-studio/violating.ts:2"))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("audit detects node:-prefixed imports", async () => {
  const root = await mkdtemp(join(tmpdir(), "synth-boundary-test-"))
  try {
    await mkdir(join(root, "core"), { recursive: true })
    await writeFile(
      join(root, "core", "violating.ts"),
      'import { spawn } from "node:child_process"\nexport const x = 1\n',
    )
    const { status, output } = runAudit(root)
    assert.strictEqual(status, 1)
    assert.ok(output.includes("core/violating.ts:1"))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("audit allows crypto imports (pure computation)", async () => {
  const root = await mkdtemp(join(tmpdir(), "synth-boundary-test-"))
  try {
    await mkdir(join(root, "control"), { recursive: true })
    await writeFile(
      join(root, "control", "clean.ts"),
      'import crypto from "crypto"\nexport const x = 1\n',
    )
    const { status, output } = runAudit(root)
    assert.strictEqual(status, 0, output)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("audit ignores violations outside Core directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "synth-boundary-test-"))
  try {
    await mkdir(join(root, "cli"), { recursive: true })
    await writeFile(join(root, "cli", "tool.ts"), 'import fs from "fs"\nexport const x = 1\n')
    await mkdir(join(root, "domain"), { recursive: true })
    await writeFile(join(root, "domain", "clean.ts"), "export const y = 2\n")
    const { status, output } = runAudit(root)
    assert.strictEqual(status, 0, output)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("audit tolerates missing Core directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "synth-boundary-test-"))
  try {
    const { status, output } = runAudit(root)
    assert.strictEqual(status, 0, output)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
