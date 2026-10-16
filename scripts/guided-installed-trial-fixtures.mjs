#!/usr/bin/env node
// Synthetic, unbranded starting inputs for the installed-CLI guided-journey trial.
//
// This is setup tooling, not trial evidence. It prepares matched "plain" and
// "guided" workspaces for the three case scenarios (greenfield, brownfield,
// documentation-led) plus two optional extras (knowledge-rooted and conflicting
// documents) that mirror the existing acceptance suite. The fixture bodies and
// revision hashing are intentionally identical to
// scripts/guided-three-path-comparison-fixtures.mjs so hashes can be compared
// with the executed E4 diagnostic. The trial instructions describe how an
// operator and a running agent use these directories:
//
//   docs/plans/guided-installed-cli-trial-instructions.md
//
// The operator must run this only in a scratch directory. No private asset,
// owner repository, or canonical runtime state is written here.
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'

const root = process.argv[2]
if (!root || !path.isAbsolute(root)) {
  console.error('Usage: node scripts/guided-installed-trial-fixtures.mjs <absolute empty directory>')
  process.exit(2)
}
if ((await fs.readdir(root)).length !== 0) {
  console.error('Refusing nonempty fixture directory')
  process.exit(2)
}

const fixtures = {
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

// The three cases the trial must cover; the remaining two are optional extras.
const required = ['green', 'brown', 'docs']
const optional = ['knowledge', 'conflict']

const hashes = {}
for (const [name, files] of Object.entries(fixtures)) {
  const rows = Object.entries(files).sort(([a], [b]) => a.localeCompare(b))
  const revision = createHash('sha256').update(JSON.stringify(rows)).digest('hex')
  hashes[name] = revision
  for (const treatment of ['plain', 'guided']) {
    const cwd = path.join(root, treatment, name)
    await fs.mkdir(cwd, { recursive: true })
    for (const [relative, content] of rows) {
      const target = path.join(cwd, relative)
      await fs.mkdir(path.dirname(target), { recursive: true })
      await fs.writeFile(target, content)
    }
  }
}

console.log(JSON.stringify({
  fixtureRoot: root,
  revisions: hashes,
  requiredCases: required,
  optionalCases: optional,
  treatments: ['plain', 'guided'],
  sourceFilesOnly: true,
}, null, 2))
