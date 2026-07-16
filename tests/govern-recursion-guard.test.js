// Regression guards for EXP-TRUST-001 (Govern Recursion Guard).
//
// A project must never be able to point its "govern" script back at the
// SYNTH governance pipeline (`synth govern`, `synth validate --full`,
// `npm run govern`). Doing so re-enters the pipeline from inside itself
// and recurses without bound. These fixtures reproduce that loop against
// the real CLI and assert it dies prescriptively instead of recursing.

import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const DIST_SYNTH = path.join(REPO_ROOT, "dist", "cli", "synth.js")
const LOOP_BOUND = 20
const MAX_DELEGATION_HOPS = 2

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    passed++
    console.log(`✓ ${message}`)
  } else {
    failed++
    console.error(`✗ ${message}`)
  }
}

// Every fixture is self-limiting: even without the guard, the recursion
// collapses after LOOP_BOUND levels instead of hanging forever.
function makeFixture(governScript) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "synth-guard-"))
  const counter = path.join(dir, ".loops")
  fs.writeFileSync(counter, "0")

  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "guard-fixture", version: "1.0.0", scripts: { govern: governScript } }, null, 2),
  )

  const binDir = path.join(dir, "bin")
  fs.mkdirSync(binDir)
  const limitLines = [
    `C="${counter}"`,
    'N=$(cat "$C" 2>/dev/null || echo 0)',
    "N=$((N+1))",
    'echo "$N" > "$C"',
    `if [ "$N" -ge ${LOOP_BOUND} ]; then echo "limit: loop bound reached" >&2; exit 1; fi`,
  ]
  const shim = ["#!/bin/sh", ...limitLines, `exec node "${DIST_SYNTH}" "$@"`, ""].join("\n")
  fs.writeFileSync(path.join(binDir, "synth"), shim, { mode: 0o755 })
  // Standalone counter for loops that never touch the synth shim (npm self-loops).
  const limiter = ["#!/bin/sh", ...limitLines, ""].join("\n")
  fs.writeFileSync(path.join(dir, "limit.sh"), limiter, { mode: 0o755 })

  return { dir, binDir, counter }
}

function readLoops(fixture) {
  try {
    return Number(fs.readFileSync(fixture.counter, "utf8").trim())
  } catch {
    return -1
  }
}

function runCli(fixture, args, extraEnv = {}) {
  const startedAt = Date.now()
  // Never inherit a delegation marker from the surrounding pipeline: each
  // fixture must exercise the guard layers deterministically.
  const env = { ...process.env, PATH: `${fixture.binDir}${path.delimiter}${process.env.PATH}` }
  delete env.SYNTH_GOVERN_DEPTH
  Object.assign(env, extraEnv)
  const res = spawnSync(process.execPath, [DIST_SYNTH, ...args], {
    cwd: fixture.dir,
    env,
    timeout: 30000,
    encoding: "utf8",
    killSignal: "SIGKILL",
  })
  return {
    status: res.status,
    output: `${res.stdout || ""}${res.stderr || ""}`,
    durationMs: Date.now() - startedAt,
    timedOut: Boolean(res.error && res.error.code === "ETIMEDOUT"),
  }
}

function cleanup(fixture) {
  fs.rmSync(fixture.dir, { recursive: true, force: true })
}

function main() {
  if (!fs.existsSync(DIST_SYNTH)) {
    console.error("dist/cli/synth.js not found; run `npm run build` first.")
    process.exit(1)
  }

  // 1. Loop A verbatim: "govern": "synth govern"
  {
    const fixture = makeFixture("synth govern")
    try {
      const r = runCli(fixture, ["govern"])
      const loops = readLoops(fixture)
      assert(!r.timedOut, "Loop A (synth govern): terminates without timeout")
      assert(r.status !== 0, "Loop A (synth govern): exits non-zero")
      assert(/cycle/i.test(r.output), "Loop A (synth govern): refusal mentions the delegation cycle")
      assert(loops >= 0 && loops <= MAX_DELEGATION_HOPS, `Loop A (synth govern): bounded delegation (observed ${loops} hops)`)
    } finally {
      cleanup(fixture)
    }
  }

  // 2. Self-loop: "govern": "npm run govern"
  {
    const fixture = makeFixture("sh ./limit.sh && npm run govern")
    try {
      const r = runCli(fixture, ["govern"])
      const loops = readLoops(fixture)
      assert(!r.timedOut, "Self-loop (npm run govern): terminates without timeout")
      assert(r.status !== 0, "Self-loop (npm run govern): exits non-zero")
      assert(/cycle/i.test(r.output), "Self-loop (npm run govern): refusal mentions the delegation cycle")
      assert(loops >= 0 && loops <= MAX_DELEGATION_HOPS, `Self-loop: bounded delegation (observed ${loops} hops)`)
    } finally {
      cleanup(fixture)
    }
  }

  // 3. Transitive loop: "govern": "synth validate --full"
  {
    const fixture = makeFixture("synth validate --full")
    try {
      const r = runCli(fixture, ["govern"])
      const loops = readLoops(fixture)
      assert(!r.timedOut, "Transitive loop (synth validate --full): terminates without timeout")
      assert(r.status !== 0, "Transitive loop (synth validate --full): exits non-zero")
      assert(/cycle/i.test(r.output), "Transitive loop (synth validate --full): refusal mentions the delegation cycle")
      assert(loops >= 0 && loops <= MAX_DELEGATION_HOPS, `Transitive loop: bounded delegation (observed ${loops} hops)`)
    } finally {
      cleanup(fixture)
    }
  }

  // 4. Legitimate govern script still runs and the guard stays silent.
  {
    const fixture = makeFixture("echo project-tests-pass")
    try {
      const r = runCli(fixture, ["govern"])
      assert(r.status === 0, "Legitimate script: govern succeeds")
      assert(r.output.includes("project-tests-pass"), "Legitimate script: project validation output is preserved")
      assert(!/cycle/i.test(r.output), "Legitimate script: guard stays silent")
    } finally {
      cleanup(fixture)
    }
  }

  // 5. Marker isolation: a safe script inside an existing delegation tree is refused.
  {
    const fixture = makeFixture("echo should-never-run")
    try {
      const r = runCli(fixture, ["govern"], { SYNTH_GOVERN_DEPTH: "1" })
      assert(!r.timedOut, "Marker layer: terminates without timeout")
      assert(r.status !== 0, "Marker layer: exits non-zero inside a delegation tree")
      assert(/SYNTH_GOVERN_DEPTH/.test(r.output), "Marker layer: refusal names the delegation marker")
      assert(!r.output.includes("should-never-run"), "Marker layer: project script is never executed")
    } finally {
      cleanup(fixture)
    }
  }

  // 6. Bootstrap intake: "synth bootstrap --approve" must not recurse either.
  {
    const fixture = makeFixture("synth govern")
    try {
      const r = runCli(fixture, ["bootstrap", "--approve"])
      const loops = readLoops(fixture)
      assert(!r.timedOut, "Bootstrap intake: terminates without timeout")
      assert(r.status !== 0, "Bootstrap intake: reports the failed govern run")
      assert(/cycle/i.test(r.output), "Bootstrap intake: govern output mentions the delegation cycle")
      assert(loops >= 0 && loops <= MAX_DELEGATION_HOPS, `Bootstrap intake: bounded delegation (observed ${loops} hops)`)
    } finally {
      cleanup(fixture)
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main()
