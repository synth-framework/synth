// ============================================================
// TEST HELPERS — Filesystem fixture dirs
// ============================================================
// Shared fixture-directory helpers for adapter tests that stage files on
// disk (adapter-filesystem, adapter-specification). Single home for the
// identical FIXTURES_DIR/cleanFixtures/writeFixture blocks
// (expedition 7a79e79b, round 8/80).
//
// Usage:
//   import { cleanFixtures, writeFixture } from "./helpers/adapter-fixtures.js"
//   const dir = path.join(process.cwd(), "tests", "filesystem-adapter-fixtures")
//   cleanFixtures(dir)
//   writeFixture(dir, "case.json", "...")
// ============================================================

import fs from "fs"
import path from "path"

/** Reset a fixture directory. */
export function cleanFixtures(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
}

/** Write a fixture file, creating parent dirs. */
export function writeFixture(dir, relativePath, content) {
  const fullPath = path.join(dir, relativePath)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, content)
}

/** Stage one fixture file, then configure/enable/observe an adapter. */
export async function observeStagedFile(dir, file, content, adapter, configureArg) {
  cleanFixtures(dir)
  writeFixture(dir, file, content)
  await adapter.configure(configureArg)
  await adapter.enable()
  return adapter.observe()
}
