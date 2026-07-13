// ============================================================
// FREEZE CERTIFICATION TEST
// ============================================================
// Verifies that Synth v2 freeze artifacts exist and that all
// prerequisite expeditions are accepted.
//
// This test is the automated evidence gate for EXP-PROD-005.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "fs/promises"
import path from "path"

const PROD_EXPEDITIONS = [
  "EXP-PROD-001.md",
  "EXP-PROD-002.md",
  "EXP-PROD-003.md",
  "EXP-PROD-004.md",
  "EXP-PROD-005.md",
]

async function readExpeditionStatus(filename) {
  const filePath = path.join(process.cwd(), "docs/expeditions", filename)
  const content = await fs.readFile(filePath, "utf-8")
  const match = content.match(/\*\*Status:\*\*\s*(\w+)/)
  return match ? match[1].toLowerCase() : null
}

async function findLatestProof() {
  const proofDir = path.join(process.cwd(), "proof")
  const entries = await fs.readdir(proofDir)
  const proofs = entries
    .filter((f) => f.startsWith("proof-") && f.endsWith(".json"))
    .sort()
  return proofs.length > 0 ? path.join(proofDir, proofs[proofs.length - 1]) : null
}

test("All Productization Expeditions are completed", async () => {
  for (const filename of PROD_EXPEDITIONS) {
    const status = await readExpeditionStatus(filename)
    assert.strictEqual(status, "completed", `${filename} must be Completed`)
  }
})

test("Freeze report exists and references required sections", async () => {
  const reportPath = path.join(process.cwd(), "docs/operator/synth-v2-freeze-report.md")
  const content = await fs.readFile(reportPath, "utf-8")

  assert.ok(content.includes("## Production Readiness"), "Report must include Production Readiness")
  assert.ok(content.includes("## Known Limitations"), "Report must include Known Limitations")
  assert.ok(content.includes("## Deferred Work (v2.1)"), "Report must include Deferred Work")
  assert.ok(content.includes("## Architectural Certificate"), "Report must include Architectural Certificate")
})

test("Freeze ADR exists and is accepted", async () => {
  const adrPath = path.join(process.cwd(), "docs/adr/ADR-001-v2-freeze-certification.md")
  const content = await fs.readFile(adrPath, "utf-8")

  assert.ok(content.includes("**Status:** Accepted"), "ADR-001 must be Accepted")
  assert.ok(content.includes("Synth v2 Freeze Certification"), "ADR-001 must be about v2 freeze")
})

test("Product Boundary ADR exists and is accepted", async () => {
  const adrPath = path.join(process.cwd(), "docs/adr/ADR-002-product-boundary.md")
  const content = await fs.readFile(adrPath, "utf-8")

  assert.ok(content.includes("**Status:** Accepted"), "ADR-002 must be Accepted")
  assert.ok(content.includes("Product Boundary"), "ADR-002 must be about product boundary")
  assert.ok(content.includes("Mission"), "ADR-002 must list the public concepts")
  assert.ok(content.includes("Replay"), "ADR-002 must list Replay as a public concept")
})

test("Constitutional baseline records freeze certification and product boundary", async () => {
  const baselinePath = path.join(process.cwd(), "docs/architecture/constitutional-baseline.md")
  const content = await fs.readFile(baselinePath, "utf-8")

  assert.ok(content.includes("Freeze Certification Date:"), "Baseline must record freeze certification date")
  assert.ok(content.includes("ADR-001"), "Baseline must reference ADR-001")
  assert.ok(content.includes("ADR-002"), "Baseline must reference ADR-002")
})

test("v2.1 Validation Program Charter ADR exists and is accepted", async () => {
  const adrPath = path.join(process.cwd(), "docs/adr/ADR-003-v2-1-validation-program-charter.md")
  const content = await fs.readFile(adrPath, "utf-8")

  assert.ok(content.includes("**Status:** Accepted"), "ADR-003 must be Accepted")
  assert.ok(content.includes("Validation before Evolution"), "ADR-003 must declare the v2.1 charter")
  assert.ok(content.includes("Do not add new architectural capabilities"), "ADR-003 must freeze architectural capabilities for v2.1")
})

test("Constitutional baseline references v2.1 Validation Program Charter", async () => {
  const baselinePath = path.join(process.cwd(), "docs/architecture/constitutional-baseline.md")
  const content = await fs.readFile(baselinePath, "utf-8")

  assert.ok(content.includes("ADR-003"), "Baseline must reference ADR-003")
  assert.ok(content.includes("Validation Program Charter"), "Baseline must reference the v2.1 charter")
})

test("Eras and Protected Assets ADR exists and is accepted", async () => {
  const adrPath = path.join(process.cwd(), "docs/adr/ADR-004-synth-eras-and-protected-assets.md")
  const content = await fs.readFile(adrPath, "utf-8")

  assert.ok(content.includes("**Status:** Accepted"), "ADR-004 must be Accepted")
  assert.ok(content.includes("Protected Assets"), "ADR-004 must define Protected Assets")
  assert.ok(content.includes("Era I — Foundation"), "ADR-004 must define Era I")
  assert.ok(content.includes("Era II — Adoption"), "ADR-004 must define Era II")
  assert.ok(content.includes("Era III — Evolution"), "ADR-004 must define Era III")
})

test("Constitutional baseline references Eras and Protected Assets ADR", async () => {
  const baselinePath = path.join(process.cwd(), "docs/architecture/constitutional-baseline.md")
  const content = await fs.readFile(baselinePath, "utf-8")

  assert.ok(content.includes("ADR-004"), "Baseline must reference ADR-004")
  assert.ok(content.includes("Eras and Protected Assets"), "Baseline must reference the eras and protected assets ADR")
})

test("Latest proof artifact exists and passed", async () => {
  const latestProof = await findLatestProof()
  assert.ok(latestProof, "A proof artifact must exist")

  const proof = JSON.parse(await fs.readFile(latestProof, "utf-8"))
  assert.strictEqual(proof.schema, "synth-proof-v1", "Proof must use synth-proof-v1 schema")
  assert.strictEqual(proof.overall.passed, true, "Proof must have passed overall")
  assert.ok(proof.proofs.p1Structural.passed, "P1 Structural must pass")
  assert.ok(proof.proofs.p2Replay.passed, "P2 Replay must pass")
  assert.ok(proof.proofs.p2Determinism.passed, "P2 Determinism must pass")
  assert.ok(proof.proofs.p4Adversarial.passed, "P4 Adversarial must pass")
})
