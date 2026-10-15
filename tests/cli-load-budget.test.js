import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import crypto from "node:crypto"
import { spawnSync } from "node:child_process"
import { fileURLToPath, pathToFileURL } from "node:url"
import { edgesOf, readModuleGraph, closure, measureModules } from "../scripts/lib/module-graph.js"
import { budgetFailures, checkStaticEntries, validateProbeResult, runGuard } from "../scripts/check-cli-load-budget.js"
import { ORIGINAL_MODULES, ORDINARY_LIMIT, ENTRY_BUDGETS, PROBES } from "../scripts/lib/cli-load-budgets.js"

const ROOT = fileURLToPath(new URL("../", import.meta.url))
const ENTRY = "dist/cli/entry.js"
const source = new Map([[ENTRY, "export {};"], ["dist/dependency.js", "export {};"]])
const graph = new Map([[ENTRY, { static: ["dist/dependency.js"], dynamic: [] }], ["dist/dependency.js", { static: [], dynamic: [] }]])
const probe = { id: "fixture", args: [], kind: "Fixture" }
const result = { status: 0, signal: null, stdout: '{"status":"ok","kind":"Fixture"}', stderr: "" }
const trace = [...source.keys()].map(JSON.stringify).join("\n")

function temporary(body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "synth-load-test-"))
  try { return body(dir) } finally { fs.rmSync(dir, { recursive: true, force: true }) }
}

test("AST graph handles multiline imports, reexports, side effects and literal dynamic imports, not comments/strings", () => {
  const code = `// import "./fake.js"\nconst prose = 'import("./fake.js")';
    import {\n value\n} from "./a.js";
    import "./b.js"; export { x } from "./c.js";
    export * from "./d.js"; import("./e.js"); import(\`./f.js\`);
    import(variable); import(\`./\${variable}.js\`); import "node:fs";`
  assert.deepEqual(edgesOf("/repo/dist/root.js", code, "/repo"), {
    static: ["dist/a.js", "dist/b.js", "dist/c.js", "dist/d.js"], dynamic: ["dist/e.js", "dist/f.js"],
  })
  assert.throws(() => edgesOf("/repo/dist/root.js", "import {", "/repo"), /Cannot parse/)
})

test("missing roots and static/dynamic edges fail closed; cycles and Unicode bytes are measured exactly", () => {
  assert.throws(() => closure(["dist/missing.js"], graph), /missing/)
  assert.throws(() => measureModules(["dist/missing.js"], source), /absent/)
  const cycle = new Map([...graph, ["dist/dependency.js", { static: [ENTRY], dynamic: [] }]])
  assert.equal(closure([ENTRY], cycle).size, 2)
  assert.equal(measureModules([ENTRY, ENTRY], new Map([[ENTRY, "é"]])).bytes, 2)
  temporary((root) => {
    fs.mkdirSync(path.join(root, "dist"))
    for (const statement of ['import "./missing.js"', 'import("./missing.js")']) {
      fs.writeFileSync(path.join(root, "dist/a.js"), statement)
      assert.throws(() => readModuleGraph(root), /Unresolved built import/)
    }
  })
})

test("ordinary denominator never increases with module extraction; byte and module limits both reject excess", () => {
  assert.equal(ORIGINAL_MODULES, 348)
  assert.equal(ORDINARY_LIMIT, 139)
  assert.equal(ENTRY_BUDGETS["dist/main.js"].modules, 172)
  assert.equal(ENTRY_BUDGETS["dist/cli/status-light.js"].modules, 23)
  assert.equal(ENTRY_BUDGETS["dist/cli/status-light.js"].bytes, 130 * 1024)
  for (const [id, bound] of [["doctor", 193], ["checkpoint", 207], ["bootstrap-plan", 220]]) {
    assert.equal(PROBES.find((p) => p.id === id)?.modules, bound)
  }
  assert.equal(budgetFailures("fixture", { modules: 26, bytes: 153601 }, { modules: 25, bytes: 153600 }).length, 2)
  assert.deepEqual(budgetFailures("fixture", { modules: 25, bytes: 153600 }, { modules: 25, bytes: 153600 }), [])
})

test("read-only runtime capability names exactly match the default executable registry", async () => {
  const { DEFAULT_CAPABILITY_NAMES } = await import("../dist/capability/default-names.js")
  const { createCapabilityRegistry } = await import("../dist/capability/registry.js")
  assert.ok(Object.isFrozen(DEFAULT_CAPABILITY_NAMES))
  assert.deepEqual([...DEFAULT_CAPABILITY_NAMES], createCapabilityRegistry().list())
  const { graph } = readModuleGraph(ROOT)
  const resolver = closure(["dist/runtime/governance-resolver.js"], graph)
  assert.ok(!resolver.has("dist/capability/registry.js"))
  assert.ok(resolver.has("dist/capability/default-names.js"))
  // Status must not load the all-SDK barrel just to call two leaf functions.
  const status = closure(["dist/cli/status-light.js"], graph)
  assert.ok(!status.has("dist/sdk/index.js"))
})

test("even a tiny eager dispatcher handler fails below the numeric budget", () => {
  const handler = "dist/cli/commands-fixture.js"
  const sources = new Map([[ENTRY, ""], [handler, ""]])
  const g = new Map([[ENTRY, { static: [handler], dynamic: [] }], [handler, { static: [], dynamic: [] }]])
  const measured = checkStaticEntries([ENTRY], g, sources)
  assert.equal(measured.entries[0].modules, 2)
  assert.match(measured.failures.join("\n"), /eagerly loads handlers/)
  assert.throws(() => checkStaticEntries(["dist/new-bin.js"], g, sources), /no reviewed load budget/)
})

test("whole-invocation trace is deduplicated but must include all static dependencies", () => {
  assert.equal(validateProbeResult(probe, result, `${trace}\n${JSON.stringify(ENTRY)}`, graph, source, ENTRY).modules, 2)
  assert.throws(() => validateProbeResult(probe, result, JSON.stringify(ENTRY), graph, source, ENTRY), /incomplete trace/)
})

for (const [name, changedResult, changedTrace, pattern] of [
  ["nonzero exit", { ...result, status: 1 }, trace, /unexpected exit/],
  ["signal", { ...result, signal: "SIGTERM" }, trace, /process failed/],
  ["timeout", { ...result, error: new Error("ETIMEDOUT") }, trace, /process failed/],
  ["empty output", { ...result, stdout: "" }, trace, /invalid JSON/],
  ["error envelope", { ...result, stdout: '{"status":"error"}' }, trace, /unexpected result/],
  ["wrong command", { ...result, stdout: '{"status":"ok","kind":"Help"}' }, trace, /wrong output kind/],
  ["empty trace", result, "", /empty\/missing/],
  ["truncated trace", result, `${trace}\n{`, /malformed/],
  ["out-of-build module", result, `${trace}\n"dist/missing.js"`, /absent/],
  ["non-module record", result, `${trace}\n{}`, /invalid traced path/],
]) test(`probe fails closed on ${name}`, () => {
  assert.throws(() => validateProbeResult(probe, changedResult, changedTrace, graph, source, ENTRY), pattern)
})

test("a skipped/empty replay cannot satisfy a work-based exception", () => {
  const doctor = PROBES.find((p) => p.id === "doctor")
  const g = new Map([...graph, ["dist/core/bootstrap.js", { static: [], dynamic: [] }]])
  const sources = new Map([...source, ["dist/core/bootstrap.js", ""]])
  const loaded = `${trace}\n"dist/core/bootstrap.js"`
  const output = { status: "ok", checks: { replay: { ok: true, detail: "No event log present; replay skipped" } } }
  assert.throws(() => validateProbeResult(doctor, { ...result, stdout: JSON.stringify(output) }, loaded, g, sources, ENTRY), /failed\/skipped\/empty/)
  output.checks.replay.detail = "Event log consistent (5 events, segmented layout)"
  assert.equal(validateProbeResult(doctor, { ...result, stdout: JSON.stringify(output) }, loaded, g, sources, ENTRY).modules, 3)
  assert.throws(() => validateProbeResult(probe, result, loaded, g, sources, ENTRY), /unexpectedly bootstrapped/)
})

test("read-only planning adapter names exactly match the default live registry", async () => {
  const { PLANNING_ADAPTER_NAMES } = await import("../dist/mission-studio/adapter-names.js")
  const { createAdapterRegistry } = await import("../dist/mission-studio/adapter-registry.js")
  assert.ok(Object.isFrozen(PLANNING_ADAPTER_NAMES))
  assert.deepEqual([...PLANNING_ADAPTER_NAMES], createAdapterRegistry().list())
  const { graph } = readModuleGraph(ROOT)
  assert.ok(!closure(["dist/runtime/governance-resolver.js"], graph).has("dist/mission-studio/adapter-registry.js"))
})

test("repo status has no bootstrap INFO chatter in its normal stderr surface", () => temporary((root) => {
  const r = spawnSync(process.execPath, [path.join(ROOT, ENTRY), "repo", "status"], {
    cwd: root, encoding: "utf8", timeout: 30000,
    env: { ...process.env, SYNTH_QUIET_LOGS: "0" },
  })
  assert.ifError(r.error)
  assert.equal(r.status, 0, r.stderr)
  assert.equal(JSON.parse(r.stdout).kind, "RepositoryStatus")
  assert.doesNotMatch(r.stderr, /\[INFO\]|Starting Synth v2 bootstrap/)
}))

test("repository projection matches full-bootstrap replay without loading its mutation plane", () => temporary((root) => {
  const cli = (args) => {
    const r = spawnSync(process.execPath, [path.join(ROOT, ENTRY), ...args, "--json"], { cwd: root, encoding: "utf8", env: { ...process.env, SYNTH_QUIET_LOGS: "1" }, timeout: 30000 })
    assert.ifError(r.error)
    assert.equal(r.status, 0, `${args.join(" ")}: ${r.stdout}\n${r.stderr}`)
    return JSON.parse(r.stdout)
  }
  const tree = () => {
    const records = []
    function walk(dir) {
      for (const item of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const file = path.join(dir, item.name)
        if (item.isDirectory()) walk(file)
        else records.push([path.relative(root, file), crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")])
      }
    }
    walk(root)
    return records
  }
  const compare = () => {
    // Independent reference: the previous implementation obtained state by
    // bootstrapping the complete runtime. Real stores/events, no domain mocks.
    const code = `import { bootstrap } from ${JSON.stringify(pathToFileURL(path.join(ROOT, "dist/core/bootstrap.js")).href)};
      const ctx = await bootstrap({ skipGenesis: true, infra: { persistence: "file" } });
      console.log(JSON.stringify(await ctx.runtime.getState()));`
    const r = spawnSync(process.execPath, ["--input-type=module", "-e", code], { cwd: root, encoding: "utf8", env: { ...process.env, SYNTH_QUIET_LOGS: "1" }, timeout: 30000 })
    assert.ifError(r.error)
    assert.equal(r.status, 0, r.stderr)
    const state = JSON.parse(r.stdout)
    const before = tree()
    const output = cli(["repo", "status"])
    assert.deepEqual(tree(), before, "query changed durable state")
    assert.equal(output.initialized, state.repository !== undefined)
    assert.equal(output.lifecycle, state.repository?.lifecycle || "uninitialized")
    for (const field of ["forgeProvider", "versionStrategy", "defaultBranch"]) assert.equal(output[field], state.repository?.[field])
    for (const [field, collection] of [["branchCount", "branches"], ["pullRequestCount", "pullRequests"], ["releaseCount", "releases"]]) assert.equal(output[field], Object.keys(state.repository?.[collection] || {}).length)
  }
  compare()
  cli(["init", "--name", "Repository load fixture"])
  cli(["repo", "init", "--forge-provider", "github", "--version-strategy", "semver"])
  compare()
}))

test("derived guard measures every declared entry and all real representative invocations", { timeout: 180000 }, () => {
  const report = runGuard(ROOT)
  assert.equal(report.ok, true, report.failures.join("\n"))
  assert.equal(report.probes.length, PROBES.length)
  assert.equal(report.originalTotalModules, 348)
  assert.ok(report.entries.some((entry) => entry.root === ENTRY))
  for (const probe of report.probes) assert.ok(probe.files.length > 0, `${probe.id}: missing measurement`)
})
