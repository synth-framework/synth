import { test } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENTRY = path.resolve(__dirname, "../dist/cli/entry.js")

function runEntry(args, opts = {}) {
  const start = performance.now()
  const r = spawnSync(process.execPath, [ENTRY, ...args], { encoding: "utf8", ...opts })
  return { ...r, ms: performance.now() - start }
}

// Subprocess regression guard: a light command must be far faster than the
// heavy path (which loads synth.js + runs the 13-step bootstrap). The sandbox
// adds node-startup overhead, so these ceilings are intentionally loose but
// still catch an accidental synth.js load (heavy would exceed ~12s).
const LIGHT_CEILING = 12000

// All assertions live under a single parent test so its subtests run
// sequentially. This eliminates two sources of flakiness: (1) node:test's
// default concurrency spawning many sibling `node` subprocesses that contend
// for CPU/FS, and (2) in-process tests mutating the process-global
// `process.argv` racing each other. We do NOT capture stdout in the in-process
// tests (the runner writes its protocol there too), so "no synth.js load" is
// proven purely by stable in-process timing vs. the heavy path's known cost.
test("loader entrypoint decoupling (light commands skip synth.js)", { timeout: 180000 }, async (t) => {
  await t.test("entry[subprocess]: `version` prints semver and stays light", () => {
    const r = runEntry(["version"])
    assert.equal(r.status, 0, r.stderr || `exit ${r.status}`)
    assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+/, `stdout=${JSON.stringify(r.stdout)}`)
    assert.ok(r.ms < LIGHT_CEILING, `version took ${r.ms.toFixed(0)}ms (ceiling ${LIGHT_CEILING}ms)`)
  })

  await t.test("entry[subprocess]: `--version` stays light", () => {
    const r = runEntry(["--version"])
    assert.equal(r.status, 0, r.stderr || `exit ${r.status}`)
    assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+/)
    assert.ok(r.ms < LIGHT_CEILING, `took ${r.ms.toFixed(0)}ms`)
  })

  await t.test("entry[subprocess]: `help` prints usage and stays light", () => {
    const r = runEntry(["help"])
    assert.equal(r.status, 0, r.stderr || `exit ${r.status}`)
    assert.ok(r.stdout.toLowerCase().includes("synth"), `stdout=${JSON.stringify(r.stdout)}`)
    assert.ok(r.ms < LIGHT_CEILING, `took ${r.ms.toFixed(0)}ms`)
  })

  await t.test("entry[subprocess]: `status --json` stays light and is valid JSON", () => {
    const r = runEntry(["status", "--json"])
    assert.equal(r.status, 0, r.stderr || `exit ${r.status}`)
    let parsed
    assert.doesNotThrow(() => { parsed = JSON.parse(r.stdout) }, `invalid JSON: ${JSON.stringify(r.stdout)}`)
    assert.ok(typeof parsed.status === "string", `expected status field; got ${JSON.stringify(parsed)}`)
    assert.ok(r.ms < LIGHT_CEILING, `status took ${r.ms.toFixed(0)}ms (ceiling ${LIGHT_CEILING}ms)`)
  })

  await t.test("entry[subprocess]: `explain replay` stays light and is valid JSON", () => {
    const r = runEntry(["explain", "replay"])
    assert.equal(r.status, 0, r.stderr || `exit ${r.status}`)
    let parsed
    assert.doesNotThrow(() => { parsed = JSON.parse(r.stdout) }, `invalid JSON: ${JSON.stringify(r.stdout)}`)
    assert.equal(typeof parsed.consistent === "boolean", true, `expected consistent field; got ${JSON.stringify(parsed)}`)
    assert.ok(r.ms < LIGHT_CEILING, `explain replay took ${r.ms.toFixed(0)}ms (ceiling ${LIGHT_CEILING}ms)`)
  })

  // Heavy command still routes through synth.js. Guards against the entrypoint
  // accidentally short-circuiting a command it shouldn't.
  await t.test("entry[subprocess]: heavy command `explain governance` still routes through synth.js", () => {
    const r = runEntry(["explain", "governance"])
    assert.equal(r.status, 0, r.stderr || `exit ${r.status}`)
    assert.ok(r.stdout.trim().length > 0, "expected non-empty explain output")
  })

  // In-process timing proof that synth.js is never loaded for `version`.
  // Loading synth.js alone costs >100ms, so a <100ms run proves the thin
  // entrypoint short-circuited before the heavy dynamic import. No output
  // capture (the runner shares process.stdout), so this only measures timing.
  await t.test("entry[in-process]: `version` executes in <100ms (no synth.js load)", async () => {
    const origArgv = process.argv
    process.argv = ["node", "entry.js", "version"]
    const { run } = await import(ENTRY)
    const start = performance.now()
    await run()
    const cliMs = performance.now() - start
    process.argv = origArgv
    assert.ok(cliMs < 100, `in-process version took ${cliMs.toFixed(1)}ms (spec budget 100ms)`)
  })

  // In-process timing proof for `explain replay`: its light path
  // (createInfra + createReplayVerifier) runs in ~0.9s here, whereas the heavy
  // path (which loads synth.js + bootstrap) costs ~3.4s in-process. The 1.8s
  // ceiling is stable and cleanly separates the two.
  await t.test("entry[in-process]: `explain replay` executes in <1.8s (no synth.js load)", async () => {
    const origArgv = process.argv
    process.argv = ["node", "entry.js", "explain", "replay"]
    const { run } = await import(ENTRY)
    const start = performance.now()
    await run()
    const cliMs = performance.now() - start
    process.argv = origArgv
    assert.ok(cliMs < 1800, `in-process explain replay took ${cliMs.toFixed(1)}ms (ceiling 1800ms)`)
  })
})
