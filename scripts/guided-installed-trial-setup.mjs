#!/usr/bin/env node
// ============================================================
// SYNTH — guided-journey trial: setup executor
// ============================================================
// Mechanical setup for the operator-run trial described in
// docs/plans/guided-installed-cli-trial-instructions.md.
//
// The runbook knows two things and nothing else:
//
//   --repo       the local checkout of SYNTH whose HEAD is the revision under test
//   --workspace  an empty scratch directory that becomes the testing workspace
//
// Everything else is inferred: the revision, the branch, the harness location,
// the per-test directories and their names, the staged instruction set, where
// the CLI is installed, and one paste-ready handoff note per cell.
//
// Layout it creates (all inferred, nothing hand-made):
//
//   <workspace>/
//     .trial/                  harness: pack, install prefix, transcripts, notes
//     greenfield/              brownfield/           documentation/
//     .control/greenfield/     ... (plain condition, only if the path is neutral)
//
// The plain-condition mirrors are skipped when any part of their path spells the
// tool's name, because the plain condition must never learn that the tool exists.
// The reason is recorded in the manifest instead of being silently ignored.
//
// The script performs no judgment, no trial cell, and no lifecycle action. It
// deliberately STOPS after staging: starting a cell requires an operator-issued
// handoff, because no auto-feed initialization command exists yet that hands
// instructions back to a running agent.
//
// The ONLY product command this script runs is `synth --version`.
//
// Usage:
//   node scripts/guided-installed-trial-setup.mjs --repo <path> --workspace <dir> [options]
//
// See USAGE below for the advanced overrides, all of which have inferred
// defaults. The script never commits, pushes, opens a pull request, or modifies
// the checkout it is given.
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

// Sources copied out of the pinned revision into the harness.
const INSTRUCTIONS_SOURCE = 'docs/plans/guided-installed-cli-trial-instructions.md'
const TEMPLATE_SOURCE = 'docs/analysis/guided-three-path-installed-trial-evidence-template.md'
const FIXTURE_GENERATOR = 'scripts/guided-installed-trial-fixtures.mjs'
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

export const HARNESS_DIR = '.trial'
export const CONTROL_DIR = '.control'

const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const synthBinName = process.platform === 'win32' ? 'synth.cmd' : 'synth'

export const USAGE = `Usage: node scripts/guided-installed-trial-setup.mjs --repo <path> --workspace <dir> [options]

  --repo <path>         required; local checkout of the repository; its HEAD is the revision under test
  --workspace <dir>     required; absolute, empty or nonexistent, outside the checkout; the testing workspace
  --cases <a,b,c>       default ${REQUIRED_CASES.join(',')} (available: ${CASE_ORDER.join(', ')})
  --pin <ref>           advanced; default: the checkout's HEAD commit
  --allow-dirty         proceed although the checkout has uncommitted changes (the artifact still comes
                        from the committed HEAD only; the decision is recorded in the manifest)
  --control-root <dir>  advanced; where the plain-condition mirrors live; default <workspace>/${CONTROL_DIR}
  --help                print this text

Everything else is inferred: the revision, the harness location, the per-test
directory names, the staged instruction set, the installed CLI path and one
paste-ready handoff note per cell.

Stops after staging: no trial cell is started and no lifecycle command is run.
See docs/plans/guided-installed-cli-trial-instructions.md.

Setup complete means the recipe ran; it is never trial evidence.`

/** True when a path component does not spell the tool's name. */
export function isNeutralPath(target) {
  return !/synth/i.test(target)
}

/** Every inferred location, derived from the two inputs. */
export function layoutFor(workspace, controlRoot) {
  const root = path.resolve(workspace)
  const harness = path.join(root, HARNESS_DIR)
  const control = path.resolve(controlRoot ?? path.join(root, CONTROL_DIR))
  return {
    workspace: root,
    harness,
    instructions: path.join(harness, 'instructions'),
    kickoff: path.join(harness, 'kickoff'),
    transcripts: path.join(harness, 'transcripts'),
    pack: path.join(harness, 'pack'),
    globalPrefix: path.join(harness, 'global'),
    sourceClone: path.join(harness, 'src'),
    fixtures: path.join(harness, 'fixtures'),
    testDir: (caseId) => path.join(root, TEST_DIRS[caseId]),
    controlRoot: control,
    controlDir: (caseId) => path.join(control, TEST_DIRS[caseId]),
    controlAllowed: isNeutralPath(root) && isNeutralPath(control),
    installedCli: path.join(harness, 'global', 'bin', synthBinName),
  }
}

/** Parse and validate arguments. Throws on anything unsafe or ambiguous. */
export function parseArgs(argv) {
  const args = { repo: undefined, workspace: undefined, cases: REQUIRED_CASES.slice(), pin: undefined, allowDirty: false, controlRoot: undefined }
  const takesValue = { '--repo': 'repo', '--workspace': 'workspace', '--cases': 'cases', '--pin': 'pin', '--control-root': 'controlRoot' }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    if (flag === '--help' || flag === '-h') return { help: true }
    if (flag === '--allow-dirty') {
      args.allowDirty = true
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
  if (!args.repo) throw new Error('--repo is required: the local checkout whose HEAD is the revision under test')
  if (!args.workspace) throw new Error('--workspace is required: the empty testing workspace directory')
  if (!path.isAbsolute(args.workspace)) throw new Error('--workspace must be an absolute path')
  if (args.controlRoot !== undefined && !path.isAbsolute(args.controlRoot)) throw new Error('--control-root must be an absolute path')
  return args
}

/** Refuse layouts that would leak repository material or cross the two inputs. */
export function assertSafeLayout(args) {
  const workspace = path.resolve(args.workspace)
  const repo = path.resolve(args.repo)
  const inside = (child, parent) => child === parent || child.startsWith(parent + path.sep)
  if (inside(workspace, repo)) throw new Error('--workspace must be outside the checkout given by --repo')
  if (inside(repo, workspace)) throw new Error('--repo must not be inside --workspace: the testing workspace must not contain the checkout')
  if (args.controlRoot !== undefined) {
    const control = path.resolve(args.controlRoot)
    if (inside(control, repo)) throw new Error('--control-root must be outside the checkout')
    if (inside(control, workspace)) throw new Error('--control-root must not be inside --workspace')
  }
  return { repo, workspace }
}

/** Decide whether the given checkout can be used as the pinned source. */
export function assessRepo(repo, { allowDirty = false, pin } = {}) {
  const git = (gitArgs) => spawnSync('git', ['-C', repo, ...gitArgs], { encoding: 'utf-8' })
  const inside = git(['rev-parse', '--is-inside-work-tree'])
  if (inside.status !== 0 || inside.stdout.trim() !== 'true') {
    return { ok: false, kind: 'not-a-checkout', reason: `not a git work tree: ${repo}` }
  }
  if (pin !== undefined) {
    const resolved = git(['rev-parse', '--verify', `${pin}^{commit}`])
    if (resolved.status !== 0) return { ok: false, kind: 'bad-pin', reason: `--pin ${pin} does not resolve to a commit in ${repo}` }
    const commit = resolved.stdout.trim()
    const status = git(['status', '--porcelain']).stdout
    const dirty = status.trim().length > 0
    if (dirty && !allowDirty) {
      return {
        ok: false,
        kind: 'dirty',
        commit,
        branch: pin,
        subject: git(['log', '-1', '--oneline', commit]).stdout.trim(),
        dirty,
        reason: 'the checkout has uncommitted changes, so a clone of it would carry the committed history only',
        remedy: 'commit or stash the changes, or pass --allow-dirty to record that decision explicitly',
      }
    }
    return { ok: true, commit, branch: pin, subject: git(['log', '-1', '--oneline', commit]).stdout.trim(), dirty, status, pinnedByRef: true }
  }
  const head = git(['rev-parse', 'HEAD'])
  if (head.status !== 0) return { ok: false, kind: 'no-head', reason: `no commit at HEAD in ${repo}` }
  const commit = head.stdout.trim()
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim()
  const subject = git(['log', '-1', '--oneline']).stdout.trim()
  const status = git(['status', '--porcelain']).stdout
  const dirty = status.trim().length > 0
  if (dirty && !allowDirty) {
    return {
      ok: false,
      kind: 'dirty',
      commit,
      branch,
      subject,
      dirty,
      reason: 'the checkout has uncommitted changes, so a clone of it would carry the committed HEAD only',
      remedy: 'commit or stash the changes, or pass --allow-dirty to record that decision explicitly',
    }
  }
  return { ok: true, commit, branch, subject, dirty, status }
}

function sha256File(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
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

// #region handoff-note-text — staged note text only; no product command is executed here
/**
 * Short handoff note for one cell: the test, the workspace, the staged
 * instruction file, and — guided only — where the CLI is installed. It carries
 * no process; the process lives in the staged instruction set.
 */
export function renderHandoffNote(condition, { caseId, testDir, workspace, synthBin, instructionFile }) {
  if (condition !== 'plain' && condition !== 'guided') throw new Error(`Unknown condition: ${condition}`)
  const test = TEST_DIRS[caseId]
  if (!test) throw new Error(`Unknown case: ${caseId}`)
  const lines = [
    `# Handoff — ${test} (${condition} condition)`,
    ``,
    `You are taking part in a usability trial. Your workspace is:`,
    ``,
    `    ${workspace}`,
    ``,
    `Start by reading the instruction file staged in that workspace and follow it:`,
    ``,
    `    ${instructionFile}`,
    ``,
  ]
  if (condition === 'guided') {
    lines.push(
      `Your assigned test is \`${test}\`. The instruction set tells you to begin with the SYNTH`,
      `initialization process. The CLI is installed at:`,
      ``,
      `    ${synthBin}`,
      ``,
      `and the operator may also have it on PATH as \`synth\`. If neither works, record that and stop.`,
      ``,
    )
  } else {
    lines.push(
      `Your assigned test is \`${test}\`. The instruction set lists all the tests and their`,
      `starting conditions, and states what your report must contain.`,
      ``,
    )
  }
  lines.push(
    `Work only inside your workspace. Do not read or write anything outside it, and do not look for`,
    `other checkouts, test suites or documentation.`,
    ``,
  )
  return lines.join('\n')
}

/** File name of one cell's handoff note. */
export function handoffNoteName(condition, caseId) {
  const test = TEST_DIRS[caseId]
  if (!test) throw new Error(`Unknown case: ${caseId}`)
  return `${condition}-${test}.md`
}

/** Index note for the harness kickoff directory. No process, just the map. */
export function renderKickoffIndex({ workspace, cases, controlCreated, controlReason }) {
  const lines = [
    `# Handoff notes — setup is not a trial run`,
    ``,
    `Testing workspace: ${workspace}`,
    ``,
    `One note per cell. Open one fresh agent session per cell, paste exactly one note, and log`,
    `verbatim any help you give beyond that paste. Alternate the note order across tests so practice`,
    `effects do not all point one way.`,
    ``,
    `| Test directory | Guided note | Plain note |`,
    `| --- | --- | --- |`,
  ]
  for (const caseId of cases) {
    const test = TEST_DIRS[caseId]
    const plain = controlCreated ? `\`${handoffNoteName('plain', caseId)}\`` : '`not created`'
    lines.push(`| \`${test}/\` | \`${handoffNoteName('guided', caseId)}\` | ${plain} |`)
  }
  if (!controlCreated) {
    lines.push('', `Plain mirrors were not created: ${controlReason}`)
  }
  lines.push(
    '',
    'Fill in the evidence template in `../instructions/` as you go, and stop at the end of each note.',
    '',
    'No auto-feed initialization command exists yet that returns instructions to a running agent, so',
    'this hand-off is manual by design. Proposal, not built: have the existing dry-run and status',
    'projection emit an agent-facing next-steps block instead of adding a new verb, judged against',
    'this trial evidence before it is built.',
    '',
  )
  return lines.join('\n')
}
// #endregion handoff-note-text

/** Closing banner: the runbook stops here; only an operator starts a cell. */
export function stopBanner({ repo, workspace, layout, manifest, assessment, cases, controlCreated, controlReason }) {
  const dirty = assessment.dirty ? '  (dirty checkout; --allow-dirty was used)' : ''
  const lines = [
    `SETUP COMPLETE — the runbook stops here.`,
    ``,
    `No trial cell has been run and none may start until the operator issues the handoff.`,
    `  repo               : ${repo}`,
    `  workspace          : ${workspace}`,
    `  tested revision    : ${assessment.commit}  ${assessment.branch}  ${assessment.subject}${dirty}`,
    `  installed CLI      : ${layout.installedCli}   (setup invoked only: synth --version)`,
    `  tests              : ${cases.map((caseId) => `${TEST_DIRS[caseId]}/`).join('  ')}`,
  ]
  if (controlCreated) lines.push(`  plain mirrors      : ${layout.controlRoot}/`)
  else lines.push(`  plain mirrors      : not created — ${controlReason}`)
  lines.push(
    `  handoff notes      : ${layout.kickoff}/    (one pasted note per fresh session, per cell)`,
    `  manifest           : ${manifest}`,
    ``,
    `Next step: open one fresh agent session per cell and paste its handoff note. The agent reads the`,
    `instruction file staged in its own test directory, and in a guided cell begins with the SYNTH`,
    `initialization process rather than any setup script. Until an auto-feed initialization command`,
    `exists that returns instructions to a running agent, this human hand-off is required.`,
  )
  return lines.join('\n')
}

async function main(argv) {
  const parsed = parseArgs(argv)
  if (parsed.help) {
    console.log(USAGE)
    return 0
  }
  const { repo, workspace } = assertSafeLayout(parsed)
  const layout = layoutFor(workspace, parsed.controlRoot)

  const drifted = revisionMismatches()
  if (drifted.length > 0) throw new Error(`Fixture drift against the executed E4 record: ${JSON.stringify(drifted)}`)
  if (!(await exists(repo))) throw new Error(`--repo does not exist: ${repo}`)
  const assessment = assessRepo(repo, { allowDirty: parsed.allowDirty, pin: parsed.pin })
  if (!assessment.ok) {
    throw new Error(`${assessment.reason}${assessment.remedy ? `. ${assessment.remedy}` : ''}`)
  }
  if (!(await pathIsEmptyOrMissing(workspace))) throw new Error(`--workspace must be empty or nonexistent: ${workspace}`)
  if (layout.controlRoot !== path.join(workspace, CONTROL_DIR) && !(await pathIsEmptyOrMissing(layout.controlRoot))) {
    throw new Error(`--control-root must be empty or nonexistent: ${layout.controlRoot}`)
  }

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

  await fs.mkdir(workspace, { recursive: true })
  for (const dir of [layout.harness, layout.pack, layout.globalPrefix, layout.transcripts, layout.kickoff, layout.instructions, layout.fixtures]) {
    await fs.mkdir(dir, { recursive: true })
  }

  // 1. throwaway clone of the given checkout, pinned to the resolved commit
  run('clone', 'git', ['clone', '--quiet', '--no-hardlinks', repo, layout.sourceClone], workspace)
  run('checkout', 'git', ['checkout', '--quiet', '--detach', assessment.commit], layout.sourceClone)
  const head = run('resolve-revision', 'git', ['rev-parse', 'HEAD'], layout.sourceClone).stdout.trim()
  if (head !== assessment.commit) throw new Error(`clone resolved ${head}, expected ${assessment.commit}`)

  // 2-4. build, pack, install into the harness prefix
  run('npm-ci', npmBin, ['ci'], layout.sourceClone)
  run('build', npmBin, ['run', 'build'], layout.sourceClone)
  run('pack', npmBin, ['pack', '--pack-destination', layout.pack], layout.sourceClone)
  const packNames = (await fs.readdir(layout.pack)).filter((name) => name.endsWith('.tgz'))
  if (packNames.length !== 1) throw new Error(`expected exactly one packed tarball, found ${packNames.length}`)
  const tarball = path.join(layout.pack, packNames[0])
  const tarballSha256 = sha256File(await fs.readFile(tarball))
  await fs.writeFile(path.join(layout.transcripts, 'tarball.sha256'), `${tarballSha256}  ${tarball}\n`)
  run('install', npmBin, ['install', '-g', '--prefix', layout.globalPrefix, tarball], workspace)
  const version = run('synth-version', layout.installedCli, ['--version'], workspace)
  await fs.writeFile(path.join(layout.transcripts, 'version.json'), version.stdout)
  const versionJson = JSON.parse(version.stdout)

  // 5. instructions, evidence template and both authored instruction sets, from the pin
  for (const relative of [INSTRUCTIONS_SOURCE, TEMPLATE_SOURCE, INSTRUCTION_SET_INDEX, INSTRUCTION_SETS.guided, INSTRUCTION_SETS.plain]) {
    await fs.copyFile(path.join(layout.sourceClone, relative), path.join(layout.instructions, path.basename(relative)))
  }
  const instructionText = {}
  for (const condition of ['guided', 'plain']) {
    instructionText[condition] = await fs.readFile(path.join(layout.sourceClone, INSTRUCTION_SETS[condition]), 'utf-8')
  }
  if (instructionText.guided === instructionText.plain) {
    throw new Error('guided and plain instruction sets are byte-identical: the conditions are indistinguishable')
  }

  // 6. fixtures from the pinned generator, verified, then staged per test
  const generated = run('fixtures', process.execPath, [path.join(layout.sourceClone, FIXTURE_GENERATOR), layout.fixtures], layout.sourceClone)
  const revisions = JSON.parse(generated.stdout).revisions
  await fs.writeFile(path.join(layout.transcripts, 'fixtures.json'), generated.stdout)
  const expected = caseRevisions()
  for (const caseId of CASE_ORDER) {
    if (revisions[caseId] !== expected[caseId]) {
      throw new Error(`fixture revision mismatch for ${caseId}: ${revisions[caseId]} != ${expected[caseId]}`)
    }
  }

  const cells = {}
  for (const caseId of parsed.cases) {
    const guidedDir = layout.testDir(caseId)
    const guidedInstruction = path.join(guidedDir, 'INSTRUCTIONS.md')
    await copyTree(path.join(layout.fixtures, 'guided', caseId), guidedDir)
    await fs.writeFile(guidedInstruction, instructionText.guided)
    cells[handoffNoteName('guided', caseId)] = { caseId, workspace: guidedDir, instructionFile: guidedInstruction, revision: expected[caseId], condition: 'guided' }
    if (layout.controlAllowed) {
      const plainDir = layout.controlDir(caseId)
      const plainInstruction = path.join(plainDir, 'INSTRUCTIONS.md')
      await copyTree(path.join(layout.fixtures, 'plain', caseId), plainDir)
      await fs.writeFile(plainInstruction, instructionText.plain)
      cells[handoffNoteName('plain', caseId)] = { caseId, workspace: plainDir, instructionFile: plainInstruction, revision: expected[caseId], condition: 'plain' }
    }
  }
  await fs.rm(layout.fixtures, { recursive: true, force: true })

  // 7. one paste-ready handoff note per staged cell
  for (const [name, cell] of Object.entries(cells)) {
    const note = renderHandoffNote(cell.condition, {
      caseId: cell.caseId,
      testDir: TEST_DIRS[cell.caseId],
      workspace: cell.workspace,
      synthBin: layout.installedCli,
      instructionFile: cell.instructionFile,
    })
    await fs.writeFile(path.join(layout.kickoff, `${name}.md`), note)
  }
  const controlReason = layout.controlAllowed
    ? null
    : `the path ${layout.workspace} or ${layout.controlRoot} spells the tool's name, which the plain condition must never see`
  await fs.writeFile(path.join(layout.kickoff, 'README.md'), renderKickoffIndex({
    workspace: layout.workspace,
    cases: parsed.cases,
    controlCreated: layout.controlAllowed,
    controlReason,
  }))

  // 8. isolation, transcripts, manifest
  await fs.rm(layout.sourceClone, { recursive: true, force: true })
  steps.push({ step: 'delete-source-clone', command: `rm -rf ${layout.sourceClone}`, cwd: workspace, exitCode: 0, durationMs: 0, outputTail: '' })
  if (await exists(layout.sourceClone)) throw new Error('source clone still present after cleanup')

  const manifest = path.join(layout.transcripts, 'setup-manifest.json')
  const manifestBody = {
    status: 'setup-complete-stop-before-handoff',
    generatedAt: new Date().toISOString(),
    inputs: { repo, workspace },
    inferred: {
      harness: layout.harness,
      kickoff: layout.kickoff,
      instructions: layout.instructions,
      controlRoot: layout.controlAllowed ? layout.controlRoot : null,
      testDirs: Object.fromEntries(parsed.cases.map((caseId) => [caseId, TEST_DIRS[caseId]])),
    },
    testedRevision: {
      commit: assessment.commit,
      branch: assessment.branch,
      subject: assessment.subject,
      dirty: assessment.dirty,
      dirtyIgnored: assessment.dirty && parsed.allowDirty,
      pinOverride: parsed.pin ?? null,
      pinnedByRef: Boolean(assessment.pinnedByRef),
    },
    node: process.version,
    npm: runCapture(npmBin, ['--version'], workspace).stdout.trim(),
    platform: `${process.platform} ${process.arch}`,
    installedCli: { bin: layout.installedCli, tarball, tarballSha256, version: versionJson },
    instructions: {
      dir: layout.instructions,
      sources: [INSTRUCTIONS_SOURCE, TEMPLATE_SOURCE, INSTRUCTION_SET_INDEX, INSTRUCTION_SETS.guided, INSTRUCTION_SETS.plain],
      stagedPerWorkspace: 'INSTRUCTIONS.md',
      conditionSets: INSTRUCTION_SETS,
      plainSetMentionsTool: /synth/i.test(instructionText.plain),
    },
    revisions: expected,
    cases: parsed.cases,
    optionalCases: OPTIONAL_CASES,
    cells,
    plainMirrors: layout.controlAllowed ? { created: true, root: layout.controlRoot } : { created: false, reason: controlReason },
    steps,
    productCommandsRun: ['synth --version'],
    trialCellsRun: 0,
    lifecycleCommandsRun: [],
    note: 'Setup only, inferred from the two inputs. Counts as a validated recipe, never as trial evidence. Cells start only after an operator handoff; in a guided cell the agent begins with the SYNTH initialization process, not with a setup script.',
  }
  await fs.writeFile(manifest, `${JSON.stringify(manifestBody, null, 2)}\n`)
  await fs.writeFile(path.join(layout.transcripts, 'setup.log'), `${log.join('\n\n')}\n`)

  console.log(stopBanner({
    repo,
    workspace,
    layout,
    manifest,
    assessment,
    cases: parsed.cases,
    controlCreated: layout.controlAllowed,
    controlReason,
  }))
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(`Setup failed: ${error.message}`)
      const workspace = process.argv.includes('--workspace') ? process.argv[process.argv.indexOf('--workspace') + 1] : '<workspace>'
      console.error(`Partial state, if any, is left under ${workspace} for diagnosis. Retry in a fresh empty workspace.`)
      process.exit(1)
    })
}
