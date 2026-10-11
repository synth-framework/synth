// ============================================================
// TEST HELPERS — Context / Workspace fixtures
// ============================================================
// Shared bootstrap/makeCtx/makeWorkspace wiring (see dedupe-plan.md,
// finding F3). Replaces the inlined `bootstrap({ infra: { eventLogPath,
// statePath, checkpointPath }, genesis: {...}, skipGenesis })` blocks that
// were duplicated across the suite. This stays a test-only helper: it drives
// the production SDK `bootstrap`, but the data-dir/config wiring is test
// scaffolding, not SDK behavior.
//
// Usage:
//   import { makeTempDataDir, makeCtx, makeWorkspace } from "./helpers/context.js"
//
//   const dataDir = makeTempDataDir()
//   const ctx = await makeCtx(dataDir, { projectName: "Demo", systemId: "demo", skipGenesis: true })
// ============================================================

import fs from "fs"
import os from "os"
import path from "path"
import { bootstrap } from "../../dist/core/bootstrap.js"

/** Create an isolated temp data directory and return its path. */
export function makeTempDataDir(prefix = "synth-ctx-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

/**
 * Bootstrap a context rooted at `dataDir` with the standard infra paths.
 * Override any field via options: `infra`, `genesis`, `skipGenesis`, and any
 * other bootstrap flags (passed through via `rest`).
 */
export async function makeCtx(dataDir, options = {}) {
  const {
    projectName = "SYNTH Test Project",
    systemId = "synth-test",
    partitions = 1,
    skipGenesis = false,
    infra = {},
    genesis = {},
    ...rest
  } = options
  return bootstrap({
    infra: {
      eventLogPath: path.join(dataDir, "event-log.jsonl"),
      statePath: path.join(dataDir, "canonical-state.json"),
      checkpointPath: path.join(dataDir, "checkpoint.json"),
      ...infra,
    },
    genesis: { projectName, systemId, partitions, ...genesis },
    skipGenesis,
    ...rest,
  })
}

/** Create an isolated temp workspace directory and return its path. */
export function makeWorkspace(prefix = "synth-workspace-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

/**
 * Disable automatic lifecycle continuation on a bootstrapped context so
 * tests can assert each governance stage independently. Returns the ctx.
 */
export function withoutLifecycleContinuation(ctx) {
  // These tests assert each governance stage explicitly.
  const originalHandleIntent = ctx.api.handleIntent.bind(ctx.api)
  ctx.api.handleIntent = (req) =>
    originalHandleIntent({
      ...req,
      context: { ...(req.context || {}), disableLifecycleContinuation: true },
    })
  return ctx
}
