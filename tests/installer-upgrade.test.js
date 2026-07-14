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

const INSTALLER_PATH = path.resolve(process.cwd(), "scripts", "install.sh")

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "synth-installer-upgrade-"))
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, { mode: 0o755 })
}

function createFakeNpm(options = {}) {
  const dir = makeTempDir()
  const logFile = path.join(dir, "npm.log")
  const attemptsFile = path.join(dir, "attempts")
  const { prefix, maxFail = 0, permanentFail = false } = options

  const script = `#!/usr/bin/env bash
set -euo pipefail
FAKE_NPM_LOG="${logFile}"
FAKE_NPM_ATTEMPTS="${attemptsFile}"
FAKE_NPM_PREFIX="${prefix || ""}"
FAKE_NPM_MAX_FAIL="${maxFail}"
FAKE_NPM_PERMANENT_FAIL="${permanentFail ? "true" : "false"}"

echo "$@" >> "$FAKE_NPM_LOG"

if [ "$1" = "--version" ]; then
  echo "10.0.0"
  exit 0
fi

if [ "$1" = "view" ]; then
  echo "2.0.0"
  exit 0
fi

if [ "$1" = "config" ] && [ "\${2:-}" = "get" ] && [ "\${3:-}" = "prefix" ]; then
  if [ -n "$FAKE_NPM_PREFIX" ]; then
    echo "$FAKE_NPM_PREFIX"
  else
    echo "/usr/local"
  fi
  exit 0
fi

if [ "$1" = "uninstall" ]; then
  if [ -n "$FAKE_NPM_PREFIX" ] && [ -f "$FAKE_NPM_PREFIX/bin/synth" ]; then
    rm -f "$FAKE_NPM_PREFIX/bin/synth"
  fi
  exit 0
fi

attempt=$(cat "$FAKE_NPM_ATTEMPTS" 2>/dev/null || echo 0)
attempt=$((attempt + 1))
echo "$attempt" > "$FAKE_NPM_ATTEMPTS"

if [ "$FAKE_NPM_PERMANENT_FAIL" = "true" ]; then
  echo "Simulated permanent failure" >&2
  exit 1
fi

if [ "$FAKE_NPM_MAX_FAIL" != "" ] && [ "$FAKE_NPM_MAX_FAIL" != "0" ] && [ "$attempt" -le "$FAKE_NPM_MAX_FAIL" ]; then
  echo "Simulated network failure (attempt $attempt)" >&2
  exit 1
fi

# Parse target version from install command
if [ "$1" = "install" ]; then
  target="\${@: -1}"
  installed_version="2.0.0"
  case "$target" in
    *@*) installed_version="\${target##*@}" ;;
  esac

  if [ -n "$FAKE_NPM_PREFIX" ]; then
    mkdir -p "$FAKE_NPM_PREFIX/bin"
    {
      printf '#!/usr/bin/env bash\n'
      printf 'if [ "$1" = "--version" ] || [ "$1" = "version" ]; then\n'
      printf '  echo "synth %s"\n' "$installed_version"
      printf '  exit 0\n'
      printf 'fi\n'
      printf 'if [ "$1" = "init" ]; then\n'
      printf '  mkdir -p .synth\n'
      printf '  echo '"'"'{"status":"ok"}'"'"' > .synth/manifest.json\n'
      printf '  echo '"'"'{"status":"ok","message":"initialized"}'"'"'\n'
      printf '  exit 0\n'
      printf 'fi\n'
      printf 'if [ "$1" = "doctor" ]; then\n'
      printf '  echo '"'"'{"status":"ok","name":"synth","version":"%s","healthy":true,"checks":{"node":{"ok":true},"binary":{"ok":true},"version":{"ok":true},"manifest":{"ok":true}}}'"'"'\n' "$installed_version"
      printf '  exit 0\n'
      printf 'fi\n'
      printf 'echo "Unknown synth command: $1" >&2\n'
      printf 'exit 1\n'
    } > "$FAKE_NPM_PREFIX/bin/synth"
    chmod +x "$FAKE_NPM_PREFIX/bin/synth"
  fi
fi

exit 0
`

  writeFile(path.join(dir, "npm"), script)
  return { dir, logFile, attemptsFile }
}

function runInstaller(args = [], env = {}, timeout = 60000) {
  const result = spawnSync("bash", [INSTALLER_PATH, ...args], {
    cwd: process.cwd(),
    encoding: "utf-8",
    env: {
      ...process.env,
      SYNTH_INSTALLER_BASE_URL: "http://localhost:1",
      ...env,
    },
    timeout,
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
  const prefix = makeTempDir()
  const fake = createFakeNpm({ prefix })
  const env = {
    SYNTH_INSTALLER_NPM_PREFIX: prefix,
    PATH: `${prefix}/bin:${fake.dir}:${process.env.PATH}`,
  }

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
  const prefix = makeTempDir()
  const fake = createFakeNpm({ prefix })
  const env = {
    SYNTH_INSTALLER_NPM_PREFIX: prefix,
    PATH: `${prefix}/bin:${fake.dir}:${process.env.PATH}`,
  }

  const result = runInstaller(["--version", "1.5.0"], env, 180000)
  assert(result.status === 0, "Exact version install must succeed")
  assert(installedVersion(prefix) === "1.5.0", "Installed version must match requested exact version")

  const log = fs.readFileSync(fake.logFile, "utf-8").trim().split("\n")
  const installLine = log.find((line) => line.startsWith("install "))
  assert(installLine !== undefined && installLine.includes("@synth-framework/synth@1.5.0"), "Must install exact requested version")
}

async function testChannelSelection() {
  const prefix = makeTempDir()
  const fake = createFakeNpm({ prefix })
  const env = {
    SYNTH_INSTALLER_NPM_PREFIX: prefix,
    PATH: `${prefix}/bin:${fake.dir}:${process.env.PATH}`,
  }

  const result = runInstaller(["--channel", "latest"], env, 180000)
  assert(result.status === 0, "Channel selection must succeed")
  assert(result.stdout.includes("Channel:    latest"), "Must indicate latest channel")
  assert(installedVersion(prefix) === "2.0.0", "Latest channel must install 2.0.0")
}

async function testRollbackOnFailedUpgrade() {
  const prefix = makeTempDir()
  const fake = createFakeNpm({ prefix })
  const env = {
    SYNTH_INSTALLER_NPM_PREFIX: prefix,
    PATH: `${prefix}/bin:${fake.dir}:${process.env.PATH}`,
  }

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
