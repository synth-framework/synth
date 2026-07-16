// ============================================================
// SYNTH First Contact Projection Tests
// ============================================================
// Verifies the First Contact projection system: the canonical
// evidence archive is complete and intact, projections are
// deterministic, and the --check mode detects drift.
// ============================================================

import { spawnSync } from "child_process"
import crypto from "crypto"
import fs from "fs/promises"
import path from "path"
import os from "os"

const PROJECT_ROOT = process.cwd()
const GENERATOR_PATH = path.resolve(PROJECT_ROOT, "scripts", "generate-first-contact-projection.js")
const REPAIR_PATH = path.resolve(PROJECT_ROOT, "scripts", "repair-first-contact-archive.js")
const ARCHIVE_A_DIR = path.resolve(PROJECT_ROOT, "examples", "first-contact", "recorded-journey", "evidence-archive")
const ARCHIVE_DIR = path.resolve(PROJECT_ROOT, "examples", "first-contact", "recorded-journey", "evidence-archive-b")

function runScript(scriptPath, args = [], cwd = PROJECT_ROOT) {
  const result = spawnSync("node", [scriptPath, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 120000,
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

async function testArchiveIsCompleteAndIntact() {
  for (const name of ["timeline.json", "commands.json", "events.jsonl", "proof.json", "replay-report.json"]) {
    const stats = await fs.stat(path.join(ARCHIVE_DIR, name)).catch(() => null)
    assert(stats && stats.size > 2, `Archive artifact ${name} must exist and be non-trivial`)
  }
  const report = JSON.parse(await fs.readFile(path.join(ARCHIVE_DIR, "replay-report.json"), "utf-8"))
  assert(report.consistent === true, "Archived replay report must be consistent")
  assert(report.chainValid === true, "Archived replay report must have a valid chain")
  assert(report.eventCount === 32, `Archived replay report must cover 32 events, got ${report.eventCount}`)
  assert(report.graphValid === true, "Archive B replay report must have a valid aggregate graph")
  assert(report.graphViolations.length === 0, `Archive B must have zero graph violations, got ${report.graphViolations.length}`)
  const proof = JSON.parse(await fs.readFile(path.join(ARCHIVE_DIR, "proof.json"), "utf-8"))
  assert(proof.artifacts.snapshotPersisted === true, "Archive B proof must record snapshot persistence")
  assert(proof.artifacts.graphValid === true, "Archive B proof must record graph validity")
  const snapshots = await fs.readdir(path.join(ARCHIVE_DIR, "snapshots")).catch(() => [])
  assert(snapshots.some((name) => name.endsWith(".json")), "Archive B must contain a signed snapshot artifact")
}

async function testProjectionCheckPasses() {
  const result = runScript(GENERATOR_PATH, ["--check"])
  assert(result.status === 0, `generate-first-contact-projection.js --check must pass on this project:\n${result.stdout}\n${result.stderr}`)
  assert(result.stdout.includes("projections current"), "Generator should report projections are current")
}

async function testProjectionIsDeterministic() {
  const snapshotDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-fc-projection-"))
  try {
    const outputs = [
      path.join("docs", "first-contact", "journey.md"),
      path.join("website", "first-contact", "replay.html"),
    ]
    for (const rel of outputs) {
      await fs.copyFile(path.join(PROJECT_ROOT, rel), path.join(snapshotDir, path.basename(rel)))
    }
    const regen = runScript(GENERATOR_PATH)
    assert(regen.status === 0, `Regeneration must succeed:\n${regen.stderr}`)
    for (const rel of outputs) {
      const before = await fs.readFile(path.join(snapshotDir, path.basename(rel)), "utf-8")
      const after = await fs.readFile(path.join(PROJECT_ROOT, rel), "utf-8")
      assert(before === after, `Projection output ${rel} must be byte-identical after regeneration`)
    }
  } finally {
    await fs.rm(snapshotDir, { recursive: true, force: true })
  }
}

async function testCheckDetectsDrift() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-fc-drift-"))
  try {
    // Mirror both archives and committed outputs into the fixture
    await fs.mkdir(path.join(tmpDir, "examples", "first-contact", "recorded-journey"), { recursive: true })
    await fs.cp(
      path.join(PROJECT_ROOT, "examples", "first-contact", "recorded-journey", "evidence-archive"),
      path.join(tmpDir, "examples", "first-contact", "recorded-journey", "evidence-archive"),
      { recursive: true },
    )
    await fs.cp(
      path.join(PROJECT_ROOT, "examples", "first-contact", "recorded-journey", "evidence-archive-b"),
      path.join(tmpDir, "examples", "first-contact", "recorded-journey", "evidence-archive-b"),
      { recursive: true },
    )
    await fs.copyFile(
      path.join(PROJECT_ROOT, "examples", "first-contact", "README.md"),
      path.join(tmpDir, "examples", "first-contact", "README.md"),
    )
    for (const rel of ["docs", "website"]) {
      await fs.cp(path.join(PROJECT_ROOT, rel, "first-contact"), path.join(tmpDir, rel, "first-contact"), { recursive: true })
    }
    // Introduce drift into one committed output
    await fs.appendFile(path.join(tmpDir, "docs", "first-contact", "journey.md"), "hand edit\n", "utf-8")

    const result = runScript(GENERATOR_PATH, ["--check"], tmpDir)
    assert(result.status !== 0, "--check must fail when a committed projection drifts from the archive")
    assert(result.stdout.includes("stale"), "--check should report the stale file")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testCheckFailsOnIncompleteArchive() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-fc-incomplete-"))
  try {
    await fs.mkdir(path.join(tmpDir, "examples", "first-contact", "recorded-journey", "evidence-archive"), { recursive: true })
    const result = runScript(GENERATOR_PATH, ["--check"], tmpDir)
    assert(result.status !== 0, "--check must fail when the archive is incomplete")
    assert(
      result.stdout.includes("ARCHIVE_INCOMPLETE") || result.stderr.includes("ARCHIVE_INCOMPLETE"),
      "Failure should report ARCHIVE_INCOMPLETE",
    )
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testRepairScriptDerivesConsistentReport() {
  // The repair script writes replay-report.json in place, so it must run
  // against a tmpdir mirror — never the committed archive. A test may not
  // modify examples/; the archive is immutable evidence (EXP-HARDEN-006).
  const realReport = path.join(ARCHIVE_A_DIR, "replay-report.json")
  const realHashBefore = crypto.createHash("sha256").update(await fs.readFile(realReport)).digest("hex")

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-fc-repair-"))
  try {
    await fs.mkdir(path.join(tmpDir, "examples", "first-contact", "recorded-journey"), { recursive: true })
    await fs.cp(
      ARCHIVE_A_DIR,
      path.join(tmpDir, "examples", "first-contact", "recorded-journey", "evidence-archive"),
      { recursive: true },
    )

    const result = runScript(REPAIR_PATH, [], tmpDir)
    assert(result.status === 0, `repair-first-contact-archive.js must succeed:\n${result.stdout}\n${result.stderr}`)
    assert(result.stdout.includes("consistent"), "Repair should report a consistent replay report")

    const repaired = JSON.parse(
      await fs.readFile(
        path.join(tmpDir, "examples", "first-contact", "recorded-journey", "evidence-archive", "replay-report.json"),
        "utf-8",
      ),
    )
    assert(repaired.consistent === true, "Repaired report must be consistent")
    assert(repaired.chainValid === true, "Repaired report must have a valid chain")
    assert(repaired.eventCount === 32, `Repaired report must cover 32 events, got ${repaired.eventCount}`)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }

  const realHashAfter = crypto.createHash("sha256").update(await fs.readFile(realReport)).digest("hex")
  assert(realHashAfter === realHashBefore, "committed replay-report.json must stay byte-identical")
}

async function main() {
  console.log("Running First Contact projection tests...")

  await testArchiveIsCompleteAndIntact()
  console.log("✓ canonical evidence archive is complete and intact")

  await testProjectionCheckPasses()
  console.log("✓ projection --check passes on this project")

  await testProjectionIsDeterministic()
  console.log("✓ projection regeneration is byte-identical")

  await testCheckDetectsDrift()
  console.log("✓ projection --check detects drift")

  await testCheckFailsOnIncompleteArchive()
  console.log("✓ projection --check fails on an incomplete archive")

  await testRepairScriptDerivesConsistentReport()
  console.log("✓ archive repair derives a consistent replay report")

  console.log("\nAll First Contact projection tests passed.")
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
