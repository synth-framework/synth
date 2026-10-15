#!/usr/bin/env node
// Preliminary STATE-001 audit, not a latency benchmark or a new public verb.
// Real-root probes are reads. The only mutation runs through the API/gate on
// a disposable copy. No store writes, synthetic ledger edits or git operations.
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createHash } from "node:crypto"
import { spawnSync, execFileSync } from "node:child_process"
import { fileURLToPath, pathToFileURL } from "node:url"
import assert from "node:assert/strict"

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const args = process.argv.slice(2)
if (args.length !== 2 || args[0] !== "--out") {
  console.error("Usage: node scripts/audit-state-access.js --out <report.json> (requires npm run build)")
  process.exit(1)
}
const output = path.resolve(args[1])
assert(!output.startsWith(path.join(repo, ".synth") + path.sep), "Do not write audit output into the ledger")
const hash = (value) => createHash("sha256").update(value).digest("hex")
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "synth-state-access-"))
function tree(directory, prefix = "") {
  if (!fs.existsSync(directory)) return {}
  return Object.fromEntries(fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
    const name = path.join(directory, entry.name)
    const relative = prefix + entry.name
    assert(!entry.isSymbolicLink(), `Audit refuses symlinks in fixture input: ${name}`)
    return entry.isDirectory() ? Object.entries(tree(name, relative + "/")) : [[relative, hash(fs.readFileSync(name))]]
  }))
}
function changed(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((file) => before[file] !== after[file]).sort()
}
function summarize(records, before, after) {
  const files = new Map()
  for (const record of records) {
    const key = `${record.op}:${record.file}`
    const item = files.get(key) || { op: record.op, file: record.file, calls: 0, failures: 0, bytes: 0, callers: [] }
    item.calls++
    if (!record.ok) item.failures++
    item.bytes += record.bytes || 0
    const caller = record.caller.join(" | ").replaceAll(repo, "<repo>").replaceAll(temp, "<temp>")
    if (!item.callers.includes(caller)) item.callers.push(caller)
    files.set(key, item)
  }
  const byFile = [...files.values()].sort((a, b) => a.file.localeCompare(b.file) || a.op.localeCompare(b.op))
  const reads = records.filter((r) => r.op === "read" && r.ok)
  const writes = records.filter((r) => r.op !== "read" && r.ok)
  const writePaths = [...new Set(writes.map((r) => r.file))]
  return {
    successfulReadCalls: reads.length, readBytes: reads.reduce((n, r) => n + (r.bytes || 0), 0),
    successfulWriteCalls: writes.length, writeBytes: writes.reduce((n, r) => n + (r.bytes || 0), 0),
    distinctFilesWritten: writePaths.length,
    ...(before && after ? { writtenButContentUnchanged: writePaths.filter((file) => before[file] !== undefined && before[file] === after[file]), changedFiles: changed(before, after) } : {}),
    byFile,
  }
}
function run(name, root, nodeArgs) {
  const trace = path.join(temp, `${name}.jsonl`)
  const result = spawnSync(process.execPath, ["--import", pathToFileURL(path.join(repo, "scripts/lib/state-io-tracer.mjs")).href, ...nodeArgs], {
    cwd: root, encoding: "utf8", timeout: 60000, maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, SYNTH_STATE_TRACE_ROOT: root, SYNTH_STATE_TRACE_FILE: trace, SYNTH_STATE_TRACE_PHASE: "probe" },
  })
  assert(!result.error && !result.signal && result.status === 0, `${name} failed: ${result.error || result.signal || result.status}\n${result.stdout}\n${result.stderr}`)
  assert(fs.existsSync(trace), `${name}: missing trace (instrumentation did not run)`)
  const records = fs.readFileSync(trace, "utf8").trim().split("\n").map((line) => JSON.parse(line))
  assert(records.some((r) => r.ok && r.op === "read"), `${name}: no successful state reads observed`)
  assert(records.every((r) => !r.ok || Number.isSafeInteger(r.bytes)), `${name}: unmeasured payload bytes; extend the tracer before reporting totals`)
  return { records, stdout: result.stdout, result: { name, exitCode: result.status, stdoutHash: hash(result.stdout), ...summarize(records) } }
}
const beforeSource = tree(path.join(repo, ".synth/data"), ".synth/data/")
try {
  const stateBytes = fs.readFileSync(path.join(repo, ".synth/data/canonical-state.json"))
  const state = JSON.parse(stateBytes)
  const expedition = Object.values(state.expeditions).find((e) => e.status === "executing")
  assert(expedition, "Audit requires a nonterminal expedition for its copied-fixture refinement")
  const id = expedition.id
  const cli = path.join(repo, "dist/cli/entry.js")
  assert(fs.existsSync(cli), "Build dist first")
  const probes = []
  for (const argv of [
    ["status", "--json"], ["mission", "list", "--json"],
    ["expedition", "show", "--id", id, "--json"], ["expedition", "report", "--id", id, "--json"],
    ["explain", "replay", "--json"], ["verify", "--json"],
    ["doctor", "--json"], ["checkpoint", "--json"],
  ]) {
    const name = argv.slice(0, 2).join("-").replaceAll("--", "")
    const probe = run(name, repo, [cli, ...argv])
    const response = JSON.parse(probe.stdout)
    const plain = spawnSync(process.execPath, [cli, ...argv], { cwd: repo, encoding: "utf8", timeout: 60000, maxBuffer: 16 * 1024 * 1024 })
    assert(!plain.error && !plain.signal && plain.status === 0, `${name}: uninstrumented control failed`)
    assert.equal(plain.stdout, probe.stdout, `${name}: instrumentation changed stdout`)
    probe.result.exactStdoutParity = true
    assert.equal(probe.result.successfulWriteCalls, 0, `${name}: read probe performed traced writes`)
    assert(response.status !== "error", `${name}: command reported error`)
    probes.push({ ...probe.result, argv, responseSummary: {
      status: response.status, consistent: response.consistent, eventCount: response.eventCount,
      summary: response.summary,
      nonPassingChecks: Object.fromEntries(Object.entries(response.checks || {}).filter(([, check]) => check.ok === false)),
      nextSteps: response.nextSteps,
    } })
  }
  const sdkURL = pathToFileURL(path.join(repo, "dist/sdk/state/index.js")).href
  probes.push(run("sdk-one-expedition", repo, ["--input-type=module", "-e", `
    import { readStateOrThrow } from ${JSON.stringify(sdkURL)};
    const state = await readStateOrThrow(process.cwd());
    if (!state.expeditions[${JSON.stringify(id)}]) throw new Error('Missing expedition');
    console.log(JSON.stringify({ id: state.expeditions[${JSON.stringify(id)}].id }));
  `]).result)

  // Preserve real events, hashes, projections and configuration as input, rather
  // than fabricating state. No CLI auto-commit wrapper or VCS integration here.
  const fixture = path.join(temp, "fixture")
  fs.mkdirSync(path.join(fixture, ".synth"), { recursive: true })
  fs.cpSync(path.join(repo, ".synth/data"), path.join(fixture, ".synth/data"), { recursive: true })
  const config = path.join(repo, ".synth/config.yaml")
  if (fs.existsSync(config)) fs.copyFileSync(config, path.join(fixture, ".synth/config.yaml"))
  const charters = path.join(repo, "docs/expeditions")
  if (fs.existsSync(charters)) fs.cpSync(charters, path.join(fixture, "docs/expeditions"), { recursive: true })
  const beforeFixture = tree(path.join(fixture, ".synth/data"), ".synth/data/")
  const bootstrapURL = pathToFileURL(path.join(repo, "dist/core/bootstrap.js")).href
  const replayURL = pathToFileURL(path.join(repo, "dist/runtime/replay.js")).href
  const mutation = run("copied-api-refinement", fixture, ["--input-type=module", "-e", `
    import assert from 'node:assert/strict';
    import { bootstrap } from ${JSON.stringify(bootstrapURL)};
    import { rebuildState } from ${JSON.stringify(replayURL)};
    process.env.SYNTH_STATE_TRACE_PHASE = 'setup';
    const ctx = await bootstrap({ skipGenesis: true, infra: { persistence: 'file', gitEnabled: false } });
    for (const name of ctx.capabilityRegistry.list()) ctx.runtime.registerCapability(ctx.capabilityRegistry.resolve(name));
    ctx.seal();
    const before = await ctx.infra.eventStore.loadAll();
    // Persisted CanonicalState is JSON: omit undefined object fields exactly as
    // StateStore.save does (e.g. repository: undefined), but compare every
    // serialized field, not only the stateHash or selected collections.
    assert.deepEqual(await ctx.infra.stateStore.load(), JSON.parse(JSON.stringify(rebuildState(before))));
    process.env.SYNTH_STATE_TRACE_PHASE = 'mutation';
    const result = await ctx.api.handleIntent({ actor: 'state-access-audit', capability: 'RefineExpedition', payload: {
      id: ${JSON.stringify(id)}, note: 'Disposable state-access audit; never applied to the source repository.'
    }});
    assert.equal(result.status, 'ok', JSON.stringify(result));
    process.env.SYNTH_STATE_TRACE_PHASE = 'verify';
    const after = await ctx.infra.eventStore.loadAll();
    assert.deepEqual(after.slice(0, before.length), before, 'Existing history must be unchanged');
    assert.equal(after.length, before.length + 1);
    assert.equal(after.at(-1).type, 'EXPEDITION_REFINED');
    assert.deepEqual(await ctx.infra.stateStore.load(), JSON.parse(JSON.stringify(rebuildState(after))));
    console.log(JSON.stringify({ status: result.status, beforeEvents: before.length, afterEvents: after.length, exactJSONReplayEquality: true, preservedHistory: true }));
  `])
  const afterFixture = tree(path.join(fixture, ".synth/data"), ".synth/data/")
  const mutationRecords = mutation.records.filter((r) => r.phase === "mutation")
  assert(mutationRecords.some((r) => r.op !== "read" && r.ok), "Mutation had no observed writes")
  const sourceChanges = changed(beforeSource, tree(path.join(repo, ".synth/data"), ".synth/data/"))
  assert.deepEqual(sourceChanges, [], "Audit changed real repository state data")
  const report = {
    schemaVersion: 1, phase: "preliminary-real-repository-audit", generatedAt: new Date().toISOString(),
    source: {
      commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim(),
      node: process.version, platform: process.platform,
      toolingHashes: Object.fromEntries(["scripts/audit-state-access.js", "scripts/lib/state-io-tracer.mjs"].map((file) => [file, hash(fs.readFileSync(path.join(repo, file)))])),
      canonicalBytes: stateBytes.length, canonicalFileHash: hash(stateBytes), stateHash: state.stateHash,
      missions: Object.keys(state.missions).length, expeditions: Object.keys(state.expeditions).length,
      targetExpedition: id,
    },
    methodology: {
      tracedAPIs: "node:fs sync/callback and node:fs/promises readFile/writeFile/appendFile under .synth; completed calls and requested write payload bytes",
      exclusions: "No stream/FileHandle/raw-fd I/O, directory/metadata calls, kernel I/O, CPU attribution, latency measurements or allocation measurements",
      mutations: "One RefineExpedition through bootstrap API/ExecutionGate in a disposable copy; no fabricated ledger events or direct StateStore.save",
      fixtures: "Current real data only; deterministic 10x/100x supported-API fixtures and performance budgets remain outstanding",
    },
    realRootDataUnchanged: true,
    probes,
    mutation: { name: mutation.result.name, ...JSON.parse(mutation.stdout.trim().split("\n").at(-1)), ...summarize(mutationRecords, beforeFixture, afterFixture) },
  }
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n")
  console.log(JSON.stringify({ report: output, realRootDataUnchanged: true, probes: probes.length, mutation: { ...report.mutation, byFile: undefined, writtenButContentUnchanged: report.mutation.writtenButContentUnchanged.length } }, null, 2))
} finally {
  const sourceChanges = changed(beforeSource, tree(path.join(repo, ".synth/data"), ".synth/data/"))
  fs.rmSync(temp, { recursive: true, force: true })
  assert.deepEqual(sourceChanges, [], "Audit detected changes to real repository state data; do not claim a read-only run")
}
