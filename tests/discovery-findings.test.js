// ============================================================
// DISCOVERY FINDINGS PROJECTION TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { projectFindings } from "../dist/discovery/index.js"
import { makeEvidenceGraph } from "./helpers/discovery-fixtures.js"

const makeGraph = (claimAssertions) => makeEvidenceGraph(claimAssertions, { sourcePath: "/project" })

test("findings projection returns schema and empty items for no signals", () => {
  const graph = makeGraph([])
  const findings = projectFindings(graph)

  assert.strictEqual(findings.schema, "synth-discovery-findings-v1")
  assert.deepStrictEqual(findings.items, [])
})

test("findings detects missing README when source directory exists", () => {
  const graph = makeGraph(["Source directory observed"])
  const findings = projectFindings(graph)

  assert.strictEqual(findings.items.length, 1)
  assert.strictEqual(findings.items[0].category, "missing-artifact")
  assert.strictEqual(findings.items[0].severity, "medium")
  assert.match(findings.items[0].description, /README/)
})

test("findings does not detect missing README when documentation present", () => {
  const graph = makeGraph(["Source directory observed", "Documentation present"])
  const findings = projectFindings(graph)

  assert.strictEqual(findings.items.length, 0)
})

test("findings detects missing architecture docs for Node.js project", () => {
  const graph = makeGraph(["Node.js project manifest present"])
  const findings = projectFindings(graph)

  assert.strictEqual(findings.items.length, 1)
  assert.strictEqual(findings.items[0].category, "incompleteness")
  assert.match(findings.items[0].description, /architecture documentation/i)
})

test("findings detects missing architecture docs when implementation directory observed", () => {
  const graph = makeGraph(["Implementation directory observed"])
  const findings = projectFindings(graph)

  assert.strictEqual(findings.items.length, 1)
  assert.strictEqual(findings.items[0].category, "incompleteness")
})

test("findings references evidence claim ids", () => {
  const graph = makeGraph(["Source directory observed"])
  const findings = projectFindings(graph)

  assert.strictEqual(findings.items[0].evidenceClaimIds.length, 1)
  assert.strictEqual(findings.items[0].evidenceClaimIds[0], "claim-000000")
})

test("findings includes confidence scores", () => {
  const graph = makeGraph(["Source directory observed"])
  const findings = projectFindings(graph)

  assert.strictEqual(typeof findings.items[0].confidence.value, "number")
  assert.ok(findings.items[0].confidence.reason.length > 0)
})
