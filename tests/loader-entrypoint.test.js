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

function runHeavy(args, opts = {}) {
  const start = performance.now()
  const r = spawnSync(process.execPath, [SYNTH, ...args], { encoding: "utf8", ...opts })
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
  // ---- Unified CLI surface -------------------------------------------------
  // `bin.synth` is entry.js, yet a full test run spawns synth.js directly for
  // 1536 of its 1572 CLI invocations (98%) -- so the suite was exercising an
  // entry point that is not shipped. Measured before unification, the two
  // paths diverged on 7 of 9 invocations: `version` printed a bare semver on
  // one and a JSON envelope on the other, `help` printed prose on one and
  // exited 1 with a CLIError on the other, and `status --human` returned JSON
  // on one and prose on the other. Both now render through the shared
  // src/cli/usage.ts and src/cli/version.ts modules, so the durable guard is
  // byte-identity across the whole surface: whichever path grows a private
  // output contract again, this fails.
  const SURFACE = [
    ["version"],
    ["--version"],
    ["-v"],
    ["help"],
    ["--help"],
    ["-h"],
    ["status"],
    ["status", "--json"],
    ["status", "--human"],
  ]

  for (const args of SURFACE) {
    const label = args.join(" ")
    await t.test(`entry[subprocess]: \`${label}\` matches the heavy path byte-for-byte`, () => {
      const light = runEntry(args)
      const heavy = runHeavy(args)
      assert.equal(light.status, 0, light.stderr || `exit ${light.status}`)
      assert.equal(heavy.status, 0, heavy.stderr || `exit ${heavy.status}`)
      assert.equal(
        light.stdout,
        heavy.stdout,
        `\`${label}\` stdout diverged between entry.js and synth.js`,
      )
    })
  }

  // The contract itself, asserted once so a shared-module regression that
  // changes BOTH paths identically still fails.
  await t.test("entry[subprocess]: `version` prints the JSON envelope", () => {
    const r = runEntry(["version"])
    assert.equal(r.status, 0, r.stderr || `exit ${r.status}`)
    const parsed = JSON.parse(r.stdout)
    assert.equal(parsed.status, "ok")
    assert.match(parsed.version, /^\d+\.\d+\.\d+/, `version field=${JSON.stringify(parsed.version)}`)
  })

  await t.test("entry[subprocess]: `version --human` prints the bare semver", () => {
    const r = runEntry(["version", "--human"])
    assert.equal(r.status, 0, r.stderr || `exit ${r.status}`)
    assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+$/, `stdout=${JSON.stringify(r.stdout)}`)
  })

  await t.test("entry[subprocess]: `help` lists every verb when piped", () => {
    const r = runEntry(["help"])
    assert.equal(r.status, 0, r.stderr || `exit ${r.status}`)
    const parsed = JSON.parse(r.stdout)
    const names = parsed.commands.map((c) => c.name)
    // The shipped help used to omit four verbs the heavy path accepted.
    for (const verb of ["verify", "task", "release", "report"]) {
      assert.ok(names.includes(verb), `help omits \`${verb}\`; got ${names.join(", ")}`)
    }
    assert.ok(names.includes("version") && names.includes("status"), "help omits a core verb")
    assert.equal(parsed.name, "synth")
    assert.ok(parsed.usage.includes("synth"), `usage=${JSON.stringify(parsed.usage)}`)
  })

  await t.test("entry[subprocess]: `help --human` renders prose when asked", () => {
    const r = runEntry(["help", "--human"])
    assert.equal(r.status, 0, r.stderr || `exit ${r.status}`)
    assert.match(r.stdout, /^synth v\d+\.\d+\.\d+/, `stdout=${JSON.stringify(r.stdout.slice(0, 120))}`)
    assert.ok(r.stdout.includes("Usage: synth"), "expected a usage line in the prose rendering")
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

// EXP-CLI-003: routing is data, and object prototype names are not CLI verbs.
test("verb registry resolves namespaces and help without accepting inherited keys", async () => {
  const { getNamespaceLoader, getNamespaceHelp, isExplainSub, resolveLightExplain, callExplainHandler } =
    await import("../dist/cli/verb-registry.js")
  for (const command of ["mission", "expedition", "explain", "first-contact", "genesis", "task", "repo", "adapter", "doctor", "checkpoint", "log", "validate", "govern"]) {
    assert.equal(typeof getNamespaceLoader(command), "function", command)
  }
  for (const command of ["constructor", "toString", "__proto__", "missing-command"]) {
    assert.equal(getNamespaceLoader(command), undefined)
    assert.equal(getNamespaceHelp([command, "--help"]), undefined)
    assert.equal(isExplainSub(command), false)
    assert.equal(resolveLightExplain(command), undefined)
    await assert.rejects(callExplainHandler(command, {}), /VERB_REGISTRY_UNKNOWN_SUB/)
  }
  assert.equal(getNamespaceHelp(["mission"]), undefined)
  assert.equal(getNamespaceHelp(["mission", "list"]), undefined)
  assert.equal(typeof getNamespaceHelp(["mission", "approve", "--help"]), "function")
  assert.equal(typeof getNamespaceHelp(["expedition", "approve", "-h"]), "function")
  assert.equal(resolveLightExplain(undefined), "replay")
  assert.equal(resolveLightExplain(""), "replay")
  assert.equal(resolveLightExplain("identity"), "identity")
  assert.equal(resolveLightExplain("agents"), undefined)
})

test("namespace and approval help remain byte-identical across entry points", { timeout: 120000 }, () => {
  const namespaces = ["bootstrap", "discover", "mission", "program", "project", "intent", "alignment", "expedition", "doctor", "checkpoint", "certify", "capabilities", "log", "docs", "adapter", "snapshot", "repair", "first-contact", "genesis", "validate", "verify", "approval", "task", "explain", "ai", "repo", "migrate"]
  const invocations = namespaces.map((namespace) => [namespace, "--help"])
  invocations.push(["mission", "approve", "--help"], ["expedition", "approve", "-h"])
  for (const args of invocations) {
    const light = runEntry(args)
    const compatibility = runHeavy(args)
    assert.equal(light.status, 0, `${args.join(" ")}: ${light.stderr}`)
    assert.equal(compatibility.status, 0, compatibility.stderr)
    assert.equal(light.stdout, compatibility.stdout, args.join(" "))
    assert.equal(light.stderr, compatibility.stderr, args.join(" "))
  }
})
