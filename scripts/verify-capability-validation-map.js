#!/usr/bin/env node
// ============================================================
// SYNTH Capability ↔ Test Mapping Validator
// ============================================================
// Validates that docs/reference/capability-validation-map.json
// is internally consistent and that every referenced npm script
// exists in package.json. Fails `npm run govern` on any mismatch.
// ============================================================

import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MAP_PATH =
  process.env.SYNTH_CAPABILITY_MAP_PATH ||
  path.resolve(__dirname, "..", "docs", "reference", "capability-validation-map.json")
const PACKAGE_PATH = path.resolve(__dirname, "..", "package.json")

const EXPECTED_SCHEMA = "synth-capability-validation-map-v1"
const REQUIRED_CAPABILITY_FIELDS = [
  "unitTests",
  "integrationTests",
  "benchmarks",
  "proofs",
  "lintScope",
  "typecheckScope",
]

async function loadJson(filePath) {
  const content = await fs.readFile(filePath, "utf-8")
  return JSON.parse(content)
}

function isNonEmptyStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function validate(map, packageJson) {
  const issues = []
  const availableScripts = Object.keys(packageJson.scripts || {})

  // Top-level schema check
  if (map.schema !== EXPECTED_SCHEMA) {
    issues.push({
      severity: "error",
      message: `Unexpected schema '${map.schema}'. Expected '${EXPECTED_SCHEMA}'.`,
    })
  }

  if (!isNonEmptyStringArray(map.lintScope)) {
    issues.push({
      severity: "error",
      message: "Top-level 'lintScope' must be a non-empty array of strings.",
    })
  }

  if (!isNonEmptyStringArray(map.typecheckScope)) {
    issues.push({
      severity: "error",
      message: "Top-level 'typecheckScope' must be a non-empty array of strings.",
    })
  }

  if (!map.capabilities || typeof map.capabilities !== "object") {
    issues.push({
      severity: "error",
      message: "Missing or invalid 'capabilities' object.",
    })
    return issues
  }

  const capabilityNames = Object.keys(map.capabilities)

  if (capabilityNames.length === 0) {
    issues.push({
      severity: "error",
      message: "No capabilities declared in the mapping.",
    })
  }

  for (const name of capabilityNames) {
    const capability = map.capabilities[name]

    // Required fields
    for (const field of REQUIRED_CAPABILITY_FIELDS) {
      if (!(field in capability)) {
        issues.push({
          severity: "error",
          capability: name,
          message: `Missing required field '${field}'.`,
        })
        continue
      }

      if (!isNonEmptyStringArray(capability[field])) {
        issues.push({
          severity: "error",
          capability: name,
          message: `'${field}' must be an array of strings.`,
        })
      }
    }

    // Every capability must map to at least one validation activity
    const hasAnyValidation =
      capability.unitTests.length > 0 ||
      capability.integrationTests.length > 0 ||
      capability.benchmarks.length > 0 ||
      capability.proofs.length > 0

    if (!hasAnyValidation) {
      issues.push({
        severity: "error",
        capability: name,
        message: "Capability must declare at least one unit test, integration test, benchmark, or proof.",
      })
    }

    // Protected assets must be covered by integration tests or proofs
    if (capability.protectedAsset) {
      const hasStrongValidation =
        capability.integrationTests.length > 0 || capability.proofs.length > 0

      if (!hasStrongValidation) {
        issues.push({
          severity: "error",
          capability: name,
          message: `Protected Asset '${capability.protectedAsset}' must have at least one integration test or proof.`,
        })
      }
    }

    // Validate every referenced script exists in package.json
    const allScripts = [
      ...capability.unitTests,
      ...capability.integrationTests,
      ...capability.benchmarks,
      ...capability.proofs,
    ]

    for (const script of allScripts) {
      if (!availableScripts.includes(script)) {
        issues.push({
          severity: "error",
          capability: name,
          message: `Referenced script '${script}' is not defined in package.json.`,
        })
      }
    }
  }

  return issues
}

async function main() {
  console.log("═══════════════════════════════════════════════════")
  console.log("  SYNTH Capability ↔ Test Mapping Validator")
  console.log("  Validating mapping manifest against package.json...")
  console.log("═══════════════════════════════════════════════════")

  const map = await loadJson(MAP_PATH)
  const packageJson = await loadJson(PACKAGE_PATH)
  const issues = validate(map, packageJson)
  const errors = issues.filter((i) => i.severity === "error")

  if (errors.length === 0) {
    console.log("\n  ✅ Capability validation map is consistent")
    console.log(`  Capabilities checked: ${Object.keys(map.capabilities).length}`)
    console.log("═══════════════════════════════════════════════════\n")
    process.exit(0)
  }

  console.log(`\n  ❌ ${errors.length} error(s):`)
  for (const issue of errors) {
    const capability = issue.capability ? `[${issue.capability}] ` : ""
    console.log(`    - ${capability}${issue.message}`)
  }
  console.log("═══════════════════════════════════════════════════\n")
  process.exit(1)
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
