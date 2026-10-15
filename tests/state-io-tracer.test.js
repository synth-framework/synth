import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const tracer = new URL("../scripts/lib/state-io-tracer.mjs", import.meta.url).href
function fixture(body) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "state-tracer-test-"))
  fs.mkdirSync(path.join(root, ".synth"))
  const trace = path.join(root, "trace.jsonl")
  const run = (code, extraEnv = {}) => spawnSync(process.execPath, ["--import", tracer, "--input-type=module", "-e", code], {
    cwd: root, encoding: "utf8", timeout: 10000,
    env: { ...process.env, SYNTH_STATE_TRACE_ROOT: root, SYNTH_STATE_TRACE_FILE: trace, ...extraEnv },
  })
  try { body({ root, trace, run, records: () => fs.readFileSync(trace, "utf8").trim().split("\n").map(JSON.parse) }) }
  finally { fs.rmSync(root, { recursive: true, force: true }) }
}
function success(result) {
  assert.ifError(result.error)
  assert.equal(result.status, 0, result.stderr)
}

test("preload observes sync, callback and promise APIs once each without changing values", () => fixture(({ run, records }) => {
  success(run(`
    import assert from 'node:assert/strict';
    import fs, { readFileSync } from 'node:fs';
    import fsp, { readFile } from 'node:fs/promises';
    import { promisify } from 'node:util';
    fs.writeFileSync('.synth/a', 'é');
    assert.equal(readFileSync('.synth/a', 'utf8'), 'é');
    await fsp.appendFile('.synth/a', '!');
    assert.equal(await readFile('.synth/a', 'utf8'), 'é!');
    await promisify(fs.writeFile)('.synth/b', Buffer.from('abc'));
    assert.deepEqual(await promisify(fs.readFile)('.synth/b'), Buffer.from('abc'));
  `))
  const rows = records()
  assert.equal(rows.length, 6)
  assert.deepEqual(rows.map(({ api, bytes, ok }) => [api, bytes, ok]), [
    ["writeFileSync", 2, true], ["readFileSync", 2, true],
    ["promises.appendFile", 1, true], ["promises.readFile", 3, true],
    ["writeFile", 3, true], ["readFile", 3, true],
  ])
  assert(rows.every((r) => r.caller.length > 0))
}))

test("read errors retain their code and are not counted as successful bytes", () => fixture(({ run, records }) => {
  success(run(`
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import fsp from 'node:fs/promises';
    import { promisify } from 'node:util';
    assert.throws(() => fs.readFileSync('.synth/missing'), { code: 'ENOENT' });
    await assert.rejects(fsp.readFile('.synth/missing'), { code: 'ENOENT' });
    await assert.rejects(promisify(fs.readFile)('.synth/missing'), { code: 'ENOENT' });
  `))
  const rows = records()
  assert.equal(rows.length, 3)
  assert(rows.every((r) => !r.ok && r.error === "ENOENT" && r.bytes === undefined))
}))

test("root filtering, URL and Buffer paths, and phase labels are explicit", () => fixture(({ run, records }) => {
  success(run(`
    import fs from 'node:fs';
    import { pathToFileURL } from 'node:url';
    import path from 'node:path';
    fs.writeFileSync('outside', 'not counted');
    fs.mkdirSync('.synth-other');
    fs.writeFileSync('.synth-other/a', 'not counted');
    process.env.SYNTH_STATE_TRACE_PHASE = 'mutation';
    fs.writeFileSync(pathToFileURL(path.resolve('.synth/a')), 'a');
    process.env.SYNTH_STATE_TRACE_PHASE = 'verify';
    fs.readFileSync(Buffer.from('.synth/a'));
  `))
  const rows = records()
  assert.equal(rows.length, 2)
  assert.deepEqual(rows.map((r) => [r.file, r.phase]), [[".synth/a", "mutation"], [".synth/a", "verify"]])
}))

test("missing trace configuration fails rather than producing silent zero-I/O evidence", () => fixture(({ run }) => {
  const result = run("", { SYNTH_STATE_TRACE_FILE: "" })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /requires explicit root and output/)
}))

test("audit CLI rejects output inside the real state directory before running probes", () => {
  const script = fileURLToPath(new URL("../scripts/audit-state-access.js", import.meta.url))
  const root = path.dirname(path.dirname(script))
  const result = spawnSync(process.execPath, [script, "--out", path.join(root, ".synth/data/forbidden-audit.json")], { encoding: "utf8", timeout: 10000 })
  assert.ifError(result.error)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Do not write audit output into the ledger/)
  assert(!fs.existsSync(path.join(root, ".synth/data/forbidden-audit.json")))
})
