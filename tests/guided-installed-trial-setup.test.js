// ============================================================
// SYNTH — guided-journey trial setup executor tests
// ============================================================
// These tests cover the setup script's guards, the layout it infers, the staged
// instruction files and the fixture revision constants. They never clone,
// build, install or run a trial cell: the npm path is exercised by an operator,
// not by CI. Every case below is refused before the script can touch the network.
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

/**
 * Case-id → task text as quoted in an instruction file's test table. The table
 * has Test / Case id / Directory / Task text columns, so parse by cells rather
 * than by column position.
 */
function taskTable(text) {
  const rows = {}
  for (const line of text.split("\n")) {
    if (!line.startsWith("|")) continue
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim())
    const caseCell = cells.find((cell) => /^`(green|brown|docs|knowledge|conflict)`$/.test(cell))
    const taskCell = cells.find((cell) => /^".*"$/.test(cell))
    if (caseCell && taskCell) rows[caseCell.slice(1, -1)] = taskCell.slice(1, -1)
  }
  return rows
}

test("help states the two inputs, the staging split and that setup stops before the agent", () => {
  const result = runScript(["--help"])
  assert.equal(result.status, 0, result.stderr)
  assert(result.stdout.includes("--repo <path>"), "usage must document the checkout input")
  assert(result.stdout.includes("--workspace <dir>"), "usage must document the TEST_PATH input")
  assert(result.stdout.includes("--stage-only"), "usage must document the beforehand staging step")
  assert(result.stdout.includes("never interfere with the test run"), "usage must state the build lives outside TEST_PATH")
  assert(result.stdout.includes("told to follow the instruction file in its root"), "usage must describe how the agent starts")
})

test("workspace and, for staging, a repo or cli root are required", () => {
  const noWorkspace = runScript(["--repo", REPO_ROOT])
  assert.notEqual(noWorkspace.status, 0)
  assert(noWorkspace.stderr.includes("--workspace is required"), noWorkspace.stderr)

  const stageOnlyNoTarget = runScript(["--repo", REPO_ROOT, "--stage-only"])
  assert.notEqual(stageOnlyNoTarget.status, 0)
  assert(stageOnlyNoTarget.stderr.includes("--stage-only needs --workspace"), stageOnlyNoTarget.stderr)

  const missingStaging = runScript(["--workspace", path.join(os.tmpdir(), "board-ws-no-staging")])
  assert.notEqual(missingStaging.status, 0)
  assert(missingStaging.stderr.includes("no staged CLI"), missingStaging.stderr)
})

test("unknown or valueless flags fail rather than guessing", () => {
  const unknown = runScript(["--workspace", path.join(os.tmpdir(), "board-ws-unknown"), "--turbo"])
  assert.notEqual(unknown.status, 0)
  assert(unknown.stderr.includes("Unknown argument: --turbo"), unknown.stderr)

  const valueless = runScript(["--workspace"])
  assert.notEqual(valueless.status, 0)
  assert(valueless.stderr.includes("--workspace requires a value"), valueless.stderr)

  const badCase = runScript(["--workspace", path.join(os.tmpdir(), "board-ws-case"), "--cases", "greenfield"])
  assert.notEqual(badCase.status, 0)
  assert(badCase.stderr.includes("Unknown case: greenfield"), badCase.stderr)

  const badCondition = runScript(["--workspace", path.join(os.tmpdir(), "board-ws-cond"), "--condition", "guided-ish"])
  assert.notEqual(badCondition.status, 0)
  assert(badCondition.stderr.includes("--condition must be guided or plain"), badCondition.stderr)
})

test("plain refuses a TEST_PATH that would reveal the tool, and refuses --stage-only", () => {
  const leaky = runScript(["--workspace", path.join(os.tmpdir(), "synth-plain-leak"), "--condition", "plain"])
  assert.notEqual(leaky.status, 0)
  assert(leaky.stderr.includes("does not spell the tool's name"), leaky.stderr)

  const staging = runScript(["--repo", REPO_ROOT, "--workspace", path.join(os.tmpdir(), "board-plain-stage"), "--condition", "plain", "--stage-only"])
  assert.notEqual(staging.status, 0)
  assert(staging.stderr.includes("does not use"), staging.stderr)
})

test("the plain condition is staged from a checkout without building anything", async () => {
  // A fake checkout carrying only the files the plain staging path reads: the
  // instruction sets, the index and the fixture generator with its library.
  const checkout = await makeCheckout("board-plain-src-")
  const workspace = path.join(os.tmpdir(), `board-plain-${process.pid}-${Date.now()}`)
  try {
    const copies = [
      ["docs/plans/guided-trial/instructions/guided.md", "docs/plans/guided-trial/instructions/guided.md"],
      ["docs/plans/guided-trial/instructions/plain.md", "docs/plans/guided-trial/instructions/plain.md"],
      ["docs/plans/guided-trial/README.md", "docs/plans/guided-trial/README.md"],
      ["scripts/guided-installed-trial-fixtures.mjs", "scripts/guided-installed-trial-fixtures.mjs"],
      ["scripts/lib/guided-trial-fixtures.mjs", "scripts/lib/guided-trial-fixtures.mjs"],
    ]
    for (const [from, to] of copies) {
      const target = path.join(checkout, to)
      await fs.mkdir(path.dirname(target), { recursive: true })
      await fs.copyFile(path.join(REPO_ROOT, from), target)
    }
    git(["add", "."], checkout)
    git(["commit", "-q", "-m", "trial sources"], checkout)

    const result = runScript(["--repo", checkout, "--workspace", workspace, "--condition", "plain"])
    assert.equal(result.status, 0, result.stderr)
    assert(result.stdout.includes("does not run the tool"), "the banner must say the plain run builds nothing")
    assert.equal(/npm-ci|npm run build/.test(result.stdout), false, "no build may run for the plain condition")
    assert.equal(result.stdout.includes("installed CLI"), false, "the plain run must not claim an installed CLI")
    assert(result.stdout.includes("runs no product command at all"), "the plain banner must say nothing was built")

    const entries = (await fs.readdir(workspace)).sort()
    assert.deepEqual(entries, ["INSTRUCTIONS.md", "brownfield", "documentation", "greenfield"])
    const instruction = await fs.readFile(path.join(workspace, "INSTRUCTIONS.md"), "utf-8")
    assert.equal(TOOL_WORD.test(instruction), false, "the plain root instruction must not name the tool")
    assert.equal(/first-contact/.test(instruction), false, "the plain root instruction must not carry guided commands")
    assert.deepEqual((await fs.readdir(path.join(workspace, "greenfield"))).length, 0, "greenfield starts empty")
    assert.deepEqual((await fs.readdir(path.join(workspace, "documentation"))).sort(), ["docs"])
    assert.deepEqual((await fs.readdir(path.join(workspace, "brownfield"))).sort(), ["docs", "package.json", "src", "tests"])
    assert.equal(await fs.access(path.join(workspace, "ENVIRONMENT.md")).then(() => true, () => false), false, "no generated environment note in a plain run")

    const manifest = JSON.parse(await fs.readFile(path.join(`${workspace}-cli`, "transcripts", "setup-manifest.json"), "utf-8"))
    assert.equal(manifest.condition, "plain")
    assert.equal(manifest.installedCli, null)
    assert.equal(manifest.cliStagingUsed, false)
    assert.deepEqual(manifest.productCommandsRun, ["synth --version"])
  } finally {
    await fs.rm(checkout, { recursive: true, force: true })
    await fs.rm(workspace, { recursive: true, force: true })
    await fs.rm(`${workspace}-cli`, { recursive: true, force: true })
  }
})

test("a relative workspace is refused", () => {
  const result = runScript(["--workspace", "relative/workspace"])
  assert.notEqual(result.status, 0)
  assert(result.stderr.includes("--workspace must be an absolute path"), result.stderr)
})

test("the checkout, TEST_PATH and the CLI staging directory may not contain each other", () => {
  const insideRepo = runScript(["--repo", REPO_ROOT, "--workspace", path.join(REPO_ROOT, ".trial-should-not-exist")])
  assert.notEqual(insideRepo.status, 0)
  assert(insideRepo.stderr.includes("--workspace must be outside the checkout"), insideRepo.stderr)

  const repoInside = runScript(["--repo", path.join(os.tmpdir(), "board-ws-outer", "checkout"), "--workspace", path.join(os.tmpdir(), "board-ws-outer")])
  assert.notEqual(repoInside.status, 0)
  assert(repoInside.stderr.includes("--repo must not be inside --workspace"), repoInside.stderr)

  const cliInside = runScript(["--workspace", path.join(os.tmpdir(), "board-ws-cli"), "--cli-root", path.join(os.tmpdir(), "board-ws-cli", "harness")])
  assert.notEqual(cliInside.status, 0)
  assert(cliInside.stderr.includes("--cli-root must be outside --workspace"), cliInside.stderr)
})

test("a repo that is not a checkout is refused", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "board-ws-notrepo-"))
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

test("the layout keeps the build out of TEST_PATH and puts one directory per test in it", async () => {
  const script = await loadScript()
  const workspace = path.join(os.tmpdir(), "board-tests")
  const layout = script.layoutFor(workspace)

  assert.equal(layout.workspace, workspace)
  assert.equal(layout.cliRoot, `${workspace}-cli`, "the CLI staging directory is inferred next to TEST_PATH")
  assert.equal(layout.cliRoot.startsWith(workspace + path.sep), false, "staging must not live inside TEST_PATH")
  assert.equal(layout.rootInstruction, path.join(workspace, "INSTRUCTIONS.md"))
  assert.equal(layout.environmentFile, path.join(workspace, "ENVIRONMENT.md"))
  assert.equal(layout.testDir("green"), path.join(workspace, "greenfield"))
  assert.equal(layout.testDir("brown"), path.join(workspace, "brownfield"))
  assert.equal(layout.testDir("docs"), path.join(workspace, "documentation"))
  assert.equal(layout.cli.installedCli, path.join(layout.cliRoot, "global", "bin", process.platform === "win32" ? "synth.cmd" : "synth"))
  assert.equal(layout.cli.transcripts, path.join(layout.cliRoot, "transcripts"))
  assert.equal(layout.cli.manifest, path.join(layout.cliRoot, "cli-manifest.json"))

  const override = script.layoutFor(workspace, { cliRoot: path.join(os.tmpdir(), "board-harness") })
  assert.equal(override.cliRoot, path.join(os.tmpdir(), "board-harness"))
  assert.equal(override.testDir("docs"), path.join(workspace, "documentation"))
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

test("a staged CLI is reused only for the same revision and only when it is present", async () => {
  const script = await loadScript()
  const manifest = { testedRevision: { commit: "a".repeat(40) } }
  const assessment = { commit: "a".repeat(40) }

  assert.equal(script.shouldReuseCli(manifest, assessment, { installedCliExists: true }).reuse, true)
  assert.equal(script.shouldReuseCli(manifest, assessment, { installedCliExists: true, refresh: true }).reuse, false)
  assert.equal(script.shouldReuseCli(manifest, assessment, { installedCliExists: false }).reuse, false)
  assert.equal(script.shouldReuseCli(manifest, { commit: "b".repeat(40) }, { installedCliExists: true }).reuse, false)
  assert.equal(script.shouldReuseCli(null, assessment, { installedCliExists: true }).reuse, false)
})

test("the environment note records paths and build identity, never process", async () => {
  const script = await loadScript()
  const note = script.renderEnvironment({
    workspace: "/tmp/board-tests",
    testDirs: ["greenfield", "brownfield", "documentation"],
    cliRoot: "/tmp/board-tests-cli",
    installedCli: "/tmp/board-tests-cli/global/bin/synth",
    manifestPath: "/tmp/board-tests-cli/transcripts/setup-manifest.json",
    revision: { commit: "c".repeat(40), subject: "abc1234 example" },
  })
  assert(note.includes("/tmp/board-tests-cli/global/bin/synth"), "the note must say where the CLI is")
  assert(note.includes("greenfield/"), "the note must list the test directories")
  assert(note.includes("c".repeat(40)), "the note must record the revision")
  assert.equal(/first-contact/.test(note), false, "the note must not carry the process")
  assert(note.includes("do not edit"), "the note must say it is generated")
})

test("the launch instruction is one line naming the root instruction file", async () => {
  const script = await loadScript()
  const line = script.launchInstruction()
  assert.equal(line, "Read INSTRUCTIONS.md in the root of this workspace and follow it.")
  assert.equal(line.includes("\n"), false)
})

test("both instruction files list every test with the task text used for hashing", async () => {
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
    assert(text.includes("INSTRUCTIONS.md"), `${condition} set must be the file staged in the root`)
    assert(text.includes("REPORT.md"), `${condition} set must ask for a written report`)
    assert(text.includes("one at a time"), `${condition} set must run the tests one at a time`)
    assert(text.includes("`brownfield/`"), `${condition} set must name the brownfield directory`)
  }
  assert(sets.guided.includes("awaiting-response"), "guided set must require the offer to stay unanswered")
})

test("the guided instruction file begins with the SYNTH initialization process", async () => {
  const text = await fs.readFile(GUIDED_SET, "utf-8")
  const dryRun = text.indexOf("first-contact --dry-run")
  const start = text.indexOf("first-contact start")
  const clarify = text.indexOf("first-contact clarify --source-offer offer.json")
  assert(dryRun !== -1 && start !== -1 && clarify !== -1, "guided set must carry the initialization process")
  assert(dryRun < start && start < clarify, "guided set must order dry-run, start, then the offer")
  assert(text.includes("do not substitute another script"), "guided set must forbid substituting another script for the CLI process")
  assert(text.includes("follow the CLI"), "guided set must make the CLI authoritative over the document")
  assert(text.includes("ENVIRONMENT.md"), "guided set must point at the generated environment note")
  assert(text.includes("Do **not** pass `--selection` or `--human-response`"), "guided set must forbid invented responses")
  assert(text.includes("do not run `first-contact materialize`"), "guided set must forbid lifecycle actions")
  assert(text.includes("Do not push anywhere"), "guided set must forbid publishing")
  assert(text.includes("cd <test directory>"), "guided set must start each test inside its own directory")
})

test("the plain instruction file never names the tool or its commands", async () => {
  const text = await fs.readFile(PLAIN_SET, "utf-8")
  assert.equal(TOOL_WORD.test(text), false, "the plain set must not reveal the tool under test")
  assert.equal(/first-contact/i.test(text), false, "the plain set must not carry the guided commands")
  assert.equal(/ENVIRONMENT\.md/.test(text), false, "the plain workspace has no generated environment note")
  assert(text.includes("There is no required first command"), "the plain set must leave the process to the agent")
  assert(text.includes("offer.json"), "plain set must still ask for a reviewable proposal")
})

test("the instruction-set index explains the layout and the launch", async () => {
  const text = await fs.readFile(SET_INDEX, "utf-8")
  for (const name of ["green", "brown", "docs", "knowledge", "conflict"]) {
    assert(text.includes(`\`${name}\``), `index must name case ${name}`)
  }
  assert(text.includes("INSTRUCTIONS.md"), "index must say the instruction file is staged in the root")
  assert(text.includes("TEST_PATH"), "index must describe TEST_PATH")
  assert(text.includes("test:guided-installed-trial-setup"), "index must point at the consistency guard")
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

test("the script runs no product command other than --version and stages no build output in TEST_PATH", async () => {
  const source = await fs.readFile(SCRIPT, "utf-8")
  assert(source.includes("productCommandsRun: ['synth --version']"), "the manifest must record which product command setup ran")
  assert(source.includes("buildArtifactsInsideTestPath: []"), "the manifest must state that no build output lands in TEST_PATH")
  assert(source.includes("delete-source-clone"), "isolation cleanup must be a recorded step")
  assert(source.includes("shouldReuseCli"), "setup must reuse a CLI staged beforehand instead of rebuilding")
  assert.equal(/first-contact/.test(source), false, "no product workflow command may appear in the setup script at all")
  assert.equal(/npm run (?!build|pack)/.test(source), false, "setup may only run npm build and npm pack")
})
