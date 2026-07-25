// ============================================================
// Track B — Operator Experience Certification
// ============================================================
// Aggregates the evidence that a first-time operator can adopt
// SYNTH without prior repository knowledge.
//
// Usage:
//   node scripts/certify-operator-experience.js [--output <path>]
// ============================================================

import { spawnSync } from "node:child_process"
import fsp from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, "..")

function run(script) {
  const start = Date.now()
  const result = spawnSync("npm", ["run", script], {
    cwd: REPO_ROOT,
    env: process.env,
    encoding: "utf8",
    timeout: 300000,
    maxBuffer: 50 * 1024 * 1024,
  })
  return {
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    durationMs: Date.now() - start,
  }
}

function passed(result) {
  return result.status === 0
}

async function main() {
  const args = process.argv.slice(2)
  const outputFlag = args.indexOf("--output")
  const outputPath = outputFlag >= 0 ? args[outputFlag + 1] : path.join(REPO_ROOT, "proof", "certifications", "operator-experience-certificate.json")

  console.log("[Track B] Certifying operator experience...")

  const checks = [
    { id: "first-operator-experience", script: "test:first-operator-experience", required: true },
    { id: "installer-contract", script: "test:installer-contract", required: true },
    { id: "installer-verify", script: "test:installer-verify", required: true },
    { id: "operator-journey", script: "test:operator-journey", required: false },
  ]

  const results = []
  for (const check of checks) {
    console.log(`  Running ${check.id}...`)
    const result = run(check.script)
    results.push({
      id: check.id,
      status: passed(result) ? "passed" : "failed",
      required: check.required,
      durationMs: result.durationMs,
      stderr: passed(result) ? undefined : result.stderr.slice(0, 1000),
    })
  }

  const failedRequired = results.some((r) => r.required && r.status === "failed")
  const certified = !failedRequired

  const certificate = {
    schema: "synth-operator-experience-certificate-v1",
    program: "EXP-PROGRAM-042",
    track: "B",
    title: "Operator Experience Certificate",
    certified,
    generatedAt: new Date().toISOString(),
    checks: results,
    artifacts: [
      { path: "tests/first-operator-experience.test.js", description: "70-assertion first-run journey certification" },
      { path: "tests/installer-contract.test.js", description: "Installer script argument and help contract" },
      { path: "tests/installer-verify.test.js", description: "Installation verification workflow" },
      { path: "docs/getting-started/first-five-minutes.md", description: "Operator onboarding guide" },
    ],
  }

  await fsp.mkdir(path.dirname(outputPath), { recursive: true })
  await fsp.writeFile(outputPath, JSON.stringify(certificate, null, 2), "utf8")

  console.log(`\nOperator Experience Certificate: ${outputPath}`)
  console.log(`Certified: ${certified}`)
  if (!certified) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
