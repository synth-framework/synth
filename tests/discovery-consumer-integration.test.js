import { makeTempDir } from "./helpers/workspace.js"
import { test } from "node:test"
import assert from "node:assert"
import path from "path"
import { registerDiscoveryIntegrationTests } from "./helpers/discovery-integration-tests.js"
import { analyzeRepository } from "../dist/cli/bootstrap-analyzer.js"

// ============================================================
// DISCOVERY CONSUMER INTEGRATION TESTS
// ============================================================
// Verifies that bootstrap analysis continues to satisfy its legacy
// contract after migrating to the Discovery Consumption Layer.
// ============================================================

registerDiscoveryIntegrationTests(makeTempDir)

test("bootstrap-apply receives discoverySessionId and discoverySessionHash through analysis", async () => {
  const PROJECT_ROOT = process.cwd()
  const EXAMPLES = [
    { name: "todo", dir: "examples/todo", expectedType: "node" },
  ]
  const exampleDir = path.resolve(PROJECT_ROOT, EXAMPLES[0].dir)
  const analysis = await analyzeRepository(exampleDir)

  assert.ok(analysis.discoverySessionId, "analysis must include discoverySessionId for bootstrap-apply")
  assert.ok(analysis.discoverySessionHash, "analysis must include discoverySessionHash for bootstrap-apply")

  // bootstrap-apply.ts copies these values into the mission observation payload.
  // This test verifies the contract surface that bootstrap-apply consumes.
  assert.strictEqual(typeof analysis.discoverySessionId, "string")
  assert.strictEqual(typeof analysis.discoverySessionHash, "string")
  assert.ok(analysis.discoverySessionId.length > 0)
  assert.ok(analysis.discoverySessionHash.length > 0)
})