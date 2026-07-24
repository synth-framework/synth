// ============================================================
// TEST HELPERS — CLI Harness
// ============================================================
// Shared infrastructure for invoking the SYNTH CLI in tests.
//
// This module replaces duplicated runSynth/parseJson/temp-dir helpers
// across the test suite. It does not introduce new behavior; it only
// centralizes existing test infrastructure.
//
// Usage:
//   import { runSynth, parseJson, withTempDir, writeEventLog, writeManifest } from "./helpers/cli-harness.js"
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")
const HASH_MODULE_PATH = path.resolve(process.cwd(), "dist", "core", "hash.js")

/** Verify the CLI binary exists. */
export async function assertCliBuilt() {
  try {
    await fs.access(CLI_PATH)
  } catch {
    throw new Error(`CLI not built at ${CLI_PATH}. Run 'npm run build' first.`)
  }
}

/** Invoke the SYNTH CLI and return stdout/stderr/status. */
export function runSynth(args, cwd = process.cwd(), options = {}) {
  const result = spawnSync("node", [CLI_PATH, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: options.timeout ?? 30000,
    env: options.env,
  })
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  }
}

/** Parse CLI JSON output, throwing a descriptive error on failure. */
export function parseJson(stdout) {
  try {
    return JSON.parse(stdout.trim())
  } catch (err) {
    throw new Error(`Failed to parse CLI output as JSON: ${stdout}\nError: ${err.message}`)
  }
}

/** Create a temporary directory, run an async function, then clean up. */
export async function withTempDir(prefix, fn) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix))
  try {
    return await fn(tmpDir)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

/** Load the production computeEventHash function for test event chaining. */
export async function loadComputeEventHash() {
  const { computeEventHash } = await import(HASH_MODULE_PATH)
  return computeEventHash
}

/**
 * Write a hash-chained event log to `.synth/data/event-log.jsonl`.
 * Computes event hashes using the production hash function.
 * Returns the generated events for optional further assertions.
 */
export async function writeEventLog(dir, rawEvents) {
  const computeEventHash = await loadComputeEventHash()
  const events = []
  let previousHash = "genesis"
  for (const raw of rawEvents) {
    const event = { ...raw, eventHash: "", previousHash }
    event.eventHash = computeEventHash(event)
    previousHash = event.eventHash
    events.push(event)
  }
  const dataDir = path.join(dir, ".synth", "data")
  await fs.mkdir(dataDir, { recursive: true })
  await fs.writeFile(path.join(dataDir, "event-log.jsonl"), events.map((e) => JSON.stringify(e)).join("\n") + "\n")
  return events
}

/**
 * Write a `.synth/manifest.json` for tests that need a governed project
 * without running `synth init`.
 */
export async function writeManifest(dir, projectName = "Synth Test Project", options = {}) {
  const synthDir = path.join(dir, ".synth")
  await fs.mkdir(synthDir, { recursive: true })
  const manifest = {
    schema: "synth-bootstrap-manifest-v1",
    version: options.version ?? "2.0.0",
    projectName,
    root: dir,
    generatedAt: new Date().toISOString(),
    bootstrapped: true,
    commands: options.commands ?? [],
    capabilities: options.capabilities ?? [],
    layout: { data: ".synth/data/" },
    publicVocabulary: options.publicVocabulary ?? ["Mission", "Expedition", "Replay"],
  }
  await fs.writeFile(path.join(synthDir, "manifest.json"), JSON.stringify(manifest, null, 2))
}
