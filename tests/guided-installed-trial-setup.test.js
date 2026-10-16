// ============================================================
// SYNTH — guided-journey trial setup executor tests
// ============================================================
// These tests cover the setup script's guards, the layout it infers, the staged
// instruction files and the fixture revision constants. The guided path really runs
// npm build, npm pack and npm install against a throwaway checkout that contains a
// tiny packable package, so the code path an operator exercises is the one tested.
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

/**
 * The trial files a temp checkout needs, plus a tiny packable package whose
 * `bin` is a stand-in for the CLI. The guided run then builds, packs and installs
 * this package for real, without dependencies and without network access.
 */
async function seedCheckout(checkout) {
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
  await fs.writeFile(path.join(checkout, "package.json"), `${JSON.stringify({
    name: "trial-fixture-cli",
    version: "9.9.9",
    private: true,
    bin: { synth: "bin/synth.js" },
    scripts: { build: "node -e \"require('fs').mkdirSync('dist',{recursive:true})\"" },
  }, null, 2)}\n`)
  await fs.mkdir(path.join(checkout, "bin"), { recursive: true })
  await fs.writeFile(path.join(checkout, "bin", "synth.js"),
    '#!/usr/bin/env node\nconsole.log(JSON.stringify({ status: "ok", version: "9.9.9", name: "synth", schema: "synth-cli-v1" }))\n')
  git(["add", "."], checkout)
  git(["commit", "-q", "-m", "trial sources"], checkout)
}

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

test("TEST_PATH is the only required argument and nothing else has to be passed", async () => {
  const script = await loadScript()

  const noArgs = runScript([])
  assert.notEqual(noArgs.status, 0)
  assert(noArgs.stderr.includes("--workspace is required"), noArgs.stderr)

  const minimal = script.parseArgs(["--workspace", "/tmp/board-tests"])
  assert.equal(minimal.workspace, "/tmp/board-tests")
  assert.equal(minimal.repo, undefined, "the repository must be inferred, not required")
  assert.deepEqual(minimal.cases, ["green", "brown", "docs"])
  assert.equal(minimal.condition, "guided")
  assert.equal(minimal.cliRoot, undefined, "the scratch directory must be inferred")

  const manual = script.parseArgs(["--workspace", "/tmp/board-tests", "--condition", "plain", "--cases", "green,conflict"])
  assert.equal(manual.condition, "plain")
  assert.deepEqual(manual.cases, ["green", "conflict"], "cases keep the canonical order")
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

  // The two-step shape is gone: there is no stage-only mode and no dirty escape hatch.
  const stageOnly = runScript(["--stage-only"])
  assert.notEqual(stageOnly.status, 0)
  assert(stageOnly.stderr.includes("Unknown argument: --stage-only"), stageOnly.stderr)

  const dirty = runScript(["--workspace", tempPath("board-ws-flag"), "--allow-dirty"])
  assert.notEqual(dirty.status, 0)
  assert(dirty.stderr.includes("Unknown argument: --allow-dirty"), dirty.stderr)
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

test("the checkout, TEST_PATH and the staging directory may not contain each other", async () => {
  const insideRepo = runScript(["--workspace", path.join(REPO_ROOT, ".trial-should-not-exist")])
  assert.notEqual(insideRepo.status, 0)
  assert(insideRepo.stderr.includes("--workspace must be outside the checkout"), insideRepo.stderr)
  assert.equal(await fs.access(path.join(REPO_ROOT, ".trial-should-not-exist")).then(() => true, () => false), false, "a refused workspace is not created")

  const workspace = tempPath("board-ws-cli")
  const insideWorkspace = runScript(["--workspace", workspace, "--cli-root", path.join(workspace, "staging")])
  assert.notEqual(insideWorkspace.status, 0)
  assert(insideWorkspace.stderr.includes("may not contain each other"), insideWorkspace.stderr)

  const containingWorkspace = runScript(["--workspace", path.join(os.tmpdir(), "board-ws-outer"), "--cli-root", os.tmpdir()])
  assert.notEqual(containingWorkspace.status, 0)
  assert(containingWorkspace.stderr.includes("may not contain each other"), containingWorkspace.stderr)
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

test("uncommitted changes are recorded, not refused: the tarball digest pins the build", async () => {
  const checkout = await makeCheckout("board-ws-dirty-", { dirty: true })
  const script = await loadScript()
  try {
    const decision = script.assessRepo(checkout)
    assert.equal(decision.ok, true, "a dirty checkout is usable: the build is what it is, and it is recorded")
    assert.equal(decision.workingTreeDirty, true)
    assert.match(decision.commit, /^[0-9a-f]{40}$/)

    const clean = script.assessRepo(checkout)
    assert.equal(clean.workingTreeDirty, true, "the flag must reflect the working tree")
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
    assert.equal(decision.workingTreeDirty, false)
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

test("Windows shims run through cmd.exe with a quoted command line, other tools directly", async () => {
  const script = await loadScript()

  // Node refuses to start a .cmd/.bat through CreateProcess since its 2024 fix, and
  // its shell option concatenates unescaped arguments (DEP0190), so setup builds the
  // command line itself and hands it to cmd.exe verbatim.
  const win = script.spawnPlan("npm.cmd", ["run", "build"], { encoding: "utf-8" }, "win32")
  assert.match(win.command, /cmd\.exe$/i, "the command runs through cmd.exe")
  assert.deepEqual(win.args.slice(0, 3), ["/d", "/s", "/c"])
  assert.equal(win.args.at(-1), '"npm.cmd run build"', "the shim and its arguments form one quoted command line")
  assert.equal(win.options.windowsVerbatimArguments, true, "the command line is handed over as written")
  assert.equal(win.options.shell, undefined, "the shell option would warn and escape nothing")
  assert.equal(win.options.encoding, "utf-8", "the caller's options are preserved")

  const spaced = script.spawnPlan("C:\\Program Files\\nodejs\\npm.cmd", ["pack", "--pack-destination", "C:\\Users\\John Doe\\AppData\\Local\\Temp\\pack"], {}, "win32")
  assert(spaced.args.at(-1).includes('"C:\\Program Files\\nodejs\\npm.cmd" pack'), "a path with a space is quoted for cmd.exe")
  assert(spaced.args.at(-1).includes('--pack-destination "C:\\Users\\John Doe\\AppData\\Local\\Temp\\pack"'), "an argument with a space is quoted too")

  const installed = script.spawnPlan("C:\\Users\\j\\AppData\\Local\\Temp\\trial-staging\\abc\\global\\synth.cmd", ["--version"], {}, "win32")
  assert(installed.args.at(-1).includes("synth.cmd --version"), "the installed CLI is a .cmd shim as well")

  assert.equal(script.spawnPlan("git", ["-C", "/repo", "status"], {}, "win32").options.shell, undefined, "git.exe is not a shim")
  assert.equal(script.spawnPlan("git", ["-C", "/repo", "status"], {}, "win32").command, "git", "a real executable is spawned directly")
  assert.equal(script.spawnPlan("npm", ["run", "build"], {}, "linux").options.shell, undefined, "POSIX npm is a real executable")
  assert.equal(script.spawnPlan("npm", ["run", "build"], {}, "linux").command, "npm")
})

test("a spawn that produces no exit code says why instead of printing null", async () => {
  const script = await loadScript()
  assert.equal(script.failureDetail({ status: null, error: { code: "EINVAL" } }), " (EINVAL)")
  assert.equal(script.failureDetail({ status: null, error: new Error("boom") }), " (boom)")
  assert.equal(script.failureDetail({ status: null, signal: "SIGTERM" }), " (killed by SIGTERM)")
  assert.equal(script.failureDetail({ status: 1 }), "", "a normal non-zero exit needs no extra detail")
  assert.equal(script.failureDetail({ status: 0 }), "")
})

test("the installed binary is discovered where this platform puts it", async () => {
  const script = await loadScript()
  const prefix = await fs.mkdtemp(path.join(os.tmpdir(), "trial-prefix-"))
  try {
    assert.equal(await script.resolveInstalledCli(prefix), null, "no binary means no path, not a guess")

    const binDir = process.platform === "win32" ? prefix : path.join(prefix, "bin")
    await fs.mkdir(binDir, { recursive: true })
    const bin = path.join(binDir, process.platform === "win32" ? "synth.cmd" : "synth")
    await fs.writeFile(bin, "")
    assert.equal(await script.resolveInstalledCli(prefix), bin, "the binary npm creates is the one found")
    assert(script.installedCliCandidates(prefix).includes(bin), "the platform's bin directory is searched")
  } finally {
    await fs.rm(prefix, { recursive: true, force: true })
  }
})

test("the guided run builds, packs and installs from the checkout, then creates TEST_PATH", async () => {
  const checkout = await makeCheckout("board-guided-src-")
  await seedCheckout(checkout)
  const staging = tempPath("board-guided-cli")
  const workspace = tempPath("board-guided-ws")
  try {
    const result = runScript(["--workspace", workspace, "--repo", checkout, "--cli-root", staging])
    assert.equal(result.status, 0, result.stderr)
    assert(result.stdout.includes("This trial uses SYNTH, the CLI installed on this machine as `synth`."), "the guided banner must print a launch line that names the tool")
    assert(result.stdout.includes("in the root of this workspace and follow it"), "the banner must print the launch line")
    assert(result.stdout.includes("the checkout this script lives in (no clone)"), "the banner must say the build was in place")

    // The build ran in the checkout, packed into the scratch directory and installed there.
    assert.deepEqual(await fs.readdir(path.join(checkout, "dist")), [], "the build ran in the checkout")
    const packNames = (await fs.readdir(path.join(staging, "pack"))).filter((name) => name.endsWith(".tgz"))
    assert.equal(packNames.length, 1, "exactly one tarball is packed")
    assert.equal(packNames[0].includes(".tgz"), true)

    assert.deepEqual((await fs.readdir(workspace)).sort(), ["ENVIRONMENT.md", "INSTRUCTIONS.md", "brownfield", "documentation", "greenfield"])
    const instruction = await fs.readFile(path.join(workspace, "INSTRUCTIONS.md"), "utf-8")
    assert.equal(instruction, await fs.readFile(GUIDED_SET, "utf-8"), "the guided instruction file is staged verbatim")

    const manifest = JSON.parse(await fs.readFile(path.join(staging, "transcripts", "setup-manifest.json"), "utf-8"))
    assert.equal(manifest.condition, "guided")
    assert.equal(manifest.status, "setup-complete-stop-before-agent")
    assert.equal(manifest.cloneUsed, false, "no clone may be involved")
    assert.equal(manifest.builtFrom, checkout)
    assert.equal(manifest.installedCli.version.version, "9.9.9", "the installed CLI answered --version")
    assert.match(manifest.installedCli.tarballSha256, /^[0-9a-f]{64}$/)
    const environment = await fs.readFile(path.join(workspace, "ENVIRONMENT.md"), "utf-8")
    assert(environment.includes(manifest.installedCli.bin), "the environment note must give the installed CLI path")
    assert.deepEqual((await fs.readdir(path.join(workspace, "greenfield"))).length, 0, "greenfield starts empty")
    assert.deepEqual((await fs.readdir(path.join(workspace, "documentation"))).sort(), ["docs"])
    assert.deepEqual((await fs.readdir(path.join(workspace, "brownfield"))).sort(), ["docs", "package.json", "src", "tests"])
    assert.deepEqual(manifest.buildArtifactsInsideTestPath, [])
    assert.deepEqual(manifest.trialTestsRun, 0)
    assert.deepEqual(manifest.lifecycleCommandsRun, [])
    assert.equal(await fs.access(path.join(workspace, "node_modules")).then(() => true, () => false), false, "no build output may land in TEST_PATH")
  } finally {
    await fs.rm(checkout, { recursive: true, force: true })
    await fs.rm(staging, { recursive: true, force: true })
    await fs.rm(workspace, { recursive: true, force: true })
  }
})

test("the plain run builds nothing, leaks nothing, and writes nothing outside TEST_PATH", async () => {
  const checkout = await makeCheckout("board-plain-src-")
  const staging = tempPath("board-plain-staging")
  const workspace = tempPath("board-plain-ws")
  try {
    await seedCheckout(checkout)

    const result = runScript(["--workspace", workspace, "--repo", checkout, "--condition", "plain", "--cli-root", staging])
    assert.equal(result.status, 0, result.stderr)
    assert(result.stdout.includes("builds nothing at all"), "the banner must say nothing was built")
    assert.equal(result.stdout.includes("installed CLI"), false, "the plain run must not claim an installed CLI")
    assert.equal(/npm-install|npm run build|npm pack/.test(result.stdout), false, "no build may run for the plain condition")
    assert.equal(await fs.access(path.join(checkout, "dist")).then(() => true, () => false), false, "the plain condition must not build the checkout")
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

test("the launch instruction names the tool in guided and nothing in plain", async () => {
  const script = await loadScript()
  const guided = script.launchInstruction("guided")
  const plain = script.launchInstruction("plain")
  assert.equal(guided.includes("\n"), false, "the launch line must stay one line")
  assert.equal(plain.includes("\n"), false, "the launch line must stay one line")

  // An agent has no ambient way to learn the tool exists, so the guided line must say it.
  assert(/SYNTH/.test(guided), "the guided line must name SYNTH explicitly")
  assert(/`synth`/.test(guided), "the guided line must give the installed command name")
  assert(/first-contact --dry-run/.test(guided), "the guided line must carry the first command")
  assert(guided.includes("INSTRUCTIONS.md"), "the guided line must still point at the instruction file")
  assert.equal(script.launchInstruction(), guided, "guided is the default condition")

  // The plain condition must never learn that the tool exists.
  assert.equal(TOOL_WORD.test(plain), false, "the plain line must not name the tool")
  assert.equal(/first-contact/i.test(plain), false, "the plain line must not carry guided commands")
  assert(plain.includes("INSTRUCTIONS.md"), "the plain line must point at the instruction file")
})

test("the guided banner says the tool must be named, and the plain banner refuses to name it", async () => {
  const checkout = await makeCheckout("board-banner-src-")
  await seedCheckout(checkout)
  const staging = tempPath("board-banner-staging")
  const guidedWs = tempPath("board-banner-guided")
  const plainWs = tempPath("board-banner-plain")
  try {
    const guided = runScript(["--workspace", guidedWs, "--repo", checkout, "--cli-root", staging])
    assert.equal(guided.status, 0, guided.stderr)
    assert(guided.stdout.includes("SYNTH"), "the guided banner must print a launch line naming the tool")
    assert(/no\s+skill, plugin, hook or background service/.test(guided.stdout.replace(/\n/g, " ")), "the guided banner must say nothing announces the tool")
    assert(guided.stdout.includes("give it this line verbatim"), "the guided banner must mark the line verbatim")

    const plain = runScript(["--workspace", plainWs, "--repo", checkout, "--condition", "plain", "--cli-root", tempPath("board-banner-plain-staging")])
    assert.equal(plain.status, 0, plain.stderr)
    // Scope: the banner is the operator's log, not the agent's input, so repository metadata
    // (branch and commit subject, which may themselves spell the tool's name) is out of scope
    // here and is covered by the operator rule in the trial instructions. What must never
    // appear is the guided hand-off or any hint that a CLI is involved in this run.
    assert.equal(plain.stdout.includes("This trial uses SYNTH"), false, "the plain banner must not hand out a tool-naming launch line")
    assert.equal(/first-contact/i.test(plain.stdout), false, "the plain banner must not carry guided commands")
    assert.equal(plain.stdout.includes("installed CLI"), false, "the plain banner must not suggest an installed CLI")
    assert(plain.stdout.includes("must run without any hint that a CLI exists"), "the plain banner must say why the line stays neutral")
    assert(plain.stdout.includes("keep this setup log out of TEST_PATH"), "the plain banner must warn that its own log is not agent input")
  } finally {
    for (const target of [guidedWs, plainWs, staging]) await fs.rm(target, { recursive: true, force: true })
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

test("the guided instruction file opens by telling the agent the tool exists", async () => {
  const text = await fs.readFile(GUIDED_SET, "utf-8")
  assert(text.includes("**You are using SYNTH.**"), "the guided set must state the tool plainly up front")
  assert(text.includes("no skill, plugin, hook or service"), "the guided set must say nothing announces the tool")
  assert(/synth first-contact --dry-run/.test(text), "the guided set must carry the initialization command")
  assert(/synth --version/.test(text), "the guided set must tell the agent how to check the tool is installed")
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

test("the script clones nothing, runs no product command but --version, and keeps the build out of TEST_PATH", async () => {
  const source = await fs.readFile(SCRIPT, "utf-8")
  assert(source.includes("productCommandsRun: ['synth --version']"), "the manifest must record which product command setup ran")
  assert(source.includes("buildArtifactsInsideTestPath: []"), "the manifest must state that no build output lands in TEST_PATH")
  assert(source.includes("cloneUsed: false"), "the manifest must record that no clone was involved")
  assert.equal(/git clone|no-hardlinks/.test(source), false, "setup must not clone the repository")
  assert.equal(/run\([^)]*'git'/.test(source), false, "setup must not run git beyond the revision read")
  assert.equal(/run(?:Capture)?\([^)]*first-contact/.test(source), false, "setup may never execute a product workflow command")
  assert.equal((source.match(/first-contact/g) ?? []).length, 1, "the only mention of a workflow command is the operator's launch line")
  assert(source.includes("begin each test with `synth first-contact --dry-run`"), "that mention is the guided launch line")
  // The only npm invocations are the ordinary ones: install dependencies, build, pack, install globally.
  for (const match of source.matchAll(/'npm-(install|ci)?'?|NPM_BIN, \['([^\]]*)\]/g)) void match
  assert(source.includes("['run', 'build']"), "the build script is the documented npm run build")
  assert(source.includes("['pack', '--pack-destination', cli.pack]"), "the tarball is packed with npm pack")
  assert(source.includes("['install', '-g', '--prefix', cli.globalPrefix, tarball]"), "the CLI is installed with npm install -g")
  assert.equal(/npm run (?!build)/.test(source), false, "setup may only run the build script")
})
