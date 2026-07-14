// ============================================================
// Synth Installer Distribution Resolution Tests
// ============================================================
// Verifies that scripts/install.sh resolves distribution profiles
// correctly for supported channels and versions.
// ============================================================

import { spawnSync } from "child_process"
import path from "path"

const INSTALLER_PATH = path.resolve(process.cwd(), "scripts", "install.sh")

function runInstaller(args = [], env = {}) {
  const result = spawnSync("bash", [INSTALLER_PATH, ...args], {
    cwd: process.cwd(),
    encoding: "utf-8",
    env: { ...process.env, ...env },
    timeout: 60000,
  })
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function testDryRunPrintsDistributionProfile() {
  const result = runInstaller(["--dry-run"])
  assert(result.status === 0, "--dry-run must exit with code 0")
  assert(result.stdout.includes("Distribution profile:"), "Must print distribution profile")
  assert(result.stdout.includes("Backend:    npm"), "Must use npm backend")
  assert(result.stdout.includes("Package:    @synth-framework/synth"), "Must use correct package")
  assert(result.stdout.includes("Channel:    latest"), "Must use latest channel by default")
}

async function testExactVersionIsResolved() {
  const result = runInstaller(["--version", "2.0.0-rc.1", "--dry-run"])
  assert(result.status === 0, "Exact version --dry-run must exit with code 0")
  assert(result.stdout.includes("Version:    2.0.0-rc.1"), "Must resolve exact version")
}

async function testUnknownChannelFails() {
  const result = runInstaller(["--channel", "unknown", "--dry-run"])
  assert(result.status === 1, "Unknown channel must exit with code 1")
  assert(result.stderr.includes("Unknown release channel"), "Must report unknown channel")
}

async function testStableChannelResolves() {
  const result = runInstaller(["--channel", "stable", "--dry-run"])
  assert(result.status === 0, "Stable channel must exit with code 0")
  assert(result.stdout.includes("Channel:    stable"), "Must indicate stable channel")
  assert(result.stdout.includes("Backend:    npm"), "Must use npm backend")
}

async function main() {
  console.log("Running installer distribution tests...")

  await testDryRunPrintsDistributionProfile()
  console.log("✓ --dry-run prints distribution profile")

  await testExactVersionIsResolved()
  console.log("✓ Exact version is resolved")

  await testUnknownChannelFails()
  console.log("✓ Unknown channel fails with exit code 1")

  await testStableChannelResolves()
  console.log("✓ Stable channel resolves")

  console.log("\nAll installer distribution tests passed.")
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
