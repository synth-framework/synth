// ============================================================
// SYNTH — guided-journey trial setup executor tests
// ============================================================
// These tests cover the setup script's guards, kickoff text and fixture
// revision constants. They never clone, install, or run a trial cell: the
// network/npm path is exercised by an operator, not by CI. Every case below is
// refused before the script can touch the network.
// ============================================================

import test from "node:test"
import { strict as assert } from "node:assert"
import { spawnSync } from "node:child_process"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"

const REPO_ROOT = process.cwd()
const SCRIPT = path.resolve(REPO_ROOT, "scripts", "guided-installed-trial-setup.mjs")
const LIB = path.resolve(REPO_ROOT, "scripts", "lib", "guided-trial-fixtures.mjs")

const runScript = (args) =>
  spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf-8", cwd: REPO_ROOT, timeout: 60000 })

const loadLib = () => import(pathToFileURL(LIB).href)
const loadScript = () => import(pathToFileURL(SCRIPT).href)

test("help prints usage and exits 0 without touching anything", () => {
  const result = runScript(["--help"])
  assert.equal(result.status, 0, result.stderr)
  assert(result.stdout.includes("Stops after staging"), "usage must state that setup stops before any cell")
  assert(result.stdout.includes("--plain-root"), "usage must document the plain workspace root")
  assert(result.stdout.includes("never trial evidence"), "usage must not let setup be read as trial evidence")
})

test("a relative root is refused", () => {
  const result = runScript(["--root", "relative/trial"])
  assert.notEqual(result.status, 0)
  assert(result.stderr.includes("--root must be an absolute path"), result.stderr)
})

test("a root inside this repository is refused", () => {
  const result = runScript(["--root", path.join(REPO_ROOT, ".trial-should-not-exist")])
  assert.notEqual(result.status, 0)
  assert(result.stderr.includes("outside this repository"), result.stderr)
})

test("a non-empty root is refused and left untouched", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-trial-guard-"))
  try {
    await fs.writeFile(path.join(dir, "keep.txt"), "existing content\n")
    const result = runScript(["--root", dir])
    assert.notEqual(result.status, 0)
    assert(result.stderr.includes("must be empty or nonexistent"), result.stderr)
    assert.equal(await fs.readFile(path.join(dir, "keep.txt"), "utf-8"), "existing content\n")
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

test("a plain root that would reveal the tool under test is refused", () => {
  const result = runScript([
    "--root", path.join(os.tmpdir(), "board-task-root-guard"),
    "--plain-root", path.join(os.tmpdir(), "synth-plain-leak"),
  ])
  assert.notEqual(result.status, 0)
  assert(result.stderr.includes('must not contain "synth"'), result.stderr)
})

test("a plain root nested inside the trial root is refused", () => {
  const root = path.join(os.tmpdir(), "board-task-root-nesting")
  const result = runScript(["--root", root, "--plain-root", path.join(root, "inside")])
  assert.notEqual(result.status, 0)
  assert(result.stderr.includes("must not be inside --root"), result.stderr)
})

test("unknown or valueless flags fail rather than guessing", () => {
  const unknown = runScript(["--root", path.join(os.tmpdir(), "board-task-unknown"), "--turbo"])
  assert.notEqual(unknown.status, 0)
  assert(unknown.stderr.includes("Unknown argument: --turbo"), unknown.stderr)

  const valueless = runScript(["--root", path.join(os.tmpdir(), "board-task-valueless"), "--pin"])
  assert.notEqual(valueless.status, 0)
  assert(valueless.stderr.includes("--pin requires a value"), valueless.stderr)
})

test("plain kickoff never reveals the tool under test", async () => {
  const [lib, script] = await Promise.all([loadLib(), loadScript()])
  const workspace = path.join(os.tmpdir(), "board-task-plain", "green")
  const kickoff = script.renderKickoff("plain", {
    caseName: "green",
    workspace,
    synthBin: "/nowhere/synth",
    task: lib.TASKS.green,
  })

  assert.equal(/synth/i.test(kickoff), false, "the plain condition must not learn that a tool named synth exists")
  assert.equal(/first-contact/i.test(kickoff), false, "the plain condition must not receive the guided commands")
  assert(kickoff.includes(workspace), "plain kickoff must confine the agent to its own workspace")
  assert(kickoff.includes(lib.TASKS.green), "plain kickoff must carry the exact case task")
  assert(kickoff.includes("Do not claim that anything was approved"), "plain kickoff must forbid claiming approval")
})

test("guided kickoff carries the initialization commands and forbids invented humans", async () => {
  const [lib, script] = await Promise.all([loadLib(), loadScript()])
  const workspace = path.join(os.tmpdir(), "board-task-guided", "docs")
  const bin = "/tmp/trial/global/bin/synth"
  const kickoff = script.renderKickoff("guided", {
    caseName: "docs",
    workspace,
    synthBin: bin,
    task: lib.TASKS.docs,
  })

  assert(kickoff.includes(`${bin} first-contact --dry-run`), "guided kickoff must start with the initialization commands")
  assert(kickoff.includes(`${bin} first-contact start "${lib.TASKS.docs}"`), "guided kickoff must pass the exact case task")
  assert(kickoff.includes(`${bin} first-contact clarify --source-offer offer.json`), "guided kickoff must record the agent's own offer")
  assert(kickoff.includes("awaiting-response"), "guided kickoff must require the offer to stay unanswered")
  assert(kickoff.includes("--selection or --human-response"), "guided kickoff must forbid invented responses")
  assert(kickoff.includes("do not push anywhere"), "guided kickoff must forbid publishing")
  assert(kickoff.includes("Do not run first-contact approve or first-contact materialize"), "guided kickoff must explicitly forbid lifecycle commands")
})

test("fixture revisions still match the executed E4 record", async () => {
  const lib = await loadLib()
  assert.deepEqual(lib.revisionMismatches(), [], "fixture bodies must not drift from the published revisions")
  assert.deepEqual(lib.caseRevisions(), lib.E4_REVISIONS)
  assert.deepEqual(lib.REQUIRED_CASES, ["green", "brown", "docs"])
  assert.deepEqual(lib.OPTIONAL_CASES, ["knowledge", "conflict"])
  assert.equal(lib.CASE_ORDER.length, 5)
  for (const name of lib.CASE_ORDER) assert.equal(typeof lib.TASKS[name], "string")
})

test("the revision rule round-trips on a copied workspace", async () => {
  const [lib, script] = await Promise.all([loadLib(), loadScript()])
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-trial-revision-"))
  try {
    for (const [relative, content] of lib.fixtureRows(lib.FIXTURES.brown)) {
      const target = path.join(dir, relative)
      await fs.mkdir(path.dirname(target), { recursive: true })
      await fs.writeFile(target, content)
    }
    assert.equal(await script.revisionOfDir(dir), lib.E4_REVISIONS.brown)
    await fs.writeFile(path.join(dir, "docs", "limitation.md"), "changed\n")
    assert.notEqual(await script.revisionOfDir(dir), lib.E4_REVISIONS.brown, "an edited workspace must not keep the recorded revision")
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

test("setup never invokes a product lifecycle command", async () => {
  const source = await fs.readFile(SCRIPT, "utf-8")
  assert(source.includes("// #region product-command-text"), "text-only regions must be marked")
  assert(source.includes("// #endregion product-command-text"), "text-only regions must be closed")
  const outside = source
    .replace(/\/\/ #region product-command-text[\s\S]*?\/\/ #endregion product-command-text/g, "")
    .toLowerCase()
  for (const forbidden of ["first-contact", "materialize", "approve", "mission", "expedition"]) {
    assert.equal(outside.includes(forbidden), false, `'${forbidden}' must appear only as kickoff text, never as an executed command`)
  }
  assert(source.includes("productCommandsRun: ['synth --version']"), "the manifest must record which product command setup ran")
  assert(source.includes("delete-source-clone"), "isolation cleanup must be a recorded step")
})
