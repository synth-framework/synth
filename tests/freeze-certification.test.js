// ============================================================
// FREEZE CERTIFICATION TEST
// ============================================================
// Verifies that Synth v2 freeze artifacts exist and that all
// prerequisite expeditions are accepted.
//
// This test is the automated evidence gate for EXP-PROD-005.
//
// Important: this test does NOT rely on a pre-existing proof artifact
// committed to the repository. Instead, it invokes the same proof
// generation routine used by `npm run govern` and validates that a
// passing proof can be produced from the current source. Proof
// artifacts are generated evidence, not versioned inputs.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "fs"
import path from "path"
import { execSync } from "child_process"
import { tmpdir } from "os"

const PROD_EXPEDITIONS = [
  "EXP-PROD-001.md",
  "EXP-PROD-002.md",
  "EXP-PROD-003.md",
  "EXP-PROD-004.md",
  "EXP-PROD-005.md",
]

async function readExpeditionStatus(filename) {
  const filePath = path.join(process.cwd(), "docs/expeditions", filename)
  const content = await fs.promises.readFile(filePath, "utf-8")
  const match = content.match(/\*\*Status:\*\*\s*(\w+)/)
  return match ? match[1].toLowerCase() : null
}

function generateTemporaryProof() {
  const tempDir = fs.mkdtempSync(path.join(tmpdir(), "synth-proof-"))

  try {
    // Copy the data directory so proof generation mutations are isolated
    // from the working repository.
    fs.cpSync(path.join(process.cwd(), "data"), path.join(tempDir, "data"), { recursive: true })

    // Symlink source, build, and script directories so the generator can
    // compute hashes and invoke audit scripts without duplicating the repo.
    for (const dir of ["src", "dist", "scripts"]) {
      fs.symlinkSync(path.join(process.cwd(), dir), path.join(tempDir, dir))
    }

    execSync("node scripts/generate-proof.js", {
      cwd: tempDir,
      encoding: "utf-8",
      stdio: "pipe",
    })

    const proofDir = path.join(tempDir, "proof")
    const proofs = fs.readdirSync(proofDir).filter((f) => f.startsWith("proof-") && f.endsWith(".json"))
    assert.ok(proofs.length > 0, "A proof artifact must be generated")

    const latestProof = path.join(proofDir, proofs.sort()[proofs.length - 1])
    return JSON.parse(fs.readFileSync(latestProof, "utf-8"))
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

test("All Productization Expeditions are completed", async () => {
  for (const filename of PROD_EXPEDITIONS) {
    const status = await readExpeditionStatus(filename)
    assert.strictEqual(status, "completed", `${filename} must be Completed`)
  }
})

test("Freeze report exists and references required sections", async () => {
  const reportPath = path.join(process.cwd(), "docs/operator/synth-v2-freeze-report.md")
  const content = await fs.promises.readFile(reportPath, "utf-8")

  assert.ok(content.includes("## Production Readiness"), "Report must include Production Readiness")
  assert.ok(content.includes("## Known Limitations"), "Report must include Known Limitations")
  assert.ok(content.includes("## Deferred Work (v2.1)"), "Report must include Deferred Work")
  assert.ok(content.includes("## Architectural Certificate"), "Report must include Architectural Certificate")
})

test("Freeze ADR exists and is accepted", async () => {
  const adrPath = path.join(process.cwd(), "docs/adr/ADR-001-v2-freeze-certification.md")
  const content = await fs.promises.readFile(adrPath, "utf-8")

  assert.ok(content.includes("**Status:** Accepted"), "ADR-001 must be Accepted")
  assert.ok(content.includes("Synth v2 Freeze Certification"), "ADR-001 must be about v2 freeze")
})

test("Product Boundary ADR exists and is accepted", async () => {
  const adrPath = path.join(process.cwd(), "docs/adr/ADR-002-product-boundary.md")
  const content = await fs.promises.readFile(adrPath, "utf-8")

  assert.ok(content.includes("**Status:** Accepted"), "ADR-002 must be Accepted")
  assert.ok(content.includes("Product Boundary"), "ADR-002 must be about product boundary")
  assert.ok(content.includes("Mission"), "ADR-002 must list the public concepts")
  assert.ok(content.includes("Replay"), "ADR-002 must list Replay as a public concept")
})

test("Constitutional baseline records freeze certification and product boundary", async () => {
  const baselinePath = path.join(process.cwd(), "docs/architecture/constitutional-baseline.md")
  const content = await fs.promises.readFile(baselinePath, "utf-8")

  assert.ok(content.includes("Freeze Certification Date:"), "Baseline must record freeze certification date")
  assert.ok(content.includes("ADR-001"), "Baseline must reference ADR-001")
  assert.ok(content.includes("ADR-002"), "Baseline must reference ADR-002")
})

test("v2.1 Validation Program Charter ADR exists and is accepted", async () => {
  const adrPath = path.join(process.cwd(), "docs/adr/ADR-003-v2-1-validation-program-charter.md")
  const content = await fs.promises.readFile(adrPath, "utf-8")

  assert.ok(content.includes("**Status:** Accepted"), "ADR-003 must be Accepted")
  assert.ok(content.includes("Validation before Evolution"), "ADR-003 must declare the v2.1 charter")
  assert.ok(content.includes("Do not add new architectural capabilities"), "ADR-003 must freeze architectural capabilities for v2.1")
})

test("Constitutional baseline references v2.1 Validation Program Charter", async () => {
  const baselinePath = path.join(process.cwd(), "docs/architecture/constitutional-baseline.md")
  const content = await fs.promises.readFile(baselinePath, "utf-8")

  assert.ok(content.includes("ADR-003"), "Baseline must reference ADR-003")
  assert.ok(content.includes("Validation Program Charter"), "Baseline must reference the v2.1 charter")
})

test("Eras and Protected Assets ADR exists and is accepted", async () => {
  const adrPath = path.join(process.cwd(), "docs/adr/ADR-004-synth-eras-and-protected-assets.md")
  const content = await fs.promises.readFile(adrPath, "utf-8")

  assert.ok(content.includes("**Status:** Accepted"), "ADR-004 must be Accepted")
  assert.ok(content.includes("Protected Assets"), "ADR-004 must define Protected Assets")
  assert.ok(content.includes("Era I — Foundation"), "ADR-004 must define Era I")
  assert.ok(content.includes("Era II — Adoption"), "ADR-004 must define Era II")
  assert.ok(content.includes("Era III — Evolution"), "ADR-004 must define Era III")
})

test("Constitutional baseline references Eras and Protected Assets ADR", async () => {
  const baselinePath = path.join(process.cwd(), "docs/architecture/constitutional-baseline.md")
  const content = await fs.promises.readFile(baselinePath, "utf-8")

  assert.ok(content.includes("ADR-004"), "Baseline must reference ADR-004")
  assert.ok(content.includes("Eras and Protected Assets"), "Baseline must reference the eras and protected assets ADR")
})

test("Synth can generate a passing proof from current source", async () => {
  const proof = generateTemporaryProof()

  assert.strictEqual(proof.schema, "synth-proof-v1", "Proof must use synth-proof-v1 schema")
  assert.strictEqual(proof.overall.passed, true, "Proof must have passed overall")
  assert.ok(proof.proofs.p1Structural.passed, "P1 Structural must pass")
  assert.ok(proof.proofs.p2Replay.passed, "P2 Replay must pass")
  assert.ok(proof.proofs.p2Determinism.passed, "P2 Determinism must pass")
  assert.ok(proof.proofs.p4Adversarial.passed, "P4 Adversarial must pass")
})
