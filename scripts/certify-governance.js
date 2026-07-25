// ============================================================
// Track C — Governance Certification
// ============================================================
// Aggregates the evidence that SYNTH's governance system
// enforces its own rules deterministically.
//
// Usage:
//   node scripts/certify-governance.js [--output <path>]
// ============================================================

import { spawnSync } from "node:child_process"
import fsp from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, "..")

function run(script) {
  return runCommand(["npm", "run", script])
}

function runCommand(command) {
  const start = Date.now()
  const [cmd, ...args] = command
  const result = spawnSync(cmd, args, {
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

async function main() {
  const args = process.argv.slice(2)
  const outputFlag = args.indexOf("--output")
  const outputPath = outputFlag >= 0 ? args[outputFlag + 1] : path.join(REPO_ROOT, "proof", "certifications", "governance-certificate.json")

  console.log("[Track C] Certifying governance...")

  const checks = [
    { id: "replay-graph-integrity", script: "test:replay-graph-integrity", required: true },
    { id: "convergence-certification", script: null, command: ["node", "tests/convergence-certification.test.js"], required: true },
    { id: "bypass-audit", script: "test:audit", required: true },
    { id: "governance-evaluation-enforcement", script: "test:governance-evaluation-enforcement", required: true },
    { id: "expedition-governance", script: "test:expedition-governance", required: true },
    { id: "documentation-projections", script: "test:documentation-projections", required: true },
  ]

  const results = []
  for (const check of checks) {
    console.log(`  Running ${check.id}...`)
    const result = check.command ? runCommand(check.command) : run(check.script)
    results.push({
      id: check.id,
      status: result.status === 0 ? "passed" : "failed",
      required: check.required,
      durationMs: result.durationMs,
      stderr: result.status === 0 ? undefined : result.stderr.slice(0, 1000),
    })
  }

  const certified = results.every((r) => !r.required || r.status === "passed")

  const certificate = {
    schema: "synth-governance-certificate-v1",
    program: "EXP-PROGRAM-042",
    track: "C",
    title: "Governance Certificate",
    certified,
    generatedAt: new Date().toISOString(),
    checks: results,
  }

  await fsp.mkdir(path.dirname(outputPath), { recursive: true })
  await fsp.writeFile(outputPath, JSON.stringify(certificate, null, 2), "utf8")

  console.log(`\nGovernance Certificate: ${outputPath}`)
  console.log(`Certified: ${certified}`)
  if (!certified) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
