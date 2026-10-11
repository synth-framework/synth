import { makeTempDirSync } from "./helpers/workspace.js"
// ============================================================
// Synth Installer Upgrade Tests
// ============================================================
// Verifies upgrade workflows, version selection, channel
// selection, and rollback behavior.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs"
import os from "os"
import path from "path"
import { assert } from "./helpers/assert.js"
import { runEngineInstaller as runInstaller, createFakeNpm as createFakeNpmBase } from "./helpers/installer.js"

const createFakeNpm = (options = {}) => createFakeNpmBase({ viewVersion: "2.0.0", versionFromTarget: true, ...options })

function makeTempDir() {
  return makeTempDirSync("synth-installer-upgrade-")
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, { mode: 0o755 })
}

/** Set up prefix + fake npm + env for an install test. */
function setupInstallTest(options = {}) {
  const prefix = makeTempDir()
  const fake = createFakeNpm({ prefix, ...options })
  const env = {
    SYNTH_INSTALLER_NPM_PREFIX: prefix,
    PATH: `${prefix}/bin:${fake.dir}:${process.env.PATH}`,
  }
  return { prefix, fake, env }
}

function installedVersion(prefix) {
  const synthBin = path.join(prefix, "bin", "synth")
  if (!fs.existsSync(synthBin)) {
    return null
  }
  const result = spawnSync(synthBin, ["--version"], { encoding: "utf-8" })
  const output = (result.stdout || "").trim()
  const match = output.match(/(\d+\.\d+\.\d+[^\s]*)/)
  return match ? match[1] : null
}

async function testUpgradeInstallsNewVersion() {
  const { prefix, fake, env } = setupInstallTest()

  const first = runInstaller([], env, 180000)
  assert(first.status === 0, "Initial install must succeed")
  assert(installedVersion(prefix) === "2.0.0", "Initial version must be 2.0.0")

  const upgraded = runInstaller(["--upgrade"], env, 180000)
  assert(upgraded.status === 0, "Upgrade must succeed")
  assert(installedVersion(prefix) === "2.0.0", "Upgrade must leave installed version at 2.0.0 (latest in fake registry)")

  const log = fs.readFileSync(fake.logFile, "utf-8").trim().split("\n")
  const upgradeInstall = log.find((line) => line.startsWith("install ") && line.includes("--upgrade") === false && line.includes("@synth-framework/synth@2.0.0"))
  assert(upgradeInstall !== undefined, "Upgrade must invoke npm install for latest version")
}

async function testExactVersionInstall() {
  const { prefix, fake, env } = setupInstallTest()

  const result = runInstaller(["--version", "1.5.0"], env, 180000)
  assert(result.status === 0, "Exact version install must succeed")
  assert(installedVersion(prefix) === "1.5.0", "Installed version must match requested exact version")

  const log = fs.readFileSync(fake.logFile, "utf-8").trim().split("\n")
  const installLine = log.find((line) => line.startsWith("install "))
  assert(installLine !== undefined && installLine.includes("@synth-framework/synth@1.5.0"), "Must install exact requested version")
}

async function testChannelSelection() {
  const { prefix, fake, env } = setupInstallTest()

  const result = runInstaller(["--channel", "latest"], env, 180000)
  assert(result.status === 0, "Channel selection must succeed")
  assert(result.stdout.includes("Channel:    latest"), "Must indicate latest channel")
  assert(installedVersion(prefix) === "2.0.0", "Latest channel must install 2.0.0")
}

async function testRollbackOnFailedUpgrade() {
  const { prefix, fake, env } = setupInstallTest()

  const first = runInstaller([], env, 180000)
  assert(first.status === 0, "Initial install must succeed")
  assert(installedVersion(prefix) === "2.0.0", "Initial version must be 2.0.0")

  const fakeFailing = createFakeNpm({ prefix, permanentFail: true })
  const envFailing = {
    SYNTH_INSTALLER_NPM_PREFIX: prefix,
    PATH: `${prefix}/bin:${fakeFailing.dir}:${process.env.PATH}`,
  }

  const upgrade = runInstaller(["--upgrade"], envFailing, 180000)
  assert(upgrade.status === 1, "Failed upgrade must exit with code 1")

  const log = fs.readFileSync(fakeFailing.logFile, "utf-8").trim().split("\n")
  const rollbackLine = log.find((line) => line.startsWith("install ") && line.includes("@synth-framework/synth@2.0.0"))
  assert(rollbackLine !== undefined, "Rollback to previous version must be attempted")
}

async function main() {
  console.log("Running installer upgrade tests...")

  await testUpgradeInstallsNewVersion()
  console.log("✓ Upgrade installs the latest version")

  await testExactVersionInstall()
  console.log("✓ Exact version install targets requested version")

  await testChannelSelection()
  console.log("✓ Channel selection resolves correctly")

  await testRollbackOnFailedUpgrade()
  console.log("✓ Failed upgrade attempts rollback to previous version")

  console.log("\nAll installer upgrade tests passed.")
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
