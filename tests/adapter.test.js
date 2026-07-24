// ============================================================
// ADAPTER TESTS — Repository Adapter (Git Reference)
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createGitRepositoryAdapter } from "../dist/adapters/repository/git.js"
import { createAdapterRegistry } from "../dist/mission-studio/adapter-registry.js"
import fs from "fs"
import path from "path"
import { execSync } from "child_process"

const TEST_REPO = path.join(process.cwd(), "data-test", "adapter-repo")

function cleanRepo() {
  fs.rmSync(TEST_REPO, { recursive: true, force: true })
}

function initRepo() {
  cleanRepo()
  fs.mkdirSync(TEST_REPO, { recursive: true })
  execSync("git init", { cwd: TEST_REPO })
  execSync("git config user.email 'test@example.com'", { cwd: TEST_REPO })
  execSync("git config user.name 'Test User'", { cwd: TEST_REPO })
  fs.writeFileSync(path.join(TEST_REPO, "README.md"), "# Test repo\n")
  execSync("git add -A", { cwd: TEST_REPO })
  execSync("git commit -m 'initial'", { cwd: TEST_REPO })
}

test("AdapterRegistry lists registered adapters", () => {
  const registry = createAdapterRegistry()
  assert.deepStrictEqual(registry.list().sort(), ["architecture", "bdd", "confidence", "conversation", "dependency", "document", "expedition-builder", "filesystem", "github", "knowledge-extraction", "mission-builder", "objective-builder", "repository", "specification", "tdd", "wizard"])
})

test("GitRepositoryAdapter starts in discovered state", () => {
  const adapter = createGitRepositoryAdapter()
  assert.strictEqual(adapter.state, "discovered")
  assert.strictEqual(adapter.metadata.kind, "repository")
})

test("GitRepositoryAdapter transitions through lifecycle", async () => {
  initRepo()
  const adapter = createGitRepositoryAdapter()
  await adapter.configure({ path: TEST_REPO, remote: "origin", defaultBranch: "main", promotionMode: "direct" })
  assert.strictEqual(adapter.state, "configured")
  await adapter.validate()
  assert.strictEqual(adapter.state, "validated")
})

test("GitRepositoryAdapter initializes a git repository", async () => {
  cleanRepo()
  fs.mkdirSync(TEST_REPO, { recursive: true })
  const adapter = createGitRepositoryAdapter()
  await adapter.configure({ path: TEST_REPO, remote: "origin", defaultBranch: "main", promotionMode: "direct" })
  await adapter.initialize()
  assert.strictEqual(adapter.state, "configured")
  assert.strictEqual(fs.existsSync(path.join(TEST_REPO, ".git")), true)
})

test("GitRepositoryAdapter reports status on initialized repo", async () => {
  initRepo()
  const expectedBranch = execSync("git branch --show-current", { cwd: TEST_REPO, encoding: "utf-8" }).trim()
  const adapter = createGitRepositoryAdapter()
  await adapter.configure({ path: TEST_REPO, remote: "origin", defaultBranch: "main", promotionMode: "direct" })
  await adapter.enable()
  const status = await adapter.status()
  assert.strictEqual(status.initialized, true)
  assert.strictEqual(status.branch, expectedBranch)
  assert.strictEqual(status.uncommittedChanges, false)
  assert.strictEqual(status.adapterEnabled, true)
})

test("GitRepositoryAdapter creates branches and commits", async () => {
  initRepo()
  const adapter = createGitRepositoryAdapter()
  await adapter.configure({ path: TEST_REPO, remote: "origin", defaultBranch: "main", promotionMode: "direct" })
  await adapter.enable()
  await adapter.createBranch("feature/test")
  fs.writeFileSync(path.join(TEST_REPO, "feature.txt"), "feature work\n")
  await adapter.commit("Add feature file")
  const status = await adapter.status()
  assert.strictEqual(status.branch, "feature/test")
  assert.strictEqual(status.uncommittedChanges, false)
})

test("GitRepositoryAdapter installs governance hooks", async () => {
  initRepo()
  const adapter = createGitRepositoryAdapter()
  await adapter.configure({ path: TEST_REPO, remote: "origin", defaultBranch: "main", promotionMode: "direct" })
  await adapter.enable()
  await adapter.installHooks()
  const status = await adapter.status()
  assert.strictEqual(status.hooksInstalled, true)
  const hookContent = fs.readFileSync(path.join(TEST_REPO, ".git", "hooks", "pre-commit"), "utf-8")
  assert.ok(hookContent.includes("npm run govern"))
})

test("Adapter lifecycle: discover -> configure -> validate -> enable -> disable", async () => {
  const registry = createAdapterRegistry()
  const adapter = registry.create("repository")
  assert.strictEqual(adapter.state, "discovered")
  await adapter.configure({ path: TEST_REPO, remote: "origin", defaultBranch: "main", promotionMode: "direct" })
  assert.strictEqual(adapter.state, "configured")
  await adapter.validate()
  assert.strictEqual(adapter.state, "validated")
  await adapter.enable()
  assert.strictEqual(adapter.state, "enabled")
  await adapter.disable()
  assert.strictEqual(adapter.state, "disabled")
})

test("GitRepositoryAdapter observes languages, dependencies, and tests", async () => {
  cleanRepo()
  fs.mkdirSync(TEST_REPO, { recursive: true })
  fs.writeFileSync(
    path.join(TEST_REPO, "package.json"),
    JSON.stringify({
      name: "test-repo",
      dependencies: { express: "^4.18.0" },
      devDependencies: { typescript: "^5.0.0", jest: "^29.0.0" },
      scripts: { test: "jest" },
    }, null, 2),
  )
  fs.writeFileSync(path.join(TEST_REPO, "tsconfig.json"), '{"compilerOptions": {"target": "ES2022"}}')
  fs.mkdirSync(path.join(TEST_REPO, "src"), { recursive: true })
  fs.writeFileSync(path.join(TEST_REPO, "src", "index.ts"), "export const app = {}")
  fs.mkdirSync(path.join(TEST_REPO, "tests"), { recursive: true })
  fs.writeFileSync(path.join(TEST_REPO, "tests", "app.test.ts"), "test('app', () => {})")
  execSync("git init", { cwd: TEST_REPO })
  execSync("git config user.email 'test@example.com'", { cwd: TEST_REPO })
  execSync("git config user.name 'Test User'", { cwd: TEST_REPO })
  execSync("git add -A", { cwd: TEST_REPO })
  execSync("git commit -m 'initial'", { cwd: TEST_REPO })

  const adapter = createGitRepositoryAdapter()
  await adapter.configure({ path: TEST_REPO, remote: "origin", defaultBranch: "main", promotionMode: "direct" })
  await adapter.enable()
  const result = await adapter.observe()
  assert.strictEqual(result.errors.length, 0)

  const languages = result.observations.filter((o) => o.category === "language")
  assert.ok(languages.length > 0, "Expected language observations")
  assert.ok(languages.some((o) => o.subject === "TypeScript"), "Expected TypeScript language observation")

  const dependencies = result.observations.filter((o) => o.category === "dependency")
  assert.ok(dependencies.some((o) => o.subject === "express"), "Expected express dependency")
  assert.ok(dependencies.some((o) => o.subject === "typescript"), "Expected typescript dependency")

  const tests = result.observations.filter((o) => o.category === "test")
  assert.ok(tests.length > 0, "Expected test observation")

  const tooling = result.observations.filter((o) => o.category === "evidence" && o.subject === "tsconfig.json")
  assert.ok(tooling.length > 0, "Expected tsconfig.json evidence observation")
})
