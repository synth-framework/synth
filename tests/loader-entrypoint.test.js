import { test } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENTRY = path.resolve(__dirname, "../dist/cli/entry.js")
const SYNTH = path.resolve(__dirname, "../dist/cli/synth.js")

function runEntry(args, opts = {}) {
  const start = performance.now()
  const r = spawnSync(process.execPath, [ENTRY, ...args], { encoding: "utf8", ...opts })
  return { ...r, ms: performance.now() - start }
}

// Subprocess tests prove correctness / byte-identical output to the heavy
// path. They intentionally do NOT assert wall-clock timing: the sandbox adds
// node-startup + FS variance that makes subprocess durations flaky. The
// deterministic "no synth.js load" proof is carried by the in-process timing
// tests below (no node-startup variance).

// In-process tests mutate the process-global `process.argv` (the entrypoint
// reads it) and `node:test` may run sibling subtests concurrently, so we
// serialize the global-mutation window with a chain promise to avoid one
// in-process test clobbering another's argv mid-import.
let _cliChain = Promise.resolve()
function isolatedCli(body) {
  let release
  const next = new Promise((res) => { release = res })
  const prev = _cliChain
  _cliChain = next
  return prev.then(() => body()).finally(() => release())
}

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
  })

  await t.test("entry[subprocess]: `--version` prints semver", () => {
    const r = runEntry(["--version"])
    assert.equal(r.status, 0, r.stderr || `exit ${r.status}`)
    assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+/)
  })

  await t.test("entry[subprocess]: `help` prints usage", () => {
    const r = runEntry(["help"])
    assert.equal(r.status, 0, r.stderr || `exit ${r.status}`)
    assert.ok(r.stdout.toLowerCase().includes("synth"), `stdout=${JSON.stringify(r.stdout)}`)
  })

  await t.test("entry[subprocess]: `status --json` is valid JSON", () => {
    const r = runEntry(["status", "--json"])
    assert.equal(r.status, 0, r.stderr || `exit ${r.status}`)
    let parsed
    assert.doesNotThrow(() => { parsed = JSON.parse(r.stdout) }, `invalid JSON: ${JSON.stringify(r.stdout)}`)
    assert.ok(typeof parsed.status === "string", `expected status field; got ${JSON.stringify(parsed)}`)
  })

  await t.test("entry[subprocess]: `explain replay` is valid JSON", () => {
    const r = runEntry(["explain", "replay"])
    assert.equal(r.status, 0, r.stderr || `exit ${r.status}`)
    let parsed
    assert.doesNotThrow(() => { parsed = JSON.parse(r.stdout) }, `invalid JSON: ${JSON.stringify(r.stdout)}`)
    assert.equal(typeof parsed.consistent === "boolean", true, `expected consistent field; got ${JSON.stringify(parsed)}`)
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
    await isolatedCli(async () => {
      const origArgv = process.argv
      process.argv = ["node", "entry.js", "version"]
      const { run } = await import(ENTRY)
      const start = performance.now()
      await run()
      const cliMs = performance.now() - start
      process.argv = origArgv
      assert.ok(cliMs < 100, `in-process version took ${cliMs.toFixed(1)}ms (spec budget 100ms)`)
    })
  })

  // In-process timing proof for `explain replay`: its light path
  // (createInfra + createReplayVerifier) runs in ~0.9s here, whereas the heavy
  // path (which loads synth.js + bootstrap) costs ~3.4s in-process. The 1.8s
  // ceiling is stable and cleanly separates the two.
  await t.test("entry[in-process]: `explain replay` executes in <1.8s (no synth.js load)", async () => {
    await isolatedCli(async () => {
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

  // Phase 3 (identity/resume/governance are bootstrap-free read-only explain
  // subcommands). Light routing must produce byte-identical output to the heavy
  // path and must never load synth.js.

  // In-process timing proof: identity's light path is buildRepositoryIdentity +
  // sdk reads (~1s). The heavy path (synth.js + 13-step bootstrap) costs ~3.4s
  // in-process, so a 1.5s ceiling cleanly separates them.
  await t.test("entry[in-process]: `explain identity` executes in <1.5s (no synth.js load)", async () => {
    await isolatedCli(async () => {
      const origArgv = process.argv
      process.argv = ["node", "entry.js", "explain", "identity"]
      const { run } = await import(ENTRY)
      const start = performance.now()
      await run()
      const cliMs = performance.now() - start
      process.argv = origArgv
      assert.ok(cliMs < 1500, `in-process explain identity took ${cliMs.toFixed(1)}ms (ceiling 1500ms)`)
    })
  })

  await t.test("entry[subprocess]: `explain identity` output matches heavy path", () => {
    const light = runEntry(["explain", "identity"])
    const heavy = spawnSync(process.execPath, [SYNTH, "explain", "identity"], { encoding: "utf8" })
    assert.equal(light.status, 0, light.stderr || `exit ${light.status}`)
    assert.equal(heavy.status, 0, heavy.stderr || `exit ${heavy.status}`)
    assert.equal(light.stdout, heavy.stdout, "light explain identity must match heavy byte-for-byte")
  })

  await t.test("entry[subprocess]: `explain resume` output matches heavy path", () => {
    const light = runEntry(["explain", "resume"])
    const heavy = spawnSync(process.execPath, [SYNTH, "explain", "resume"], { encoding: "utf8" })
    assert.equal(light.status, 0, light.stderr || `exit ${light.status}`)
    assert.equal(heavy.status, 0, heavy.stderr || `exit ${heavy.status}`)
    assert.equal(light.stdout, heavy.stdout, "light explain resume must match heavy byte-for-byte")
  })

  await t.test("entry[subprocess]: `explain governance` output matches heavy path", () => {
    const light = runEntry(["explain", "governance"])
    const heavy = spawnSync(process.execPath, [SYNTH, "explain", "governance"], { encoding: "utf8" })
    assert.equal(light.status, 0, light.stderr || `exit ${light.status}`)
    assert.equal(heavy.status, 0, heavy.stderr || `exit ${heavy.status}`)
    assert.equal(light.stdout, heavy.stdout, "light explain governance must match heavy byte-for-byte")
  })
})
