// ============================================================
// EXP-GUARD-001 — Derived-State Protection & Expedition Scope
// ============================================================
// Verifies that the public SDK refuses direct writes to derived files
// and that the ExecutionGate enforces expedition scope with an
// auditable out-of-scope override.
//
// All subtests run in a single parent test with concurrency disabled
// because they mutate process.cwd() and the project-root resolver.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "node:fs"
import os from "os"
import path from "node:path"
import { spawnSync } from "child_process"
import { bootstrap } from "../dist/core/bootstrap.js"
import * as sdkFiles from "../dist/sdk/files/index.js"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

function makeTempProjectRoot() {
  // Resolve the real path so process.cwd() after chdir and path.resolve()
  // agree on macOS (/var/folders vs /private/var/folders).
  return fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "derived-state-guard-")))
}

function seedEvents(projectRoot, overrides = {}) {
  const dataDir = path.join(projectRoot, ".synth", "data")
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(path.join(projectRoot, ".synth", "manifest.json"), "{}\n")

  const scope = overrides.scope || []
  const events = [
    {
      id: "evt-1",
      type: "SYSTEM_GENESIS",
      timestamp: 1,
      transactionId: "tx-1",
      capability: "genesis",
      actor: "genesis",
      payload: { projectName: "Derived State Guard Test", systemId: "derived-state-test", partitions: 1 },
    },
    {
      id: "evt-2",
      type: "PROJECT_CREATED",
      timestamp: 2,
      transactionId: "tx-2",
      capability: "genesis",
      actor: "genesis",
      payload: { project: { id: "project-1", name: "Derived State Guard Test", status: "active", metadata: {}, createdAt: 2, updatedAt: 2 } },
    },
    {
      id: "evt-3",
      type: "MISSION_CREATED",
      timestamp: 3,
      transactionId: "tx-3",
      capability: "test",
      actor: "test",
      payload: {
        mission: {
          id: "m1",
          name: "Mission m1",
          purpose: "test",
          status: "draft",
          expeditions: [],
          metadata: {},
          createdAt: 3,
          updatedAt: 3,
        },
      },
    },
    { id: "evt-4", type: "MISSION_APPROVED", timestamp: 4, transactionId: "tx-4", capability: "test", actor: "test", payload: { id: "m1" } },
    {
      id: "evt-5",
      type: "EXPEDITION_CREATED",
      timestamp: 5,
      transactionId: "tx-5",
      capability: "test",
      actor: "test",
      payload: {
        expedition: {
          id: "e1",
          missionId: "m1",
          name: "Expedition e1",
          goal: "test scope enforcement",
          status: "draft",
          objectives: [],
          discoveries: [],
          decisions: [],
          dependsOn: [],
          metadata: scope.length > 0 ? { scope } : {},
          createdAt: 5,
          updatedAt: 5,
        },
      },
    },
    { id: "evt-6", type: "EXPEDITION_APPROVED", timestamp: 6, transactionId: "tx-6", capability: "test", actor: "test", payload: { id: "e1" } },
  ]

  fs.writeFileSync(
    path.join(dataDir, "event-log.jsonl"),
    events.map((e) => JSON.stringify(e)).join("\n") + "\n",
  )
}

async function makeCtx(projectRoot, overrides = {}) {
  seedEvents(projectRoot, overrides)
  const dataDir = path.join(projectRoot, ".synth", "data")
  const ctx = await bootstrap({
    infra: {
      eventLogPath: path.join(dataDir, "event-log.jsonl"),
      statePath: path.join(dataDir, "canonical-state.json"),
      checkpointPath: path.join(dataDir, "checkpoint.json"),
    },
    skipGenesis: true,
  })
  // When genesis is skipped, capabilities are not automatically registered
  // with the runtime. Register them explicitly so that side-effecting
  // capabilities (e.g. FilesystemWrite) are resolved by the executor.
  for (const name of ctx.capabilityRegistry.list()) {
    const cap = ctx.capabilityRegistry.resolve(name)
    if (cap) ctx.runtime.registerCapability(cap)
  }
  return ctx
}

async function attemptFilesystemWrite(ctx, target, overrideReason) {
  const context = typeof overrideReason === "string" ? { authorizeOutOfScope: overrideReason } : undefined
  return ctx.api.handleIntent({
    actor: "test",
    capability: "FilesystemWrite",
    payload: { path: target, content: "test content" },
    context,
  })
}

async function lastEvent(ctx, type, predicate = () => true) {
  const events = await ctx.infra.eventStore.loadAll()
  const matches = events.filter((e) => e.type === type && predicate(e))
  return matches[matches.length - 1]
}

function runSynth(args, cwd) {
  const result = spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 60000,
  })
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  }
}

function parseJson(stdout) {
  try {
    return JSON.parse(stdout.trim())
  } catch (err) {
    throw new Error(`Failed to parse CLI output as JSON: ${stdout}\nError: ${err.message}`)
  }
}

test("derived-state and expedition scope protection", { concurrency: false }, async (t) => {
  const originalCwd = process.cwd()

  await t.test("SDK rejects direct writes to canonical-state.json", async () => {
    const dir = makeTempProjectRoot()
    process.chdir(dir)
    try {
      const target = path.join(process.cwd(), ".synth", "data", "canonical-state.json")
      await assert.rejects(
        () => sdkFiles.writeFile(target, "{}"),
        /This is derived state\. Modify source events or evidence instead\./,
      )
    } finally {
      process.chdir(originalCwd)
    }
  })

  await t.test("SDK rejects direct writes to event-log.jsonl", async () => {
    const dir = makeTempProjectRoot()
    process.chdir(dir)
    try {
      const target = path.join(process.cwd(), ".synth", "data", "event-log.jsonl")
      await assert.rejects(
        () => sdkFiles.appendFile(target, "{}\n"),
        /This is derived state\. Modify source events or evidence instead\./,
      )
    } finally {
      process.chdir(originalCwd)
    }
  })

  await t.test("SDK rejects direct writes to AGENTS.md", async () => {
    const dir = makeTempProjectRoot()
    process.chdir(dir)
    try {
      const target = path.join(process.cwd(), "AGENTS.md")
      await assert.rejects(
        () => sdkFiles.writeFile(target, "# agents"),
        /This is derived state\. Modify source events or evidence instead\./,
      )
    } finally {
      process.chdir(originalCwd)
    }
  })

  await t.test("SDK rejects direct writes to docs/generated/*.md", async () => {
    const dir = makeTempProjectRoot()
    process.chdir(dir)
    try {
      const genDir = path.join(process.cwd(), "docs", "generated")
      fs.mkdirSync(genDir, { recursive: true })
      const target = path.join(genDir, "README.md")
      await assert.rejects(
        () => sdkFiles.writeFile(target, "# generated"),
        /This is derived state\. Modify source events or evidence instead\./,
      )
    } finally {
      process.chdir(originalCwd)
    }
  })

  await t.test("SDK allows writes to non-derived files", async () => {
    const dir = makeTempProjectRoot()
    process.chdir(dir)
    try {
      const target = path.join(process.cwd(), "src", "foo.txt")
      await sdkFiles.writeFile(target, "hello")
      assert.equal(fs.readFileSync(target, "utf-8"), "hello")
    } finally {
      process.chdir(originalCwd)
    }
  })

  await t.test("ExecutionGate blocks mutations to derived files", async () => {
    const dir = makeTempProjectRoot()
    process.chdir(dir)
    const ctx = await makeCtx(dir, { scope: ["apps/mobile/**"] })
    try {
      const target = path.join(process.cwd(), ".synth", "data", "canonical-state.json")
      const result = await attemptFilesystemWrite(ctx, target)
      assert.equal(result.status, "error")
      assert.match(result.error || "", /derived state/)
    } finally {
      ctx.seal?.()
      process.chdir(originalCwd)
    }
  })

  await t.test("ExecutionGate enforces expedition scope", async () => {
    const dir = makeTempProjectRoot()
    process.chdir(dir)
    const ctx = await makeCtx(dir, { scope: ["apps/mobile/**"] })
    try {
      const inScope = path.join(process.cwd(), "apps", "mobile", "index.ts")
      const outOfScope = path.join(process.cwd(), "packages", "ui", "button.tsx")

      const inResult = await attemptFilesystemWrite(ctx, inScope)
      assert.equal(inResult.status, "ok", `in-scope write failed: ${inResult.error}`)
      assert.ok(fs.existsSync(inScope))

      const outResult = await attemptFilesystemWrite(ctx, outOfScope)
      assert.equal(outResult.status, "error")
      assert.match(outResult.error || "", /outside authorized expedition scope/)
    } finally {
      ctx.seal?.()
      process.chdir(originalCwd)
    }
  })

  await t.test("out-of-scope override appends OUT_OF_SCOPE_AUTHORIZED event", async () => {
    const dir = makeTempProjectRoot()
    process.chdir(dir)
    const ctx = await makeCtx(dir, { scope: ["apps/mobile/**"] })
    try {
      const outOfScope = path.join(process.cwd(), "packages", "ui", "button.tsx")
      const result = await attemptFilesystemWrite(ctx, outOfScope, "emergency hotfix")
      assert.equal(result.status, "ok", `override write failed: ${result.error}`)
      assert.ok(fs.existsSync(outOfScope))

      const event = await lastEvent(
        ctx,
        "OUT_OF_SCOPE_AUTHORIZED",
        (e) => e.payload?.target === outOfScope,
      )
      assert.ok(event, "expected OUT_OF_SCOPE_AUTHORIZED event")
      assert.equal(event.payload.reason, "emergency hotfix")
      assert.equal(event.payload.expeditionId, "e1")
    } finally {
      ctx.seal?.()
      process.chdir(originalCwd)
    }
  })

  await t.test("CLI expedition create --scope stores scope in metadata", async () => {
    const dir = makeTempProjectRoot()
    seedEvents(dir)

    const run = runSynth(
      ["expedition", "create", "--mission", "m1", "--subject", "Mobile fixes", "--goal", "Fix mobile", "--scope", "apps/mobile/**", "--scope", "supabase/config.toml"],
      dir,
    )
    assert.strictEqual(run.status, 0, run.stderr)

    const logPath = path.join(dir, ".synth", "data", "event-log.jsonl")
    const logLines = fs.readFileSync(logPath, "utf-8").trim().split("\n")
    const createEvents = logLines
      .map((line) => JSON.parse(line))
      .filter((e) => e.type === "EXPEDITION_CREATED")
    assert.ok(createEvents.length > 0, "expected EXPEDITION_CREATED event")
    const createEvent = createEvents[createEvents.length - 1]
    assert.deepStrictEqual(createEvent.payload.expedition.metadata.scope, ["apps/mobile/**", "supabase/config.toml"])
  })
})
