#!/usr/bin/env node
// ============================================================
// SYNTH — guided-journey trial: setup executor
// ============================================================
// One command, one argument, run from the checkout:
//
//   node scripts/guided-installed-trial-setup.mjs --workspace <TEST_PATH>
//
// The repository is the checkout this script lives in, so it is never passed.
// There is no clone and no second copy of the source tree: the CLI is built,
// packed and installed from this checkout, in three ordinary commands —
//
//   npm run build
//   npm pack --pack-destination <staging>/pack
//   npm install -g --prefix <staging>/global <tarball>
//
// The build output, the tarball and the installed CLI live in a scratch
// directory outside TEST_PATH (<tmp>/trial-staging/<revision>/), so none of them
// can interfere with the run. TEST_PATH only receives:
//
//   <TEST_PATH>/
//     INSTRUCTIONS.md      copied from the repository: the file the agent follows
//     ENVIRONMENT.md       guided only: generated paths (CLI location, revision)
//     greenfield/          one isolated environment per test …
//     brownfield/          … holding only that test's own starting inputs
//     documentation/
//     [knowledge-led/] [conflicting-documents/]     (optional cases)
//
// Then the operator starts an agent in TEST_PATH and tells it to follow
// INSTRUCTIONS.md. No trial test is started by this script, no lifecycle command
// is run, and the only product command it runs is `synth --version`.
//
// The plain condition builds nothing at all and writes nothing outside TEST_PATH.
// ============================================================

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  CASE_ORDER,
  OPTIONAL_CASES,
  REQUIRED_CASES,
  caseRevisions,
  revisionMismatches,
} from './lib/guided-trial-fixtures.mjs'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..')

const FIXTURE_GENERATOR = 'scripts/guided-installed-trial-fixtures.mjs'
const NPM_BIN = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const SYNTH_BIN = process.platform === 'win32' ? 'synth.cmd' : 'synth'

export const INSTRUCTION_SET_DIR = 'docs/plans/guided-trial'
/** The instruction files that ship with the trial, one per condition. */
export const INSTRUCTION_SETS = {
  guided: `${INSTRUCTION_SET_DIR}/instructions/guided.md`,
  plain: `${INSTRUCTION_SET_DIR}/instructions/plain.md`,
}

/** Test directory names, one isolated environment per test. */
export const TEST_DIRS = {
  green: 'greenfield',
  brown: 'brownfield',
  docs: 'documentation',
  knowledge: 'knowledge-led',
  conflict: 'conflicting-documents',
}

/** Default scratch directory name; deliberately neutral, and outside TEST_PATH. */
export const STAGING_DIR_NAME = 'trial-staging'

export const USAGE = `Usage: node scripts/guided-installed-trial-setup.mjs --workspace <TEST_PATH> [options]

  --workspace <dir>     TEST_PATH; created when missing, and required to be empty when it exists
  --condition <name>    guided (default) or plain; plain refuses a path that spells the tool's
                        name, and builds nothing at all
  --cases <a,b,c>       default ${REQUIRED_CASES.join(',')} (available: ${CASE_ORDER.join(', ')})

  Advanced overrides, all inferred by default:
  --repo <path>         default: the checkout this script lives in
  --pin <ref>           default: that checkout's committed HEAD
  --cli-root <dir>      default: <tmp>/${STAGING_DIR_NAME}/<revision>, outside TEST_PATH
  --help                print this text

Run it from the checkout; the repository is inferred from this script's location. The guided
condition runs npm run build, npm pack and npm install -g into <cli-root>, which is outside
TEST_PATH, so building, packing and installing cannot interfere with the run. The plain condition
builds nothing and writes nothing outside TEST_PATH.

No trial test is started and no lifecycle command is run: start an agent in TEST_PATH afterwards
and tell it to follow the INSTRUCTIONS.md staged in that root. Setup complete means the recipe
ran; it is never trial evidence.`

/** Where the scratch directory lives: outside TEST_PATH, keyed by revision. */
export function stagingRootFor(commit, { cliRoot } = {}) {
  if (cliRoot) return path.resolve(cliRoot)
  if (!commit) throw new Error('stagingRootFor needs the revision under test')
  return path.join(os.tmpdir(), STAGING_DIR_NAME, commit.slice(0, 12))
}

/** The installed binary npm produces for this platform, most likely first. */
export function installedCliCandidates(prefix) {
  const names = process.platform === 'win32' ? ['synth.cmd', 'synth'] : ['synth']
  const dirs = process.platform === 'win32'
    ? [prefix, path.join(prefix, 'bin')]
    : [path.join(prefix, 'bin'), prefix]
  return dirs.flatMap((dir) => names.map((name) => path.join(dir, name)))
}

/** Every inferred location. The build never happens inside TEST_PATH. */
export function layoutFor(workspace, { stagingRoot, condition = 'guided' } = {}) {
  const root = workspace ? path.resolve(workspace) : undefined
  const staging = path.resolve(stagingRoot)
  return {
    workspace: root,
    condition,
    rootInstruction: root ? path.join(root, 'INSTRUCTIONS.md') : undefined,
    environmentFile: root ? path.join(root, 'ENVIRONMENT.md') : undefined,
    testDir: (caseId) => {
      if (!root) throw new Error('no TEST_PATH was given')
      return path.join(root, TEST_DIRS[caseId])
    },
    staging: {
      root: staging,
      pack: path.join(staging, 'pack'),
      globalPrefix: path.join(staging, 'global'),
      transcripts: path.join(staging, 'transcripts'),
      manifest: path.join(staging, 'cli-manifest.json'),
      installedCli: path.join(prefixBinDir(staging), SYNTH_BIN),
    },
  }
}

function prefixBinDir(staging) {
  return process.platform === 'win32' ? path.join(staging, 'global') : path.join(staging, 'global', 'bin')
}

/** Parse and validate arguments. TEST_PATH is the only thing the operator must supply. */
export function parseArgs(argv) {
  const args = { workspace: undefined, cases: REQUIRED_CASES.slice(), pin: undefined, repo: undefined, cliRoot: undefined, condition: 'guided' }
  const takesValue = { '--repo': 'repo', '--workspace': 'workspace', '--cases': 'cases', '--pin': 'pin', '--cli-root': 'cliRoot', '--condition': 'condition' }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    if (flag === '--help' || flag === '-h') return { help: true }
    const key = takesValue[flag]
    if (!key) throw new Error(`Unknown argument: ${flag}`)
    const value = argv[i + 1]
    if (value === undefined || value.startsWith('--')) throw new Error(`${flag} requires a value`)
    if (key === 'cases') {
      const requested = value.split(',').map((item) => item.trim()).filter(Boolean)
      if (requested.length === 0) throw new Error('--cases requires at least one case')
      for (const name of requested) if (!CASE_ORDER.includes(name)) throw new Error(`Unknown case: ${name}`)
      args.cases = CASE_ORDER.filter((name) => requested.includes(name))
    } else {
      args[key] = value
    }
    i += 1
  }
  if (args.condition !== 'guided' && args.condition !== 'plain') throw new Error('--condition must be guided or plain')
  if (!args.workspace) throw new Error('--workspace is required: the TEST_PATH that will hold the trial (created when missing)')
  if (!path.isAbsolute(args.workspace)) throw new Error('--workspace must be an absolute path')
  if (args.repo !== undefined && !path.isAbsolute(args.repo)) throw new Error('--repo must be an absolute path')
  if (args.cliRoot !== undefined && !path.isAbsolute(args.cliRoot)) throw new Error('--cli-root must be an absolute path')
  if (args.condition === 'plain' && /synth/i.test(args.workspace)) {
    throw new Error(`--condition plain needs a TEST_PATH whose path does not spell the tool's name: ${args.workspace}`)
  }
  return args
}

/** Refuse the two layouts that would let the build or the checkout leak into the trial. */
export function assertSafeLayout({ repo, workspace, stagingRoot }) {
  const inside = (child, parent) => child === parent || child.startsWith(parent + path.sep)
  if (workspace && repo && inside(workspace, repo)) throw new Error('--workspace must be outside the checkout')
  if (workspace && stagingRoot && (inside(stagingRoot, workspace) || inside(workspace, stagingRoot))) {
    throw new Error('--cli-root and --workspace may not contain each other: the build must not touch the trial')
  }
  return { repo, workspace, stagingRoot }
}

/**
 * Read what the checkout offers. Uncommitted changes are recorded, never refused:
 * the tarball digest pins what was actually built and installed.
 */
export function assessRepo(repo, { pin } = {}) {
  const git = (gitArgs) => spawnSync('git', ['-C', repo, ...gitArgs], { encoding: 'utf-8' })
  const inside = git(['rev-parse', '--is-inside-work-tree'])
  if (inside.status !== 0 || inside.stdout.trim() !== 'true') {
    return { ok: false, kind: 'not-a-checkout', reason: `not a git work tree: ${repo}` }
  }
  const status = git(['status', '--porcelain']).stdout
  const target = pin === undefined ? 'HEAD' : `${pin}^{commit}`
  const resolved = git(['rev-parse', '--verify', target])
  if (resolved.status !== 0) {
    return { ok: false, kind: pin === undefined ? 'no-head' : 'bad-pin', reason: `${pin ?? 'HEAD'} does not resolve to a commit in ${repo}` }
  }
  const commit = resolved.stdout.trim()
  const branch = pin === undefined ? git(['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim() : pin
  return {
    ok: true,
    commit,
    branch,
    subject: git(['log', '-1', '--oneline', commit]).stdout.trim(),
    workingTreeDirty: status.trim().length > 0,
    pinnedByRef: pin !== undefined,
  }
}

/** Does TEST_PATH exist, and may setup write into it? */
export async function workspaceState(dir) {
  try {
    const entries = await fs.readdir(dir)
    return { exists: true, empty: entries.length === 0 }
  } catch {
    return { exists: false, empty: true }
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

async function exists(target) {
  return fs.access(target).then(() => true, () => false)
}

/** The installed binary, if npm put one where this platform keeps it. */
export async function resolveInstalledCli(prefix) {
  const tried = installedCliCandidates(prefix)
  for (const candidate of tried) if (await exists(candidate)) return candidate
  return null
}

async function copyTree(source, target) {
  await fs.mkdir(target, { recursive: true })
  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name)
    const to = path.join(target, entry.name)
    if (entry.isDirectory()) await copyTree(from, to)
    else await fs.copyFile(from, to)
  }
}

/** Recompute a copied workspace's revision from disk, using the shared hashing rule. */
export async function revisionOfDir(dir) {
  const rows = []
  const walk = async (current) => {
    for (const entry of (await fs.readdir(current, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) await walk(full)
      else rows.push([path.relative(dir, full).split(path.sep).join('/'), await fs.readFile(full, 'utf-8')])
    }
  }
  await walk(dir)
  rows.sort(([a], [b]) => a.localeCompare(b))
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex')
}

// #region generated-text — paths, hashes and revisions only; no process, no product command
/**
 * The environment note staged in a guided TEST_PATH. It carries machine paths and
 * build identity so the instruction file can stay versioned and path-free.
 */
export function renderEnvironment({ workspace, testDirs, stagingRoot, installedCli, manifestPath, revision }) {
  return [
    `# Environment (generated by trial setup — do not edit)`,
    ``,
    `This file only records paths and build identity. The process is in \`INSTRUCTIONS.md\`.`,
    ``,
    `Testing workspace : ${workspace}`,
    `Test directories  : ${testDirs.map((name) => `${name}/`).join('  ')}`,
    `SYNTH CLI         : ${installedCli}`,
    `                    (or \`synth\` when the operator put it on PATH)`,
    `Revision under test: ${revision.commit}  ${revision.subject}`,
    `CLI staging       : ${stagingRoot}`,
    `Setup manifest    : ${manifestPath}`,
    ``,
  ].join('\n')
}

/**
 * The line the operator pastes into a fresh agent session started at TEST_PATH.
 *
 * An agent has no ambient way to learn that SYNTH exists: no skill, plugin, hook or
 * service on this machine announces it, and nothing outside this workspace refers to
 * it. The guided line therefore names the tool and its initialization command itself.
 * The plain line names nothing, because the plain condition must never hear of it.
 */
export function launchInstruction(condition = 'guided') {
  if (condition === 'plain') return 'Read INSTRUCTIONS.md in the root of this workspace and follow it.'
  return 'This trial uses SYNTH, the CLI installed on this machine as `synth`. Read INSTRUCTIONS.md '
    + 'in the root of this workspace and follow it; begin each test with `synth first-contact --dry-run`.'
}

/** Closing banner: the runbook stops here; only an operator starts the agent. */
export function stopBanner({ layout, manifest, assessment, cases, revisions, stagingUsed, installedCli }) {
  const dirty = assessment?.workingTreeDirty ? '   (checkout has uncommitted changes; the tarball digest below pins what was built)' : ''
  const lines = [
    `SETUP COMPLETE — the runbook stops here.`,
    ``,
    `No trial test has been run and none may start until the operator launches the agent.`,
    `The agent cannot discover the tool by itself: the launch line below is what tells it.`,
    `  testing workspace  : ${layout.workspace}`,
    `  condition          : ${layout.condition}`,
  ]
  if (assessment) lines.push(`  tested revision    : ${assessment.commit}  ${assessment.branch}  ${assessment.subject}${dirty}`)
  if (stagingUsed) {
    lines.push(
      `  built from         : the checkout this script lives in (no clone)`,
      `  CLI staging        : ${layout.staging.root}`,
      `  installed CLI      : ${installedCli ?? layout.staging.installedCli}   (setup invoked only: synth --version)`,
      `  or install it yourself: npm install -g ${layout.staging.pack}${path.sep}*.tgz`,
    )
  } else {
    lines.push(`  CLI staging        : not used — the plain condition builds nothing at all`)
  }
  lines.push(
    `  tests              : ${cases.map((caseId) => `${TEST_DIRS[caseId]}/`).join('  ')}`,
    `  copied into root   : ${layout.condition === 'guided' ? 'INSTRUCTIONS.md  ENVIRONMENT.md' : 'INSTRUCTIONS.md'}`,
    `  staging revision   :`,
  )
  for (const caseId of cases) lines.push(`      ${TEST_DIRS[caseId]}/  ${revisions[caseId]}`)
  lines.push(
    `  manifest           : ${manifest ?? 'none — the plain condition writes nothing outside TEST_PATH'}`,
    ``,
    `Next step: start one fresh agent session in ${layout.workspace} and give it this line verbatim:`,
    ``,
    `  ${launchInstruction(layout.condition)}`,
    ``,
  )
  if (layout.condition === 'guided') {
    lines.push(
      `The line names SYNTH on purpose. Nothing on this machine announces that the tool exists — no`,
      `skill, plugin, hook or background service — so an agent only learns about it from this line and`,
      `from INSTRUCTIONS.md. Do not paraphrase it into a tool-free "follow the instructions" line, or`,
      `the guided session runs without ever knowing the tool is there.`,
      ``,
    )
  } else {
    lines.push(
      `The line names no tool on purpose: this condition must run without any hint that a CLI exists, so`,
      `do not add anything to it, do not name any tool, and keep this setup log out of TEST_PATH.`,
      ``,
    )
  }
  lines.push(
    `The agent reads the instruction file in the root and works one test at a time inside its own`,
    `directory. Nothing built by setup is inside TEST_PATH, so no build output is visible to the agent.`,
  )
  return lines.join('\n')
}
// #endregion generated-text

/**
 * Build, pack and install the CLI from this checkout into the scratch directory.
 * Three ordinary commands, no clone and no second copy of the source tree.
 */
export async function buildInstallCli({ repo, layout, run, logger }) {
  const cli = layout.staging
  for (const dir of [cli.pack, cli.globalPrefix, cli.transcripts]) await fs.mkdir(dir, { recursive: true })

  if (!(await exists(path.join(repo, 'node_modules')))) {
    // Dependencies are only installed when they are missing; npm ci needs a lockfile.
    const hasLockfile = await exists(path.join(repo, 'package-lock.json'))
    run('npm-install', NPM_BIN, hasLockfile ? ['ci'] : ['install'], repo)
  }
  run('build', NPM_BIN, ['run', 'build'], repo)
  run('pack', NPM_BIN, ['pack', '--pack-destination', cli.pack], repo)

  const packNames = (await fs.readdir(cli.pack)).filter((name) => name.endsWith('.tgz'))
  if (packNames.length !== 1) throw new Error(`expected exactly one packed tarball in ${cli.pack}, found ${packNames.length}`)
  const tarball = path.join(cli.pack, packNames[0])
  const tarballSha256 = sha256(await fs.readFile(tarball))
  await fs.writeFile(path.join(cli.transcripts, 'tarball.sha256'), `${tarballSha256}  ${tarball}\n`)

  run('install', NPM_BIN, ['install', '-g', '--prefix', cli.globalPrefix, tarball], cli.root)
  const installedCli = (await resolveInstalledCli(cli.globalPrefix)) ?? cli.installedCli
  const version = run('synth-version', installedCli, ['--version'], cli.root)
  await fs.writeFile(path.join(cli.transcripts, 'version.json'), version.stdout)

  const manifest = {
    status: 'cli-installed',
    stagedAt: new Date().toISOString(),
    builtFrom: repo,
    testedRevision: {},
    installedCli: { bin: installedCli, tarball, tarballSha256, version: JSON.parse(version.stdout) },
    productCommandsRun: ['synth --version'],
    trialTestsRun: 0,
    lifecycleCommandsRun: [],
  }
  await fs.writeFile(cli.manifest, `${JSON.stringify(manifest, null, 2)}\n`)
  logger.step({ step: 'build-install-cli', command: 'npm run build && npm pack && npm install -g', cwd: repo, exitCode: 0, durationMs: 0, outputTail: '' })
  return manifest
}

async function main(argv) {
  const parsed = parseArgs(argv)
  if (parsed.help) {
    console.log(USAGE)
    return 0
  }

  const drifted = revisionMismatches()
  if (drifted.length > 0) throw new Error(`Fixture drift against the executed E4 record: ${JSON.stringify(drifted)}`)

  // The repository is inferred: this script lives in it.
  const repo = path.resolve(parsed.repo ?? REPO_ROOT)

  // Input validation first, before any git or build work.
  assertSafeLayout({
    repo,
    workspace: path.resolve(parsed.workspace),
    stagingRoot: parsed.cliRoot ? path.resolve(parsed.cliRoot) : undefined,
  })
  if (!(await exists(repo))) throw new Error(`--repo does not exist: ${repo}`)

  const assessment = assessRepo(repo, { pin: parsed.pin })
  if (!assessment.ok) throw new Error(assessment.reason)

  const stagingRoot = stagingRootFor(assessment.commit, { cliRoot: parsed.cliRoot })
  const layout = layoutFor(parsed.workspace, { stagingRoot, condition: parsed.condition })
  assertSafeLayout({ repo, workspace: layout.workspace, stagingRoot })

  // Fail fast on TEST_PATH, before spending any build time, without creating it.
  const state = await workspaceState(layout.workspace)
  if (state.exists && !state.empty) {
    throw new Error(`--workspace is not empty: ${layout.workspace}. Setup creates TEST_PATH when it is missing and never merges into an existing directory — use a new path, or remove the existing one to start over.`)
  }

  const log = []
  const logger = { step: (entry) => log.push(`$ ${entry.command}\n${entry.outputTail}`.trim()) }
  const record = (name, command, result, cwd) => logger.step({
    step: name,
    command,
    cwd,
    exitCode: result.status,
    durationMs: result.durationMs,
    outputTail: `${result.stdout || ''}${result.stderr || ''}`.trim().split('\n').slice(-6).join('\n'),
  })
  const run = (name, command, args, cwd) => {
    const started = Date.now()
    const result = spawnSync(command, args, { cwd, encoding: 'utf-8' })
    const wrapped = { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '', durationMs: Date.now() - started }
    record(name, [command, ...args].join(' '), wrapped, cwd)
    if (wrapped.status !== 0) {
      const detail = `${wrapped.stdout}${wrapped.stderr}`.trim().split('\n').slice(-4).join(' | ')
      throw new Error(`${name} failed (exit ${wrapped.status})${detail ? `: ${detail}` : ''}`)
    }
    return wrapped
  }
  const runCapture = (command, args, cwd) => spawnSync(command, args, { cwd, encoding: 'utf-8' })

  // --- guided: build, pack and install from this checkout; plain: build nothing ---
  let cliManifest = null
  if (parsed.condition === 'guided') {
    cliManifest = await buildInstallCli({ repo, layout, run, logger })
    cliManifest.testedRevision = {
      commit: assessment.commit,
      branch: assessment.branch,
      subject: assessment.subject,
      workingTreeDirty: assessment.workingTreeDirty,
    }
    await fs.writeFile(layout.staging.manifest, `${JSON.stringify(cliManifest, null, 2)}\n`)
  }

  // --- TEST_PATH: create it, then copy the instruction file and one directory per test ---
  await fs.mkdir(layout.workspace, { recursive: true })

  const instructionText = {}
  for (const condition of ['guided', 'plain']) {
    instructionText[condition] = await fs.readFile(path.join(repo, INSTRUCTION_SETS[condition]), 'utf-8')
  }
  if (instructionText.guided === instructionText.plain) {
    throw new Error('guided and plain instruction sets are byte-identical: the conditions are indistinguishable')
  }
  const stagedSet = instructionText[parsed.condition]
  if (parsed.condition === 'plain' && /synth/i.test(stagedSet)) {
    throw new Error('the plain instruction set mentions the tool under test; refusing to stage it')
  }

  // Fixtures are generated in a throwaway directory, never inside TEST_PATH.
  const fixturesDir = await fs.mkdtemp(path.join(os.tmpdir(), 'trial-fixtures-'))
  let revisions
  let expected
  try {
    const generated = runCapture(process.execPath, [path.join(repo, FIXTURE_GENERATOR), fixturesDir], os.tmpdir())
    if (generated.status !== 0) throw new Error(`fixtures failed (exit ${generated.status}): ${generated.stderr}`)
    record('fixtures', `${process.execPath} ${path.join(repo, FIXTURE_GENERATOR)} ${fixturesDir}`, generated, os.tmpdir())
    revisions = JSON.parse(generated.stdout).revisions
    expected = caseRevisions()
    for (const caseId of CASE_ORDER) {
      if (revisions[caseId] !== expected[caseId]) throw new Error(`fixture revision mismatch for ${caseId}: ${revisions[caseId]} != ${expected[caseId]}`)
    }
    for (const caseId of parsed.cases) {
      const dir = layout.testDir(caseId)
      await copyTree(path.join(fixturesDir, parsed.condition === 'plain' ? 'plain' : 'guided', caseId), dir)
      const observed = await revisionOfDir(dir)
      if (observed !== expected[caseId]) throw new Error(`staged ${dir} does not match revision ${expected[caseId]} (observed ${observed})`)
    }
  } finally {
    await fs.rm(fixturesDir, { recursive: true, force: true })
  }

  await fs.writeFile(layout.rootInstruction, stagedSet)
  const installedCli = cliManifest?.installedCli?.bin ?? null
  if (parsed.condition === 'guided') {
    await fs.writeFile(layout.environmentFile, renderEnvironment({
      workspace: layout.workspace,
      testDirs: parsed.cases.map((caseId) => TEST_DIRS[caseId]),
      stagingRoot: layout.staging.root,
      installedCli,
      manifestPath: layout.staging.manifest,
      revision: { commit: assessment.commit, subject: assessment.subject },
    }))
  }

  // Guided runs record the manifest in the scratch directory; plain runs deliberately write
  // nothing outside TEST_PATH, so nothing on the machine can leak the tool to that session.
  let manifest = null
  if (parsed.condition === 'guided') {
    manifest = path.join(layout.staging.transcripts, 'setup-manifest.json')
    await fs.writeFile(manifest, `${JSON.stringify({
      status: 'setup-complete-stop-before-agent',
      generatedAt: new Date().toISOString(),
      inputs: { repo, workspace: layout.workspace },
      inferred: {
        stagingRoot: layout.staging.root,
        testDirs: Object.fromEntries(parsed.cases.map((caseId) => [caseId, TEST_DIRS[caseId]])),
        rootInstruction: layout.rootInstruction,
        environmentFile: layout.environmentFile,
      },
      condition: parsed.condition,
      testedRevision: {
        commit: assessment.commit,
        branch: assessment.branch,
        subject: assessment.subject,
        workingTreeDirty: assessment.workingTreeDirty,
      },
      builtFrom: repo,
      cloneUsed: false,
      installedCli: cliManifest.installedCli,
      revisions: expected,
      cases: parsed.cases,
      optionalCases: OPTIONAL_CASES,
      copiedIntoTestPath: ['INSTRUCTIONS.md', 'ENVIRONMENT.md'],
      buildArtifactsInsideTestPath: [],
      productCommandsRun: ['synth --version'],
      trialTestsRun: 0,
      lifecycleCommandsRun: [],
      launchInstruction: launchInstruction(parsed.condition),
      note: 'Setup only. The CLI was built from this checkout into the scratch directory outside TEST_PATH. Counts as a validated recipe, never as trial evidence. The agent is launched in TEST_PATH and told to follow INSTRUCTIONS.md.',
    }, null, 2)}\n`)
    await fs.writeFile(path.join(layout.staging.transcripts, 'setup.log'), `${log.join('\n\n')}\n`)
  }

  console.log(stopBanner({
    layout,
    manifest,
    assessment,
    cases: parsed.cases,
    revisions: expected,
    stagingUsed: parsed.condition === 'guided',
    installedCli,
  }))
  return 0
}

const invokedDirectly = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
if (invokedDirectly) {
  main(process.argv.slice(2))
    .then((code) => { process.exitCode = code })
    .catch((error) => {
      console.error(`Setup failed: ${error.message}`)
      console.error(``)
      console.error(`Partial state, if any, is left outside the trial for diagnosis; retry in a fresh empty workspace.`)
      process.exitCode = 1
    })
}

export { main as runSetup }
