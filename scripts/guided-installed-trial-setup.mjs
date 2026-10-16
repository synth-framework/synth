#!/usr/bin/env node
// ============================================================
// SYNTH — guided-journey trial: setup executor
// ============================================================
// Mechanical setup for the operator-run trial described in
// docs/plans/guided-installed-cli-trial-instructions.md.
//
// Two things are needed and nothing else:
//
//   --repo       the local checkout of SYNTH whose HEAD is the revision under test
//   --workspace  the empty TEST_PATH that will hold the trial
//
// Building, packing and installing happen in a separate CLI staging directory
// OUTSIDE the testing workspace, so nothing about the build can interfere with
// the test run. Prepare it beforehand with `--stage-only`, then create TEST_PATH
// later (the staged CLI is reused, and no npm or git command runs at all):
//
//   # beforehand, once
//   node scripts/guided-installed-trial-setup.mjs --repo <checkout> --workspace <TEST_PATH> --stage-only
//
//   # then, whenever the trial is run
//   node scripts/guided-installed-trial-setup.mjs --workspace <TEST_PATH>
//
// The testing workspace contains the instruction file and one isolated
// directory per test — no harness, no transcripts, no build output:
//
//   <TEST_PATH>/
//     INSTRUCTIONS.md        copied from the repository: the file the agent follows
//     ENVIRONMENT.md         guided only: generated paths (CLI location, revision)
//     greenfield/            one isolated environment per test …
//     brownfield/            … holding only that test's own inputs
//     documentation/
//     [knowledge-led/] [conflicting-documents/]
//
// Everything is inferred: the revision, the CLI staging directory, the per-test
// directory names, the staged instruction file and where the CLI is installed.
//
// The script performs no judgment, runs no trial cell and no lifecycle action,
// and never commits, pushes or modifies the checkout it is given. The ONLY
// product command it runs is `synth --version`.
// ============================================================

import fs from 'node:fs/promises'
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

// Sources copied out of the pinned revision into the CLI staging directory.
const INSTRUCTIONS_SOURCE = 'docs/plans/guided-installed-cli-trial-instructions.md'
const TEMPLATE_SOURCE = 'docs/analysis/guided-three-path-installed-trial-evidence-template.md'
const FIXTURE_GENERATOR = 'scripts/guided-installed-trial-fixtures.mjs'
const FIXTURE_LIB = 'scripts/lib/guided-trial-fixtures.mjs'
export const INSTRUCTION_SET_DIR = 'docs/plans/guided-trial'
export const INSTRUCTION_SETS = {
  guided: `${INSTRUCTION_SET_DIR}/instructions/guided.md`,
  plain: `${INSTRUCTION_SET_DIR}/instructions/plain.md`,
}
const INSTRUCTION_SET_INDEX = `${INSTRUCTION_SET_DIR}/README.md`

/** Test directory names, one isolated environment per test. */
export const TEST_DIRS = {
  green: 'greenfield',
  brown: 'brownfield',
  docs: 'documentation',
  knowledge: 'knowledge-led',
  conflict: 'conflicting-documents',
}

const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const synthBinName = process.platform === 'win32' ? 'synth.cmd' : 'synth'

export const USAGE = `Usage: node scripts/guided-installed-trial-setup.mjs --workspace <TEST_PATH> [options]
       node scripts/guided-installed-trial-setup.mjs --repo <checkout> --workspace <TEST_PATH> --stage-only

  --repo <path>         local checkout of the repository; its committed HEAD is the revision under test
                        (required to build/stage the CLI; optional once a staged CLI exists)
  --workspace <dir>     TEST_PATH: absolute, empty or nonexistent, outside the checkout
  --stage-only          beforehand: build, pack and install the CLI, copy the instructions and tools,
                        then stop without creating TEST_PATH
  --cli-root <dir>      advanced; default: the sibling directory <TEST_PATH>-cli, outside TEST_PATH
  --refresh-cli         rebuild even when a staged CLI for this revision already exists
  --condition <name>    guided (default) or plain; plain refuses a path that spells the tool's name
  --cases <a,b,c>       default ${REQUIRED_CASES.join(',')} (available: ${CASE_ORDER.join(', ')})
  --pin <ref>           advanced; default: the checkout's committed HEAD
  --allow-dirty         proceed although the checkout has uncommitted changes (the artifact still comes
                        from the committed HEAD only; the decision is recorded)
  --help                print this text

TEST_PATH receives only the instruction file, the environment note (guided) and one
isolated directory per test. Building, packing and installing live in the CLI staging
directory outside TEST_PATH, so they never interfere with the test run.

No trial cell is started and no lifecycle command is run: the agent is launched
afterwards, in TEST_PATH, and told to follow the instruction file in its root.`

/** Every inferred location, derived from TEST_PATH. */
export function layoutFor(workspace, { cliRoot, condition = 'guided' } = {}) {
  const root = path.resolve(workspace)
  const cli = path.resolve(cliRoot ?? `${root}-cli`)
  return {
    workspace: root,
    condition,
    cliRoot: cli,
    rootInstruction: path.join(root, 'INSTRUCTIONS.md'),
    environmentFile: path.join(root, 'ENVIRONMENT.md'),
    testDir: (caseId) => path.join(root, TEST_DIRS[caseId]),
    cli: {
      root: cli,
      pack: path.join(cli, 'pack'),
      globalPrefix: path.join(cli, 'global'),
      transcripts: path.join(cli, 'transcripts'),
      instructions: path.join(cli, 'instructions'),
      tools: path.join(cli, 'tools'),
      sourceClone: path.join(cli, 'src'),
      manifest: path.join(cli, 'cli-manifest.json'),
      installedCli: path.join(cli, 'global', 'bin', synthBinName),
    },
  }
}

/** Parse and validate arguments. Throws on anything unsafe or ambiguous. */
export function parseArgs(argv) {
  const args = {
    repo: undefined,
    workspace: undefined,
    cases: REQUIRED_CASES.slice(),
    pin: undefined,
    allowDirty: false,
    cliRoot: undefined,
    refreshCli: false,
    stageOnly: false,
    condition: 'guided',
  }
  const takesValue = { '--repo': 'repo', '--workspace': 'workspace', '--cases': 'cases', '--pin': 'pin', '--cli-root': 'cliRoot', '--condition': 'condition' }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    if (flag === '--help' || flag === '-h') return { help: true }
    if (flag === '--allow-dirty') {
      args.allowDirty = true
      continue
    }
    if (flag === '--refresh-cli') {
      args.refreshCli = true
      continue
    }
    if (flag === '--stage-only') {
      args.stageOnly = true
      continue
    }
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
  if (!args.workspace && !args.cliRoot) {
    throw new Error(args.stageOnly
      ? '--stage-only needs --workspace (to infer the CLI staging directory) or an explicit --cli-root'
      : '--workspace is required: the empty TEST_PATH that will hold the trial')
  }
  if (args.workspace && !path.isAbsolute(args.workspace)) throw new Error('--workspace must be an absolute path')
  if (args.cliRoot !== undefined && !path.isAbsolute(args.cliRoot)) throw new Error('--cli-root must be an absolute path')
  if (args.condition === 'plain' && args.workspace && /synth/i.test(args.workspace)) {
    throw new Error(`--condition plain needs a TEST_PATH whose path does not spell the tool's name: ${args.workspace}`)
  }
  return args
}

/** Refuse layouts that would let the build or the checkout leak into the trial. */
export function assertSafeLayout(args) {
  const repo = args.repo ? path.resolve(args.repo) : undefined
  const workspace = args.workspace ? path.resolve(args.workspace) : undefined
  const cliRoot = args.cliRoot
    ? path.resolve(args.cliRoot)
    : workspace
      ? path.resolve(`${workspace}-cli`)
      : undefined
  const inside = (child, parent) => child === parent || child.startsWith(parent + path.sep)
  if (repo && workspace) {
    if (inside(workspace, repo)) throw new Error('--workspace must be outside the checkout given by --repo')
    if (inside(repo, workspace)) throw new Error('--repo must not be inside --workspace: the testing workspace must not contain the checkout')
  }
  if (cliRoot && workspace) {
    if (inside(cliRoot, workspace)) throw new Error('--cli-root must be outside --workspace: the staged CLI must not appear inside the trial')
    if (inside(workspace, cliRoot)) throw new Error('--workspace must not be inside --cli-root')
  }
  if (cliRoot && repo && inside(cliRoot, repo)) throw new Error('--cli-root must be outside the checkout')
  return { repo, workspace, cliRoot }
}

/** Decide whether the given checkout can be used as the pinned source. */
export function assessRepo(repo, { allowDirty = false, pin } = {}) {
  const git = (gitArgs) => spawnSync('git', ['-C', repo, ...gitArgs], { encoding: 'utf-8' })
  const inside = git(['rev-parse', '--is-inside-work-tree'])
  if (inside.status !== 0 || inside.stdout.trim() !== 'true') {
    return { ok: false, kind: 'not-a-checkout', reason: `not a git work tree: ${repo}` }
  }
  const status = git(['status', '--porcelain']).stdout
  const dirty = status.trim().length > 0
  if (dirty && !allowDirty) {
    return {
      ok: false,
      kind: 'dirty',
      dirty,
      reason: 'the checkout has uncommitted changes, so a clone of it would carry the committed history only',
      remedy: 'commit or stash the changes, or pass --allow-dirty to record that decision explicitly',
    }
  }
  const target = pin === undefined ? 'HEAD' : `${pin}^{commit}`
  const resolved = git(['rev-parse', '--verify', target])
  if (resolved.status !== 0) {
    return { ok: false, kind: pin === undefined ? 'no-head' : 'bad-pin', dirty, reason: `${pin ?? 'HEAD'} does not resolve to a commit in ${repo}` }
  }
  const commit = resolved.stdout.trim()
  const branch = pin === undefined ? git(['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim() : pin
  return { ok: true, commit, branch, subject: git(['log', '-1', '--oneline', commit]).stdout.trim(), dirty, pinnedByRef: pin !== undefined, status }
}

/** Reuse a staged CLI only when it belongs to the same revision and still exists. */
export function shouldReuseCli(manifest, assessment, { installedCliExists, refresh = false } = {}) {
  if (refresh) return { reuse: false, reason: 'refresh requested' }
  if (!manifest) return { reuse: false, reason: 'no staged CLI manifest' }
  if (!installedCliExists) return { reuse: false, reason: 'the staged CLI binary is missing' }
  if (manifest.testedRevision?.commit !== assessment.commit) {
    return { reuse: false, reason: `staged for ${manifest.testedRevision?.commit ?? 'unknown'}, not ${assessment.commit}` }
  }
  return { reuse: true, reason: `staged CLI for ${assessment.commit}` }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

async function exists(target) {
  return fs.access(target).then(() => true, () => false)
}

async function pathIsEmptyOrMissing(dir) {
  try {
    return (await fs.readdir(dir)).length === 0
  } catch {
    return true
  }
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
export function renderEnvironment({ workspace, testDirs, cliRoot, installedCli, manifestPath, revision }) {
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
    `CLI staging       : ${cliRoot}`,
    `Setup manifest    : ${manifestPath}`,
    ``,
  ].join('\n')
}

/** The one line the operator pastes into a fresh agent session started at TEST_PATH. */
export function launchInstruction() {
  return 'Read INSTRUCTIONS.md in the root of this workspace and follow it.'
}

/** Closing banner: the runbook stops here; only an operator starts the agent. */
export function stopBanner({ layout, manifest, assessment, cases, cliStaging, stagingReused }) {
  const dirty = assessment?.dirty ? '  (dirty checkout; --allow-dirty was used)' : ''
  const lines = [
    `SETUP COMPLETE — the runbook stops here.`,
    ``,
    `No trial cell has been run and none may start until the operator launches the agent.`,
    `  testing workspace  : ${layout.workspace}`,
    `  condition          : ${layout.condition}`,
  ]
  if (assessment) lines.push(`  tested revision    : ${assessment.commit}  ${assessment.branch}  ${assessment.subject}${dirty}`)
  if (cliStaging) {
    lines.push(`  CLI staging        : ${layout.cliRoot}   (${stagingReused ? 'reused a CLI staged earlier' : 'built, packed and installed beforehand'})`)
    lines.push(`  installed CLI      : ${layout.cli.installedCli}   (setup invoked only: synth --version)`)
    lines.push(`  transcripts        : ${layout.cli.transcripts}`)
  }
  lines.push(
    `  tests              : ${cases.map((caseId) => `${TEST_DIRS[caseId]}/`).join('  ')}`,
    `  copied into root   : ${layout.condition === 'guided' ? 'INSTRUCTIONS.md  ENVIRONMENT.md' : 'INSTRUCTIONS.md'}`,
    `  manifest           : ${manifest}`,
    ``,
    `Next step: start one fresh agent session in ${layout.workspace} and give it the line:`,
    `  "${launchInstruction()}"`,
    ``,
    `The agent reads the instruction file in the root and works one test at a time inside its own`,
    `directory. Building, packing and installing are already done and live outside TEST_PATH, so no`,
    `build output is visible to the agent.`,
  )
  return lines.join('\n')
}
// #endregion generated-text

async function readJsonOrNull(target) {
  try {
    return JSON.parse(await fs.readFile(target, 'utf-8'))
  } catch {
    return null
  }
}

/** Build, pack and install the CLI, then copy the instructions and tools out of the pin. */
export async function prepareCli({ repo, assessment, layout, run, runCapture, logger }) {
  const cli = layout.cli
  for (const dir of [cli.root, cli.pack, cli.globalPrefix, cli.transcripts, cli.instructions, cli.tools, path.join(cli.tools, 'lib')]) {
    await fs.mkdir(dir, { recursive: true })
  }

  run('clone', 'git', ['clone', '--quiet', '--no-hardlinks', repo, cli.sourceClone], cli.root)
  run('checkout', 'git', ['checkout', '--quiet', '--detach', assessment.commit], cli.sourceClone)
  const head = run('resolve-revision', 'git', ['rev-parse', 'HEAD'], cli.sourceClone).stdout.trim()
  if (head !== assessment.commit) throw new Error(`clone resolved ${head}, expected ${assessment.commit}`)

  run('npm-ci', npmBin, ['ci'], cli.sourceClone)
  run('build', npmBin, ['run', 'build'], cli.sourceClone)
  run('pack', npmBin, ['pack', '--pack-destination', cli.pack], cli.sourceClone)
  const packNames = (await fs.readdir(cli.pack)).filter((name) => name.endsWith('.tgz'))
  if (packNames.length !== 1) throw new Error(`expected exactly one packed tarball, found ${packNames.length}`)
  const tarball = path.join(cli.pack, packNames[0])
  const tarballSha256 = sha256(await fs.readFile(tarball))
  await fs.writeFile(path.join(cli.transcripts, 'tarball.sha256'), `${tarballSha256}  ${tarball}\n`)
  run('install', npmBin, ['install', '-g', '--prefix', cli.globalPrefix, tarball], cli.root)
  const version = run('synth-version', cli.installedCli, ['--version'], cli.root)
  await fs.writeFile(path.join(cli.transcripts, 'version.json'), version.stdout)

  const instructionHashes = {}
  for (const relative of [INSTRUCTIONS_SOURCE, TEMPLATE_SOURCE, INSTRUCTION_SET_INDEX, INSTRUCTION_SETS.guided, INSTRUCTION_SETS.plain]) {
    const body = await fs.readFile(path.join(cli.sourceClone, relative))
    await fs.writeFile(path.join(cli.instructions, path.basename(relative)), body)
    instructionHashes[relative] = sha256(body)
  }
  for (const relative of [FIXTURE_GENERATOR, FIXTURE_LIB]) {
    const body = await fs.readFile(path.join(cli.sourceClone, relative))
    await fs.writeFile(path.join(cli.tools, path.relative('scripts', relative)), body)
  }

  const manifest = {
    status: 'cli-staged',
    stagedAt: new Date().toISOString(),
    repo,
    testedRevision: { commit: assessment.commit, branch: assessment.branch, subject: assessment.subject, dirty: assessment.dirty },
    installedCli: { bin: cli.installedCli, tarball, tarballSha256, version: JSON.parse(version.stdout) },
    instructionHashes,
    instructionsDir: cli.instructions,
    fixturesTool: path.join(cli.tools, 'guided-installed-trial-fixtures.mjs'),
    productCommandsRun: ['synth --version'],
    trialCellsRun: 0,
    lifecycleCommandsRun: [],
  }
  await fs.writeFile(cli.manifest, `${JSON.stringify(manifest, null, 2)}\n`)
  await fs.rm(cli.sourceClone, { recursive: true, force: true })
  logger.step({ step: 'delete-source-clone', command: `rm -rf ${cli.sourceClone}`, cwd: cli.root, exitCode: 0, durationMs: 0, outputTail: '' })
  if (await exists(cli.sourceClone)) throw new Error('source clone still present after cleanup')
  return manifest
}

async function main(argv) {
  const parsed = parseArgs(argv)
  if (parsed.help) {
    console.log(USAGE)
    return 0
  }
  const { repo, workspace, cliRoot } = assertSafeLayout(parsed)
  const layout = layoutFor(workspace ?? path.join(cliRoot, 'unused'), { cliRoot, condition: parsed.condition })

  const drifted = revisionMismatches()
  if (drifted.length > 0) throw new Error(`Fixture drift against the executed E4 record: ${JSON.stringify(drifted)}`)

  const log = []
  const steps = []
  const logger = {
    step: (entry) => {
      steps.push(entry)
      log.push(`$ ${entry.command}\n${entry.outputTail}`)
    },
  }
  const record = (name, command, result, cwd) => logger.step({ step: name, command, cwd, exitCode: result.status, durationMs: result.durationMs, outputTail: `${result.stdout || ''}${result.stderr || ''}`.trim().split('\n').slice(-6).join('\n') })
  const run = (name, command, args, cwd) => {
    const started = Date.now()
    const result = spawnSync(command, args, { cwd, encoding: 'utf-8' })
    const wrapped = { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '', durationMs: Date.now() - started }
    record(name, [command, ...args].join(' '), wrapped, cwd)
    if (wrapped.status !== 0) throw new Error(`${name} failed (exit ${wrapped.status})`)
    return wrapped
  }
  const runCapture = (command, args, cwd) => spawnSync(command, args, { cwd, encoding: 'utf-8' })

  // --- resolve the revision under test (only when a checkout is given) ---
  let assessment = null
  if (repo) {
    if (!(await exists(repo))) throw new Error(`--repo does not exist: ${repo}`)
    assessment = assessRepo(repo, { allowDirty: parsed.allowDirty, pin: parsed.pin })
    if (!assessment.ok) throw new Error(`${assessment.reason}${assessment.remedy ? `. ${assessment.remedy}` : ''}`)
  }

  // --- CLI staging: beforehand, and always outside TEST_PATH ---
  const stagedManifest = await readJsonOrNull(layout.cli.manifest)
  let cliStaging = Boolean(assessment) || Boolean(stagedManifest)
  let stagingReused = false
  let cliManifest = stagedManifest
  if (assessment) {
    const decision = shouldReuseCli(stagedManifest, assessment, {
      installedCliExists: await exists(layout.cli.installedCli),
      refresh: parsed.refreshCli,
    })
    if (decision.reuse) {
      stagingReused = true
      cliManifest = stagedManifest
    } else {
      cliManifest = await prepareCli({ repo, assessment, layout, run, runCapture, logger })
    }
  } else if (!stagedManifest) {
    throw new Error(`no staged CLI at ${layout.cli.manifest}, and no --repo was given to build one`)
  }

  if (parsed.stageOnly) {
    await fs.mkdir(layout.cli.transcripts, { recursive: true })
    await fs.writeFile(path.join(layout.cli.transcripts, 'staged.log'), `${log.join('\n\n')}\n`)
    console.log([
      `CLI STAGED — nothing else was created.`,
      ``,
      `  CLI staging     : ${layout.cliRoot}`,
      `  installed CLI   : ${layout.cli.installedCli}   (setup invoked only: synth --version)`,
      `  revision        : ${cliManifest.testedRevision.commit}  ${cliManifest.testedRevision.subject}`,
      `  tarball SHA-256 : ${cliManifest.installedCli.tarballSha256}`,
      `  transcripts     : ${layout.cli.transcripts}`,
      ``,
      `The trial workspace was NOT created. Later, run:`,
      `  node scripts/guided-installed-trial-setup.mjs --workspace <TEST_PATH>`,
      `and the staged CLI above is reused without running npm or git again.`,
    ].join('\n'))
    return 0
  }

  // --- TEST_PATH: instruction file plus one isolated directory per test ---
  if (!(await pathIsEmptyOrMissing(layout.workspace))) throw new Error(`--workspace must be empty or nonexistent: ${layout.workspace}`)
  await fs.mkdir(layout.workspace, { recursive: true })

  const instructionSource = cliManifest.instructionsDir
  const instructionText = {}
  for (const condition of ['guided', 'plain']) {
    instructionText[condition] = await fs.readFile(path.join(instructionSource, path.basename(INSTRUCTION_SETS[condition])), 'utf-8')
  }
  if (instructionText.guided === instructionText.plain) {
    throw new Error('guided and plain instruction sets are byte-identical: the conditions are indistinguishable')
  }
  const stagedSet = instructionText[parsed.condition]
  if (parsed.condition === 'plain' && /synth/i.test(stagedSet)) {
    throw new Error('the plain instruction set mentions the tool under test; refusing to stage it')
  }

  const fixturesDir = path.join(layout.cli.root, 'fixtures')
  await fs.rm(fixturesDir, { recursive: true, force: true })
  const generated = runCapture(process.execPath, [cliManifest.fixturesTool, fixturesDir], layout.cli.root)
  if (generated.status !== 0) throw new Error(`fixtures failed (exit ${generated.status}): ${generated.stderr}`)
  record('fixtures', `${process.execPath} ${cliManifest.fixturesTool} ${fixturesDir}`, generated, layout.cli.root)
  const revisions = JSON.parse(generated.stdout).revisions
  const expected = caseRevisions()
  for (const caseId of CASE_ORDER) {
    if (revisions[caseId] !== expected[caseId]) throw new Error(`fixture revision mismatch for ${caseId}: ${revisions[caseId]} != ${expected[caseId]}`)
  }

  for (const caseId of parsed.cases) {
    const dir = layout.testDir(caseId)
    await copyTree(path.join(fixturesDir, parsed.condition === 'plain' ? 'plain' : 'guided', caseId), dir)
    const observed = await revisionOfDir(dir)
    if (observed !== expected[caseId]) throw new Error(`staged ${dir} does not match revision ${expected[caseId]} (observed ${observed})`)
  }
  await fs.rm(fixturesDir, { recursive: true, force: true })

  await fs.writeFile(layout.rootInstruction, stagedSet)
  if (parsed.condition === 'guided') {
    await fs.writeFile(layout.environmentFile, renderEnvironment({
      workspace: layout.workspace,
      testDirs: parsed.cases.map((caseId) => TEST_DIRS[caseId]),
      cliRoot: layout.cliRoot,
      installedCli: layout.cli.installedCli,
      manifestPath: path.join(layout.cli.transcripts, 'setup-manifest.json'),
      revision: cliManifest.testedRevision,
    }))
  }

  const manifest = path.join(layout.cli.transcripts, 'setup-manifest.json')
  await fs.writeFile(manifest, `${JSON.stringify({
    status: 'setup-complete-stop-before-agent',
    generatedAt: new Date().toISOString(),
    inputs: { repo: repo ?? null, workspace: layout.workspace },
    inferred: {
      cliRoot: layout.cliRoot,
      testDirs: Object.fromEntries(parsed.cases.map((caseId) => [caseId, TEST_DIRS[caseId]])),
      rootInstruction: layout.rootInstruction,
      environmentFile: parsed.condition === 'guided' ? layout.environmentFile : null,
    },
    condition: parsed.condition,
    testedRevision: cliManifest.testedRevision,
    installedCli: cliManifest.installedCli,
    stagingReused,
    stagingBuiltFrom: cliManifest.repo,
    revisions: expected,
    cases: parsed.cases,
    optionalCases: OPTIONAL_CASES,
    copiedIntoTestPath: parsed.condition === 'guided' ? ['INSTRUCTIONS.md', 'ENVIRONMENT.md'] : ['INSTRUCTIONS.md'],
    buildArtifactsInsideTestPath: [],
    productCommandsRun: ['synth --version'],
    trialCellsRun: 0,
    lifecycleCommandsRun: [],
    launchInstruction: launchInstruction(),
    note: 'Setup only. Build, pack and install live outside TEST_PATH. Counts as a validated recipe, never as trial evidence. The agent is launched in TEST_PATH and told to follow INSTRUCTIONS.md.',
  }, null, 2)}\n`)
  await fs.writeFile(path.join(layout.cli.transcripts, 'setup.log'), `${log.join('\n\n')}\n`)

  console.log(stopBanner({ layout, manifest, assessment, cases: parsed.cases, cliStaging, stagingReused }))
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(`Setup failed: ${error.message}`)
      console.error('Partial state, if any, is left outside the trial for diagnosis; retry in a fresh empty workspace.')
      process.exit(1)
    })
}
