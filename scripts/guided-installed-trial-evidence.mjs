#!/usr/bin/env node
// ============================================================
// SYNTH — guided-journey trial: evidence capture
// ============================================================
// One command, one argument, run from the checkout after a trial session:
//
//   node scripts/guided-installed-trial-evidence.mjs --workspace <TEST_PATH>
//
// It reads the finished TEST_PATH — the operator's own workspace, the only thing
// it needs — and files the trial evidence into the repository:
//
//   docs/analysis/guided-installed-cli-trial-<yyyy-mm-dd>[-plain].md
//   docs/analysis/guided-installed-cli-trial-<yyyy-mm-dd>[-plain]-raw/
//
// What it takes from TEST_PATH, per case directory: REPORT.md, offer.json,
// .synth/first-contact/{transcript.jsonl,draft.json} and every other file the CLI
// left under .synth/ (for example .synth/data/cli-errors.jsonl). When the scratch
// directory is reachable (inferred from ENVIRONMENT.md, or passed with --staging)
// it also takes cli-manifest.json and transcripts/{tarball.sha256,version.json,
// setup.log,setup-manifest.json}.
//
// The division of labour is deliberate:
//
//   machine-read   every fact the files already contain — artifact digests, input
//                  revisions against the frozen E4 record, citation hashes
//                  recomputed with the CLI's own rule, offer ids, recorded
//                  timestamps, the launch line setup printed, install proof
//   as-written     the agent's own report sections, quoted verbatim and attributed
//   <to confirm>   everything only a person can supply — names, agent identity,
//                  local wall-clock, time box, terminal state, the §7 recommendation
//
// The script never invents a human word, an elapsed time, a pass/fail judgement or
// a recommendation, and it never writes a value into TEST_PATH. It copies bytes; it
// does not tidy them.
//
// Raw copies keep their bytes and lose nothing but a `.md` suffix: `REPORT.md` is
// copied as `REPORT.md.txt` so that the repository link checker, which scans every
// Markdown file for links, cannot mistake an agent's prose for repository links.
// For the same reason quoted text has `](` escaped as `]\(` in the evidence file;
// the raw copy remains the authority.
// ============================================================

import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  CASE_ORDER,
  E4_REVISIONS,
  FIXTURES,
  OPTIONAL_CASES,
  REQUIRED_CASES,
  TASKS,
  caseRevisions,
  revisionFor,
} from './lib/guided-trial-fixtures.mjs'
import { TEST_DIRS, launchInstruction } from './guided-installed-trial-setup.mjs'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..')

/** Where completed evidence is filed, relative to the repository root. */
export const EVIDENCE_DIR = 'docs/analysis'
export const EVIDENCE_PREFIX = 'guided-installed-cli-trial'
export const TEMPLATE_PATH = `${EVIDENCE_DIR}/guided-three-path-installed-trial-evidence-template.md`
export const RUNBOOK_PATH = 'docs/plans/guided-installed-cli-trial-instructions.md'

/** Directories that hold no trial evidence and are never walked. */
const SKIP_DIRS = new Set(['.git', 'node_modules'])

/** Prefix for every row this script cannot fill without a person. */
export const OPERATOR_PREFIX = '<to confirm — operator'

const operator = (what) => `${OPERATOR_PREFIX}: ${what}>`

/** The CLI's own file-citation rule (src/first-contact/source-brief.ts). */
const CITATION_PATH_RE = /^(?:(?:docs|knowledge)\/.+\.(?:md|mdx)|(?:src|tests)\/.+\.(?:js|jsx|ts|tsx|json)|package\.json)$/i
/** The CLI reads at most 64 KiB per citation. */
const CITATION_READ_LIMIT = 64 * 1024

export const USAGE = `Usage: node scripts/guided-installed-trial-evidence.mjs --workspace <TEST_PATH> [options]

  --workspace <dir>     the finished TEST_PATH to harvest (required; the only input that matters)
  --staging <dir>       CLI scratch directory; inferred from ENVIRONMENT.md when it is not passed
  --condition <name>    guided or plain; inferred from ENVIRONMENT.md and refused when it disagrees
  --cases <a,b,c>       default: every case directory found in TEST_PATH
  --date <yyyy-mm-dd>   default: the date of the newest recorded trial event (falls back to file mtime)

  Advanced overrides, all inferred by default:
  --repo <path>         default: the checkout this script lives in
  --out <path>          default: ${EVIDENCE_DIR}/${EVIDENCE_PREFIX}-<date>[-plain].md
  --raw-dir <path>      default: the evidence file's path without the .md suffix, plus -raw
  --force               overwrite an existing evidence file and raw directory
  --dry-run             print the evidence file instead of writing it
  --json                print the machine summary as JSON after writing
  --help                print this text

Run it from the checkout: the repository is inferred from this script's location. The script writes
only inside that repository, never into TEST_PATH. Rows it cannot fill mechanically are rendered as
"${OPERATOR_PREFIX}: …>" and listed again on stdout when it finishes: fill those by hand, in the
operator's own words, or re-run on the machine that holds the staging directory to fill more of them.
Captured evidence is what the operator forwards to PR #347 in their own comment; this script opens no
pull request, runs no product command and changes no trial file.`

// #region helpers

function sha256(input) {
  return createHash('sha256').update(input).digest('hex')
}

async function exists(target) {
  return fs.access(target).then(() => true, () => false)
}

async function statOrNull(target) {
  return fs.stat(target).then((stat) => stat, () => null)
}

/** Repo-relative, posix-separated. */
function relativeTo(root, target) {
  return path.relative(root, target).split(path.sep).join('/')
}

/** True when `target` is `root` or lives underneath it. */
export function isInside(root, target) {
  if (!root || !target) return false
  const rel = relativeTo(path.resolve(root), path.resolve(target))
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

async function listFilesRecursive(dir) {
  const files = []
  const walk = async (current) => {
    const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => [])
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === '.' || entry.name === '..') continue
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue
        await walk(full)
      } else if (entry.isFile()) {
        files.push(full)
      }
    }
  }
  await walk(dir)
  return files
}

async function readBytes(target) {
  return fs.readFile(target).catch(() => null)
}

/** Parse a JSONL file loosely: unparsable lines are reported, never dropped silently. */
function parseJsonl(text) {
  const rows = []
  const problems = []
  text.split(/\r?\n/).forEach((line, index) => {
    if (line.trim() === '') return
    try {
      rows.push(JSON.parse(line))
    } catch (error) {
      problems.push(`line ${index + 1}: ${error.message}`)
    }
  })
  return { rows, problems }
}

/** Escape `](` so a quoted sentence cannot be read as a link by scripts/check-links.js. */
function quote(text) {
  return String(text ?? '').replace(/\]\(/g, ']\\(')
}

function fenced(text, language = 'text') {
  const body = quote(String(text ?? '').replace(/\r\n/g, '\n')).trimEnd()
  return `\`\`\`${language}\n${body}\n\`\`\``
}

/** Inline code that survives a value containing backticks (the launch line does). */
function inlineCode(text) {
  const value = String(text ?? '')
  const longest = (value.match(/`+/g) ?? []).reduce((max, run) => Math.max(max, run.length), 0)
  const fence = '`'.repeat(longest + 1)
  const pad = /^`|`$/.test(value) ? ' ' : ''
  return `${fence}${pad}${value}${pad}${fence}`
}

/**
 * Report sections open with the shape line the instruction set fixes ("rough elapsed
 * time for this test", "command, exit code and result …"); the agent's own words are
 * the bullet lines that follow, so those are what gets quoted first.
 */
function firstDetail(text) {
  const lines = String(text ?? '').split('\n').map((line) => line.trim()).filter(Boolean)
  const found = lines.find((line) => /^[-*]/.test(line)) ?? lines.find((line) => /\d/.test(line)) ?? lines[0] ?? null
  return found === null ? null : found.replace(/^[-*]\s*/, '')
}

function humanBytes(bytes) {
  if (bytes === null || bytes === undefined) return 'unknown'
  return `${bytes} B`
}

function secondsBetween(from, to) {
  const a = Date.parse(from)
  const b = Date.parse(to)
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.max(0, Math.round((b - a) / 1000))
}

function humanSpan(seconds) {
  if (seconds === null) return 'unknown'
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes} min ${String(rest).padStart(2, '0')} s`
}

// #endregion helpers

// #region arguments and layout

/** Parse and validate arguments. TEST_PATH is the only thing the operator must supply. */
export function parseArgs(argv) {
  const args = {
    workspace: undefined,
    staging: undefined,
    condition: undefined,
    cases: undefined,
    date: undefined,
    out: undefined,
    rawDir: undefined,
    repo: undefined,
    force: false,
    dryRun: false,
    json: false,
  }
  const takesValue = {
    '--workspace': 'workspace',
    '--staging': 'staging',
    '--condition': 'condition',
    '--cases': 'cases',
    '--date': 'date',
    '--out': 'out',
    '--raw-dir': 'rawDir',
    '--repo': 'repo',
  }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    if (flag === '--help' || flag === '-h') return { help: true }
    if (flag === '--force') { args.force = true; continue }
    if (flag === '--dry-run') { args.dryRun = true; continue }
    if (flag === '--json') { args.json = true; continue }
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
  if (!args.workspace) throw new Error('--workspace is required: the finished TEST_PATH to harvest')
  const absolute = ['workspace', 'staging', 'repo', 'out', 'rawDir']
  for (const key of absolute) {
    if (args[key] !== undefined && !path.isAbsolute(args[key])) throw new Error(`--${key === 'rawDir' ? 'raw-dir' : key} must be an absolute path`)
  }
  if (args.condition !== undefined && args.condition !== 'guided' && args.condition !== 'plain') {
    throw new Error('--condition must be guided or plain')
  }
  if (args.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) throw new Error('--date must be yyyy-mm-dd')
  return args
}

/**
 * Refuse the layouts that would make the capture meaningless: a workspace that is
 * not a finished trial directory, a workspace inside the checkout, or a staging
 * directory inside the workspace (nothing built by setup may sit in TEST_PATH).
 */
export function assertSafeLayout({ repo, workspace, staging }) {
  if (isInside(workspace, repo) || isInside(repo, workspace)) {
    throw new Error(`--workspace must live outside the checkout: ${workspace} is ${isInside(workspace, repo) ? 'inside' : 'above'} ${repo}`)
  }
  if (staging && isInside(workspace, staging)) {
    throw new Error(`--staging must live outside TEST_PATH: ${staging} is inside ${workspace}`)
  }
  if (staging && isInside(staging, workspace)) {
    throw new Error(`--staging must live outside TEST_PATH: ${workspace} is inside ${staging}`)
  }
}

/** Read the guided environment note: the machine paths setup recorded in TEST_PATH. */
export async function readEnvironment(workspace) {
  const file = path.join(workspace, 'ENVIRONMENT.md')
  const bytes = await readBytes(file)
  if (!bytes) return { present: false, file: null, text: null }
  const text = bytes.toString('utf-8')
  const value = (label) => {
    const match = text.match(new RegExp(`^${label}\\s*:\\s*(.+)$`, 'm'))
    return match ? match[1].trim() : null
  }
  const revisionLine = value('Revision under test') ?? ''
  const revisionMatch = revisionLine.match(/^([0-9a-f]{7,40})\s*(.*)$/i)
  return {
    present: true,
    file,
    bytes: bytes.length,
    sha256: sha256(bytes),
    text,
    workspace: value('Testing workspace'),
    testDirs: (value('Test directories') ?? '').split(/\s+/).map((item) => item.replace(/\/$/, '')).filter(Boolean),
    cli: value('SYNTH CLI'),
    staging: value('CLI staging'),
    manifest: value('Setup manifest'),
    revision: revisionMatch ? revisionMatch[1] : null,
    revisionShort: revisionMatch ? revisionMatch[1].slice(0, 7) : null,
    revisionSubject: revisionMatch ? revisionMatch[2].trim() : null,
  }
}

/** A staged instruction set is the guided one when it names the tool. */
export async function readStagedInstruction(workspace) {
  const file = path.join(workspace, 'INSTRUCTIONS.md')
  const bytes = await readBytes(file)
  if (!bytes) return { present: false, file: null, namesTool: null, sha256: null }
  const text = bytes.toString('utf-8')
  return { present: true, file, bytes: bytes.length, sha256: sha256(bytes), namesTool: /synth/i.test(text), text }
}

/** Collect the scratch directory when it is reachable: manifest, transcripts, tarball digest. */
export async function collectStaging(stagingRoot = null) {
  const record = {
    root: stagingRoot ?? null,
    source: stagingRoot ? 'argument' : null,
    present: false,
    manifest: null,
    setupManifest: null,
    transcripts: {},
    pack: [],
    notes: [],
  }
  if (!stagingRoot) return record
  record.present = await exists(stagingRoot)
  if (!record.present) {
    record.notes.push(`staging directory not found at capture time: ${stagingRoot}`)
    return record
  }
  const manifestFile = path.join(stagingRoot, 'cli-manifest.json')
  const manifestBytes = await readBytes(manifestFile)
  if (manifestBytes) {
    record.manifest = { file: manifestFile, bytes: manifestBytes.length, sha256: sha256(manifestBytes) }
    try {
      record.manifest.json = JSON.parse(manifestBytes.toString('utf-8'))
    } catch (error) {
      record.notes.push(`cli-manifest.json did not parse: ${error.message}`)
    }
  } else {
    record.notes.push(`cli-manifest.json not found in ${stagingRoot}`)
  }
  const transcriptDir = path.join(stagingRoot, 'transcripts')
  for (const name of ['setup-manifest.json', 'tarball.sha256', 'version.json', 'setup.log']) {
    const file = path.join(transcriptDir, name)
    const bytes = await readBytes(file)
    if (!bytes) continue
    const entry = { file, bytes: bytes.length, sha256: sha256(bytes), text: bytes.toString('utf-8') }
    if (name.endsWith('.json')) {
      try {
        entry.json = JSON.parse(entry.text)
      } catch (error) {
        record.notes.push(`transcripts/${name} did not parse: ${error.message}`)
      }
    }
    record.transcripts[name] = entry
  }
  const packDir = path.join(stagingRoot, 'pack')
  for (const file of await listFilesRecursive(packDir)) {
    const stat = await statOrNull(file)
    const bytes = file.endsWith('.tgz') ? null : await readBytes(file)
    record.pack.push({
      file,
      name: path.basename(file),
      bytes: stat ? stat.size : null,
      sha256: bytes ? sha256(bytes) : null,
      digestRecorded: bytes ? null : 'binary artifact — the digest is in transcripts/tarball.sha256',
    })
  }
  record.setupManifest = record.transcripts['setup-manifest.json']?.json ?? null
  return record
}

/**
 * Recompute a case's starting-input revision and compare it with the frozen E4
 * record. The revision is the CLI-trial definition of "matched inputs": SHA-256 over
 * the sorted [relative path, content] pairs of that case's fixture files — the same
 * function the setup executor refuses to drift from. Files the agent added are not
 * inputs and are reported separately.
 */
export async function checkInputs({ caseId, dir }) {
  const expected = E4_REVISIONS[caseId]
  const frozen = FIXTURES[caseId] ?? {}
  const rows = []
  const present = {}
  const files = []
  for (const [relative, content] of Object.entries(frozen).sort(([a], [b]) => a.localeCompare(b))) {
    const file = path.join(dir, relative)
    const bytes = await readBytes(file)
    const onDisk = bytes ? bytes.toString('utf-8') : null
    const matches = onDisk !== null && onDisk === content
    if (onDisk !== null) {
      present[relative] = onDisk
      rows.push([relative, onDisk])
    }
    files.push({
      path: relative,
      present: bytes !== null,
      matches,
      bytes: bytes ? bytes.length : null,
      sha256: bytes ? sha256(bytes) : null,
      expectedSha256: sha256(content),
    })
  }
  const missing = files.filter((file) => !file.present).map((file) => file.path)
  const changed = files.filter((file) => file.present && !file.matches).map((file) => file.path)
  let basis = 'all-inputs'
  if (files.length === 0) basis = 'no-inputs'
  else if (missing.length > 0) basis = 'partial-inputs'
  // Every starting input is on disk, so the revision is recomputable — a changed
  // input makes it differ from the frozen record, which is a finding, not a blank.
  const observed = basis === 'partial-inputs' ? null : revisionFor(present)
  return {
    expected,
    observed,
    basis,
    matched: observed !== null && observed === expected,
    files,
    missing,
    changed,
    frozenFiles: Object.keys(frozen).sort(),
    task: TASKS[caseId] ?? null,
  }
}

/**
 * Recompute one citation with the CLI's own rule (src/first-contact/source-brief.ts):
 * a file citation hashes the entire file and must also reproduce the exact line; an
 * operator-intent citation hashes the journey's exact original intent.
 */
export async function verifyCitation({ dir, option, originalIntent }) {
  const source = option?.source ?? {}
  const hashRecorded = typeof source.sha256 === 'string' && source.sha256.length > 0
  const base = { optionId: option?.id ?? null, quote: source.quote ?? null, recordedSha256: source.sha256 ?? null, hashRecorded }
  if (source.path !== undefined || source.line !== undefined) {
    const relative = String(source.path ?? '')
    const file = path.join(dir, relative)
    const bytes = await readBytes(file)
    const result = {
      ...base,
      kind: 'file',
      path: relative,
      line: source.line ?? null,
      pathAllowedByCli: CITATION_PATH_RE.test(relative) && !path.isAbsolute(relative) && !relative.includes('\\'),
      expectedLine: null,
      recomputedSha256: null,
      hashMatches: null,
      lineMatches: null,
    }
    if (!bytes) return { ...result, status: 'file-missing' }
    if (bytes.length > CITATION_READ_LIMIT) return { ...result, status: 'file-over-cli-read-limit' }
    const content = bytes.toString('utf-8')
    result.recomputedSha256 = sha256(content)
    result.hashMatches = hashRecorded ? result.recomputedSha256 === source.sha256 : null
    const line = Number(source.line)
    result.expectedLine = Number.isSafeInteger(line) && line >= 1 ? content.split(/\r?\n/)[line - 1] ?? null : null
    result.lineMatches = Number.isSafeInteger(line) && line >= 1 ? result.expectedLine === source.quote : false
    result.status = !result.lineMatches
      ? 'line-mismatch'
      : hashRecorded ? (result.hashMatches ? 'matched' : 'hash-mismatch') : 'matched-recomputed'
    return result
  }
  if (source.kind === 'operator-intent') {
    const quoteMatches = originalIntent !== null && source.quote === originalIntent
    const recomputedSha256 = originalIntent === null ? null : sha256(originalIntent)
    return {
      ...base,
      kind: 'operator-intent',
      path: null,
      line: null,
      pathAllowedByCli: true,
      expectedLine: originalIntent,
      recomputedSha256,
      hashMatches: hashRecorded ? recomputedSha256 !== null && recomputedSha256 === source.sha256 : null,
      lineMatches: quoteMatches,
      status: quoteMatches
        ? (hashRecorded ? (recomputedSha256 === source.sha256 ? 'matched' : 'hash-mismatch') : 'matched-recomputed')
        : originalIntent === null ? 'original-intent-not-captured' : 'quote-mismatch',
    }
  }
  return { ...base, kind: source.kind ?? 'unknown', path: null, line: null, status: 'unsupported-source-kind' }
}

/** Commands are read out of the agent's report only; nothing else is treated as a command. */
export function commandsFromReport(sections) {
  const text = sections?.COMMANDS
  if (!text) return []
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('-') || line.startsWith('$'))
    .map((line) => line.replace(/^[-$]\s*/, ''))
}

const LIFECYCLE_RE = /(?:^|[\s`"'])(?:--approve|--selection|--human-response|-approve|materialize|mission\s+(?:build|approve|start)|expedition\s+(?:start|complete)|deliver|seal|git\s+push)(?=$|[\s`"',;])/i

/** What the captured files prove about condition integrity, and nothing more. */
export function integrityOf(caseData) {
  const events = caseData.transcript?.events ?? []
  const operatorInputs = events.filter((event) => event.actor === 'operator')
  const lifecycle = []
  for (const command of caseData.commands) {
    if (LIFECYCLE_RE.test(command)) lifecycle.push(command)
  }
  for (const error of caseData.dataErrors) {
    if (LIFECYCLE_RE.test(String(error.error ?? ''))) lifecycle.push(`cli-errors: ${error.error}`)
  }
  const draft = caseData.draft?.json ?? {}
  const workingBrief = draft.workingBrief ?? caseData.workingBrief?.json ?? null
  const sourceAnswers = Array.isArray(draft.sourceAnswers) ? draft.sourceAnswers : []
  const choiceReviews = Array.isArray(draft.choiceReviews) ? draft.choiceReviews : []
  return {
    operatorInputEvents: operatorInputs.length,
    agentProposalEvents: events.filter((event) => event.actor === 'agent').length,
    lifecycleCommands: lifecycle,
    sourceAnswers: sourceAnswers.length,
    choiceReviews: choiceReviews.length,
    workingBriefStatus: workingBrief?.status ?? null,
    terminalState: workingBrief?.status ?? null,
    openAgentChoices: Array.isArray(draft.openAgentChoices) ? draft.openAgentChoices.length : null,
    transcriptFirst: events[0]?.timestamp ?? null,
    transcriptLast: events[events.length - 1]?.timestamp ?? null,
    spanSeconds: secondsBetween(events[0]?.timestamp, events[events.length - 1]?.timestamp),
  }
}

/** The CLI's own record of the accepted offer — the copy that carries the citation hashes. */
export function latestRecordedOffer(draft) {
  const offers = Array.isArray(draft?.sourceOffers) ? draft.sourceOffers.slice() : []
  if (offers.length === 0) return null
  offers.sort((a, b) => (a?.version ?? 0) - (b?.version ?? 0))
  return offers[offers.length - 1]
}

/** The id of the offer the CLI wrote into the transcript, when the offer file itself carries none. */
export function offerIdFromTranscript(events = []) {
  for (const event of events) {
    const match = String(event?.content ?? '').match(/offer-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)
    if (match) return match[0]
  }
  return null
}

/** Does the file the agent wrote agree with the offer the CLI recorded? */
export function compareOffers(agentOffer, recorded) {
  if (!recorded) return { available: false, filePresent: Boolean(agentOffer), questionMatches: null, scopeMatches: null, optionIdsMatch: null, sourcesMatch: null, notes: ['no CLI-recorded offer exists in the captured draft'] }
  if (!agentOffer) return { available: true, filePresent: false, questionMatches: null, scopeMatches: null, optionIdsMatch: null, sourcesMatch: null, notes: ['no offer file was captured; only the CLI-recorded copy exists'] }
  const notes = []
  const agentOptions = Array.isArray(agentOffer.options) ? agentOffer.options : []
  const recordedOptions = Array.isArray(recorded.options) ? recorded.options : []
  const agentIds = agentOptions.map((option) => option?.id ?? null)
  const recordedIds = recordedOptions.map((option) => option?.id ?? null)
  const optionIdsMatch = agentIds.length === recordedIds.length && agentIds.every((id, index) => id === recordedIds[index])
  if (!optionIdsMatch) notes.push(`option ids differ: file [${agentIds.join(', ')}] vs recorded [${recordedIds.join(', ')}]`)
  const questionMatches = agentOffer.question === recorded.question
  const scopeMatches = agentOffer.scope === recorded.scope
  if (!questionMatches) notes.push('question text differs from the recorded offer')
  if (!scopeMatches) notes.push('scope text differs from the recorded offer')
  let sourcesMatch = agentOptions.length > 0
  for (const recordedOption of recordedOptions) {
    const agentOption = agentOptions.find((option) => option?.id === recordedOption?.id)
    if (!agentOption) {
      sourcesMatch = false
      continue
    }
    const from = agentOption.source ?? {}
    const to = recordedOption.source ?? {}
    for (const key of ['kind', 'path', 'line', 'quote']) {
      if ((from[key] ?? null) !== (to[key] ?? null)) {
        sourcesMatch = false
        notes.push(`option ${recordedOption?.id ?? '(no id)'}: ${key} differs from the recorded source`)
      }
    }
  }
  const hashesOnlyInRecorded = recordedOptions.some((option) => (option?.source ?? {}).sha256)
    && agentOptions.every((option) => (option?.source ?? {}).sha256 === undefined)
  if (hashesOnlyInRecorded) notes.push('the offer file carries kind/quote/path/line only; the CLI added the citation hashes to the recorded copy')
  if (agentOffer.id === undefined) notes.push(`the offer file carries no id; the CLI recorded ${recorded.id} version ${recorded.version}`)
  return { available: true, filePresent: true, questionMatches, scopeMatches, optionIdsMatch, sourcesMatch, notes }
}

/** Everything one case directory holds, read once. */
export async function collectCase({ caseId, dir, dirName }) {
  const collected = { caseId, dirName, dir, present: true, notes: [] }

  const reportFile = path.join(dir, 'REPORT.md')
  const reportBytes = await readBytes(reportFile)
  collected.report = reportBytes
    ? { present: true, file: reportFile, bytes: reportBytes.length, sha256: sha256(reportBytes), text: reportBytes.toString('utf-8') }
    : { present: false, file: reportFile }
  collected.sections = parseReportSections(collected.report.text ?? '')

  const offerFile = path.join(dir, 'offer.json')
  const offerBytes = await readBytes(offerFile)
  collected.offer = { present: false, file: offerFile }
  if (offerBytes) {
    collected.offer = { present: true, file: offerFile, bytes: offerBytes.length, sha256: sha256(offerBytes), text: offerBytes.toString('utf-8') }
    try {
      const json = JSON.parse(collected.offer.text)
      collected.offer.json = json
      const problems = []
      if (!Array.isArray(json.options) || json.options.length < 2 || json.options.length > 4) problems.push('options must be 2–4')
      const ids = new Set()
      for (const option of json.options ?? []) {
        if (typeof option.id !== 'string' || !/^[a-zA-Z0-9-]+$/.test(option.id)) problems.push(`option id ${JSON.stringify(option.id)} is not [a-zA-Z0-9-]+`)
        else if (ids.has(option.id)) problems.push(`duplicate option id ${option.id}`)
        else if (option.id === 'defer') problems.push('option id "defer" is reserved')
        ids.add(option.id)
      }
      if (typeof json.question !== 'string' || json.question.trim() === '') problems.push('question is missing')
      if (typeof json.scope !== 'string' || json.scope.trim() === '') problems.push('scope is missing')
      collected.offer.problems = problems
    } catch (error) {
      collected.offer.problems = [`offer.json did not parse: ${error.message}`]
    }
  }

  const transcriptFile = path.join(dir, '.synth', 'first-contact', 'transcript.jsonl')
  const transcriptBytes = await readBytes(transcriptFile)
  collected.transcript = { present: false, file: transcriptFile, events: [] }
  if (transcriptBytes) {
    const parsed = parseJsonl(transcriptBytes.toString('utf-8'))
    collected.transcript = {
      present: true,
      file: transcriptFile,
      bytes: transcriptBytes.length,
      sha256: sha256(transcriptBytes),
      events: parsed.rows,
      problems: parsed.problems,
    }
    if (parsed.problems.length > 0) collected.notes.push(`transcript.jsonl: ${parsed.problems.length} unparsable line(s)`)
  }

  const draftFile = path.join(dir, '.synth', 'first-contact', 'draft.json')
  const draftBytes = await readBytes(draftFile)
  collected.draft = { present: false, file: draftFile }
  if (draftBytes) {
    collected.draft = { present: true, file: draftFile, bytes: draftBytes.length, sha256: sha256(draftBytes), text: draftBytes.toString('utf-8') }
    try {
      collected.draft.json = JSON.parse(collected.draft.text)
    } catch (error) {
      collected.draft.problems = [`draft.json did not parse: ${error.message}`]
    }
  }

  // Every other CLI-stored file, so a re-run on the owner's machine captures state
  // this handoff copy does not have (working brief, manifest, further data logs).
  collected.stateFiles = []
  const stateFiles = await listFilesRecursive(path.join(dir, '.synth'))
  for (const file of stateFiles) {
    const bytes = await readBytes(file)
    collected.stateFiles.push({
      file,
      relative: relativeTo(dir, file),
      bytes: bytes ? bytes.length : null,
      sha256: bytes ? sha256(bytes) : null,
    })
  }
  const workingBriefFile = stateFiles.find((file) => /working-?brief/i.test(path.basename(file)))
  if (workingBriefFile) {
    const bytes = await readBytes(workingBriefFile)
    try {
      collected.workingBrief = { file: workingBriefFile, json: JSON.parse(bytes.toString('utf-8')) }
    } catch {
      collected.workingBrief = { file: workingBriefFile, json: null }
    }
  }

  collected.dataErrors = []
  for (const file of stateFiles.filter((candidate) => candidate.endsWith('.jsonl') && !candidate.endsWith('transcript.jsonl'))) {
    const bytes = await readBytes(file)
    const parsed = parseJsonl(bytes.toString('utf-8'))
    collected.dataErrors.push({ name: relativeTo(dir, file), rows: parsed.rows.length, problems: parsed.problems, entries: parsed.rows })
  }

  collected.inputs = await checkInputs({ caseId, dir })
  collected.extras = (await listFilesRecursive(dir))
    .filter((file) => {
      const relative = relativeTo(dir, file)
      if (relative === 'REPORT.md' || relative === 'offer.json') return false
      if (relative.startsWith('.synth/')) return false
      return !collected.inputs.frozenFiles.includes(relative)
    })
    .map((file) => ({ relative: relativeTo(dir, file), file }))

  collected.recorded = latestRecordedOffer(collected.draft?.json)
  collected.offerAgreement = compareOffers(collected.offer.json ?? null, collected.recorded)
  collected.originalIntent = collected.recorded?.originIntent
    ?? collected.draft?.json?.artifact?.intent?.description
    ?? collected.transcript.events.find((event) => event.actor === 'operator' && typeof event.content === 'string')?.content
    ?? null
  collected.offeredAt = collected.recorded?.offeredAt ?? null
  collected.attribution = collected.recorded?.attribution ?? null
  collected.offerId = collected.recorded?.id ?? offerIdFromTranscript(collected.transcript.events)
  const citedOptions = collected.recorded?.options ?? collected.offer.json?.options ?? []
  collected.citationSource = collected.recorded ? 'the CLI-recorded offer (draft.sourceOffers)' : collected.offer.json ? 'the agent offer file' : 'nothing — no offer was captured'
  collected.citations = []
  for (const option of citedOptions) {
    collected.citations.push(await verifyCitation({ dir, option, originalIntent: collected.originalIntent }))
  }
  collected.commands = commandsFromReport(collected.sections)
  collected.integrity = integrityOf(collected)
  collected.dates = (collected.transcript.events ?? [])
    .map((event) => event.timestamp)
    .filter((value) => typeof value === 'string')
    .sort()
  return collected
}

/** The report shape is fixed by the instruction set (§6); extra headings are kept when they are unambiguous. */
export const KNOWN_REPORT_SECTIONS = new Set([
  'TEST', 'COMMANDS', 'CLI OUTPUT', 'OFFER', 'CITATIONS', 'APPLICATION TESTS',
  'ASSUMPTIONS', 'STILL OPEN', 'PROBLEMS', 'EFFORT',
])

export function parseReportSections(text) {
  const cleaned = String(text ?? '').replace(/\r\n/g, '\n')
  const lines = cleaned.split('\n')
  const sections = {}
  let current = null
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const match = line.match(/^([A-Z][A-Z /-]*):\s*(.*)$/)
    const isHeading = Boolean(match)
      && match[1].trim().length <= 24
      && (KNOWN_REPORT_SECTIONS.has(match[1].trim()) || lines[index - 1] === undefined || lines[index - 1].trim() === '')
    if (isHeading) {
      current = match[1].trim()
      sections[current] = match[2].trim()
    } else if (current) {
      sections[current] = `${sections[current]}\n${line}`.trimEnd()
    }
  }
  return sections
}

/** Derive the evidence date: newest recorded trial event, else file mtime, else today. */
export async function deriveDate({ cases, explicit }) {
  if (explicit) return { date: explicit, source: 'argument' }
  const stamps = cases.flatMap((entry) => entry.dates ?? []).sort()
  if (stamps.length > 0) {
    const newest = stamps[stamps.length - 1]
    return { date: newest.slice(0, 10), source: `newest recorded trial event (${newest})` }
  }
  const mtimes = []
  for (const entry of cases) {
    for (const file of [entry.report?.file, entry.offer?.file, entry.transcript?.file, entry.draft?.file]) {
      if (!file) continue
      const stat = await statOrNull(file)
      if (stat) mtimes.push(stat.mtime.toISOString())
    }
  }
  if (mtimes.length > 0) {
    const newest = mtimes.sort()[mtimes.length - 1]
    return { date: newest.slice(0, 10), source: `newest artifact mtime (${newest})` }
  }
  return { date: new Date().toISOString().slice(0, 10), source: 'capture time — no artifact timestamps were found' }
}

// #endregion arguments and layout

// #region evidence text

function cellBlock(title, lines) {
  return [`### ${title}`, '', ...lines, ''].join('\n')
}

function bullet(label, value) {
  return `- ${label}: ${value}`
}

/** One per-case cell, in the template's own bullet order. */
function renderCell(entry, model) {
  const condition = model.condition.resolved
  const sections = entry.sections ?? {}
  const span = humanSpan(entry.integrity.spanSeconds)
  const times = entry.dates.length > 0
    ? `first recorded CLI event \`${entry.dates[0]}\`, last \`${entry.dates[entry.dates.length - 1]}\` (recorded span ${span})`
    : 'no timestamped CLI event was captured'
  const changedNote = entry.inputs.changed.length > 0
    ? `${entry.inputs.changed.length} of them differ in bytes from the frozen fixture bodies (${entry.inputs.changed.map((item) => `\`${item}\``).join(', ')}), so the input was modified after staging — see §3`
    : 'all byte-identical to the frozen fixtures'
  const revisionLine = entry.inputs.basis === 'all-inputs'
    ? `expected \`${entry.inputs.expected}\`; observed \`${entry.inputs.observed}\`; matched ${entry.inputs.matched ? 'yes' : 'NO'} — ${entry.inputs.files.length} input file(s): ${changedNote}`
    : entry.inputs.basis === 'no-inputs'
      ? `expected \`${entry.inputs.expected}\`; observed \`${entry.inputs.observed}\`; matched ${entry.inputs.matched ? 'yes' : 'NO'} — this case starts empty, so the revision is the hash of an empty file set`
      : `expected \`${entry.inputs.expected}\`; observed not computable; ${entry.inputs.missing.length} input file(s) missing from this capture: ${entry.inputs.missing.map((item) => `\`${item}\``).join(', ')}. The captured offer and report are unaffected.`
  const added = []
  if (entry.report.present) added.push(`\`REPORT.md\` (${humanBytes(entry.report.bytes)})`)
  if (entry.offer.present) added.push(`\`offer.json\` (${humanBytes(entry.offer.bytes)})`)
  if (entry.stateFiles.length > 0) added.push(`\`.synth/\` (${entry.stateFiles.length} file(s))`)
  for (const extra of entry.extras) added.push(`\`${extra.relative}\` (${humanBytes(extra.bytes ?? null)})`)

  const shared = [
    bullet('Input revision at start / any file change during the cell', `${revisionLine}. Files present that are not starting inputs: ${added.length > 0 ? added.join(', ') : 'none'}.`),
    bullet('Operator effort (minutes) and agent turns / interventions', `${sections.EFFORT ? `the report's own estimate: ${quote(firstDetail(sections.EFFORT) ?? '')}` : 'the report records no effort estimate'}; recorded ${entry.integrity.operatorInputEvents} operator input event(s) and ${entry.integrity.agentProposalEvents} agent event(s) in the CLI transcript${entry.offeredAt ? `, offer recorded at \`${entry.offeredAt}\`` : ''}${entry.draft?.json?.updatedAt ? `, draft last written \`${entry.draft.json.updatedAt}\`` : ''}. ${operator('elapsed minutes on the clock, turns, and every intervention verbatim')}`),
  ]
  const reportExtras = []
  if (sections['CLI OUTPUT']) reportExtras.push(bullet('CLI output the agent summarized (`REPORT.md` section CLI OUTPUT, verbatim)', fenced(sections['CLI OUTPUT'])))
  if (sections.PROBLEMS) reportExtras.push(bullet('What the agent reported as wrong or contradictory (`REPORT.md` section PROBLEMS, verbatim)', fenced(sections.PROBLEMS)))
  const terminal = bullet('Terminal state: `pass` / `fail` / `blocked` / `not run` — reason', operator(`the terminal state for this cell, with the reason — the captured files prove what happened, not whether it counts as a pass (recorded for this cell: ${entry.integrity.terminalState ?? 'no machine-recorded terminal projection'})`))

  if (condition === 'plain') {
    return cellBlock(`${entry.dirName} / plain`, [
      bullet('Session id and start time', `${times}. ${operator('agent session id and local wall-clock start/end')}`),
      bullet('Commands and exit codes', sections.COMMANDS ? `${operator('confirm these are complete')} — as written in \`REPORT.md\`:\n\n${fenced(sections.COMMANDS)}` : operator('the commands run and their exit codes')),
      ...shared,
      bullet('Questions or options the agent raised', sections.OFFER ? `as written in \`REPORT.md\`:\n\n${fenced(sections.OFFER)}` : operator('the questions or options the agent raised')),
      bullet('Grounding: which files/lines were actually read and cited', sections.CITATIONS ? `as written in \`REPORT.md\`:\n\n${fenced(sections.CITATIONS)}` : operator('what the agent actually read')),
      bullet('Unsupported assumptions', sections.ASSUMPTIONS ? `as written in \`REPORT.md\`:\n\n${fenced(sections.ASSUMPTIONS)}` : operator('unsupported assumptions')),
      bullet('Unresolved choices it left open', sections['STILL OPEN'] ? `as written in \`REPORT.md\`:\n\n${fenced(sections['STILL OPEN'])}` : operator('unresolved choices')),
      bullet('Application test command and exit (brown only)', sections['APPLICATION TESTS'] ? `as written in \`REPORT.md\`:\n\n${fenced(sections['APPLICATION TESTS'])}` : `not applicable or not reported; ${operator('the application test command and exit codes')}`),
      terminal,
      ...reportExtras,
    ])
  }

  const citationLines = entry.citations.length > 0
    ? entry.citations.map((citation) => {
      const target = citation.kind === 'file' ? inlineCode(`${citation.path}:${citation.line}`) : citation.kind === 'operator-intent' ? "operator-intent (the journey's original request)" : `kind ${citation.kind}`
      const detail = citation.status === 'matched'
        ? `verified — the hash the CLI recorded recomputes to the same value (\`${citation.recomputedSha256}\`) and the quoted ${citation.kind === 'file' ? 'line' : 'intent'} matches the live source`
        : citation.status === 'matched-recomputed'
          ? `verified without a recorded hash — the quoted ${citation.kind === 'file' ? `line ${citation.line} matches the live file and the full file hashes to` : 'intent matches the journey request and hashes to'} \`${citation.recomputedSha256}\``
          : citation.status === 'hash-mismatch'
            ? `NO — recomputed sha256 ${citation.recomputedSha256 ?? 'unavailable'} ≠ recorded ${citation.recordedSha256 ?? 'unavailable'}`
            : citation.status === 'line-mismatch'
              ? `NO — the hash matches but line ${citation.line} reads ${JSON.stringify(citation.expectedLine ?? null)}`
              : citation.status === 'quote-mismatch'
                ? "NO — the quoted intent is not this journey's original request"
                : `NO — ${citation.status}`
      return `  - \`${citation.optionId ?? '(no id)'}\` → ${target}: ${detail}`
    }).join('\n')
    : (entry.offer.present || entry.recorded ? '  - the captured offer carries no citations' : '  - no offer was captured')
  const citationOk = (citation) => citation.status === 'matched' || citation.status === 'matched-recomputed'
  const allCitationsMatched = entry.citations.length > 0 && entry.citations.every(citationOk)
  const agreement = entry.offerAgreement ?? { available: false, filePresent: false, notes: [] }
  const agreementLine = agreement.available && agreement.filePresent
    ? `${agreement.optionIdsMatch && agreement.questionMatches && agreement.scopeMatches && agreement.sourcesMatch ? 'yes' : 'NO'}${agreement.notes.length > 0 ? ` (${agreement.notes.map((note) => quote(note)).join('; ')})` : ''}`
    : agreement.notes.map((note) => quote(note)).join('; ') || 'not comparable'

  return cellBlock(`${entry.dirName} / guided`, [
    bullet('Session id and start time', `journeyId \`${entry.draft?.json?.journeyId ?? 'not captured'}\`; ${times}. ${operator('agent session id and local wall-clock start/end')}`),
    bullet('Commands and exit codes', sections.COMMANDS ? `${operator('confirm these are complete')} — as written in \`REPORT.md\`:\n\n${fenced(sections.COMMANDS)}` : operator('the commands run and their exit codes')),
    bullet('`first-contact status` terminal projection (`awaiting-response` required here)', entry.integrity.terminalState ? `\`${entry.integrity.terminalState}\` (machine-recorded working brief status)` : `${sections['CLI OUTPUT'] ? `not machine-recorded in this capture; the report's CLI OUTPUT section says: ${quote(sections['CLI OUTPUT'].split('\n').find((line) => /awaiting-response|workingBrief/i.test(line)) ?? 'no such line')}. ` : ''}${operator('the status projection you saw, verbatim')}`),
    ...shared,
    bullet('Agent-authored offer path and its citation targets', entry.offer.present
      ? `\`${entry.dirName}/offer.json\` (${humanBytes(entry.offer.bytes)}, sha256 \`${entry.offer.sha256}\`); the CLI recorded it as \`${entry.offerId ?? 'an offer whose id was not captured'}\`${entry.recorded?.version !== undefined ? ` version ${entry.recorded.version}` : ''}${entry.attribution ? `, attribution \`${entry.attribution}\`` : ''}${entry.offeredAt ? `, offeredAt \`${entry.offeredAt}\`` : ''}; question: ${quote(entry.recorded?.question ?? entry.offer.json?.question ?? 'not captured')}\n\n${fenced((entry.recorded?.options ?? entry.offer.json?.options ?? []).map((option) => `${option.id ?? '(no id)'} — ${option.label ?? ''}${option.source?.path ? ` [${option.source.path}:${option.source.line}]` : option.source?.kind ? ` [${option.source.kind}]` : ''}`).join('\n'), 'text')}\n  File and record agree on option ids, question and scope: ${agreementLine}.`
      : operator('which offer the agent wrote and where it left it')),
    bullet('Whether each citation matched the real file content and line', `${allCitationsMatched ? 'all' : 'not all'} recomputed here with the CLI rule, against ${entry.citationSource} (a recorded hash must recompute to the same value; a source with no recorded hash is verified by its quote and reported with the recomputed digest):\n${citationLines}${entry.citations.some((citation) => citation.status === 'file-missing') ? `\n  - note: the cited input files are not part of this capture, so those citations could not be re-checked here; the CLI's recorded hashes are preserved in \`draft.json\`` : ''}${entry.offer.problems?.length ? `\n  - offer-file schema notes: ${entry.offer.problems.join('; ')}` : ''}`),
    bullet('Questions or options the agent raised', `the recorded question and options are the offer above; ${sections.OFFER ? `as written in \`REPORT.md\`:\n\n${fenced(sections.OFFER)}` : operator('anything the report should add')}`),
    bullet('Unsupported assumptions', sections.ASSUMPTIONS ? `as written in \`REPORT.md\`:\n\n${fenced(sections.ASSUMPTIONS)}` : operator('unsupported assumptions')),
    bullet('Unresolved choices it left open', sections['STILL OPEN'] ? `as written in \`REPORT.md\`:\n\n${fenced(sections['STILL OPEN'])}` : operator('unresolved choices')),
    bullet('Any SYNTH integrity message, warning or failure text', entry.dataErrors.length > 0 ? `${entry.dataErrors.reduce((sum, entryLog) => sum + entryLog.rows, 0)} recorded error line(s) in ${entry.dataErrors.map((entryLog) => `\`${entryLog.name}\``).join(', ')}:\n\n${fenced(entry.dataErrors.flatMap((entryLog) => entryLog.entries.map((row) => `${row.timestamp ?? ''} ${row.error ?? JSON.stringify(row)}`)).join('\n'))}` : (sections.PROBLEMS ? `no CLI error log was captured; the report's PROBLEMS section:\n\n${fenced(sections.PROBLEMS)}` : operator('any integrity message, warning or failure text'))),
    bullet('Application test command and exit (brown only, before and after any change)', sections['APPLICATION TESTS'] ? `as written in \`REPORT.md\`:\n\n${fenced(sections['APPLICATION TESTS'])}` : `not reported in this cell; ${operator('the application test command and exit codes')}`),
    terminal,
    ...reportExtras,
  ])
}

/** The whole evidence document, in the template's section order. */
export function renderEvidence(model) {
  const out = []
  const cases = model.cases
  const captured = cases.map((entry) => `${entry.dirName}/${model.condition.resolved}`)
  const missingCells = []
  for (const caseId of CASE_ORDER) {
    for (const condition of ['guided', 'plain']) {
      const dirName = TEST_DIRS[caseId]
      const label = `${dirName}/${condition}`
      if (condition !== model.condition.resolved || !cases.some((entry) => entry.caseId === caseId)) missingCells.push(label)
    }
  }

  out.push(`# Installed-CLI guided-journey trial — evidence (${model.date})`)
  out.push('')
  out.push(`Captured by \`node scripts/guided-installed-trial-evidence.mjs --workspace <TEST_PATH>\` from \`${quote(model.workspace)}\` on ${model.capturedAt}${model.condition.declared ? `, condition \`${model.condition.declared}\`` : ''} (${model.dateSource}). Template: [guided-three-path-installed-trial-evidence-template.md](guided-three-path-installed-trial-evidence-template.md). Runbook: [guided-installed-cli-trial-instructions.md](../plans/guided-installed-cli-trial-instructions.md).`)
  out.push('')
  out.push(`Machine-read rows come from the finished workspace — \`REPORT.md\`, \`offer.json\`, \`.synth/first-contact/\` (including the CLI's own recorded offer with its citation hashes), any other CLI-stored file — and from the scratch directory when it was reachable. Quotes attributed to \`REPORT.md\` are the agent's own words, copied verbatim. Rows reading \`${OPERATOR_PREFIX}: …>\` are operator-only: this script has no way to know them and will not guess. Raw byte-for-byte copies: \`${model.rawRelative}/\`.`)
  if (model.environment?.workspace && model.workspace) {
    out.push('')
    out.push(`This is a copy: the staged \`ENVIRONMENT.md\` records the workspace as \`${model.environment.workspace}\`, and the copy captured here ran at \`${model.workspace}\`. Every artifact below is byte-identical to that copy's files; the digests in \`${model.rawRelative}/SOURCES.json\` name both paths. The operator's own machine is the source of the run, not of these bytes.`)
  }
  out.push('')
  out.push(`Cells captured here: ${captured.map((cell) => `\`${cell}\``).join(', ') || 'none'}. Not captured in this file: ${missingCells.map((cell) => `\`${cell}\``).join(', ') || 'none'}. The other condition needs its own TEST_PATH; capture that workspace separately with its own \`--out\`.`)
  out.push('')

  // ---- 0. independence compliance
  out.push('## 0. Independence compliance')
  out.push('')
  out.push(`Checklist: [instructions, Appendix C](../plans/guided-installed-cli-trial-instructions.md#appendix-c--independence-compliance-checklist). Mark each item and name anything unmet. The "evidence column" rows below are what this capture could prove mechanically; the "Met?" column stays with the operator.`)
  out.push('')
  out.push('| # | Requirement | Met? | Note or evidence |')
  out.push('| --- | --- | --- | --- |')
  const stagedInstruction = model.instruction
  const instructionNote = stagedInstruction.present
    ? `staged \`INSTRUCTIONS.md\` present: ${humanBytes(stagedInstruction.bytes)}, sha256 \`${stagedInstruction.sha256}\`, ${stagedInstruction.namesTool ? 'names the tool (guided set)' : 'names no tool (plain set)'}`
    : 'no staged `INSTRUCTIONS.md` was found in TEST_PATH'
  const buildArtifacts = model.buildArtifactsInsideTestPath
  out.push(`| 1 | Sessions run by a different agent and fresh sessions than the authoring agent | ${operator('who ran the sessions and whether they had seen this repository')} | No agent identity is recorded in TEST_PATH. The launch line setup printed is in §1. |`)
  out.push(`| 2 | Agent had no access to the authoring checkout | ${operator('how the machine was isolated')} | ${buildArtifacts.length === 0 ? 'No build output, tarball or `node_modules` inside TEST_PATH.' : `Build output found inside TEST_PATH: ${buildArtifacts.map((item) => `\`${item}\``).join(', ')}.`} Staging: ${model.staging.root ? `${inlineCode(model.staging.root)} (${model.staging.present ? 'found' : 'NOT reachable from this capture'})` : 'not recorded'}. |`)
  out.push(`| 2b | Isolation mode: same-machine confinement by layout and instruction, or a container/separate machine | ${operator('confinement or container/separate machine')} | ${model.environment.present ? `ENVIRONMENT.md records the workspace as ${inlineCode(model.environment.workspace ?? '')} and the CLI outside it.` : 'No ENVIRONMENT.md in TEST_PATH, so the plain condition wrote nothing outside it.'} |`)
  out.push(`| 3 | Agent blind to which condition is expected to win; plain prompt never mentioned SYNTH | ${operator('confirm the prompt you typed and that nothing else named the tool')} | ${instructionNote}. |`)
  out.push(`| 4 | Matched inputs; revisions recorded before the first cell | ${operator('confirm the setup run preceded the first cell')} | §3 recomputes every captured case against the frozen record: ${cases.map((entry) => `${entry.dirName} ${entry.inputs.matched ? 'matched' : entry.inputs.basis === 'partial-inputs' ? 'not computable here — starting inputs were not in this capture' : 'MISMATCH'}`).join('; ') || 'no case directory found'}. |`)
  out.push(`| 5 | Matched agent/model/version, tools, starting request text | ${operator('the agent, model, version and tool access used in this condition')} | The starting request text per case is in the raw copies and quoted in §4; the staged instruction set is ${stagedInstruction.present ? `sha256 \`${stagedInstruction.sha256}\`` : 'missing'}. |`)
  out.push(`| 6 | Session plan and order (fresh session per test where possible; one session per condition at minimum) | ${operator('the actual order and session count')} | Recorded CLI timestamps: ${cases.map((entry) => `${entry.dirName} ${entry.dates[0] ?? 'no timestamp'}`).join('; ') || 'none'}. |`)
  out.push(`| 7 | Protocol, time box, expected observations and stop conditions pre-registered | ${operator('the time box and where the protocol was fixed')} | [guided-three-path-matched-comparison.md](guided-three-path-matched-comparison.md) and the runbook were in the repository before this run; the commits carrying them are in the branch history. |`)
  out.push(`| 8 | Verbatim transcripts, wall-clock per cell, intervention log | ${operator('confirm nothing was tidied or withheld')} | CLI transcripts captured for ${cases.filter((entry) => entry.transcript.present).length} of ${cases.length} case(s); agent reports captured for ${cases.filter((entry) => entry.report.present).length} of ${cases.length}. |`)
  out.push(`| 9 | Installed tarball pinned and identified (not a repo build) | ${operator('confirm the installed CLI is the one that ran')} | ${model.install.tarballSha256 ? `tarball sha256 \`${model.install.tarballSha256}\`${model.install.version ? `, \`synth --version\` → ${JSON.stringify(model.install.version)}` : ''}` : 'the staging directory was not reachable from this capture, so the tarball digest and version are in §2 as operator values.'} |`)
  out.push(`| 10 | No invented human words; guided cells ended \`awaiting-response\`; no lifecycle action; no push | ${operator('confirm from your own session')} | ${model.integrityNote} |`)
  out.push(`| 11 | Operator coaching logged verbatim | ${operator('every intervention, verbatim — including any reminder that the tool exists')} | ${cases.reduce((sum, entry) => sum + entry.integrity.operatorInputEvents, 0)} operator input event(s) across the captured transcripts (the kickoff line each). |`)
  out.push('')
  out.push(`Anything unmet, and why: ${operator('list every unmet item and the reason, or write "none"')}`)
  out.push('')

  // ---- 1. run identity
  out.push('## 1. Run identity')
  out.push('')
  out.push('| Field | Value |')
  out.push('| --- | --- |')
  const identity = [
    ['Operator (who ran the trial)', operator('your name')],
    ['Setup executed by (agent/tool, model, version)', operator('who or what ran `guided-installed-trial-setup.mjs`, and its model/version')],
    ['Setup command and exit code', model.setupCommand ?? `${operator('the setup command you ran and its exit code')}`],
    ['TEST_PATH state before setup', model.stateBefore ?? operator('missing, or empty')],
    ['Was TEST_PATH created by setup?', model.createdBySetup ?? operator('yes or no')],
    ['Scratch directory (outside TEST_PATH)', model.staging.root ? `${inlineCode(model.staging.root)}${model.staging.present ? '' : ' — not reachable from this capture'} — tarball, installed CLI and transcripts` : operator('the staging directory setup used')],
    ['CLI manifest / setup manifest', model.manifestNote],
    ['Instruction file staged at TEST_PATH root', stagedInstruction.present ? `\`INSTRUCTIONS.md\` (${stagedInstruction.namesTool ? 'guided set — names the tool' : 'plain set — names no tool'}), sha256 \`${stagedInstruction.sha256}\`${model.environment.present ? ', plus `ENVIRONMENT.md`' : ', no `ENVIRONMENT.md` (plain condition)'}` : operator('which instruction file was staged')],
    ['Launch line given to the agent, verbatim', `recorded by setup: ${inlineCode(model.launch.recorded ?? '')}${model.launch.source === 'manifest' ? ' (from `setup-manifest.json`)' : model.launch.source === 'inferred' ? ' (the line this repository\'s script prints for this condition — the manifest was not reachable)' : ''}. ${operator('paste what you actually typed, and if you changed the wording, say exactly how')}`],
    ['Date and timezone, start/end', `${cases.map((entry) => `\`${entry.dirName}\`: ${entry.dates[0] ?? 'no timestamp'} → ${entry.dates[entry.dates.length - 1] ?? 'no timestamp'}`).join('; ') || 'no recorded timestamps'}; filename date \`${model.date}\` (${model.dateSource}). ${operator('your local timezone and the wall-clock start/end')}`],
    ['Running agent, model and version', operator('agent product, model and version; session ids')],
    ['Tool access given to the agent', operator('shell, editor, network, and anything else')],
    ['Pinned repository revision', model.revision.commit ? `\`${model.revision.commit}\`${model.revision.subject ? ` — ${quote(model.revision.subject)}` : ''}${model.revision.source ? ` (${model.revision.source})` : ''}` : operator('the commit the CLI was built from')],
    ['Environment', `${operator('node --version, npm --version, OS — the machine that ran setup and the sessions')}`],
    ['Time box set before starting', operator('the time box you set, and whether the run stayed inside it')],
    ['Private assets involved', '`none` (required; any private asset invalidates this run)'],
  ]
  for (const [field, value] of identity) out.push(`| ${field} | ${value} |`)
  out.push('')

  // ---- 2. install proof
  out.push('## 2. Install proof')
  out.push('')
  out.push('| Field | Value |')
  out.push('| --- | --- |')
  const proof = [
    ['Build command and exit', model.install.build],
    ['Pack command and exit', model.install.pack],
    ['Tarball name', model.install.tarballName ?? operator('the packed file name')],
    ['Tarball SHA-256', model.install.tarballSha256 ? `\`${model.install.tarballSha256}\`` : operator('the tarball digest — re-run with `--staging <dir>` on the machine that holds it to fill this in mechanically')],
    ['Global install command and exit', model.install.global],
    ['`synth --version` output', model.install.versionText ? fenced(JSON.stringify(model.install.version ?? model.install.versionText, null, 2), 'json') : operator('the JSON `synth --version` printed')],
  ]
  for (const [field, value] of proof) out.push(`| ${field} | ${value} |`)
  out.push('')
  if (model.staging.notes.length > 0) {
    out.push(`Staging notes: ${model.staging.notes.map((note) => quote(note)).join('; ')}.`)
    out.push('')
  }

  // ---- 3. matched input revisions
  out.push('## 3. Matched input revisions')
  out.push('')
  out.push('| Case | Expected revision | Observed revision | Matched? |')
  out.push('| --- | --- | --- | --- |')
  for (const caseId of CASE_ORDER) {
    const dirName = TEST_DIRS[caseId]
    const entry = cases.find((candidate) => candidate.caseId === caseId)
    if (!entry) {
      out.push(`| ${dirName} | \`${E4_REVISIONS[caseId]}\` | not captured — no \`${dirName}/\` in this TEST_PATH | n/a |`)
      continue
    }
    const observed = entry.inputs.observed ? `\`${entry.inputs.observed}\`` : `not computable — ${entry.inputs.missing.length} input file(s) absent from this capture`
    out.push(`| ${dirName} | \`${entry.inputs.expected}\` | ${observed} | ${entry.inputs.matched ? 'yes' : entry.inputs.basis === 'partial-inputs' ? 'not computable' : 'NO'} |`)
  }
  out.push('')
  const drift = cases.filter((entry) => entry.inputs.changed.length > 0)
  if (drift.length > 0) {
    out.push('Input files whose bytes are not the frozen fixture bodies — this is starting-input drift, not fixture drift:')
    out.push('')
    for (const entry of drift) {
      for (const file of entry.inputs.files.filter((candidate) => candidate.present && !candidate.matches)) {
        out.push(`- \`${entry.dirName}/${file.path}\`: on disk ${humanBytes(file.bytes)} sha256 \`${file.sha256}\`; frozen fixture ${humanBytes(file.expectedBytes)} sha256 \`${file.expectedSha256}\``)
      }
    }
    out.push('')
  }
  const incomplete = cases.filter((entry) => entry.inputs.basis === 'partial-inputs')
  if (incomplete.length > 0) {
    out.push('Cases whose starting inputs were not part of this capture, so their revision could not be recomputed here:')
    out.push('')
    for (const entry of incomplete) {
      out.push(`- \`${entry.dirName}/\`: missing ${entry.inputs.missing.map((item) => `\`${item}\``).join(', ')}. Re-run the capture on the machine that still holds the workspace, or copy those input files into the workspace copy, to turn this row into a number. The captured offer and report are unaffected.`)
    }
    out.push('')
  }
  out.push('If any required case did not match, stop and report `blocked` — do not continue to the cells.')
  out.push('')

  // ---- 4. cells
  out.push('## 4. Cells')
  out.push('')
  out.push(`One block per case and condition. This capture holds ${captured.length} cell(s): ${captured.map((cell) => `\`${cell}\``).join(', ') || 'none'}. Required cases produce six blocks across both conditions; blocks for cells that were not run stay out of this file and are reported as \`not run\` here.`)
  out.push('')
  for (const entry of cases) out.push(renderCell(entry, model))

  // ---- 5. cross-cutting
  out.push('## 5. Cross-cutting observations')
  out.push('')
  out.push('| Question | Answer |')
  out.push('| --- | --- |')
  const crossCutting = [
    'Did the guided condition ask substantively different or better questions?',
    'Did the guided condition add verifiable provenance the plain condition lacked?',
    'Which condition required fewer operator steps or less reading?',
    'Which condition produced a clearer next slice?',
    ['Same agent/model and tool access in both conditions?', operator('yes or no, with the evidence that shows it')],
    ['Plain and guided run order, and could ordering explain the result?', operator('the order actually used and your reading of it')],
    ['Sessions used: one per condition, or one per test? Order used?', operator('the session plan you actually ran')],
  ]
  for (const question of crossCutting) {
    if (typeof question === 'string') out.push(`| ${question} | ${operator('a comparative judgement — only a person who watched both conditions can answer it')} |`)
    else out.push(`| ${question[0]} | ${question[1]} |`)
  }
  const failed = cases.flatMap((entry) => entry.dataErrors.flatMap((entryLog) => entryLog.entries.map((row) => `${entry.dirName}: ${row.error ?? JSON.stringify(row)}`)))
  out.push(`| Anything that failed or was skipped, with the exact error text | ${failed.length > 0 ? `recorded CLI errors: ${failed.map((item) => quote(item)).join(' | ')}${cases.some((entry) => !entry.transcript.present) ? '; a CLI transcript was missing for at least one case' : ''}` : 'no CLI error log was captured in this TEST_PATH'}; cells not captured in this file and therefore \`not run\` unless they ran elsewhere: ${missingCells.map((cell) => `\`${cell}\``).join(', ') || 'none'}. |`)
  out.push('')

  // ---- 6. explicit statements
  out.push('## 6. Explicit statements')
  out.push('')
  const responses = cases.map((entry) => `${entry.dirName}: ${entry.integrity.sourceAnswers === 0 && entry.integrity.choiceReviews === 0 ? '0 response(s), 0 choice review(s)' : `${entry.integrity.sourceAnswers} response(s), ${entry.integrity.choiceReviews} choice review(s)`}`)
  const lifecycle = cases.flatMap((entry) => entry.integrity.lifecycleCommands.map((command) => `${entry.dirName}: ${command}`))
  const statements = [
    ['Human words fabricated in any cell', model.humanWordsStatement],
    ['Responses recorded per cell', responses.length > 0 ? `captured CLI state — ${responses.join('; ')}. ${operator('confirm that no response exists outside the captured state')}` : operator('the responses recorded per cell')],
    ['Runtime Mission/Expedition lifecycle actions', lifecycle.length === 0 ? `none — no lifecycle, selection, approval, delivery or push command appears in the captured command lists or error logs${model.gaps.lifecycleNotChecked ? ' (no command list was captured for at least one case, so check that session yourself)' : ''}` : `FOUND — ${lifecycle.map((item) => quote(item)).join(' | ')}`],
    ['Pushes, pull requests or merges created by this trial', model.gitInside.length === 0 ? `no \`.git\` directory inside TEST_PATH; nothing was captured that could push. ${operator('confirm no session pushed from elsewhere')}` : `a \`.git\` directory was found inside TEST_PATH: ${model.gitInside.map((item) => `\`${item}\``).join(', ')} — ${operator('say what happened')}`],
    ['Application tests weakened or skipped to make a cell pass', cases.some((entry) => entry.sections['APPLICATION TESTS']) ? `the agent's own \`APPLICATION TESTS\` statement, first line per cell — ${cases.filter((entry) => entry.sections['APPLICATION TESTS']).map((entry) => `${entry.dirName}: ${quote(firstDetail(entry.sections['APPLICATION TESTS']) ?? 'no detail line')}`).join(' | ')}; the full sections are in the raw copies. ${operator('confirm no test was weakened')}` : operator('confirm no application test was weakened or skipped')],
    ['Isolation mode', operator('confinement by layout and instruction, a container, or a separate machine')],
    ['Plain condition', captured.some((cell) => cell.endsWith('/plain')) ? `this TEST_PATH — ${inlineCode(model.workspace)}` : operator('its own TEST_PATH, or "not run"')],
    ['Build output visible inside TEST_PATH', model.buildArtifactsInsideTestPath.length === 0 ? 'none — no build output, tarball or `node_modules` inside TEST_PATH' : `FOUND — ${model.buildArtifactsInsideTestPath.map((item) => `\`${item}\``).join(', ')}`],
    ['Total operator effort and whether it exceeded the time box', `${cases.length > 0 ? `recorded CLI spans: ${cases.map((entry) => `${entry.dirName} ${humanSpan(entry.integrity.spanSeconds)}`).join('; ')}` : 'no recorded spans'}. ${operator('total effort and whether it exceeded the time box')}`],
    ['Was setup run before the cells by the same agent that ran them?', operator('yes or no, and which cells')],
    ['Any auto-feed', model.autoFeed],
    ['Setup log', model.staging.transcripts['setup.log'] ? `kept at ${inlineCode(model.staging.transcripts['setup.log'].file)} (sha256 \`${model.staging.transcripts['setup.log'].sha256}\`), copied to \`${model.rawRelative}/staging/transcripts/setup.log\`. ${operator('confirm it never entered a plain TEST_PATH')}` : operator('where the setup log is kept, and confirm it never entered a plain TEST_PATH')],
  ]
  for (const [label, value] of statements) out.push(`- ${label}: ${value}.`)
  out.push('')

  // ---- 7. what this supports
  out.push('## 7. What this evidence does and does not support')
  out.push('')
  const guidedCases = cases.filter((entry) => model.condition.resolved === 'guided')
  const completed = guidedCases.filter((entry) => entry.citations.length > 0 && entry.citations.every((citation) => citation.status === 'matched' || citation.status === 'matched-recomputed'))
  const unreachable = guidedCases.filter((entry) => entry.citations.some((citation) => citation.status === 'file-missing'))
  out.push(`- **Mechanically supported by this capture:** the installed CLI recorded an offer in ${guidedCases.filter((entry) => entry.recorded ?? entry.offer.present).length} of ${guidedCases.length} captured guided cell(s)${completed.length > 0 ? `, and in ${completed.length} of them every recorded citation recomputes to the live source` : ''}${unreachable.length > 0 ? ` (in ${unreachable.length} cell(s) the cited files were not part of this capture, so those citations could not be re-checked here — their recorded hashes are preserved)` : ''}; the captured CLI state records ${cases.reduce((sum, entry) => sum + entry.integrity.sourceAnswers + entry.integrity.choiceReviews, 0)} human response(s); no captured command list contains a lifecycle, approval, delivery or push command.`)
  out.push(`- **Not supported:** owner value, delivery, production readiness, human confirmation of any response, or a merged outcome.`)
  out.push(`- **Not established by this capture, and yours to state:** whether any cell counts as \`pass\`, \`fail\` or \`blocked\`; the comparative §5 readings; and whether the captured inputs were matched (see §3 for the cases that could not be recomputed here).`)
  out.push(`- Recommendation for ordinary PR #347 review: ${operator('keep as is / change / simplify / stop — with reasons, submitted in your own review comment')}`)
  out.push('')
  return `${out.join('\n')}\n`
}

// #endregion evidence text

// #region capture

/** Read TEST_PATH and build the model the renderer needs. */
export async function collectWorkspace({ repo, workspace, stagingRoot, condition, cases, explicitDate }) {
  const drifted = CASE_ORDER.filter((caseId) => caseRevisions()[caseId] !== E4_REVISIONS[caseId])
  if (drifted.length > 0) {
    throw new Error(`Fixture drift against the executed E4 record: ${drifted.join(', ')} — recomputed revisions would compare two different things`)
  }
  const model = {
    capturedAt: new Date().toISOString(),
    repo,
    workspace,
    outPath: null,
    rawDir: null,
    rawRelative: null,
    warnings: [],
    gaps: { lifecycleNotChecked: false, operator: [] },
    buildArtifactsInsideTestPath: [],
    gitInside: [],
  }
  model.environment = await readEnvironment(workspace)
  model.instruction = await readStagedInstruction(workspace)
  const inferredCondition = model.environment.present ? 'guided' : 'plain'
  model.condition = {
    inferred: inferredCondition,
    inferredFrom: model.environment.present
      ? 'ENVIRONMENT.md is present in TEST_PATH (guided setup writes it; the plain condition writes nothing outside TEST_PATH)'
      : 'no ENVIRONMENT.md in TEST_PATH',
    declared: condition ?? null,
    resolved: condition ?? inferredCondition,
  }
  if (condition && condition !== inferredCondition) {
    throw new Error(`--condition ${condition} contradicts the layout: ${model.condition.inferredFrom}. Refusing to label the evidence for the wrong condition.`)
  }
  model.staging = await collectStaging(stagingRoot)
  if (!stagingRoot && model.environment.staging) {
    model.staging = await collectStaging(model.environment.staging)
    model.staging.source = 'ENVIRONMENT.md'
    if (!model.staging.present) model.warnings.push(`ENVIRONMENT.md points at ${model.environment.staging}, which is not reachable from this machine`)
  }

  const requested = cases ?? CASE_ORDER.filter((caseId) => TEST_DIRS[caseId])
  const caseEntries = []
  for (const caseId of requested) {
    const dirName = TEST_DIRS[caseId]
    const dir = path.join(workspace, dirName)
    const stat = await statOrNull(dir)
    if (!stat || !stat.isDirectory()) continue
    caseEntries.push(await collectCase({ caseId, dir, dirName }))
  }
  if (caseEntries.length === 0) {
    throw new Error(`no case directory found in ${workspace}: expected one of ${CASE_ORDER.map((caseId) => `${TEST_DIRS[caseId]}/`).join(', ')}`)
  }
  model.cases = caseEntries

  const dated = await deriveDate({ cases: caseEntries, explicit: explicitDate })
  model.date = dated.date
  model.dateSource = dated.source

  // Build output and VCS inside TEST_PATH are both integrity findings, not failures.
  for (const file of await listFilesRecursive(workspace)) {
    const relative = relativeTo(workspace, file)
    if (/(^|\/)\.git(\/|$)/.test(relative)) model.gitInside.push(relative.split('/').slice(0, 2).join('/'))
    if (/(^|\/)(dist|node_modules)\//.test(relative) || relative.endsWith('.tgz') || /^global\//.test(relative)) model.buildArtifactsInsideTestPath.push(relative)
  }
  model.buildArtifactsInsideTestPath = [...new Set(model.buildArtifactsInsideTestPath)]
  model.gitInside = [...new Set(model.gitInside)]

  model.revision = model.environment.present
    ? { commit: model.environment.revision, short: model.environment.revisionShort, subject: model.environment.revisionSubject, source: 'ENVIRONMENT.md' }
    : { commit: model.staging.setupManifest?.testedRevision?.commit ?? null, short: model.staging.setupManifest?.testedRevision?.commit?.slice(0, 7) ?? null, subject: model.staging.setupManifest?.testedRevision?.subject ?? null, source: model.staging.setupManifest ? 'setup-manifest.json' : null }
  if (!model.revision.commit && model.staging.setupManifest?.testedRevision) {
    model.revision = {
      commit: model.staging.setupManifest.testedRevision.commit,
      short: model.staging.setupManifest.testedRevision.commit?.slice(0, 7) ?? null,
      subject: model.staging.setupManifest.testedRevision.subject,
      source: 'setup-manifest.json',
    }
  }

  const manifestLaunch = model.staging.setupManifest?.launchInstruction
  model.launch = {
    recorded: manifestLaunch ?? launchInstruction(model.condition.resolved),
    source: manifestLaunch ? 'manifest' : 'inferred',
  }

  model.install = {
    build: null, pack: null, global: null, tarballName: null, tarballSha256: null, version: null, versionText: null,
  }
  const cli = model.staging.manifest?.json?.installedCli
  const scriptedSetup = Boolean(model.staging.setupManifest)
  const succeeded = scriptedSetup
    ? 'exit 0 — setup writes this transcript only after every step succeeded (a nonzero exit aborts before it)'
    : operator('the exit code from your own run')
  model.install.build = `\`npm run build\` → ${succeeded}`
  model.install.pack = `\`npm pack --pack-destination <staging>/pack\` → ${succeeded}`
  model.install.global = cli?.tarball
    ? `\`npm install -g --prefix <staging>/global ${quote(path.basename(cli.tarball))}\` → ${succeeded}`
    : `\`npm install -g --prefix <staging>/global <tarball>\` → ${succeeded}`
  if (cli?.tarball) model.install.tarballName = path.basename(cli.tarball)
  if (cli?.tarballSha256) model.install.tarballSha256 = cli.tarballSha256
  const digestFile = model.staging.transcripts['tarball.sha256']?.text
  if (!model.install.tarballSha256 && digestFile) {
    const digest = digestFile.trim().split(/\s+/)[0]
    if (/^[0-9a-f]{64}$/i.test(digest)) model.install.tarballSha256 = digest
  }
  if (!model.install.tarballName && digestFile) {
    const named = digestFile.trim().split(/\s+/).slice(1).join(' ')
    if (named) model.install.tarballName = path.basename(named)
  }
  const versionEntry = model.staging.transcripts['version.json']
  if (versionEntry) {
    model.install.version = versionEntry.json ?? null
    model.install.versionText = versionEntry.text
  } else if (cli?.version) {
    model.install.version = cli.version
    model.install.versionText = JSON.stringify(cli.version)
  }

  model.manifestNote = model.staging.manifest
    ? model.staging.setupManifest
      ? `${inlineCode(relativeTo(model.staging.root, model.staging.manifest.file))}, ${inlineCode(relativeTo(model.staging.root, model.staging.transcripts['setup-manifest.json'].file))}`
      : `${inlineCode(relativeTo(model.staging.root, model.staging.manifest.file))} (no setup-manifest.json found)`
    : model.condition.resolved === 'plain'
      ? '`none — the plain condition writes nothing outside TEST_PATH`'
      : operator('the staging manifest paths')
  model.setupCommand = null
  model.stateBefore = null
  model.createdBySetup = null

  // Condition-integrity summary reused by §0, §4 and §6.
  const humanResponses = model.cases.reduce((sum, entry) => sum + entry.integrity.sourceAnswers + entry.integrity.choiceReviews, 0)
  const lifecycle = model.cases.flatMap((entry) => entry.integrity.lifecycleCommands)
  const awaiting = model.cases
    .filter((entry) => model.condition.resolved === 'guided')
    .map((entry) => `${entry.dirName}: ${entry.integrity.terminalState ? inlineCode(entry.integrity.terminalState) : 'no stored working-brief status — the report\'s `first-contact status` line is quoted in §4'}`)
  model.gaps.lifecycleNotChecked = model.cases.some((entry) => entry.commands.length === 0)
  model.integrityNote = [
    `Captured CLI state records ${humanResponses} human response(s)`,
    lifecycle.length === 0 ? 'no lifecycle, selection or push command appears in a captured command list' : `lifecycle-looking commands found: ${lifecycle.map((item) => quote(item)).join(' | ')}`,
    awaiting.length > 0 ? `machine-recorded terminal projections: ${awaiting.join('; ')}` : null,
    model.cases.some((entry) => !entry.transcript.present) ? 'a guided CLI transcript is missing for at least one case' : null,
  ].filter(Boolean).join('; ')
  const fabricated = []
  if (humanResponses > 0) fabricated.push(`${humanResponses} recorded response(s) — read them before repeating this statement`)
  if (lifecycle.length > 0) fabricated.push('a lifecycle-looking command was captured')
  model.humanWordsStatement = fabricated.length === 0
    ? '`none` — required; the captured CLI state holds no recorded human response (sourceAnswers and choiceReviews are empty in every captured draft) and no captured command names a selection, approval or human response'
    : `NOT VERIFIED — ${fabricated.join('; ')}. ${operator('resolve this before citing the evidence')}`
  model.autoFeed = '`none — the agent was launched by hand with a line that names SYNTH, as the current CLI requires; no skill, plugin or service announces the tool`'
  model.operatorGaps = collectOperatorGaps(model)
  return model
}

/** Every `<to confirm …>` row in the rendered document, as a checklist for the operator. */
export function collectOperatorGaps(model) {
  const gaps = new Set()
  for (const entry of model.cases) {
    gaps.add(`§4 ${entry.dirName}: confirm the quoted command list and exit codes are the ones you saw${entry.commands.length === 0 ? ' (no COMMANDS block was found in REPORT.md — write it yourself)' : ''}`)
    gaps.add(`§4 ${entry.dirName}: the terminal state (pass / fail / blocked / not run) and its reason`)
  }
  gaps.add('§1 operator name, agent model/version, tool access, local timezone, wall-clock start/end, time box')
  gaps.add('§0 the Met? column for all eleven independence items')
  gaps.add('§5 every comparative reading')
  gaps.add('§7 the recommendation for ordinary PR #347 review')
  if (!model.install.tarballSha256) gaps.add('§2 the install proof — re-run the capture with --staging <dir> on the machine that holds the scratch directory')
  for (const entry of model.cases.filter((candidate) => candidate.inputs.basis === 'partial-inputs')) {
    gaps.add(`§3 ${entry.dirName}: starting inputs missing from this capture (${entry.inputs.missing.join(', ')}) — copy them into the workspace copy or re-run on the machine that holds it`)
  }
  return [...gaps]
}

// #endregion capture

// #region writing

/** Copy raw artifacts byte-for-byte; report every file and every digest. */
export async function copyRawArtifacts({ model, rawDir }) {
  const sources = []
  const copyFile = async (from, to, kind, { relativeTo: base } = {}) => {
    const bytes = await fs.readFile(from)
    await fs.mkdir(path.dirname(to), { recursive: true })
    await fs.writeFile(to, bytes)
    sources.push({
      bundlePath: relativeTo(rawDir, to),
      sourcePath: from,
      sourceRoot: base ?? null,
      sourceRelative: base ? relativeTo(base, from) : null,
      bytes: bytes.length,
      sha256: sha256(bytes),
      kind,
      copied: true,
    })
  }

  await copyFile(path.join(model.workspace, 'INSTRUCTIONS.md'), path.join(rawDir, 'INSTRUCTIONS.md.txt'), 'staged instruction set', { relativeTo: model.workspace })
    .catch(async () => {
      sources.push({ bundlePath: 'INSTRUCTIONS.md.txt', sourcePath: path.join(model.workspace, 'INSTRUCTIONS.md'), bytes: null, sha256: null, kind: 'staged instruction set', copied: false, note: 'not present in TEST_PATH' })
    })
  if (model.environment.present) {
    await copyFile(model.environment.file, path.join(rawDir, 'ENVIRONMENT.md.txt'), 'staged environment note', { relativeTo: model.workspace })
  }

  for (const entry of model.cases) {
    const caseTarget = path.join(rawDir, entry.dirName)
    if (entry.report.present) await copyFile(entry.report.file, path.join(caseTarget, 'REPORT.md.txt'), 'agent report', { relativeTo: entry.dir })
    else sources.push({ bundlePath: `${entry.dirName}/REPORT.md.txt`, sourcePath: entry.report.file, bytes: null, sha256: null, kind: 'agent report', copied: false, note: 'not present' })
    if (entry.offer.present) await copyFile(entry.offer.file, path.join(caseTarget, 'offer.json'), 'agent-authored offer', { relativeTo: entry.dir })
    for (const file of entry.stateFiles) {
      const target = path.join(caseTarget, 'synth-state', ...file.relative.replace(/^\.synth\//, '').split('/'))
      await copyFile(file.file, target, 'CLI-stored state', { relativeTo: entry.dir })
    }
  }

  if (model.staging.present) {
    for (const entry of Object.values(model.staging.transcripts)) {
      await copyFile(entry.file, path.join(rawDir, 'staging', 'transcripts', path.basename(entry.file)), 'setup transcript', { relativeTo: model.staging.root })
    }
    if (model.staging.manifest) await copyFile(model.staging.manifest.file, path.join(rawDir, 'staging', 'cli-manifest.json'), 'CLI manifest', { relativeTo: model.staging.root })
    for (const item of model.staging.pack) {
      sources.push({
        bundlePath: `staging/pack/${item.name}`,
        sourcePath: item.file,
        sourceRoot: model.staging.root,
        sourceRelative: relativeTo(model.staging.root, item.file),
        bytes: item.bytes,
        sha256: item.sha256,
        kind: 'packed artifact',
        copied: false,
        note: item.digestRecorded ?? 'not copied — the digest is recorded in transcripts/tarball.sha256',
      })
    }
  }

  const fixtures = {
    note: 'Recomputed at capture time from the workspace with the shared rule (SHA-256 over sorted [relative path, content] pairs). Expected values are the frozen E4 record.',
    revisions: Object.fromEntries(model.cases.map((entry) => [entry.caseId, entry.inputs.expected])),
    observed: Object.fromEntries(model.cases.map((entry) => [entry.caseId, entry.inputs.observed])),
    matched: Object.fromEntries(model.cases.map((entry) => [entry.caseId, entry.inputs.matched])),
    cases: Object.fromEntries(model.cases.map((entry) => [entry.caseId, {
      dir: entry.dirName,
      basis: entry.inputs.basis,
      files: entry.inputs.files,
      missing: entry.inputs.missing,
      changed: entry.inputs.changed,
    }])),
  }
  const fixturesText = `${JSON.stringify(fixtures, null, 2)}\n`
  await fs.writeFile(path.join(rawDir, 'fixtures.json'), fixturesText)
  sources.push({ bundlePath: 'fixtures.json', sourcePath: null, bytes: Buffer.byteLength(fixturesText), sha256: sha256(fixturesText), kind: 'recomputed revisions', copied: true })

  const summary = summaryOf(model)
  const summaryText = `${JSON.stringify(summary, null, 2)}\n`
  await fs.writeFile(path.join(rawDir, 'SUMMARY.json'), summaryText)
  const sourcesText = `${JSON.stringify({ capturedAt: model.capturedAt, workspace: model.workspace, staging: model.staging.root, sources }, null, 2)}\n`
  await fs.writeFile(path.join(rawDir, 'SOURCES.json'), sourcesText)
  return { sources, summary }
}

/** The machine summary: everything the renderer used, for later verification. */
export function summaryOf(model) {
  return {
    capturedAt: model.capturedAt,
    workspace: model.workspace,
    helper: 'scripts/guided-installed-trial-evidence.mjs',
    requiredCases: REQUIRED_CASES,
    optionalCases: OPTIONAL_CASES,
    condition: model.condition,
    date: { value: model.date, source: model.dateSource },
    instruction: model.instruction ? { present: model.instruction.present, bytes: model.instruction.bytes, sha256: model.instruction.sha256, namesTool: model.instruction.namesTool } : null,
    environment: model.environment ? {
      present: model.environment.present,
      bytes: model.environment.bytes ?? null,
      sha256: model.environment.sha256 ?? null,
      workspace: model.environment.workspace ?? null,
      staging: model.environment.staging ?? null,
      revision: model.environment.revision ?? null,
    } : null,
    launch: model.launch,
    revision: model.revision,
    install: {
      tarballName: model.install.tarballName,
      tarballSha256: model.install.tarballSha256,
      version: model.install.version,
      stagingPresent: model.staging.present,
      stagingNotes: model.staging.notes,
    },
    cases: model.cases.map((entry) => ({
      caseId: entry.caseId,
      dir: entry.dirName,
      report: { present: entry.report.present, bytes: entry.report.bytes ?? null, sha256: entry.report.sha256 ?? null },
      offer: {
        present: entry.offer.present,
        bytes: entry.offer.bytes ?? null,
        sha256: entry.offer.sha256 ?? null,
        id: entry.offer.json?.id ?? null,
        question: entry.offer.json?.question ?? null,
        optionIds: (entry.offer.json?.options ?? []).map((option) => option.id ?? null),
        problems: entry.offer.problems ?? [],
      },
      transcript: { present: entry.transcript.present, events: entry.transcript.events.length, bytes: entry.transcript.bytes ?? null, sha256: entry.transcript.sha256 ?? null },
      draft: {
        present: entry.draft.present,
        bytes: entry.draft.bytes ?? null,
        sha256: entry.draft.sha256 ?? null,
        journeyId: entry.draft.json?.journeyId ?? null,
        schema: entry.draft.json?.schema ?? null,
        status: entry.draft.json?.status ?? null,
      },
      stateFiles: entry.stateFiles.map((file) => ({ relative: file.relative, bytes: file.bytes, sha256: file.sha256 })),
      inputs: {
        expected: entry.inputs.expected,
        observed: entry.inputs.observed,
        basis: entry.inputs.basis,
        matched: entry.inputs.matched,
        missing: entry.inputs.missing,
        changed: entry.inputs.changed,
      },
      citations: entry.citations,
      commands: entry.commands,
      integrity: entry.integrity,
      reportSections: Object.keys(entry.sections ?? {}),
      extras: entry.extras.map((extra) => extra.relative),
    })),
    buildArtifactsInsideTestPath: model.buildArtifactsInsideTestPath,
    gitInside: model.gitInside,
    warnings: model.warnings,
    operatorGaps: model.operatorGaps,
  }
}

/** Write the evidence file and the raw bundle. Refuses to clobber unless --force. */
export async function writeEvidence({ model, outPath, rawDir, force }) {
  const evidenceExists = await exists(outPath)
  if (evidenceExists && !force) {
    throw new Error(`evidence file already exists: ${outPath} — pass --force to overwrite it, or --out to write a different file`)
  }
  const rawExists = await exists(rawDir)
  if (rawExists && !force) {
    throw new Error(`raw directory already exists: ${rawDir} — pass --force to overwrite it, or --raw-dir to write a different one`)
  }
  if (rawExists && force) await fs.rm(rawDir, { recursive: true, force: true })
  await fs.mkdir(path.dirname(outPath), { recursive: true })
  const { sources, summary } = await copyRawArtifacts({ model, rawDir })
  const text = renderEvidence(model)
  await fs.writeFile(outPath, text)
  return { text, sources, summary }
}

// #endregion writing

// #region main

async function main(argv) {
  const parsed = parseArgs(argv)
  if (parsed.help) {
    console.log(USAGE)
    return 0
  }
  const repo = path.resolve(parsed.repo ?? REPO_ROOT)
  const workspace = path.resolve(parsed.workspace)
  const workspaceStat = await statOrNull(workspace)
  if (!workspaceStat || !workspaceStat.isDirectory()) {
    throw new Error(`--workspace does not exist or is not a directory: ${workspace}`)
  }
  assertSafeLayout({ repo, workspace, staging: parsed.staging ? path.resolve(parsed.staging) : undefined })
  if (!(await exists(path.join(repo, EVIDENCE_DIR)))) {
    throw new Error(`--repo does not look like this checkout: ${repo} has no ${EVIDENCE_DIR}/`)
  }

  const model = await collectWorkspace({
    repo,
    workspace,
    stagingRoot: parsed.staging ? path.resolve(parsed.staging) : undefined,
    condition: parsed.condition,
    cases: parsed.cases,
    explicitDate: parsed.date,
  })
  const suffix = model.condition.resolved === 'plain' ? '-plain' : ''
  const outPath = parsed.out ? path.resolve(parsed.out) : path.join(repo, EVIDENCE_DIR, `${EVIDENCE_PREFIX}-${model.date}${suffix}.md`)
  const rawDir = parsed.rawDir ? path.resolve(parsed.rawDir) : `${outPath.replace(/\.md$/, '')}-raw`
  if (!isInside(repo, outPath) || !isInside(repo, rawDir)) throw new Error(`--out and --raw-dir must live inside the checkout: ${repo}`)
  if (isInside(workspace, outPath) || isInside(workspace, rawDir)) throw new Error('refusing to write evidence into TEST_PATH')
  model.outPath = outPath
  model.rawDir = rawDir
  model.rawRelative = relativeTo(repo, rawDir)

  const text = renderEvidence(model)
  if (parsed.dryRun) {
    console.log(text)
    return 0
  }
  const written = await writeEvidence({ model, outPath, rawDir, force: parsed.force })
  const summary = summaryOf(model)
  console.log(`Captured ${model.cases.length} case(s) from ${workspace}`)
  console.log(`  condition          : ${model.condition.resolved} (${model.condition.inferredFrom}${model.condition.declared ? `, declared ${model.condition.declared}` : ''})`)
  console.log(`  date               : ${model.date} (${model.dateSource})`)
  console.log(`  evidence file      : ${relativeTo(repo, outPath)}  (${written.text.length} B)`)
  console.log(`  raw copies         : ${model.rawRelative}/  (${written.sources.length} entry/entries)`)
  for (const entry of model.cases) {
    console.log(`  ${entry.dirName.padEnd(16)}: report ${entry.report.present ? 'yes' : 'NO '}  offer ${entry.offer.present ? 'yes' : 'NO '}  transcript ${entry.transcript.present ? 'yes' : 'NO '}  revision ${entry.inputs.matched ? 'matched' : entry.inputs.basis === 'partial-inputs' ? 'not computable' : 'MISMATCH'}  citations ${entry.citations.length > 0 ? `${entry.citations.filter((citation) => citation.status === 'matched').length}/${entry.citations.length} matched` : 'none captured'}`)
  }
  if (!model.install.tarballSha256) console.log(`  install proof      : not reachable — re-run with --staging <dir> on the machine that holds the scratch directory`)
  if (model.warnings.length > 0) for (const warning of model.warnings) console.log(`  warning            : ${warning}`)
  console.log('')
  console.log(`Operator-only rows still to fill (${OPERATOR_PREFIX} … in the evidence file):`)
  for (const gap of summary.operatorGaps) console.log(`  - ${gap}`)
  console.log('')
  console.log(`Next: fill those rows in your own words, commit ${relativeTo(repo, outPath)} and ${model.rawRelative}/, and link the evidence from PR #347 in your own comment.`)
  if (parsed.json) console.log(`\n${JSON.stringify(summary, null, 2)}`)
  return 0
}

const invokedDirectly = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
if (invokedDirectly) {
  main(process.argv.slice(2))
    .then((code) => { process.exitCode = code })
    .catch((error) => {
      console.error(`guided-installed-trial-evidence: ${error.message}`)
      process.exitCode = 1
    })
}

export { main as runEvidenceCapture }

// #endregion main
