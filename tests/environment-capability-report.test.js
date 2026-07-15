// ============================================================
// CAPABILITY REPORT TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import {
  createDiscoveryOrchestrator,
  createReferenceProviders,
  buildCapabilityReport,
  renderCapabilityReportMarkdown,
  CAPABILITY_FAMILIES,
  CAPABILITY_PLANNING_GUIDANCE,
} from "../dist/environment/index.js"

function makeInMemoryContext(files = {}, dirs = {}, env = {}, cwd = "/test") {
  const fileMap = { ...files }
  const directoryMap = { ...dirs }
  function resolve(path) {
    if (path.startsWith("/")) return path
    return `${cwd}/${path}`
  }
  return {
    readFile: async (path) => fileMap[resolve(path)],
    listDirectory: async (path) => directoryMap[resolve(path)] || [],
    pathExists: async (path) => resolve(path) in fileMap || resolve(path) in directoryMap,
    readEnv: (name) => env[name],
    execTool: async (command, args) => env[`${command} ${args.join(" ")}`],
    cwd,
  }
}

async function produceReport(generatedAt = 1000) {
  const ctx = makeInMemoryContext(
    {
      "/test/package.json": JSON.stringify({ name: "test-project" }),
      "/test/.synth/manifest.json": JSON.stringify({ name: "test" }),
    },
    { "/test": ["package.json", ".synth"], "/test/.synth": ["manifest.json"] },
    { "node --version": "v20.11.0", "npm --version": "10.2.4" },
  )
  const orchestrator = createDiscoveryOrchestrator({ providers: createReferenceProviders() })
  const { evidence } = await orchestrator.discover(ctx)
  return { report: buildCapabilityReport(evidence, generatedAt), evidence }
}

test("report covers every constitutional capability family", async () => {
  const { report } = await produceReport()
  assert.strictEqual(report.schema, "synth-capability-report-v1")
  assert.strictEqual(report.capabilities.length, CAPABILITY_FAMILIES.length)
  assert.strictEqual(CAPABILITY_FAMILIES.length, 12)
  for (const family of CAPABILITY_FAMILIES) {
    assert.ok(
      report.capabilities.some((c) => c.family === family),
      `family missing from report: ${family}`,
    )
  }
})

test("supported families expose provider, confidence, and reason", async () => {
  const { report } = await produceReport()
  const supported = report.capabilities.filter((c) => c.status === "supported")
  assert.ok(supported.length > 0)
  for (const entry of supported) {
    assert.ok(entry.provider !== undefined, `supported family ${entry.family} has no provider`)
    assert.ok(entry.reason.length > 0)
  }
})

test("families without evidence are explicitly unsupported, never omitted", async () => {
  const { report } = await produceReport()
  const unsupported = report.capabilities.filter((c) => c.status !== "supported")
  assert.ok(unsupported.length > 0, "in-memory environment should have unsupported families")
  for (const entry of unsupported) {
    assert.ok(entry.reason.length > 0)
  }
  assert.deepStrictEqual(
    report.unavailable.sort(),
    unsupported.map((c) => c.family).sort(),
  )
})

test("report maps assumptions to plain strings", async () => {
  const { report, evidence } = await produceReport()
  assert.strictEqual(report.assumptions.length, evidence.assumptions.length)
  for (const assumption of report.assumptions) {
    assert.strictEqual(typeof assumption, "string")
  }
})

test("report embeds constitutional planning guidance", async () => {
  const { report } = await produceReport()
  assert.deepStrictEqual(report.guidance, [...CAPABILITY_PLANNING_GUIDANCE])
  assert.ok(report.guidance.some((rule) => rule.includes("not against environmental assumptions")))
})

test("report is deterministic for the same evidence", async () => {
  const first = await produceReport(5000)
  const second = await produceReport(5000)
  assert.deepStrictEqual(first.report, second.report)
})

test("markdown rendering includes all sections", async () => {
  const { report } = await produceReport()
  const markdown = renderCapabilityReportMarkdown(report)
  assert.ok(markdown.includes("# Environment Capability Report"))
  assert.ok(markdown.includes("## Available Capabilities"))
  assert.ok(markdown.includes("## Unavailable or Degraded Capabilities"))
  assert.ok(markdown.includes("## Environmental Assumptions"))
  assert.ok(markdown.includes("## Planning Guidance"))
  assert.ok(markdown.includes(report.environment.platform))
  // every family appears somewhere in the document
  for (const family of CAPABILITY_FAMILIES) {
    assert.ok(markdown.includes(family), `family missing from markdown: ${family}`)
  }
})

test("markdown lists unsupported families in the unavailable table", async () => {
  const { report } = await produceReport()
  const markdown = renderCapabilityReportMarkdown(report)
  const unavailableSection = markdown.split("## Unavailable or Degraded Capabilities")[1].split("##")[0]
  for (const family of report.unavailable) {
    assert.ok(unavailableSection.includes(family), `unavailable family not rendered: ${family}`)
  }
})
