// ============================================================
// Synth Installer Contract Tests
// ============================================================
// Verifies the public interface of scripts/install.sh:
// argument parsing, exit codes, help output, and logging.
// ============================================================

import { spawnSync } from "child_process"
import path from "path"

const INSTALLER_PATH = path.resolve(process.cwd(), "scripts", "install.sh")

function runInstaller(args = [], env = {}) {
  const result = spawnSync("bash", [INSTALLER_PATH, ...args], {
    cwd: process.cwd(),
    encoding: "utf-8",
    env: { ...process.env, ...env },
    timeout: 30000,
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

async function testHelpReturnsZero() {
  const result = runInstaller(["--help"])
  assert(result.status === 0, "--help must exit with code 0")
  assert(result.stdout.includes("Synth Bootstrap Installer"), "Help must include installer title")
  assert(result.stdout.includes("--upgrade"), "Help must mention --upgrade")
  assert(result.stdout.includes("--channel"), "Help must mention --channel")
  assert(result.stdout.includes("--version"), "Help must mention --version")
  assert(result.stdout.includes("--dry-run"), "Help must mention --dry-run")
  assert(result.stdout.includes("--verbose"), "Help must mention --verbose")
}

async function testUnknownOptionFails() {
  const result = runInstaller(["--unknown"])
  assert(result.status === 1, "Unknown option must exit with code 1")
  assert(result.stderr.includes("Unknown option"), "Must report unknown option")
}

async function testMissingChannelValueFails() {
  const result = runInstaller(["--channel"])
  assert(result.status === 1, "Missing --channel value must exit with code 1")
}

async function testMissingVersionValueFails() {
  const result = runInstaller(["--version"])
  assert(result.status === 1, "Missing --version value must exit with code 1")
}

async function testDryRunReturnsZero() {
  const result = runInstaller(["--dry-run"])
  assert(result.status === 0, "--dry-run must exit with code 0")
  assert(result.stdout.includes("Installation plan"), "Must print installation plan")
  assert(result.stdout.includes("Dry run:    true"), "Must indicate dry run")
}

async function testUpgradeFlagIsParsed() {
  const result = runInstaller(["--upgrade", "--dry-run"])
  assert(result.status === 0, "--upgrade --dry-run must exit with code 0")
  assert(result.stdout.includes("Upgrade:    true"), "Must indicate upgrade")
}

async function testChannelFlagIsParsed() {
  const result = runInstaller(["--channel", "beta", "--dry-run"])
  assert(result.status === 0, "--channel beta --dry-run must exit with code 0")
  assert(result.stdout.includes("Channel:    beta"), "Must indicate beta channel")
}

async function testVersionFlagIsParsed() {
  const result = runInstaller(["--version", "2.1.0", "--dry-run"])
  assert(result.status === 0, "--version 2.1.0 --dry-run must exit with code 0")
  assert(result.stdout.includes("Version:    2.1.0"), "Must indicate version 2.1.0")
}

async function testBaseUrlEnvironmentVariable() {
  const result = runInstaller(["--dry-run"], { SYNTH_INSTALLER_BASE_URL: "https://example.com/synth" })
  assert(result.status === 0, "Custom base URL must exit with code 0")
  assert(result.stdout.includes("Base URL:   https://example.com/synth"), "Must use custom base URL")
}

async function testDefaultBaseUrl() {
  const result = runInstaller(["--dry-run"])
  assert(result.status === 0, "Default base URL must exit with code 0")
  assert(result.stdout.includes("Base URL:   https://synth-framework.github.io/synth"), "Must use default base URL")
}

async function main() {
  console.log("Running installer contract tests...")

  await testHelpReturnsZero()
  console.log("✓ --help returns exit code 0 with expected content")

  await testUnknownOptionFails()
  console.log("✓ Unknown option fails with exit code 1")

  await testMissingChannelValueFails()
  console.log("✓ Missing --channel value fails")

  await testMissingVersionValueFails()
  console.log("✓ Missing --version value fails")

  await testDryRunReturnsZero()
  console.log("✓ --dry-run returns exit code 0 and prints plan")

  await testUpgradeFlagIsParsed()
  console.log("✓ --upgrade is parsed")

  await testChannelFlagIsParsed()
  console.log("✓ --channel is parsed")

  await testVersionFlagIsParsed()
  console.log("✓ --version is parsed")

  await testBaseUrlEnvironmentVariable()
  console.log("✓ SYNTH_INSTALLER_BASE_URL environment variable is respected")

  await testDefaultBaseUrl()
  console.log("✓ Default base URL is correct")

  console.log("\nAll installer contract tests passed.")
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
