// ============================================================
// Capability ↔ Test Mapping Tests
// ============================================================
// Verifies the capability validation map manifest and its
// validator behave correctly under normal and error conditions.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

const VALIDATOR_PATH = path.resolve(process.cwd(), "scripts", "verify-capability-validation-map.js")
const MAP_PATH = path.resolve(process.cwd(), "docs", "reference", "capability-validation-map.json")
const PACKAGE_PATH = path.resolve(process.cwd(), "package.json")

async function loadJson(filePath) {
  const content = await fs.readFile(filePath, "utf-8")
  return JSON.parse(content)
}

function runValidator(extraEnv = {}) {
  return spawnSync("node", [VALIDATOR_PATH], {
    encoding: "utf-8",
    env: { ...process.env, ...extraEnv },
  })
}

async function runValidatorWithMap(mapPath) {
  return spawnSync("node", [VALIDATOR_PATH], {
    encoding: "utf-8",
    env: { ...process.env, SYNTH_CAPABILITY_MAP_PATH: mapPath },
  })
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function testValidMapPasses() {
  const result = runValidator()

  assert(result.status === 0, `expected validator to pass, got exit code ${result.status}. stderr: ${result.stderr}`)
  assert(result.stdout.includes("Capability validation map is consistent"), "should report success")
  console.log("[PASS] Valid capability map passes validator")
}

async function testMapReferencesExistingScripts() {
  const map = await loadJson(MAP_PATH)
  const packageJson = await loadJson(PACKAGE_PATH)
  const availableScripts = Object.keys(packageJson.scripts || {})

  for (const [capability, config] of Object.entries(map.capabilities)) {
    const scripts = [
      ...config.unitTests,
      ...config.integrationTests,
      ...config.benchmarks,
      ...config.proofs,
    ]

    for (const script of scripts) {
      assert(
        availableScripts.includes(script),
        `${capability} references unknown script '${script}'`
      )
    }
  }

  console.log("[PASS] Every referenced script exists in package.json")
}

async function testEveryCapabilityHasValidation() {
  const map = await loadJson(MAP_PATH)

  for (const [capability, config] of Object.entries(map.capabilities)) {
    const hasValidation =
      config.unitTests.length > 0 ||
      config.integrationTests.length > 0 ||
      config.benchmarks.length > 0 ||
      config.proofs.length > 0

    assert(hasValidation, `${capability} must declare at least one validation activity`)
  }

  console.log("[PASS] Every capability declares at least one validation activity")
}

async function testProtectedAssetsHaveStrongValidation() {
  const map = await loadJson(MAP_PATH)

  for (const [capability, config] of Object.entries(map.capabilities)) {
    if (!config.protectedAsset) continue

    const hasStrongValidation =
      config.integrationTests.length > 0 || config.proofs.length > 0

    assert(
      hasStrongValidation,
      `Protected Asset '${config.protectedAsset}' (${capability}) must have integration tests or proofs`
    )
  }

  console.log("[PASS] Protected Assets have integration tests or proofs")
}

async function testInvalidSchemaFails() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-validation-map-"))
  const invalidMapPath = path.join(tmpDir, "invalid-map.json")

  const map = await loadJson(MAP_PATH)
  map.schema = "wrong-schema"
  await fs.writeFile(invalidMapPath, JSON.stringify(map, null, 2))

  const result = await runValidatorWithMap(invalidMapPath)

  assert(result.status !== 0, "expected validator to fail with wrong schema")
  assert(result.stdout.includes("Unexpected schema"), "should report schema mismatch")

  await fs.rm(tmpDir, { recursive: true, force: true })
  console.log("[PASS] Validator rejects unexpected schema")
}

async function testMissingScriptsFail() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-validation-map-"))
  const invalidMapPath = path.join(tmpDir, "invalid-map.json")

  const map = await loadJson(MAP_PATH)
  map.capabilities.TddAdapter.unitTests = ["test:nonexistent-script"]
  await fs.writeFile(invalidMapPath, JSON.stringify(map, null, 2))

  const result = await runValidatorWithMap(invalidMapPath)

  assert(result.status !== 0, "expected validator to fail with missing script")
  assert(
    result.stdout.includes("test:nonexistent-script") &&
    result.stdout.includes("not defined in package.json"),
    "should report missing script"
  )

  await fs.rm(tmpDir, { recursive: true, force: true })
  console.log("[PASS] Validator rejects references to missing scripts")
}

async function testEmptyCapabilityValidationFails() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-validation-map-"))
  const invalidMapPath = path.join(tmpDir, "invalid-map.json")

  const map = await loadJson(MAP_PATH)
  map.capabilities.TddAdapter = {
    unitTests: [],
    integrationTests: [],
    benchmarks: [],
    proofs: [],
    lintScope: ["src/adapters/tdd/"],
    typecheckScope: ["src/adapters/tdd/"],
  }
  await fs.writeFile(invalidMapPath, JSON.stringify(map, null, 2))

  const result = await runValidatorWithMap(invalidMapPath)

  assert(result.status !== 0, "expected validator to fail with empty validation")
  assert(
    result.stdout.includes("must declare at least one"),
    "should report missing validation activity"
  )

  await fs.rm(tmpDir, { recursive: true, force: true })
  console.log("[PASS] Validator rejects capabilities with no validation activities")
}

async function main() {
  await testValidMapPasses()
  await testMapReferencesExistingScripts()
  await testEveryCapabilityHasValidation()
  await testProtectedAssetsHaveStrongValidation()
  await testInvalidSchemaFails()
  await testMissingScriptsFail()
  await testEmptyCapabilityValidationFails()

  console.log("\n[VALIDATION MAPPING] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
