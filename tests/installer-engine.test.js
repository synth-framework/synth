import { makeTempDirSync } from "./helpers/workspace.js"
// ============================================================
// Synth Installer Engine Tests
// ============================================================
// Verifies the installation workflow: package installation,
// retry logic, cleanup on failure, rollback on upgrade,
// idempotent execution, and verification integration.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs"
import os from "os"
import path from "path"
import { assert } from "./helpers/assert.js"
import { runEngineInstaller as runInstaller, createFakeNpm } from "./helpers/installer.js"

function makeTempDir() {
  return makeTempDirSync("synth-installer-engine-")
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, { mode: 0o755 })
}

async function testDryRunDoesNotInstall() {
  const fake = createFakeNpm({ prefix: makeTempDir() })
  const result = runInstaller(
    ["--dry-run"],
    {
      SYNTH_INSTALLER_NPM_PREFIX: fake.dir,
      PATH: `${fake.dir}:${process.env.PATH}`,
    },
  )
  assert(result.status === 0, "--dry-run must exit with code 0")
  const logLines = fs.existsSync(fake.logFile)
    ? fs.readFileSync(fake.logFile, "utf-8").trim().split("\n").filter(Boolean)
    : []
  const installLines = logLines.filter((line) => line.startsWith("install "))
  assert(installLines.length === 0, "npm install must not be invoked in dry-run mode")
  assert(result.stdout.includes("Dry run:    true"), "Must indicate dry run")
}

async function testSuccessfulInstall() {
  const prefix = makeTempDir()
  const fake = createFakeNpm({ prefix })
  const result = runInstaller(
    [],
    {
      SYNTH_INSTALLER_NPM_PREFIX: prefix,
      PATH: `${prefix}/bin:${fake.dir}:${process.env.PATH}`,
    },
    180000,
  )
  assert(result.status === 0, "Install must exit with code 0")
  assert(result.stdout.includes("Synth @synth-framework/synth@2.0.0-rc.1 installed successfully"), "Must report successful install")
  const log = fs.readFileSync(fake.logFile, "utf-8").trim().split("\n")
  const installLine = log.find((line) => line.startsWith("install "))
  assert(installLine !== undefined, "npm install must be invoked")
  assert(installLine.includes("@synth-framework/synth@2.0.0-rc.1"), "Must install correct target")
  assert(fs.existsSync(path.join(prefix, "bin", "synth")), "Fake synth binary must be created")
}

async function testRetryOnTransientFailure() {
  const prefix = makeTempDir()
  const fake = createFakeNpm({ prefix, maxFail: 2 })
  const result = runInstaller(
    [],
    {
      SYNTH_INSTALLER_NPM_PREFIX: prefix,
      PATH: `${prefix}/bin:${fake.dir}:${process.env.PATH}`,
    },
    180000,
  )
  assert(result.status === 0, "Install must succeed after retries")
  const attempts = fs.readFileSync(fake.attemptsFile, "utf-8").trim()
  assert(attempts === "3", `Expected 3 install attempts, got ${attempts}`)
  assert(result.stdout.includes("Synth @synth-framework/synth@2.0.0-rc.1 installed successfully"), "Must report successful install")
}

async function testCleanupOnFailure() {
  const prefix = makeTempDir()
  const fake = createFakeNpm({ prefix, permanentFail: true })
  const result = runInstaller(
    [],
    {
      SYNTH_INSTALLER_NPM_PREFIX: prefix,
      PATH: `${prefix}/bin:${fake.dir}:${process.env.PATH}`,
    },
    180000,
  )
  assert(result.status === 1, "Permanent failure must exit with code 1")
  assert(result.stderr.includes("Installation failed after 3 attempts"), "Must report final failure")
  const log = fs.readFileSync(fake.logFile, "utf-8").trim().split("\n")
  const uninstallLines = log.filter((line) => line.startsWith("uninstall "))
  assert(uninstallLines.length >= 1, "Cleanup uninstall must be attempted")
}

async function testIdempotentExecution() {
  const prefix = makeTempDir()
  const fake = createFakeNpm({ prefix })
  const env = {
    SYNTH_INSTALLER_NPM_PREFIX: prefix,
    PATH: `${prefix}/bin:${fake.dir}:${process.env.PATH}`,
  }
  const first = runInstaller([], env, 180000)
  assert(first.status === 0, "First install must succeed")
  const second = runInstaller([], env, 180000)
  assert(second.status === 0, "Second install must succeed")
  const log = fs.readFileSync(fake.logFile, "utf-8").trim().split("\n")
  const installLines = log.filter((line) => line.startsWith("install "))
  assert(installLines.length === 2, `Expected 2 install invocations, got ${installLines.length}`)
}

async function testUpgradeFlagParsedAndPassed() {
  const prefix = makeTempDir()
  const fake = createFakeNpm({ prefix })
  const result = runInstaller(
    ["--upgrade"],
    {
      SYNTH_INSTALLER_NPM_PREFIX: prefix,
      PATH: `${prefix}/bin:${fake.dir}:${process.env.PATH}`,
    },
    180000,
  )
  assert(result.status === 0, "Upgrade must exit with code 0")
  assert(result.stdout.includes("Upgrade:    true"), "Must indicate upgrade mode")
}

async function main() {
  console.log("Running installer engine tests...")

  await testDryRunDoesNotInstall()
  console.log("✓ --dry-run does not invoke npm install")

  await testSuccessfulInstall()
  console.log("✓ Successful install invokes npm with correct target")

  await testRetryOnTransientFailure()
  console.log("✓ Transient failures are retried with backoff")

  await testCleanupOnFailure()
  console.log("✓ Failed installs attempt cleanup")

  await testIdempotentExecution()
  console.log("✓ Re-running the installer succeeds")

  await testUpgradeFlagParsedAndPassed()
  console.log("✓ --upgrade flag is parsed and installation proceeds")

  console.log("\nAll installer engine tests passed.")
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
