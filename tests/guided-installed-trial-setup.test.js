// ============================================================
// SYNTH — guided-journey trial setup executor tests
// ============================================================
// These tests cover the setup script's guards, the layout it infers, the staged
// instruction files and the fixture revision constants. They never build or
// install anything: the npm path is exercised by an operator, not by CI. Where a
// test needs the guided path, it uses a pre-staged CLI fixture so the reuse
// branch is exercised without network access.
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

const tempPath = (prefix) => path.join(os.tmpdir(), `${prefix}-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`)

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

const commitOf = (dir) => git(["rev-parse", "HEAD"], dir).stdout.trim()

/**
 * A pre-staged CLI fixture: the state `--stage-only` would leave behind, with a
 * placeholder binary. Used so the guided staging branch runs without building.
 */
async function makeStagedCli({ commit }) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "trial-staged-cli-"))
  for (const dir of ["global/bin", "instructions", "tools/lib", "pack", "transcripts"]) {
    await fs.mkdir(path.join(root, dir), { recursive: true })
  }
  await fs.writeFile(path.join(root, "global", "bin", "synth"), "#!/bin/sh\nexit 0\n")
  for (const source of [GUIDED_SET, PLAIN_SET]) {
    await fs.copyFile(source, path.join(root, "instructions", path.basename(source)))
  }
  await fs.copyFile(path.resolve(REPO_ROOT, "scripts", "guided-installed-trial-fixtures.mjs"), path.join(root, "tools", "guided-installed-trial-fixtures.mjs"))
  await fs.copyFile(LIB, path.join(root, "tools", "lib", "guided-trial-fixtures.mjs"))
  await fs.writeFile(path.join(root, "cli-manifest.json"), `${JSON.stringify({
    status: "cli-staged",
    testedRevision: { commit },
    instructionsDir: path.join(root, "instructions"),
    fixturesTool: path.join(root, "tools", "guided-installed-trial-fixtures.mjs"),
    productCommandsRun: ["synth --version"],
  }, null, 2)}\n`)
  return root
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

test("help documents the single required argument and the inferred rest", () => {
  const result = runScript(["--help"])
  assert.equal(result.status, 0, result.stderr)
  assert(result.stdout.includes("--workspace <TEST_PATH>"), "usage must document TEST_PATH")
  assert(result.stdout.includes("created when missing"), "usage must say TEST_PATH is created when missing")
  assert(result.stdout.includes("inferred from this script's location"), "usage must say the repository is inferred")
  assert(result.stdout.includes("cannot interfere with the run"), "usage must state the staging is outside TEST_PATH")
  assert(result.stdout.includes("Advanced overrides"), "the remaining flags must be presented as advanced")
  assert(result.stdout.includes("never trial evidence"), "usage must not let setup be read as trial evidence")
})

test("TEST_PATH is the only required argument, and --stage-only needs none", async () => {
  const script = await loadScript()

  const noArgs = runScript([])
  assert.notEqual(noArgs.status, 0)
  assert(noArgs.stderr.includes("--workspace is required"), noArgs.stderr)

  const minimal = script.parseArgs(["--workspace", "/tmp/board-tests"])
  assert.equal(minimal.workspace, "/tmp/board-tests")
  assert.equal(minimal.repo, undefined, "the repository must be inferred, not required")
  assert.deepEqual(minimal.cases, ["green", "brown", "docs"])
  assert.equal(minimal.condition, "guided")
  assert.equal(minimal.cliRoot, undefined, "the staging directory must be inferred")

  const stagingOnly = script.parseArgs(["--stage-only"])
  assert.equal(stagingOnly.stageOnly, true)
  assert.equal(stagingOnly.workspace, undefined)
})

test("unknown or valueless flags fail rather than guessing", async () => {
  const unknown = runScript(["--workspace", tempPath("board-ws-unknown"), "--turbo"])
  assert.notEqual(unknown.status, 0)
  assert(unknown.stderr.includes("Unknown argument: --turbo"), unknown.stderr)

  const valueless = runScript(["--workspace"])
  assert.notEqual(valueless.status, 0)
  assert(valueless.stderr.includes("--workspace requires a value"), valueless.stderr)

  const badCase = runScript(["--workspace", tempPath("board-ws-case"), "--cases", "greenfield"])
  assert.notEqual(badCase.status, 0)
  assert(badCase.stderr.includes("Unknown case: greenfield"), badCase.stderr)

  const badCondition = runScript(["--workspace", tempPath("board-ws-cond"), "--condition", "guided-ish"])
  assert.notEqual(badCondition.status, 0)
  assert(badCondition.stderr.includes("--condition must be guided or plain"), badCondition.stderr)

  const script = await loadScript()
  assert.throws(() => script.parseArgs(["--condition", "plain", "--stage-only"]), /does not use/)
})

test("plain refuses a TEST_PATH that would reveal the tool", () => {
  const result = runScript(["--workspace", path.join(os.tmpdir(), "synth-plain-leak"), "--condition", "plain"])
  assert.notEqual(result.status, 0)
  assert(result.stderr.includes("does not spell the tool's name"), result.stderr)
})

test("a relative workspace is refused", () => {
  const result = runScript(["--workspace", "relative/workspace"])
  assert.notEqual(result.status, 0)
  assert(result.stderr.includes("--workspace must be an absolute path"), result.stderr)
})

test("the checkout, TEST_PATH and the staging directory may not contain each other", () => {
  const insideRepo = runScript(["--workspace", path.join(REPO_ROOT, ".trial-should-not-exist")])
  assert.notEqual(insideRepo.status, 0)
  assert(insideRepo.stderr.includes("--workspace must be outside the checkout"), insideRepo.stderr)

  const repoInside = runScript(["--workspace", path.join(os.tmpdir(), "board-ws-outer"), "--repo", path.join(os.tmpdir(), "board-ws-outer", "checkout")])
  assert.notEqual(repoInside.status, 0)
  assert(repoInside.stderr.includes("must not contain the checkout"), repoInside.stderr)

  const workspace = tempPath("board-ws-cli")
  const insideWorkspace = runScript(["--workspace", workspace, "--cli-root", path.join(workspace, "staging")])
  assert.notEqual(insideWorkspace.status, 0)
  assert(insideWorkspace.stderr.includes("staging directory must be outside --workspace"), insideWorkspace.stderr)
})

test("a repo that is not a checkout is refused", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "board-ws-notrepo-"))
  try {
    const result = runScript(["--workspace", tempPath("board-ws-notrepo-target"), "--repo", dir])
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

    const viaCli = runScript(["--workspace", tempPath("board-ws-dirty-target"), "--repo", checkout])
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

test("the staging directory is keyed by revision, neutral, and outside TEST_PATH", async () => {
  const script = await loadScript()
  const commit = "abcdef0123456789".padEnd(40, "0")

  const inferred = script.stagingRootFor(commit)
  assert.equal(inferred, path.join(os.tmpdir(), "trial-staging", "abcdef012345"))
  assert.equal(TOOL_WORD.test(inferred), false, "the staging path must stay neutral")
  assert.equal(inferred.startsWith(os.tmpdir() + path.sep), true, "staging lives in the temp area")

  const other = script.stagingRootFor("ffffffffffffffff".padEnd(40, "0"))
  assert.notEqual(inferred, other, "two revisions must not share a staging directory")

  const override = script.stagingRootFor(commit, { cliRoot: path.join(os.tmpdir(), "trial-cli-manual") })
  assert.equal(override, path.join(os.tmpdir(), "trial-cli-manual"))

  assert.throws(() => script.stagingRootFor(undefined), /needs the revision/)
})

test("the layout puts one directory per test in TEST_PATH and the build outside it", async () => {
  const script = await loadScript()
  const workspace = path.join(os.tmpdir(), "board-tests")
  const staging = path.join(os.tmpdir(), "trial-staging", "abcdef012345")
  const layout = script.layoutFor(workspace, { stagingRoot: staging })

  assert.equal(layout.workspace, workspace)
  assert.equal(layout.rootInstruction, path.join(workspace, "INSTRUCTIONS.md"))
  assert.equal(layout.environmentFile, path.join(workspace, "ENVIRONMENT.md"))
  assert.equal(layout.testDir("green"), path.join(workspace, "greenfield"))
  assert.equal(layout.testDir("brown"), path.join(workspace, "brownfield"))
  assert.equal(layout.testDir("docs"), path.join(workspace, "documentation"))
  assert.equal(layout.testDir("knowledge"), path.join(workspace, "knowledge-led"))
  assert.equal(layout.testDir("conflict"), path.join(workspace, "conflicting-documents"))
  assert.equal(layout.staging.root, staging)
  assert.equal(layout.staging.installedCli, path.join(staging, "global", "bin", process.platform === "win32" ? "synth.cmd" : "synth"))
  assert.equal(layout.staging.manifest, path.join(staging, "cli-manifest.json"))
  assert.equal(layout.staging.root.startsWith(workspace + path.sep), false, "the staging directory must not sit inside TEST_PATH")
})

test("TEST_PATH may be missing, empty, or refused when it already holds something", async () => {
  const script = await loadScript()
  const missing = tempPath("board-state-missing")
  assert.deepEqual(await script.workspaceState(missing), { exists: false, empty: true })

  const empty = await fs.mkdtemp(path.join(os.tmpdir(), "board-state-empty-"))
  assert.deepEqual(await script.workspaceState(empty), { exists: true, empty: true })

  const used = await fs.mkdtemp(path.join(os.tmpdir(), "board-state-used-"))
  await fs.writeFile(path.join(used, "offer.json"), "{}\n")
  assert.deepEqual(await script.workspaceState(used), { exists: true, empty: false })

  await fs.rm(empty, { recursive: true, force: true })
  await fs.rm(used, { recursive: true, force: true })
})

test("a non-empty TEST_PATH is refused before anything is built and left untouched", async () => {
  const checkout = await makeCheckout("board-ws-nonempty-src-")
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "board-ws-nonempty-"))
  const staging = tempPath("board-ws-nonempty-cli")
  try {
    await fs.writeFile(path.join(workspace, "keep.txt"), "existing content\n")
    const result = runScript(["--workspace", workspace, "--repo", checkout, "--condition", "plain", "--cli-root", staging])
    assert.notEqual(result.status, 0)
    assert(result.stderr.includes("is not empty"), result.stderr)
    assert(result.stderr.includes("never merges"), result.stderr)
    assert.equal(await fs.readFile(path.join(workspace, "keep.txt"), "utf-8"), "existing content\n")
    assert.equal(await fs.access(staging).then(() => true, () => false), false, "nothing may be staged for a refused TEST_PATH")
  } finally {
    await fs.rm(checkout, { recursive: true, force: true })
    await fs.rm(workspace, { recursive: true, force: true })
    await fs.rm(staging, { recursive: true, force: true })
  }
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

test("the guided run creates TEST_PATH from a staged CLI without building anything", async () => {
  const checkout = await makeCheckout("board-guided-src-")
  const staged = await makeStagedCli({ commit: commitOf(checkout) })
  const workspace = tempPath("board-guided-ws")
  try {
    const result = runScript(["--workspace", workspace, "--repo", checkout, "--cli-root", staged])
    assert.equal(result.status, 0, result.stderr)
    assert(result.stdout.includes("reused a CLI staged earlier for this revision"), result.stdout)
    assert(result.stdout.includes(`"${"Read INSTRUCTIONS.md in the root of this workspace and follow it."}"`), "the banner must print the launch line")

    assert.deepEqual((await fs.readdir(workspace)).sort(), ["ENVIRONMENT.md", "INSTRUCTIONS.md", "brownfield", "documentation", "greenfield"])
    const instruction = await fs.readFile(path.join(workspace, "INSTRUCTIONS.md"), "utf-8")
    assert.equal(instruction, await fs.readFile(GUIDED_SET, "utf-8"), "the guided instruction file is staged verbatim")
    const environment = await fs.readFile(path.join(workspace, "ENVIRONMENT.md"), "utf-8")
    assert(environment.includes(path.join(staged, "global", "bin", process.platform === "win32" ? "synth.cmd" : "synth")), "the environment note must give the CLI path")
    assert.deepEqual((await fs.readdir(path.join(workspace, "greenfield"))).length, 0, "greenfield starts empty")
    assert.deepEqual((await fs.readdir(path.join(workspace, "documentation"))).sort(), ["docs"])
    assert.deepEqual((await fs.readdir(path.join(workspace, "brownfield"))).sort(), ["docs", "package.json", "src", "tests"])

    const manifest = JSON.parse(await fs.readFile(path.join(staged, "transcripts", "setup-manifest.json"), "utf-8"))
    assert.equal(manifest.condition, "guided")
    assert.equal(manifest.status, "setup-complete-stop-before-agent")
    assert.equal(manifest.stagingReused, true)
    assert.deepEqual(manifest.buildArtifactsInsideTestPath, [])
    assert.deepEqual(manifest.trialTestsRun, 0)
    assert.deepEqual(manifest.lifecycleCommandsRun, [])
  } finally {
    await fs.rm(checkout, { recursive: true, force: true })
    await fs.rm(staged, { recursive: true, force: true })
    await fs.rm(workspace, { recursive: true, force: true })
  }
})

test("the plain run builds nothing, leaks nothing, and writes nothing outside TEST_PATH", async () => {
  const checkout = await makeCheckout("board-plain-src-")
  const staging = tempPath("board-plain-staging")
  const workspace = tempPath("board-plain-ws")
  try {
    const copies = [
      "docs/plans/guided-trial/instructions/guided.md",
      "docs/plans/guided-trial/instructions/plain.md",
      "docs/plans/guided-trial/README.md",
      "scripts/guided-installed-trial-fixtures.mjs",
      "scripts/lib/guided-trial-fixtures.mjs",
    ]
    for (const relative of copies) {
      const target = path.join(checkout, relative)
      await fs.mkdir(path.dirname(target), { recursive: true })
      await fs.copyFile(path.join(REPO_ROOT, relative), target)
    }
    git(["add", "."], checkout)
    git(["commit", "-q", "-m", "trial sources"], checkout)

    const result = runScript(["--workspace", workspace, "--repo", checkout, "--condition", "plain", "--cli-root", staging])
    assert.equal(result.status, 0, result.stderr)
    assert(result.stdout.includes("runs no product command at all"), "the banner must say nothing was built")
    assert.equal(result.stdout.includes("installed CLI"), false, "the plain run must not claim an installed CLI")
    assert.equal(/npm-ci|npm run build/.test(result.stdout), false, "no build may run for the plain condition")
    assert(result.stdout.includes("none — the plain condition writes nothing outside TEST_PATH"), result.stdout)

    assert.deepEqual((await fs.readdir(workspace)).sort(), ["INSTRUCTIONS.md", "brownfield", "documentation", "greenfield"])
    const instruction = await fs.readFile(path.join(workspace, "INSTRUCTIONS.md"), "utf-8")
    assert.equal(TOOL_WORD.test(instruction), false, "the plain root instruction must not name the tool")
    assert.equal(/first-contact/.test(instruction), false, "the plain root instruction must not carry guided commands")
    assert.equal(await fs.access(path.join(workspace, "ENVIRONMENT.md")).then(() => true, () => false), false, "no generated environment note in a plain run")
    assert.deepEqual((await fs.readdir(path.join(workspace, "brownfield"))).sort(), ["docs", "package.json", "src", "tests"])
    assert.equal(await fs.access(staging).then(() => true, () => false), false, "the plain condition stages nothing, not even outside TEST_PATH")
  } finally {
    await fs.rm(checkout, { recursive: true, force: true })
    await fs.rm(workspace, { recursive: true, force: true })
    await fs.rm(staging, { recursive: true, force: true })
  }
})

test("the repository is inferred from the script's own location when --repo is omitted", async (t) => {
  const script = await loadScript()
  const assessment = script.assessRepo(REPO_ROOT)
  if (!assessment.ok) return t.skip(`checkout not usable here: ${assessment.reason}`)

  const workspace = tempPath("board-inferred-ws")
  const staging = tempPath("board-inferred-staging")
  try {
    const result = runScript(["--workspace", workspace, "--condition", "plain", "--cli-root", staging])
    assert.equal(result.status, 0, result.stderr)
    assert(result.stdout.includes(assessment.commit), "the inferred revision must be this checkout's HEAD")
    assert.deepEqual((await fs.readdir(workspace)).sort(), ["INSTRUCTIONS.md", "brownfield", "documentation", "greenfield"])
  } finally {
    await fs.rm(workspace, { recursive: true, force: true })
    await fs.rm(staging, { recursive: true, force: true })
  }
})

test("the environment note records paths and build identity, never process", async () => {
  const script = await loadScript()
  const note = script.renderEnvironment({
    workspace: "/tmp/board-tests",
    testDirs: ["greenfield", "brownfield", "documentation"],
    stagingRoot: "/tmp/trial-staging/abcdef012345",
    installedCli: "/tmp/trial-staging/abcdef012345/global/bin/synth",
    manifestPath: "/tmp/trial-staging/abcdef012345/cli-manifest.json",
    revision: { commit: "c".repeat(40), subject: "abc1234 example" },
  })
  assert(note.includes("/tmp/trial-staging/abcdef012345/global/bin/synth"), "the note must say where the CLI is")
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
  assert(text.includes("--workspace"), "index must show the single-argument command")
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
  assert(source.includes("shouldReuseCli"), "setup must reuse a CLI staged for this revision instead of rebuilding")
  assert.equal(/first-contact/.test(source), false, "no product workflow command may appear in the setup script at all")
  assert.equal(/npm run (?!build|pack)/.test(source), false, "setup may only run npm build and npm pack")
})
