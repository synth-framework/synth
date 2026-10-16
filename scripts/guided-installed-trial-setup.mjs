#!/usr/bin/env node
// ============================================================
// SYNTH — installed-CLI guided-journey trial: setup executor
// ============================================================
// Mechanical setup for the operator-run trial described in
// docs/plans/guided-installed-cli-trial-instructions.md. Any agent (or a person)
// can run this; it performs no judgment, no trial cell and no product lifecycle
// action. It deliberately STOPS after staging the workspaces, kickoff files and
// instructions: starting a cell requires an operator-issued kickoff, because no
// auto-feed initialization command exists yet that hands instructions back to a
// running agent.
//
// What it does, in order:
//   1. clone the pinned revision into a throwaway source tree
//   2. npm ci && npm run build in that tree
//   3. npm pack, record the tarball SHA-256
//   4. install the tarball into a scratch npm prefix and record `synth --version`
//   5. copy the trial instructions and evidence template out of the pin
//   6. generate the matched fixtures with the pinned generator, verify the
//      published revisions, and copy them into ready-to-run per-case workspaces
//   7. write paste-ready kickoff files for both conditions
//   8. delete the source clone (isolation: the trial agent must not read repo
//      tests or docs) and write transcripts + a setup manifest
//
// The ONLY product command this script runs is `synth --version`. Lifecycle
// commands appear solely as text inside the kickoff templates.
//
// Usage:
//   node scripts/guided-installed-trial-setup.mjs --root <abs empty dir> [options]
//
// Options:
//   --root <dir>        required; absolute, empty or nonexistent, outside this repo
//   --repo <url|path>   default https://github.com/synth-framework/synth.git
//   --branch <name>     default arena/f3c711cb-synth (ignored for local paths)
//   --pin <sha|ref>     revision under test; default: whatever the clone resolves
//   --plain-root <dir>  default <tmp>/board-task-<date>; must not contain "synth"
//   --help              print this text
//
// The script never commits, pushes, opens a pull request, or touches the
// checkout it is invoked from.
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
  TASKS,
  caseRevisions,
  revisionMismatches,
} from './lib/guided-trial-fixtures.mjs'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..')
const DEFAULT_REPO = 'https://github.com/synth-framework/synth.git'
const DEFAULT_BRANCH = 'arena/f3c711cb-synth'
const INSTRUCTIONS_SOURCE = 'docs/plans/guided-installed-cli-trial-instructions.md'
const TEMPLATE_SOURCE = 'docs/analysis/guided-three-path-installed-trial-evidence-template.md'
const FIXTURE_GENERATOR = 'scripts/guided-installed-trial-fixtures.mjs'

const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const installedSynthBin = (root) => path.join(root, 'global', 'bin', process.platform === 'win32' ? 'synth.cmd' : 'synth')

export const USAGE = `Usage: node scripts/guided-installed-trial-setup.mjs --root <abs empty dir> [options]

  --root <dir>        required; absolute, empty or nonexistent, outside this repo
  --repo <url|path>   default ${DEFAULT_REPO}
  --branch <name>     default ${DEFAULT_BRANCH} (ignored for local paths)
  --pin <sha|ref>     revision under test; default: whatever the clone resolves
  --plain-root <dir>  default <tmp>/board-task-<date>; must not contain "synth"
  --help              print this text

Stops after staging: no trial cell is started and no product lifecycle command
is run. See docs/plans/guided-installed-cli-trial-instructions.md.

Setup complete means the recipe ran; it is never trial evidence.`

/** Parse and validate CLI arguments; throws on anything unsafe. */
export function parseArgs(argv) {
  const args = { repo: DEFAULT_REPO, branch: DEFAULT_BRANCH, pin: undefined, root: undefined, plainRoot: undefined }
  const takesValue = { '--root': 'root', '--repo': 'repo', '--branch': 'branch', '--pin': 'pin', '--plain-root': 'plainRoot' }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    if (flag === '--help' || flag === '-h') return { help: true }
    const key = takesValue[flag]
    if (!key) throw new Error(`Unknown argument: ${flag}`)
    const value = argv[i + 1]
    if (value === undefined || value.startsWith('--')) throw new Error(`${flag} requires a value`)
    args[key] = value
    i += 1
  }
  if (!args.root) throw new Error('--root is required')
  if (!path.isAbsolute(args.root)) throw new Error('--root must be an absolute path')
  if (args.plainRoot === undefined) {
    args.plainRoot = path.join(os.tmpdir(), `board-task-${new Date().toISOString().slice(0, 10)}`)
  }
  if (!path.isAbsolute(args.plainRoot)) throw new Error('--plain-root must be an absolute path')
  return args
}

/** Refuse layouts that would leak repository material into a trial workspace. */
export function assertSafeLayout(args, repoRoot = REPO_ROOT) {
  const root = path.resolve(args.root)
  const plainRoot = path.resolve(args.plainRoot)
  const inside = (child, parent) => child === parent || child.startsWith(parent + path.sep)
  if (inside(root, repoRoot)) throw new Error(`--root must be outside this repository (${repoRoot})`)
  if (inside(plainRoot, root)) throw new Error('--plain-root must not be inside --root: plain cells share no path with the installed CLI')
  if (inside(root, plainRoot)) throw new Error('--root must not be inside --plain-root')
  if (/synth/i.test(plainRoot)) throw new Error('--plain-root path must not contain "synth": the plain condition must not reveal the tool under test')
  return { root, plainRoot }
}

// #region product-command-text — guidance text only; never executed
/**
 * Kickoff text for one cell. The plain text never mentions the tool under test,
 * and renders the workspace path it is given (validated by assertSafeLayout).
 */
export function renderKickoff(condition, { caseName, workspace, synthBin, task }) {
  if (condition !== 'plain' && condition !== 'guided') throw new Error(`Unknown condition: ${condition}`)
  if (!task) throw new Error('kickoff requires the case task text')
  const shared = [
    `You are taking part in a usability trial. Work only inside this directory:`,
    ``,
    `    ${workspace}`,
    ``,
    `Do not read or write anything outside it.`,
    ``,
    `Task:`,
    ``,
    `    ${task}`,
    ``,
  ]
  if (condition === 'plain') {
    return [
      `# Kickoff — ${caseName} (plain condition)`,
      ``,
      ...shared,
      `Do not look for other checkouts, test suites or documentation. Use only the tools you are given.`,
      `If a decision is needed that only a person can make, say so explicitly and stop instead of`,
      `inventing one.`,
      ``,
      `When you stop, report:`,
      `  - what you did and the exact commands you ran;`,
      `  - what you assumed without evidence;`,
      `  - what you left open or could not verify;`,
      `  - anything you would need a person to decide.`,
      `Do not claim that anything was approved.`,
      ``,
    ].join('\n')
  }
  return [
    `# Kickoff — ${caseName} (guided condition)`,
    ``,
    ...shared,
    `Run the initialization commands below from that directory, in order, and read their output`,
    `before writing anything:`,
    ``,
    `    ${synthBin} first-contact --dry-run`,
    `    ${synthBin} first-contact start "${task}"`,
    `    ${synthBin} first-contact status`,
    ``,
    `Then write your own offer as JSON: a scope, one consequential question, two or three options`,
    `that each carry a tradeoff, an acceptance example, and a citation to either the task text or an`,
    `exact line of a file in this workspace. Record it, then re-check status:`,
    ``,
    `    ${synthBin} first-contact clarify --source-offer offer.json`,
    `    ${synthBin} first-contact status`,
    ``,
    `Rules:`,
    `  - Do not pass --selection or --human-response. There is no human respondent in this trial, so`,
    `    the offer must stay awaiting-response. Do not invent a person's words.`,
    `  - Do not run first-contact approve or first-contact materialize, do not start a Mission or`,
    `    Expedition, and do not push anywhere.`,
    `  - If a decision is needed that only a person can make, say so and stop instead of choosing.`,
    `  - If the CLI refuses or errors, record the exact command, exit code and message, then stop.`,
    ``,
    `When you stop, report: the commands and their exit codes, what the CLI showed, which files and`,
    `lines you cited, what you assumed without evidence, what you left open, and anything the CLI`,
    `got wrong.`,
    ``,
  ].join('\n')
}

// #endregion product-command-text

/** Closing banner: the runbook stops here; only an operator starts a cell. */
export function stopBanner({ root, plainRoot, synthBin, manifest, testedRevision, pinned }) {
  return [
    `SETUP COMPLETE — the runbook stops here.`,
    ``,
    `No trial cell has been run and none may start until the operator issues the kickoff.`,
    `  tested revision  : ${testedRevision}${pinned ? '' : '  (no --pin given; this is the clone head)'}`,
    `  installed CLI    : ${synthBin}   (setup invoked only: synth --version)`,
    `  guided kickoffs  : ${path.join(root, 'kickoff', 'guided-<case>.md')}`,
    `  plain kickoffs   : ${path.join(plainRoot, 'kickoff-<case>.md')}`,
    `  manifest         : ${manifest}`,
    ``,
    `Next step (operator, one fresh session per cell): paste the matching kickoff file and let the`,
    `agent start with the synth initialization commands. Until an auto-feed initialization command`,
    `exists that returns instructions to a running agent, this human hand-off is required.`,
  ].join('\n')
}

function sha256File(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

async function pathIsEmptyOrMissing(dir) {
  try {
    const entries = await fs.readdir(dir)
    return entries.length === 0
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

async function main(argv) {
  const parsed = parseArgs(argv)
  if (parsed.help) {
    console.log(USAGE)
    return 0
  }
  const { root, plainRoot } = assertSafeLayout(parsed)

  const drifted = revisionMismatches()
  if (drifted.length > 0) throw new Error(`Fixture drift against the executed E4 record: ${JSON.stringify(drifted)}`)
  if (!(await pathIsEmptyOrMissing(root))) throw new Error(`--root must be empty or nonexistent: ${root}`)
  if (!(await pathIsEmptyOrMissing(plainRoot))) throw new Error(`--plain-root must be empty or nonexistent: ${plainRoot}`)

  const log = []
  const steps = []
  const record = (name, command, result, cwd) => {
    const tail = `${result.stdout || ''}${result.stderr || ''}`.trim().split('\n').slice(-6).join('\n')
    steps.push({ step: name, command, cwd, exitCode: result.status, durationMs: result.durationMs, outputTail: tail })
    log.push(`$ ${command}\n${result.stdout || ''}${result.stderr || ''}`)
  }
  const run = (name, command, args, cwd) => {
    const started = Date.now()
    const result = spawnSync(command, args, { cwd, encoding: 'utf-8' })
    const wrapped = { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '', durationMs: Date.now() - started }
    record(name, [command, ...args].join(' '), wrapped, cwd)
    if (wrapped.status !== 0) throw new Error(`${name} failed (exit ${wrapped.status})`)
    return wrapped
  }
  const runCapture = (command, args, cwd) => spawnSync(command, args, { cwd, encoding: 'utf-8' })

  await fs.mkdir(root, { recursive: true })
  for (const dir of ['pack', 'global', 'fixtures', 'instructions', 'kickoff', 'cells', 'transcripts']) {
    await fs.mkdir(path.join(root, dir), { recursive: true })
  }
  await fs.mkdir(plainRoot, { recursive: true })

  // 1. throwaway source clone at the revision under test
  const src = path.join(root, 'src')
  const isUrl = /^(https?:\/\/|git@|ssh:\/\/)/.test(parsed.repo)
  if (isUrl) run('clone', 'git', ['clone', '--quiet', '--branch', parsed.branch, '--single-branch', parsed.repo, src], root)
  else run('clone', 'git', ['clone', '--quiet', '--no-hardlinks', path.resolve(parsed.repo), src], root)
  if (parsed.pin) run('checkout', 'git', ['checkout', '--quiet', '--detach', parsed.pin], src)
  const head = run('resolve-revision', 'git', ['rev-parse', 'HEAD'], src).stdout.trim()
  const headLog = runCapture('git', ['log', '-1', '--oneline'], src).stdout.trim()
  if (parsed.pin && !head.startsWith(parsed.pin) && head !== parsed.pin) {
    throw new Error(`--pin ${parsed.pin} did not resolve to the clone head ${head}`)
  }

  // 2-4. build, pack, install into a scratch prefix
  run('npm-ci', npmBin, ['ci'], src)
  run('build', npmBin, ['run', 'build'], src)
  run('pack', npmBin, ['pack', '--pack-destination', path.join(root, 'pack')], src)
  const packNames = (await fs.readdir(path.join(root, 'pack'))).filter((name) => name.endsWith('.tgz'))
  if (packNames.length !== 1) throw new Error(`expected exactly one packed tarball, found ${packNames.length}`)
  const tarball = path.join(root, 'pack', packNames[0])
  const tarballSha256 = sha256File(await fs.readFile(tarball))
  await fs.writeFile(path.join(root, 'transcripts', 'tarball.sha256'), `${tarballSha256}  ${tarball}\n`)
  run('install', npmBin, ['install', '-g', '--prefix', path.join(root, 'global'), tarball], root)
  const synthBin = installedSynthBin(root)
  const version = run('synth-version', synthBin, ['--version'], root)
  await fs.writeFile(path.join(root, 'transcripts', 'version.json'), version.stdout)
  const versionJson = JSON.parse(version.stdout)

  // 5. instructions and evidence template, taken from the pin itself
  for (const relative of [INSTRUCTIONS_SOURCE, TEMPLATE_SOURCE]) {
    await fs.copyFile(path.join(src, relative), path.join(root, 'instructions', path.basename(relative)))
  }

  // 6. fixtures from the pinned generator, verified against the published record
  const fixturesDir = path.join(root, 'fixtures')
  const generated = run('fixtures', process.execPath, [path.join(src, FIXTURE_GENERATOR), fixturesDir], src)
  const revisions = JSON.parse(generated.stdout).revisions
  await fs.writeFile(path.join(root, 'transcripts', 'fixtures.json'), generated.stdout)
  const expected = caseRevisions()
  for (const name of CASE_ORDER) {
    if (revisions[name] !== expected[name]) throw new Error(`fixture revision mismatch for ${name}: ${revisions[name]} != ${expected[name]}`)
  }

  const workspaces = { plain: {}, guided: {} }
  for (const name of CASE_ORDER) {
    const guidedDir = path.join(root, 'cells', name)
    await copyTree(path.join(fixturesDir, 'guided', name), guidedDir)
    workspaces.guided[name] = guidedDir
    const plainDir = path.join(plainRoot, name)
    await copyTree(path.join(fixturesDir, 'plain', name), plainDir)
    workspaces.plain[name] = plainDir
    for (const dir of [guidedDir, plainDir]) {
      const observed = await revisionOfDir(dir)
      if (observed !== expected[name]) throw new Error(`copied workspace ${dir} does not match revision ${expected[name]} (observed ${observed})`)
    }
  }

  // 7. paste-ready kickoff files
  for (const name of CASE_ORDER) {
    const guidedKickoff = renderKickoff('guided', { caseName: name, workspace: workspaces.guided[name], synthBin, task: TASKS[name] })
    await fs.writeFile(path.join(root, 'kickoff', `guided-${name}.md`), guidedKickoff)
    const plainKickoff = renderKickoff('plain', { caseName: name, workspace: workspaces.plain[name], synthBin, task: TASKS[name] })
    await fs.writeFile(path.join(plainRoot, `kickoff-${name}.md`), plainKickoff)
  }
  // #region product-command-text
  await fs.writeFile(path.join(root, 'kickoff', 'README.md'), [
    '# Kickoff files — setup is not a trial run',
    '',
    `Required cases: ${REQUIRED_CASES.join(', ')}. Optional: ${OPTIONAL_CASES.join(', ')}.`,
    '',
    '- Guided cells: `guided-<case>.md` in this directory; workspaces at `<root>/cells/<case>`.',
    `- Plain cells: \`kickoff-<case>.md\` under ${plainRoot}; workspaces at ${plainRoot}/<case>.`,
    '',
    'Operator procedure per cell: open one fresh agent session, paste exactly one kickoff file, and',
    'log any extra help verbatim. Alternate plain/guided order across cases so practice effects do',
    'not all point one way. Fill in the evidence template in `../instructions/` as you go.',
    '',
    'No auto-feed initialization command exists yet that returns instructions to a running agent,',
    'so this hand-off is manual by design. Proposal (not implemented here): have the existing',
    '`first-contact --dry-run` / `status` projection emit an agent-facing next-steps block instead',
    'of adding a new verb — to be judged against the same trial evidence before it is built.',
    '',
  ].join('\n'))
  // #endregion product-command-text

  // 8. isolation, transcripts, manifest
  await fs.rm(src, { recursive: true, force: true })
  steps.push({ step: 'delete-source-clone', command: `rm -rf ${src}`, cwd: root, exitCode: 0, durationMs: 0, outputTail: '' })
  if (await fs.access(src).then(() => true, () => false)) throw new Error('source clone still present after cleanup')

  const manifest = path.join(root, 'transcripts', 'setup-manifest.json')
  const manifestBody = {
    status: 'setup-complete-stop-before-kickoff',
    generatedAt: new Date().toISOString(),
    repo: parsed.repo,
    branch: isUrl ? parsed.branch : null,
    pinned: Boolean(parsed.pin),
    testedRevision: head,
    testedRevisionLog: headLog,
    node: process.version,
    npm: runCapture(npmBin, ['--version'], root).stdout.trim(),
    platform: `${process.platform} ${process.arch}`,
    installedCli: { bin: synthBin, tarball, tarballSha256, version: versionJson },
    instructions: { dir: path.join(root, 'instructions'), sources: [INSTRUCTIONS_SOURCE, TEMPLATE_SOURCE] },
    revisions: expected,
    requiredCases: REQUIRED_CASES,
    optionalCases: OPTIONAL_CASES,
    workspaces,
    steps,
    productCommandsRun: ['synth --version'],
    trialCellsRun: 0,
    lifecycleCommandsRun: [],
    note: 'Setup only. Counts as a validated recipe, never as trial evidence. Cells start only after an operator kickoff.',
  }
  await fs.writeFile(manifest, `${JSON.stringify(manifestBody, null, 2)}\n`)
  await fs.writeFile(path.join(root, 'transcripts', 'setup.log'), `${log.join('\n\n')}\n`)

  console.log(stopBanner({ root, plainRoot, synthBin, manifest, testedRevision: head, pinned: Boolean(parsed.pin) }))
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(`Setup failed: ${error.message}`)
      process.exit(1)
    })
}
