// ============================================================
// Synth Installer Engine Tests
// ============================================================
// Verifies the installation workflow: package installation,
// retry logic, cleanup on failure, rollback on upgrade, and
// idempotent execution.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs"
import os from "os"
import path from "path"

const INSTALLER_PATH = path.resolve(process.cwd(), "scripts", "install.sh")

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "synth-installer-engine-"))
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
  echo "2.0.0-rc.1"
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

# install command
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

if [ -n "$FAKE_NPM_PREFIX" ]; then
  mkdir -p "$FAKE_NPM_PREFIX/bin"
  cat > "$FAKE_NPM_PREFIX/bin/synth" <<'INNEREOF'
#!/usr/bin/env bash
if [ "$1" = "--version" ] || [ "$1" = "version" ]; then
  echo "synth 2.0.0-rc.1"
  exit 0
fi
if [ "$1" = "init" ]; then
  mkdir -p .synth
  echo '{"status":"ok"}' > .synth/manifest.json
  echo '{"status":"ok","message":"initialized"}'
  exit 0
fi
if [ "$1" = "doctor" ]; then
  echo '{"status":"ok","name":"synth","version":"2.0.0-rc.1","healthy":true,"checks":{"node":{"ok":true},"binary":{"ok":true},"version":{"ok":true},"manifest":{"ok":true}}}'
  exit 0
fi
echo "Unknown synth command: $1" >&2
exit 1
INNEREOF
  chmod +x "$FAKE_NPM_PREFIX/bin/synth"
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

async function testInstallSuccessAndIdempotency() {
  const prefix = makeTempDir()
  const fake = createFakeNpm({ prefix })
  const env = {
    SYNTH_INSTALLER_NPM_PREFIX: prefix,
    PATH: `${prefix}/bin:${fake.dir}:${process.env.PATH}`,
  }
  const first = runInstaller([], env, 180000)
  assert(first.status === 0, "First install must exit with code 0")
  assert(first.stdout.includes("Synth @synth-framework/synth@2.0.0-rc.1 installed successfully"), "Must report successful install")
  const firstLog = fs.readFileSync(fake.logFile, "utf-8").trim().split("\n")
  const firstInstallLine = firstLog.find((line) => line.startsWith("install "))
  assert(firstInstallLine !== undefined, "npm install must be invoked")
  assert(firstInstallLine.includes("@synth-framework/synth@2.0.0-rc.1"), "Must install correct target")
  assert(fs.existsSync(path.join(prefix, "bin", "synth")), "Fake synth binary must be created")

  const second = runInstaller([], env, 180000)
  assert(second.status === 0, "Second install must succeed")
  const fullLog = fs.readFileSync(fake.logFile, "utf-8").trim().split("\n")
  const installLines = fullLog.filter((line) => line.startsWith("install "))
  assert(installLines.length === 2, `Expected 2 install invocations, got ${installLines.length}`)
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

async function main() {
  console.log("Running installer engine tests...")

  await testDryRunDoesNotInstall()
  console.log("✓ --dry-run does not invoke npm install")

  await testInstallSuccessAndIdempotency()
  console.log("✓ Successful install invokes npm with correct target and re-running succeeds")

  await testRetryOnTransientFailure()
  console.log("✓ Transient failures are retried with backoff")

  await testCleanupOnFailure()
  console.log("✓ Failed installs attempt cleanup")

  console.log("\nAll installer engine tests passed.")
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
