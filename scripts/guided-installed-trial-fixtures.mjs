#!/usr/bin/env node
// Synthetic, unbranded starting inputs for the installed-CLI guided-journey trial.
//
// This is setup tooling, not trial evidence. It writes matched "plain" and
// "guided" workspaces for the three required case scenarios (greenfield,
// brownfield, documentation-led) plus two optional extras (knowledge-rooted and
// conflicting documents). Fixture bodies, task text and revision hashing live in
// scripts/lib/guided-trial-fixtures.mjs so the setup executor and this generator
// cannot drift apart.
//
// The trial protocol, including the copy-paste runbook and the agent kickoff
// prompt, is docs/plans/guided-installed-cli-trial-instructions.md.
//
// Usage: node scripts/guided-installed-trial-fixtures.mjs <absolute empty directory>
//
// No private asset, owner repository, or canonical runtime state is written here.
import fs from 'node:fs/promises'
import path from 'node:path'
import { CASE_ORDER, FIXTURES, OPTIONAL_CASES, REQUIRED_CASES, caseRevisions, fixtureRows, revisionMismatches } from './lib/guided-trial-fixtures.mjs'

const root = process.argv[2]
if (!root || !path.isAbsolute(root)) {
  console.error('Usage: node scripts/guided-installed-trial-fixtures.mjs <absolute empty directory>')
  process.exit(2)
}
if ((await fs.readdir(root)).length !== 0) {
  console.error('Refusing nonempty fixture directory')
  process.exit(2)
}

const drifted = revisionMismatches()
if (drifted.length > 0) {
  console.error('Fixture drift: computed revisions no longer match the executed E4 record')
  console.error(JSON.stringify(drifted, null, 2))
  process.exit(2)
}

for (const name of CASE_ORDER) {
  for (const treatment of ['plain', 'guided']) {
    const cwd = path.join(root, treatment, name)
    await fs.mkdir(cwd, { recursive: true })
    for (const [relative, content] of fixtureRows(FIXTURES[name])) {
      const target = path.join(cwd, relative)
      await fs.mkdir(path.dirname(target), { recursive: true })
      await fs.writeFile(target, content)
    }
  }
}

console.log(JSON.stringify({
  fixtureRoot: root,
  revisions: caseRevisions(),
  requiredCases: REQUIRED_CASES,
  optionalCases: OPTIONAL_CASES,
  treatments: ['plain', 'guided'],
  sourceFilesOnly: true,
}, null, 2))
