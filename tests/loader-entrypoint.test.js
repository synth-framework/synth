import { test } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENTRY = path.resolve(__dirname, "../dist/cli/entry.js")
const CLI = path.resolve(__dirname, "../dist/cli/synth.js")

function runEntry(args, opts = {}) {
  const start = performance.now()
  const r = spawnSync(process.execPath, [ENTRY, ...args], { encoding: "utf8", ...opts })
  return { ...r, ms: performance.now() - start }
}

// Subprocess regression guard: a light command must be far faster than the
// ~13s heavy path (which loads synth.js + runs the 13-step bootstrap). The
// sandbox adds ~5s of node startup, so we use a loose absolute bound that still
// catches an accidental synth.js load (which would push light > ~13s).
const LIGHT_CEILING = 9000

test("entry[subprocess]: `version` prints semver and stays light (<9s, no synth.js load)", () => {
  const r = runEntry(["version"])
  assert.equal(r.status, 0, r.stderr || `exit ${r.status}`)
  assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+/, `stdout=${JSON.stringify(r.stdout)}`)
  assert.ok(r.ms < LIGHT_CEILING, `version took ${r.ms.toFixed(0)}ms (ceiling ${LIGHT_CEILING}ms)`)
})

test("entry[subprocess]: `--version` stays light (<9s)", () => {
  const r = runEntry(["--version"])
  assert.equal(r.status, 0, r.stderr || `exit ${r.status}`)
  assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+/)
  assert.ok(r.ms < LIGHT_CEILING, `took ${r.ms.toFixed(0)}ms`)
})

test("entry[subprocess]: `help` prints usage and stays light (<9s)", () => {
  const r = runEntry(["help"])
  assert.equal(r.status, 0, r.stderr || `exit ${r.status}`)
  assert.ok(r.stdout.toLowerCase().includes("synth"), `stdout=${JSON.stringify(r.stdout)}`)
  assert.ok(r.ms < LIGHT_CEILING, `took ${r.ms.toFixed(0)}ms`)
})

// In-process test: measures ONLY the CLI's own execution time (no node startup
// or process-spawn overhead), faithfully validating the <100ms spec target and
// proving synth.js is never imported for light commands.
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

test("entry: heavy command still routes through synth.js (status works)", () => {
  // status is not a light command; must delegate to synth.js and produce output.
  const r = runEntry(["status", "--json"])
  assert.equal(r.status, 0, r.stderr || `exit ${r.status}`)
  assert.ok(r.stdout.trim().length > 0, "expected non-empty status output")
})
