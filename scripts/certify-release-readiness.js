// ============================================================
// Track E — Release Readiness Certification
// ============================================================
// Certifies that the release package is complete.
//
// Usage:
//   node scripts/certify-release-readiness.js [--output <path>]
// ============================================================

import { spawnSync } from "node:child_process"
import fs from "node:fs"
import fsp from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, "..")

function exists(p) {
  return fs.existsSync(path.join(REPO_ROOT, p))
}

function run(args) {
  const start = Date.now()
  const result = spawnSync("npm", args, {
    cwd: REPO_ROOT,
    env: process.env,
    encoding: "utf8",
    timeout: 120000,
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
  const outputPath = outputFlag >= 0 ? args[outputFlag + 1] : path.join(REPO_ROOT, "proof", "certifications", "release-readiness-certificate.json")

  console.log("[Track E] Certifying release readiness...")

  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"))

  const checks = [
    { id: "changelog", description: "CHANGELOG.md exists", test: () => exists("CHANGELOG.md") },
    { id: "license", description: "LICENSE exists", test: () => exists("LICENSE") },
    { id: "version", description: "package.json has a version", test: () => typeof pkg.version === "string" && pkg.version.length > 0 },
    { id: "bin", description: "package.json defines a bin entry", test: () => typeof pkg.bin?.synth === "string" },
    { id: "files", description: "package.json files list is present", test: () => Array.isArray(pkg.files) && pkg.files.length > 0 },
    { id: "pack-dry-run", description: "npm pack dry-run succeeds", test: () => run(["pack", "--dry-run"]).status === 0 },
    { id: "audit", description: "npm audit completes", test: () => run(["audit"]).status === 0 },
  ]

  const results = []
  for (const check of checks) {
    console.log(`  Checking ${check.id}...`)
    const ok = check.test()
    results.push({
      id: check.id,
      status: ok ? "passed" : "failed",
      description: check.description,
    })
  }

  const certified = results.every((r) => r.status === "passed")

  const certificate = {
    schema: "synth-release-readiness-certificate-v1",
    program: "EXP-PROGRAM-042",
    track: "E",
    title: "Release Readiness Certificate",
    certified,
    generatedAt: new Date().toISOString(),
    version: pkg.version,
    checks: results,
  }

  await fsp.mkdir(path.dirname(outputPath), { recursive: true })
  await fsp.writeFile(outputPath, JSON.stringify(certificate, null, 2), "utf8")

  console.log(`\nRelease Readiness Certificate: ${outputPath}`)
  console.log(`Certified: ${certified}`)
  if (!certified) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
