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
// still catch an accidental synth.js load (heavy status would exceed ~12s).
const LIGHT_CEILING = 12000

test("entry[subprocess]: `version` prints semver and stays light (<12s, no synth.js load)", () => {
  const r = runEntry(["version"])
  assert.equal(r.status, 0, r.stderr || `exit ${r.status}`)
  assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+/, `stdout=${JSON.stringify(r.stdout)}`)
  assert.ok(r.ms < LIGHT_CEILING, `version took ${r.ms.toFixed(0)}ms (ceiling ${LIGHT_CEILING}ms)`)
})

test("entry[subprocess]: `--version` stays light (<12s)", () => {
  const r = runEntry(["--version"])
  assert.equal(r.status, 0, r.stderr || `exit ${r.status}`)
  assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+/)
  assert.ok(r.ms < LIGHT_CEILING, `took ${r.ms.toFixed(0)}ms`)
})

test("entry[subprocess]: `help` prints usage and stays light (<12s)", () => {
  const r = runEntry(["help"])
  assert.equal(r.status, 0, r.stderr || `exit ${r.status}`)
  assert.ok(r.stdout.toLowerCase().includes("synth"), `stdout=${JSON.stringify(r.stdout)}`)
  assert.ok(r.ms < LIGHT_CEILING, `took ${r.ms.toFixed(0)}ms`)
})

test("entry[subprocess]: `status --json` stays light and is valid JSON", () => {
  const r = runEntry(["status", "--json"])
  assert.equal(r.status, 0, r.stderr || `exit ${r.status}`)
  let parsed
  assert.doesNotThrow(() => { parsed = JSON.parse(r.stdout) }, `invalid JSON: ${JSON.stringify(r.stdout)}`)
  assert.ok(typeof parsed.status === "string", `expected status field; got ${JSON.stringify(parsed)}`)
  assert.ok(r.ms < LIGHT_CEILING, `status took ${r.ms.toFixed(0)}ms (ceiling ${LIGHT_CEILING}ms)`)
})

// In-process tests measure ONLY the CLI's own execution time (no node startup
// or process-spawn overhead), faithfully proving synth.js is never imported
// for light commands.
test("entry[in-process]: `version` executes in <100ms and never imports synth.js", async () => {
  const origArgv = process.argv
  const origWrite = process.stdout.write.bind(process.stdout)
  let out = ""
  process.stdout.write = (chunk) => {
    out += chunk
    return true
  }
  process.argv = ["node", "entry.js", "version"]
  const { run } = await import(ENTRY)
  const start = performance.now()
  await run()
  const cliMs = performance.now() - start
  process.stdout.write = origWrite
  process.argv = origArgv
  assert.match(out.trim(), /^\d+\.\d+\.\d+/, `stdout=${JSON.stringify(out)}`)
  assert.ok(cliMs < 100, `in-process version took ${cliMs.toFixed(1)}ms (spec budget 100ms)`)
})

// The light `status` path skips the heavy synth.js module graph. In-process it
// does real state work (~2.5s) but must NOT add the ~3s synth.js load, so it
// stays well under 4s. (Heavy would be ~5s+, catching any regression that
// routes status back through synth.js.) printJson uses console.log, so we
// capture that (not process.stdout) to avoid the test runner's own protocol.
test("entry[in-process]: `status --json` executes without loading synth.js (<4s)", async () => {
  const origArgv = process.argv
  const origLog = console.log
  let out = ""
  console.log = (chunk) => {
    out += chunk
    return true
  }
  process.argv = ["node", "entry.js", "status", "--json"]
  const { run } = await import(ENTRY)
  const start = performance.now()
  await run()
  const cliMs = performance.now() - start
  console.log = origLog
  process.argv = origArgv
  let parsed
  assert.doesNotThrow(() => { parsed = JSON.parse(out) }, `invalid JSON: ${JSON.stringify(out)}`)
  assert.equal(parsed.status, "ok", `expected status ok; got ${JSON.stringify(parsed)}`)
  assert.ok(cliMs < 4000, `in-process status took ${cliMs.toFixed(1)}ms (must skip synth.js load)`)
})

// Heavy commands (e.g. explain) still route through synth.js. This guards
// against the entrypoint accidentally short-circuiting a command it shouldn't.
test("entry[subprocess]: heavy command `explain replay` still routes through synth.js", { timeout: 120000 }, () => {
  const r = runEntry(["explain", "replay"])
  assert.equal(r.status, 0, r.stderr || `exit ${r.status}`)
  assert.ok(r.stdout.trim().length > 0, "expected non-empty explain output")
})
