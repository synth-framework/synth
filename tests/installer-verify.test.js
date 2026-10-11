import { makeTempDirSync } from "./helpers/workspace.js"
// ============================================================
// Synth Installer Verification Tests
// ============================================================
// Verifies the installation verification workflow:
// executable availability, PATH resolution, version matching,
// synth doctor, Installation Proof output, and --verify-only.
// ============================================================

import fs from "fs"
import os from "os"
import path from "path"
import { assert } from "./helpers/assert.js"
import { runEngineInstaller as runInstaller, createFakeNpm } from "./helpers/installer.js"

function makeTempDir() {
  return makeTempDirSync("synth-installer-verify-")
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, { mode: 0o755 })
}

async function testVerifyOnlyFailsWhenSynthMissing() {
  const fakeNodeDir = makeTempDir()
  writeFile(
    path.join(fakeNodeDir, "node"),
    "#!/usr/bin/env bash\nif [ \"$1\" = \"--version\" ]; then echo 'v24.14.1'; exit 0; fi\nexit 1\n",
  )
  const result = runInstaller(["--verify-only"], { PATH: `${fakeNodeDir}:/usr/bin:/bin` })
  assert(result.status === 1, "--verify-only must fail when synth is missing")
  assert(result.stderr.includes("synth is not available on PATH"), "Must report missing synth")
}

function createFakeSynth(prefix, version = "2.0.0-rc.1") {
  const synthPath = path.join(prefix, "bin", "synth")
  fs.mkdirSync(path.dirname(synthPath), { recursive: true })
  writeFile(
    synthPath,
    `#!/usr/bin/env bash\nif [ "$1" = "--version" ] || [ "$1" = "version" ]; then echo "synth ${version}"; exit 0; fi\nif [ "$1" = "init" ]; then mkdir -p .synth; echo '{"status":"ok"}' > .synth/manifest.json; echo '{"status":"ok"}'; exit 0; fi\nif [ "$1" = "doctor" ]; then echo '{"status":"ok","name":"synth","version":"${version}","healthy":true,"checks":{"node":{"ok":true},"binary":{"ok":true},"version":{"ok":true},"manifest":{"ok":true}}}'; exit 0; fi\necho "Unknown synth command: $1" >&2\nexit 1\n`,
  )
}

async function testVerifyOnlySucceedsWhenSynthAvailable() {
  const prefix = makeTempDir()
  const fake = createFakeNpm({ prefix })
  createFakeSynth(prefix)
  const result = runInstaller(
    ["--verify-only"],
    {
      SYNTH_INSTALLER_NPM_PREFIX: prefix,
      PATH: `${prefix}/bin:${fake.dir}:${process.env.PATH}`,
    },
  )
  if (result.status !== 0) {
    console.log("DEBUG status:", result.status)
    console.log("DEBUG stdout:", result.stdout)
    console.log("DEBUG stderr:", result.stderr)
    console.log("DEBUG error:", result.error ? result.error.message : "none")
  }
  assert(result.status === 0, "--verify-only must succeed when synth is available")
  assert(result.stdout.includes("Installation Proof:"), "Must emit Installation Proof")
  assert(result.stdout.includes("Status:    ok"), "Proof status must be ok")
  assert(result.stdout.includes("Version:   2.0.0-rc.1"), "Proof must include version")
}

async function testVerifyOnlyFailsOnVersionMismatch() {
  const prefix = makeTempDir()
  const fake = createFakeNpm({ prefix, synthVersion: "1.0.0" })
  createFakeSynth(prefix, "1.0.0")
  const result = runInstaller(
    ["--verify-only", "--version", "2.0.0-rc.1"],
    {
      SYNTH_INSTALLER_NPM_PREFIX: prefix,
      PATH: `${prefix}/bin:${fake.dir}:${process.env.PATH}`,
    },
  )
  if (result.status !== 1) {
    console.log("DEBUG version mismatch status:", result.status)
    console.log("DEBUG stdout:", result.stdout)
    console.log("DEBUG stderr:", result.stderr)
  }
  assert(result.status === 1, "--verify-only must fail on version mismatch")
  assert(result.stderr.includes("version mismatch"), "Must report version mismatch")
}

async function testVerifyOnlyEmitsProof() {
  const prefix = makeTempDir()
  const fake = createFakeNpm({ prefix })
  createFakeSynth(prefix)
  const result = runInstaller(
    ["--verify-only"],
    {
      SYNTH_INSTALLER_NPM_PREFIX: prefix,
      PATH: `${prefix}/bin:${fake.dir}:${process.env.PATH}`,
    },
  )
  assert(result.status === 0, "Verify-only must succeed")
  assert(result.stdout.includes("Installation Proof:"), "Must emit Installation Proof")
  assert(result.stdout.includes("Status:    ok"), "Proof status must be ok")
  assert(result.stdout.includes("Doctor:     true"), "Doctor check must pass")
}

async function testVerificationFailsWhenDoctorUnhealthy() {
  const prefix = makeTempDir()
  const fake = createFakeNpm({ prefix })
  // Pre-create a broken synth that reports unhealthy doctor.
  const synthPath = path.join(prefix, "bin", "synth")
  fs.mkdirSync(path.dirname(synthPath), { recursive: true })
  writeFile(synthPath, `#!/usr/bin/env bash
if [ "$1" = "--version" ]; then
  echo "synth 2.0.0-rc.1"
  exit 0
fi
if [ "$1" = "init" ]; then
  mkdir -p .synth
  echo '{"status":"ok"}' > .synth/manifest.json
  echo '{"status":"ok"}'
  exit 0
fi
if [ "$1" = "doctor" ]; then
  echo '{"status":"ok","healthy":false}'
  exit 0
fi
exit 1
`)
  const result = runInstaller(
    ["--verify-only"],
    {
      SYNTH_INSTALLER_NPM_PREFIX: prefix,
      PATH: `${prefix}/bin:${fake.dir}:${process.env.PATH}`,
    },
  )
  assert(result.status === 1, "Verification must fail when doctor is unhealthy")
  assert(result.stderr.includes("synth doctor unhealthy"), "Must report unhealthy doctor")
}

async function main() {
  console.log("Running installer verification tests...")

  await testVerifyOnlyFailsWhenSynthMissing()
  console.log("✓ --verify-only fails when synth is missing")

  await testVerifyOnlySucceedsWhenSynthAvailable()
  console.log("✓ --verify-only succeeds when synth is available")

  await testVerifyOnlyFailsOnVersionMismatch()
  console.log("✓ --verify-only fails on version mismatch")

  await testVerifyOnlyEmitsProof()
  console.log("✓ Verify-only emits Installation Proof")

  await testVerificationFailsWhenDoctorUnhealthy()
  console.log("✓ Verification fails when synth doctor is unhealthy")

  console.log("\nAll installer verification tests passed.")
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
