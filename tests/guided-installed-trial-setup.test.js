// ============================================================
// SYNTH — guided-journey trial setup executor tests
// ============================================================
// These tests cover the setup script's guards, the layout it infers from its two
// inputs, the handoff notes, the authored instruction sets and the fixture
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
const GUIDED_SET = path.resolve(REPO_ROOT, "docs", "plans", "guided-trial", "instructions", "guided.md")
const PLAIN_SET = path.resolve(REPO_ROOT, "docs", "plans", "guided-trial", "instructions", "plain.md")
const SET_INDEX = path.resolve(REPO_ROOT, "docs", "plans", "guided-trial", "README.md")

const TOOL_WORD = /\bsynth\b/i
const LIFECYCLE_WORDS = ["first-contact", "materialize", "approve", "mission", "expedition"]
const GIT_ENV = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null" }

const runScript = (args) =>
  spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf-8", cwd: REPO_ROOT, timeout: 60000, env: GIT_ENV })

const git = (args, cwd) =>
  spawnSync("git", ["-c", "user.email=trial@example.invalid", "-c", "user.name=Trial", ...args], { encoding: "utf-8", cwd, env: GIT_ENV })

const loadLib = () => import(pathToFileURL(LIB).href)
const loadScript = () => import(pathToFileURL(SCRIPT).href)

/** Create a throwaway git checkout with one commit (and optionally a dirty file). */
async function makeCheckout(prefix, { dirty = false } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix))
  git(["init", "-q"], dir)
  await fs.writeFile(path.join(dir, "README.md"), "trial source\n")
  git(["add", "."], dir)
  git(["commit", "-q", "-m", "initial"], dir)
  if (dirty) await fs.writeFile(path.join(dir, "wip.txt"), "uncommitted\n")
  return dir
}

async function makeEmptyDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix))
}

/** Case-id → task text as quoted in an instruction set's test table. */
function taskTable(text) {
  const rows = {}
  for (const line of text.split("\n")) {
    const match = line.match(/^\| [^|]+ \| `(green|brown|docs|knowledge|conflict)` \| "(.+)" \|$/)
    if (match) rows[match[1]] = match[2]
  }
  return rows
}

test("help states the two inputs and that setup stops before any cell", () => {
  const result = runScript(["--help"])
  assert.equal(result.status, 0, result.stderr)
  assert(result.stdout.includes("--repo <path>"), "usage must document the checkout input")
  assert(result.stdout.includes("--workspace <dir>"), "usage must document the testing workspace input")
  assert(result.stdout.includes("Everything else is inferred"), "usage must say the rest is inferred")
  assert(result.stdout.includes("Stops after staging"), "usage must state that setup stops before any cell")
  assert(result.stdout.includes("never trial evidence"), "usage must not let setup be read as trial evidence")
})

test("both inputs are required", () => {
  const noWorkspace = runScript(["--repo", REPO_ROOT])
  assert.notEqual(noWorkspace.status, 0)
  assert(noWorkspace.stderr.includes("--workspace is required"), noWorkspace.stderr)

  const noRepo = runScript(["--workspace", path.join(os.tmpdir(), "board-ws-required")])
  assert.notEqual(noRepo.status, 0)
  assert(noRepo.stderr.includes("--repo is required"), noRepo.stderr)
})

test("unknown or valueless flags fail rather than guessing", () => {
  const unknown = runScript(["--repo", REPO_ROOT, "--workspace", path.join(os.tmpdir(), "board-ws-unknown"), "--turbo"])
  assert.notEqual(unknown.status, 0)
  assert(unknown.stderr.includes("Unknown argument: --turbo"), unknown.stderr)

  const valueless = runScript(["--repo", REPO_ROOT, "--workspace"])
  assert.notEqual(valueless.status, 0)
  assert(valueless.stderr.includes("--workspace requires a value"), valueless.stderr)

  const badCase = runScript(["--repo", REPO_ROOT, "--workspace", path.join(os.tmpdir(), "board-ws-case"), "--cases", "greenfield"])
  assert.notEqual(badCase.status, 0)
  assert(badCase.stderr.includes("Unknown case: greenfield"), badCase.stderr)
})

test("a relative workspace is refused", () => {
  const result = runScript(["--repo", REPO_ROOT, "--workspace", "relative/workspace"])
  assert.notEqual(result.status, 0)
  assert(result.stderr.includes("--workspace must be an absolute path"), result.stderr)
})

test("the two inputs may not contain each other", async () => {
  const insideRepo = runScript(["--repo", REPO_ROOT, "--workspace", path.join(REPO_ROOT, ".trial-should-not-exist")])
  assert.notEqual(insideRepo.status, 0)
  assert(insideRepo.stderr.includes("--workspace must be outside the checkout"), insideRepo.stderr)

  const repoInside = runScript(["--repo", path.join(os.tmpdir(), "board-ws-outer", "checkout"), "--workspace", path.join(os.tmpdir(), "board-ws-outer")])
  assert.notEqual(repoInside.status, 0)
  assert(repoInside.stderr.includes("--repo must not be inside --workspace"), repoInside.stderr)
})

test("a non-empty workspace is refused and left untouched", async () => {
  const checkout = await makeCheckout("board-ws-nonempty-repo-")
  const dir = await makeEmptyDir("board-ws-nonempty-")
  try {
    await fs.writeFile(path.join(dir, "keep.txt"), "existing content\n")
    const result = runScript(["--repo", checkout, "--workspace", dir])
    assert.notEqual(result.status, 0)
    assert(result.stderr.includes("must be empty or nonexistent"), result.stderr)
    assert.equal(await fs.readFile(path.join(dir, "keep.txt"), "utf-8"), "existing content\n")
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
    await fs.rm(checkout, { recursive: true, force: true })
  }
})

test("a repo that is not a checkout is refused", async () => {
  const dir = await makeEmptyDir("board-ws-notrepo-")
  try {
    const result = runScript(["--repo", dir, "--workspace", path.join(os.tmpdir(), "board-ws-notrepo-target")])
    assert.notEqual(result.status, 0)
    assert(result.stderr.includes("not a git work tree"), result.stderr)
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

test("a dirty checkout is refused with a remedy, and --allow-dirty records the decision", async () => {
  const checkout = await makeCheckout("board-ws-dirty-", { dirty: true })
  const script = await loadScript()
  try {
    const decision = script.assessRepo(checkout)
    assert.equal(decision.ok, false)
    assert.equal(decision.kind, "dirty")
    assert(decision.remedy.includes("--allow-dirty"), "the refusal must name the escape hatch")

    const allowed = script.assessRepo(checkout, { allowDirty: true })
    assert.equal(allowed.ok, true)
    assert.equal(allowed.dirty, true, "the dirtiness is still recorded, not hidden")
    assert.match(allowed.commit, /^[0-9a-f]{40}$/)

    const viaCli = runScript(["--repo", checkout, "--workspace", path.join(os.tmpdir(), "board-ws-dirty-target")])
    assert.notEqual(viaCli.status, 0)
    assert(viaCli.stderr.includes("--allow-dirty"), viaCli.stderr)
  } finally {
    await fs.rm(checkout, { recursive: true, force: true })
  }
})

test("a clean checkout resolves HEAD, and a bad --pin is refused", async () => {
  const checkout = await makeCheckout("board-ws-clean-")
  const script = await loadScript()
  try {
    const decision = script.assessRepo(checkout)
    assert.equal(decision.ok, true)
    assert.equal(decision.dirty, false)
    assert.match(decision.commit, /^[0-9a-f]{40}$/)
    assert.equal(decision.branch.length > 0, true)

    const pinned = script.assessRepo(checkout, { pin: "HEAD" })
    assert.equal(pinned.ok, true)
    assert.equal(pinned.commit, decision.commit)
    assert.equal(pinned.pinnedByRef, true)

    const bad = script.assessRepo(checkout, { pin: "no-such-ref" })
    assert.equal(bad.ok, false)
    assert.equal(bad.kind, "bad-pin")
  } finally {
    await fs.rm(checkout, { recursive: true, force: true })
  }
})

test("the layout is inferred from the workspace path alone", async () => {
  const script = await loadScript()
  const workspace = path.join(os.tmpdir(), "board-trial")
  const layout = script.layoutFor(workspace)

  assert.equal(layout.workspace, workspace)
  assert.equal(layout.harness, path.join(workspace, ".trial"))
  assert.equal(layout.kickoff, path.join(workspace, ".trial", "kickoff"))
  assert.equal(layout.transcripts, path.join(workspace, ".trial", "transcripts"))
  assert.equal(layout.installedCli, path.join(workspace, ".trial", "global", "bin", process.platform === "win32" ? "synth.cmd" : "synth"))
  assert.equal(layout.testDir("green"), path.join(workspace, "greenfield"))
  assert.equal(layout.testDir("brown"), path.join(workspace, "brownfield"))
  assert.equal(layout.testDir("docs"), path.join(workspace, "documentation"))
  assert.equal(layout.controlRoot, path.join(workspace, ".control"))
  assert.equal(layout.controlDir("green"), path.join(workspace, ".control", "greenfield"))
  assert.equal(layout.controlAllowed, true, "a neutral workspace may host plain mirrors")

  const leaky = script.layoutFor(path.join(os.tmpdir(), "synth-tests"))
  assert.equal(leaky.controlAllowed, false, "a workspace path spelling the tool's name must not host plain mirrors")

  const override = script.layoutFor(workspace, path.join(os.tmpdir(), "synth-elsewhere"))
  assert.equal(override.controlAllowed, false, "a leaky control root is refused too")
  assert.equal(override.controlDir("docs"), path.join(os.tmpdir(), "synth-elsewhere", "documentation"))
})

test("handoff note names are derived once and match the index", async () => {
  const script = await loadScript()
  assert.equal(script.handoffNoteName("guided", "brown"), "guided-brownfield.md")
  assert.equal(script.handoffNoteName("plain", "docs"), "plain-documentation.md")
  assert.throws(() => script.handoffNoteName("guided", "unknown"), /Unknown case/)

  const index = script.renderKickoffIndex({ workspace: "/tmp/board-trial", cases: ["green", "brown", "docs"], controlCreated: true, controlReason: null })
  for (const [condition, caseId] of [["guided", "brown"], ["plain", "docs"]]) {
    assert(index.includes(`\`${script.handoffNoteName(condition, caseId)}\``), `index must name ${condition}-${caseId}`)
  }
})

test("test directory names are spelled out, one isolated environment per test", async () => {
  const script = await loadScript()
  assert.deepEqual(script.TEST_DIRS, {
    green: "greenfield",
    brown: "brownfield",
    docs: "documentation",
    knowledge: "knowledge-led",
    conflict: "conflicting-documents",
  })
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
    assert(text.includes("Required observation per test"), `${condition} set must state the required observation`)
    assert(text.includes("No invented people"), `${condition} set must keep the honesty rule`)
    assert(text.includes("INSTRUCTIONS.md"), `${condition} set must be the file staged as INSTRUCTIONS.md`)
    assert(text.includes("REPORT.md"), `${condition} set must ask for a written report`)
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
})

test("the instruction-set index explains the tests and the handoff", async () => {
  const text = await fs.readFile(SET_INDEX, "utf-8")
  for (const name of ["green", "brown", "docs", "knowledge", "conflict"]) {
    assert(text.includes(`\`${name}\``), `index must name case ${name}`)
  }
  assert(text.includes("INSTRUCTIONS.md"), "index must say the sets are staged as INSTRUCTIONS.md")
  assert(text.includes("test:guided-installed-trial-setup"), "index must point at the consistency guard")
})

test("the guided handoff note points at the staged file and the CLI location", async () => {
  const script = await loadScript()
  const workspace = path.join(os.tmpdir(), "board-trial", "documentation")
  const instructionFile = path.join(workspace, "INSTRUCTIONS.md")
  const bin = path.join(os.tmpdir(), "board-trial", ".trial", "global", "bin", "synth")
  const note = script.renderHandoffNote("guided", { caseId: "docs", testDir: "documentation", workspace, synthBin: bin, instructionFile })

  assert(note.includes(instructionFile), "guided note must point at the staged instruction file")
  assert(note.includes(bin), "guided note must say where the CLI is installed")
  assert(note.includes("`documentation`"), "guided note must name the assigned test directory")
  assert(note.includes("initialization process"), "guided note must name the initialization process, not a command list")
  assert.equal(/first-contact/.test(note), false, "the guided note must not duplicate the process the instruction set owns")
  assert(note.includes("one fresh") === false, "the note is read by the agent, not the operator")
})

test("the plain handoff note never reveals the tool under test", async () => {
  const script = await loadScript()
  const workspace = path.join(os.tmpdir(), "board-trial", ".control", "greenfield")
  const instructionFile = path.join(workspace, "INSTRUCTIONS.md")
  const note = script.renderHandoffNote("plain", { caseId: "green", testDir: "greenfield", workspace, synthBin: "/nowhere/synth", instructionFile })

  assert.equal(TOOL_WORD.test(note), false, "the plain note must not name the tool")
  assert.equal(/first-contact/i.test(note), false, "the plain note must not carry commands")
  assert(note.includes(workspace), "plain note must name the workspace")
  assert(note.includes(instructionFile), "plain note must point at the staged instruction file")
  assert(note.includes("Do not read or write anything outside it"), "plain note must confine the agent")
})

test("the kickoff index maps cells and explains a skipped control", async () => {
  const script = await loadScript()
  const workspace = path.join(os.tmpdir(), "board-trial")
  const withControl = script.renderKickoffIndex({ workspace, cases: ["green", "brown", "docs"], controlCreated: true, controlReason: null })
  assert(withControl.includes("`guided-greenfield.md`"), "index must name the guided notes")
  assert(withControl.includes("`plain-greenfield.md`"), "index must name the plain notes")
  assert.equal(withControl.includes("| `greenfield/` |"), true, "index must map the test directory")
  assert(withControl.includes("one fresh agent session per cell"), "index must state the per-cell session rule")

  const without = script.renderKickoffIndex({
    workspace: path.join(os.tmpdir(), "synth-trial"),
    cases: ["green"],
    controlCreated: false,
    controlReason: "the workspace path spells the tool's name",
  })
  assert(without.includes("not created"), "index must say the plain mirrors were skipped")
  assert(without.includes("spells the tool's name"), "index must say why")
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
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "board-ws-revision-"))
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
  assert(source.includes("renderHandoffNote"), "setup must write one handoff note per cell")
  assert(source.includes("productCommandsRun: ['synth --version']"), "the manifest must record which product command setup ran")
  assert(source.includes("delete-source-clone"), "isolation cleanup must be a recorded step")
  assert(source.includes("plainSetMentionsTool"), "the manifest must record whether the plain set leaked the tool name")
  assert(source.includes("controlAllowed"), "setup must decide rather than assume whether plain mirrors are safe")

  const start = source.indexOf("// #region handoff-note-text")
  const end = source.indexOf("// #endregion handoff-note-text")
  assert(start !== -1 && end > start, "the handoff-note region must be marked")
  const outside = (source.slice(0, start) + source.slice(end)).toLowerCase()
  for (const forbidden of LIFECYCLE_WORDS) {
    assert.equal(outside.includes(forbidden), false, `'${forbidden}' must appear only inside the handoff-note region`)
  }
})
