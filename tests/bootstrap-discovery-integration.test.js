// ============================================================
// BOOTSTRAP-DISCOVERY INTEGRATION TESTS
// ============================================================
// Verifies that bootstrap analysis now consumes Discovery output and
// preserves the legacy RepositoryAnalysis contract.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { analyzeRepository } from "../dist/cli/bootstrap-analyzer.js"

const PROJECT_ROOT = process.cwd()

const EXAMPLES = [
  { name: "todo", dir: "examples/todo", expectedType: "node" },
  { name: "crm", dir: "examples/crm", expectedType: "node" },
  { name: "legacy-node", dir: "examples/legacy-node", expectedType: "node" },
  { name: "polyglot", dir: "examples/polyglot", expectedType: "node" },
  { name: "monolith", dir: "examples/monolith", expectedType: "node" },
  { name: "blog", dir: "examples/blog", expectedType: "node" },
]

const VALID_REPOSITORY_TYPES = new Set([
  "empty",
  "node",
  "python",
  "polyglot",
  "brownfield",
  "unknown",
])

test("analyzeRepository returns RepositoryAnalysis for each example", async () => {
  for (const example of EXAMPLES) {
    const exampleDir = path.resolve(PROJECT_ROOT, example.dir)
    const analysis = await analyzeRepository(exampleDir)

    assert.ok(
      VALID_REPOSITORY_TYPES.has(analysis.repositoryType),
      `${example.name}: repositoryType must be a valid type`,
    )
    assert.strictEqual(
      analysis.repositoryType,
      example.expectedType,
      `${example.name}: repositoryType must match expected type`,
    )
    assert.ok(Array.isArray(analysis.languages), `${example.name}: languages must be an array`)
    assert.ok(analysis.languages.length > 0, `${example.name}: languages must not be empty`)
    assert.ok(Array.isArray(analysis.frameworks), `${example.name}: frameworks must be an array`)
    assert.ok(analysis.observations.length > 0, `${example.name}: observations must be produced`)
    assert.ok(
      analysis.observations.length <= 20,
      `${example.name}: observations must be capped at 20`,
    )
    assert.ok(analysis.fileCount > 0, `${example.name}: fileCount must be greater than zero`)
    assert.strictEqual(
      analysis.hasPackageManager,
      true,
      `${example.name}: package manager must be detected`,
    )

    console.log(
      `✓ ${example.name}: ${analysis.repositoryType}, ${analysis.languages.length} language(s), ${analysis.observations.length} observation(s)`,
    )
  }
})

test("mission subject and purpose derived from Discovery match prior shape", async () => {
  for (const example of EXAMPLES) {
    const exampleDir = path.resolve(PROJECT_ROOT, example.dir)
    const analysis = await analyzeRepository(exampleDir)

    const missionObservation = analysis.observations.find(
      (observation) => observation.type === "mission",
    )
    assert.ok(missionObservation, `${example.name}: mission observation must exist`)

    const subject = missionObservation.payload.subject
    const purpose = missionObservation.payload.purpose
    assert.ok(typeof subject === "string" && subject.length > 0, `${example.name}: subject must be a non-empty string`)
    assert.ok(typeof purpose === "string" && purpose.length > 0, `${example.name}: purpose must be a non-empty string`)
    assert.ok(
      purpose.toLowerCase().includes(analysis.repositoryType),
      `${example.name}: purpose must include repository type`,
    )
    assert.ok(
      analysis.languages.every((language) => purpose.includes(language)),
      `${example.name}: purpose must include all detected languages`,
    )
  }
})

test("analyzeRepository does not modify the target directory", async () => {
  for (const example of EXAMPLES) {
    const exampleDir = path.resolve(PROJECT_ROOT, example.dir)
    const before = await fs.stat(exampleDir)
    await analyzeRepository(exampleDir)
    const after = await fs.stat(exampleDir)

    assert.strictEqual(
      before.mtimeMs,
      after.mtimeMs,
      `${example.name}: directory mtime must not change`,
    )
    assert.strictEqual(
      before.ctimeMs,
      after.ctimeMs,
      `${example.name}: directory ctime must not change`,
    )
  }
})

test("polyglot fixture with Node.js and Python source files is classified as polyglot", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "discovery-polyglot-"))
  await fs.writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "polyglot-example" }),
    "utf-8",
  )
  await fs.writeFile(path.join(tmpDir, "app.py"), "print('hello')\n", "utf-8")
  await fs.writeFile(path.join(tmpDir, "README.md"), "# Polyglot", "utf-8")

  try {
    const analysis = await analyzeRepository(tmpDir)
    assert.strictEqual(analysis.repositoryType, "polyglot")
    assert.ok(analysis.languages.includes("JavaScript/TypeScript"))
    assert.ok(analysis.languages.includes("Python"))
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
})

test("RepositoryAnalysis carries Discovery session provenance", async () => {
  const exampleDir = path.resolve(PROJECT_ROOT, EXAMPLES[0].dir)
  const analysis = await analyzeRepository(exampleDir)

  assert.ok(analysis.discoverySessionId, "discoverySessionId must be present")
  assert.ok(analysis.discoverySessionHash, "discoverySessionHash must be present")
  assert.strictEqual(typeof analysis.discoverySessionId, "string")
  assert.strictEqual(typeof analysis.discoverySessionHash, "string")
})
