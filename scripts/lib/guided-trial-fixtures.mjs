// ============================================================
// SYNTH — guided-journey trial fixtures (shared definition)
// ============================================================
// Single source of truth for the matched synthetic inputs used by the
// bounded E4 diagnostic and by the installed-CLI trial setup executor:
//
//   scripts/guided-installed-trial-fixtures.mjs   (writes the fixtures)
//   scripts/guided-installed-trial-setup.mjs      (runs the full setup)
//
// Fixture bodies and the revision hash are frozen: they were used to record the
// executed E4 comparison, so changing them would silently break comparability
// with the published diagnostic. `revisionMismatches()` exists to make such a
// change loud instead of silent.
//
// The bodies are synthetic, unbranded and deliberately tiny. No owner asset,
// private SVG or real repository content belongs here.
// ============================================================

import { createHash } from 'node:crypto'

/** Cases the trial must cover. */
export const REQUIRED_CASES = ['green', 'brown', 'docs']

/** Extra cases an operator may include when the time box allows. */
export const OPTIONAL_CASES = ['knowledge', 'conflict']

/** All cases, in generation order. */
export const CASE_ORDER = [...REQUIRED_CASES, ...OPTIONAL_CASES]

/** Source-only fixture bodies, keyed by case then relative path. */
export const FIXTURES = {
  green: {},
  brown: {
    'package.json': '{"name":"synthetic-board","type":"module","scripts":{"test":"node --test tests/board.test.js"}}\n',
    'src/board.js': "export const render = label => `<text>${label}</text>`;\n",
    'tests/board.test.js': "import test from 'node:test';\nimport { strict as assert } from 'node:assert';\nimport { render } from '../src/board.js';\ntest('existing label', () => assert.equal(render('A'), '<text>A</text>'));\n",
    'docs/limitation.md': 'Current renderer supports labels but not a user-selected fill color. Preserve its existing label output.\n',
  },
  docs: { 'docs/requirements.md': 'The first board exports one SVG from local data.\nEditing is requested, but its interaction style is undecided.\n' },
  knowledge: { 'knowledge/requirements.md': 'The first board exports one SVG from local data.\nEditing is requested, but its interaction style is undecided.\n' },
  conflict: {
    'docs/scope.md': 'Exports must stay local-only.\n',
    'knowledge/scope.md': 'Exports must be shared through cloud sync.\n',
  },
}

/**
 * The starting request handed to the agent for each case. Kept here so both
 * conditions receive byte-identical task text and the trial runbook can quote
 * one authority instead of paraphrasing per cell.
 */
export const TASKS = {
  green: 'Build a small editable specimen-board exporter for our SVG board utility. Board input and editing interaction are undecided.',
  brown: 'Extend this existing SVG board renderer with a user-selected fill color. Its current label output and tests must keep working.',
  docs: 'Continue from the requirements in docs/. The next slice is undecided.',
  knowledge: 'Continue from the requirements in knowledge/. The next slice is undecided.',
  conflict: 'Continue from the scope documents under docs/ and knowledge/. The next slice is undecided.',
}

/**
 * Revisions recorded in the executed E4 comparison
 * (docs/analysis/guided-three-path-matched-comparison.md). A mismatch means the
 * fixtures drifted and the trial would no longer start from matched inputs.
 */
export const E4_REVISIONS = {
  green: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
  brown: '348c5a3c625bf8a1f014b72415247198ac3843b10484354f166e921ad91fabfe',
  docs: '37a9341d13c50fbf308459e1145e154768a6c28812a49eb1a0dc9af733b72179',
  knowledge: 'd5c6255f264137b340e3fce58f00a397ed0c0dbd4dbd87894ebc96e0b5a3a338',
  conflict: 'fa8d3a7aaaf19968c23d2423bd66109583b16d37f24e6578385843ad1c9af3d5',
}

/** Sorted [relative path, content] rows for a fixture body. */
export function fixtureRows(files) {
  return Object.entries(files).sort(([a], [b]) => a.localeCompare(b))
}

/** SHA-256 over sorted source-path/content pairs — the revision recorded per case. */
export function revisionFor(files) {
  return createHash('sha256').update(JSON.stringify(fixtureRows(files))).digest('hex')
}

/** Computed revisions for every case. */
export function caseRevisions() {
  return Object.fromEntries(CASE_ORDER.map((name) => [name, revisionFor(FIXTURES[name])]))
}

/** Cases whose computed revision no longer matches the executed E4 record. */
export function revisionMismatches() {
  const computed = caseRevisions()
  return CASE_ORDER
    .filter((name) => computed[name] !== E4_REVISIONS[name])
    .map((name) => ({ case: name, expected: E4_REVISIONS[name], computed: computed[name] }))
}
