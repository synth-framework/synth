// ============================================================
// EXP-CLI-003 Phase 2 — Ambient root resolution
// ============================================================
// The infra stores used to capture `process.cwd()` at MODULE SCOPE:
//
//   const STATE_FILE = path.join(dataDir(process.cwd()), "canonical-state.json")
//
// Five such captures existed (checkpoint-store.ts:11, event-store.ts:13-14,
// state-store.ts:12-13). Each one froze the ambient working directory at import
// time and then served it as a constructor default forever after, so a store
// built after a process.chdir() — or by a caller inspecting another project or
// a fixture — silently pointed at whichever directory happened to be current
// when the module was first loaded. That is also why the CLI could not be
// loaded cheaply and pointed at an explicit root: the root was decided by
// import order, not by the caller.
//
// This file guards the fix in three ways: a static scan so the captures cannot
// come back, a behavioural test that resolution follows the working directory
// at call time rather than at import time, and an equivalence test that the
// default-constructed paths are byte-identical to what the old constants
// produced.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { dataDir } from "../dist/sdk/paths/index.js"
import { checkpointFile, CheckpointStore } from "../dist/infra/checkpoint-store.js"
import { stateFile, snapshotsDir, StateStore } from "../dist/infra/state-store.js"
import { eventLogFile, eventStreamDir, EventStore, PartitionStore, SegmentStore } from "../dist/infra/event-store.js"

const SRC = path.join(import.meta.dirname, "..", "src")

function walkTs(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkTs(full, out)
    else if (entry.isFile() && full.endsWith(".ts")) out.push(full)
  }
  return out
}

function tmpRoot(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `synth-ambient-${label}-`))
}

// ------------------------------------------------------------
// 1. Static guard: no ambient state captured at module scope.
// ------------------------------------------------------------

test("no module-scope process.cwd() capture survives in src/", () => {
  const offenders = []
  for (const file of walkTs(SRC)) {
    const lines = fs.readFileSync(file, "utf-8").split("\n")
    lines.forEach((line, i) => {
      // A capture is a top-level binding whose initializer reads process.cwd().
      // Per-call resolution is fine: `root: string = process.cwd()` inside a
      // signature, or `process.cwd()` inside a function body, is evaluated when
      // the call happens.
      if (/^(const|let|var)\s+.*process\.cwd\(\)/.test(line)) {
        offenders.push(`${path.relative(SRC, file)}:${i + 1}: ${line.trim()}`)
      }
    })
  }
  assert.deepEqual(
    offenders,
    [],
    "Module-scope process.cwd() captures freeze the working directory at import " +
      "time. Resolve per call instead (export a function taking `root`, or use a " +
      "parameter default). Offenders:\n  " + offenders.join("\n  ")
  )
})

test("no module-scope process.env or process.on() capture survives in src/", () => {
  const offenders = []
  for (const file of walkTs(SRC)) {
    const lines = fs.readFileSync(file, "utf-8").split("\n")
    lines.forEach((line, i) => {
      if (/^(const|let|var)\s+.*process\.(env|on)\b/.test(line)) {
        offenders.push(`${path.relative(SRC, file)}:${i + 1}: ${line.trim()}`)
      }
    })
  }
  assert.deepEqual(offenders, [], "Ambient process state captured at module scope:\n  " + offenders.join("\n  "))
})

// ------------------------------------------------------------
// 2. Behaviour: resolution follows the call, not the import.
// ------------------------------------------------------------

test("store paths follow the working directory at construction, not at import", () => {
  const original = process.cwd()
  const first = tmpRoot("first")
  const second = tmpRoot("second")
  try {
    // The modules are already imported at the top of this file, i.e. under
    // `original`. If any path were frozen at import time these assertions would
    // still report `original`.
    process.chdir(first)
    assert.equal(stateFile(), path.join(dataDir(first), "canonical-state.json"))
    assert.equal(checkpointFile(), path.join(dataDir(first), "checkpoints.json"))
    assert.equal(eventLogFile(), path.join(dataDir(first), "event-log.jsonl"))
    assert.equal(eventStreamDir(), path.join(dataDir(first), "event-stream"))
    assert.equal(snapshotsDir(), path.join(dataDir(first), "snapshots"))

    // Now move: a store constructed here must follow, proving per-call
    // resolution rather than a one-time capture.
    process.chdir(second)
    const state = new StateStore()
    const checkpoint = new CheckpointStore()
    const events = new EventStore()
    const partitions = new PartitionStore()
    const segments = new SegmentStore()
    assert.equal(state.getFilePath(), path.join(dataDir(second), "canonical-state.json"))
    assert.equal(checkpoint.getFilePath(), path.join(dataDir(second), "checkpoints.json"))
    assert.equal(events.getFilePath(), path.join(dataDir(second), "event-log.jsonl"))
    assert.equal(partitions.getBaseDir(), path.join(dataDir(second), "event-stream"))
    assert.equal(segments.getBaseDir(), path.join(dataDir(second), "event-stream"))
    assert.ok(
      !String(state.getFilePath()).includes(first),
      "a store built after chdir must not carry the earlier working directory"
    )
  } finally {
    process.chdir(original)
    fs.rmSync(first, { recursive: true, force: true })
    fs.rmSync(second, { recursive: true, force: true })
  }
})

test("an explicit root wins over the ambient working directory", () => {
  const root = tmpRoot("explicit")
  try {
    assert.equal(stateFile(root), path.join(dataDir(root), "canonical-state.json"))
    assert.equal(eventStreamDir(root), path.join(dataDir(root), "event-stream"))
    assert.equal(checkpointFile(root), path.join(dataDir(root), "checkpoints.json"))
    // An explicit constructor path is untouched by any of this.
    const custom = path.join(root, "elsewhere", "state.json")
    assert.equal(new StateStore(custom).getFilePath(), custom)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

// ------------------------------------------------------------
// 3. Equivalence: defaults are what the old constants produced.
// ------------------------------------------------------------

test("default-constructed paths are byte-identical to the old module constants", () => {
  const cwd = process.cwd()
  const expected = {
    state: path.join(dataDir(cwd), "canonical-state.json"),
    snapshots: path.join(dataDir(cwd), "snapshots"),
    checkpoint: path.join(dataDir(cwd), "checkpoints.json"),
    eventLog: path.join(dataDir(cwd), "event-log.jsonl"),
    eventStream: path.join(dataDir(cwd), "event-stream"),
  }
  assert.equal(new StateStore().getFilePath(), expected.state)
  assert.equal(new CheckpointStore().getFilePath(), expected.checkpoint)
  assert.equal(new EventStore().getFilePath(), expected.eventLog)
  assert.equal(new PartitionStore().getBaseDir(), expected.eventStream)
  assert.equal(new SegmentStore().getBaseDir(), expected.eventStream)
  assert.equal(snapshotsDir(), expected.snapshots)
})

// ------------------------------------------------------------
// 4. Snapshots co-locate with the store, not with the checkout.
// ------------------------------------------------------------

test("snapshot() writes beside the store's own state file, never into the checkout", async () => {
  const root = tmpRoot("snapshots")
  const checkoutSnapshots = path.join(dataDir(process.cwd()), "snapshots")
  const before = fs.existsSync(checkoutSnapshots) ? fs.readdirSync(checkoutSnapshots) : []
  const statePath = path.join(root, "nested", "canonical-state.json")
  try {
    const store = StateStore.createAuthorized(statePath)
    const state = { version: 1, missions: {}, expeditions: {} }
    await store.snapshot(state, "guard")
    const written = fs.readdirSync(path.join(root, "nested", "snapshots"))
    assert.equal(written.length, 1, "exactly one snapshot written beside the store's state file")
    assert.match(written[0], /^snapshot-guard-\d+\.json$/)
    const loaded = await store.loadSnapshot("guard")
    assert.deepEqual(loaded, state, "loadSnapshot reads back from the same co-located directory")
    const after = fs.existsSync(checkoutSnapshots) ? fs.readdirSync(checkoutSnapshots) : []
    assert.deepEqual(after, before, "the operator's checkout gained no snapshot from a temp-rooted store")
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
