// ============================================================
// SYNTH — guided-journey trial setup executor and instruction-set tests
// ============================================================
// These tests cover the setup script's guards, the handoff note, the authored
// instruction sets and the fixture revision constants. They never clone,
// install, or run a trial cell: the network/npm path is exercised by an
// operator, not by CI. Every case below is refused before the script can touch
// the network.
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
const GUIDED_SET = path.resolve(REPO_ROOT, "docs", "plans", "guided-trial", "instructions", "guided.md")
const PLAIN_SET = path.resolve(REPO_ROOT, "docs", "plans", "guided-trial", "instructions", "plain.md")
const SET_INDEX = path.resolve(REPO_ROOT, "docs", "plans", "guided-trial", "README.md")

const TOOL_WORD = /\bsynth\b/i
const LIFECYCLE_WORDS = ["materialize", "approve", "mission", "expedition"]

const runScript = (args) =>
  spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf-8", cwd: REPO_ROOT, timeout: 60000 })

const loadLib = () => import(pathToFileURL(LIB).href)
const loadScript = () => import(pathToFileURL(SCRIPT).href)

/** Case-id → task text as quoted in an instruction set's test table. */
function taskTable(text) {
  const rows = {}
  for (const line of text.split("\n")) {
    const match = line.match(/^\| [^|]+ \| `(green|brown|docs|knowledge|conflict)` \| "(.+)" \|$/)
    if (match) rows[match[1]] = match[2]
  }
  return rows
}

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

test("both instruction sets list every test with the task text used for hashing", async () => {
  const lib = await loadLib()
  const sets = {
    guided: await fs.readFile(GUIDED_SET, "utf-8"),
    plain: await fs.readFile(PLAIN_SET, "utf-8"),
  }
  for (const [condition, text] of Object.entries(sets)) {
    const rows = taskTable(text)
    assert.deepEqual(Object.keys(rows).sort(), lib.CASE_ORDER.slice().sort(), `${condition} set must list each test`)
    for (const name of lib.CASE_ORDER) {
      assert.equal(rows[name], lib.TASKS[name], `${condition} set task text for ${name} must match the fixture constants`)
    }
    for (const word of ["Greenfield", "Brownfield", "Documentation-led"]) {
      assert(text.includes(word), `${condition} set must describe the ${word} test`)
    }
    assert(text.includes("No invented people"), `${condition} set must keep the honesty rule`)
    assert(text.includes("EFFORT"), `${condition} set must ask for effort`)
  }
  assert(sets.guided.includes("awaiting-response"), "guided set must require the offer to stay unanswered")
})

test("the guided instruction set begins with the SYNTH initialization process", async () => {
  const text = await fs.readFile(GUIDED_SET, "utf-8")
  const dryRun = text.indexOf("first-contact --dry-run")
  const start = text.indexOf("first-contact start")
  const clarify = text.indexOf("first-contact clarify --source-offer offer.json")
  assert(dryRun !== -1 && start !== -1 && clarify !== -1, "guided set must carry the initialization process")
  assert(dryRun < start && start < clarify, "guided set must order dry-run, start, then the offer")
  assert(text.includes("do not substitute another script"), "guided set must forbid substituting another script for the CLI process")
  assert(text.includes("follow the CLI"), "guided set must make the CLI authoritative over the document")
  assert(text.includes("Do **not** pass `--selection` or `--human-response`"), "guided set must forbid invented responses")
  assert(text.includes("do not run `first-contact materialize`"), "guided set must forbid lifecycle actions")
  assert(text.includes("Do not push anywhere"), "guided set must forbid publishing")
})

test("the plain instruction set never names the tool or its commands", async () => {
  const text = await fs.readFile(PLAIN_SET, "utf-8")
  assert.equal(TOOL_WORD.test(text), false, "the plain set must not reveal the tool under test")
  assert.equal(/first-contact/i.test(text), false, "the plain set must not carry the guided commands")
  assert(text.includes("There is no required first command"), "the plain set must leave the process to the agent")
  assert(text.includes("offer.json"), "plain set must still ask for a reviewable proposal")
  assert(text.includes("Required observation per test"), "plain set must state the required observation per test")
})

test("the instruction-set index explains the tests and the handoff", async () => {
  const text = await fs.readFile(SET_INDEX, "utf-8")
  for (const name of ["green", "brown", "docs", "knowledge", "conflict"]) {
    assert(text.includes(`\`${name}\``), `index must name case ${name}`)
  }
  assert(text.includes("one fresh agent session per cell"), "index must state the per-cell session rule")
  assert(text.includes("test:guided-installed-trial-setup"), "index must point at the consistency guard")
})

test("the plain handoff note never reveals the tool under test", async () => {
  const script = await loadScript()
  const workspace = path.join(os.tmpdir(), "board-task-plain", "green")
  const note = script.renderHandoffNote("plain", { caseName: "green", workspace, synthBin: "/nowhere/synth" })

  assert.equal(TOOL_WORD.test(note), false, "the plain note must not name the tool")
  assert.equal(/first-contact/i.test(note), false, "the plain note must not carry commands")
  assert(note.includes(workspace), "plain note must name the workspace")
  assert(note.includes(path.join(workspace, "INSTRUCTIONS.md")), "plain note must point at the staged instruction set")
  assert(note.includes("Do not read or write anything outside it"), "plain note must confine the agent")
})

test("the guided handoff note points at the instruction set and the CLI location", async () => {
  const script = await loadScript()
  const workspace = path.join(os.tmpdir(), "board-task-guided", "docs")
  const bin = "/tmp/trial/global/bin/synth"
  const note = script.renderHandoffNote("guided", { caseName: "docs", workspace, synthBin: bin })

  assert(note.includes(path.join(workspace, "INSTRUCTIONS.md")), "guided note must point at the staged instruction set")
  assert(note.includes(bin), "guided note must say where the CLI is installed")
  assert(note.includes("initialization process"), "guided note must name the initialization process, not a command list")
  assert.equal(/first-contact/.test(note), false, "the guided note must not duplicate the process the instruction set owns")
  assert(note.includes("`docs`"), "guided note must name the assigned case")
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

test("setup stages both instruction sets, names no commands, and runs no lifecycle action", async () => {
  const source = await fs.readFile(SCRIPT, "utf-8")
  assert(source.includes("INSTRUCTION_SETS"), "setup must stage instruction sets from the authored directory")
  assert(source.includes("INSTRUCTIONS.md"), "setup must stage the condition-appropriate set into each workspace")
  assert(source.includes("renderHandoffNote"), "setup must write only a short handoff note per cell")
  assert(source.includes("productCommandsRun: ['synth --version']"), "the manifest must record which product command setup ran")
  assert(source.includes("delete-source-clone"), "isolation cleanup must be a recorded step")
  assert(source.includes("plainSetMentionsTool"), "the manifest must record whether the plain set leaked the tool name")

  const start = source.indexOf("// #region handoff-note-text")
  const end = source.indexOf("// #endregion handoff-note-text")
  assert(start !== -1 && end > start, "the handoff-note region must be marked")
  const outside = (source.slice(0, start) + source.slice(end)).toLowerCase()
  for (const forbidden of ["first-contact", ...LIFECYCLE_WORDS]) {
    assert.equal(outside.includes(forbidden), false, `'${forbidden}' must appear only as handoff-note text, never as an executed command`)
  }
})
