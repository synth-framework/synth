// ============================================================
// DISCOVERY CONSUMERS CONTRACT TESTS
// ============================================================
// Validates the Discovery Consumption Layer: registry behavior,
// reference consumers, and the session shape expected by hypothetical
// IDE/MCP/Web consumers.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "fs/promises"
import os from "os"
import path from "path"
import {
  createConsumerRegistry,
  createDefaultDiscoverySessionProvider,
  createJsonConsumer,
  createCliConsumer,
  createReplayConsumer,
  createDriftConsumer,
  JSON_CONSUMER_ID,
  JSON_CONSUMER_VERSION,
  CLI_CONSUMER_ID,
  REPLAY_CONSUMER_ID,
  DRIFT_CONSUMER_ID,
} from "../dist/discovery/index.js"

const PROJECT_ROOT = process.cwd()

const BROWNFIELD_EXAMPLES = [
  { name: "todo", dir: "examples/todo", type: "node" },
  { name: "crm", dir: "examples/crm", type: "node" },
  { name: "legacy-node", dir: "examples/legacy-node", type: "brownfield" },
  { name: "polyglot", dir: "examples/polyglot", type: "polyglot" },
  { name: "monolith", dir: "examples/monolith", type: "node" },
  { name: "blog", dir: "examples/blog", type: "node" },
]

async function discoverExample(example) {
  const provider = createDefaultDiscoverySessionProvider()
  return provider.discover({ targetDir: path.resolve(PROJECT_ROOT, example.dir) })
}

async function createMinimalSession(files = {}) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "discovery-consumer-"))

  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(tmpDir, relativePath)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, content, "utf-8")
  }

  try {
    const provider = createDefaultDiscoverySessionProvider()
    return await provider.discover({ targetDir: tmpDir })
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

test("consumer registry supports register, resolve, list, and unregister", () => {
  const registry = createConsumerRegistry()
  const consumer = createJsonConsumer()

  registry.register(consumer)
  assert.strictEqual(registry.list().length, 1)

  const resolved = registry.resolve(JSON_CONSUMER_ID)
  assert.ok(resolved, "resolved consumer must exist")
  assert.strictEqual(resolved.id, JSON_CONSUMER_ID)
  assert.strictEqual(resolved.version, JSON_CONSUMER_VERSION)

  registry.unregister(JSON_CONSUMER_ID)
  assert.strictEqual(registry.list().length, 0)
  assert.strictEqual(registry.resolve(JSON_CONSUMER_ID), undefined)
})

test("consumer registry rejects duplicate registration", () => {
  const registry = createConsumerRegistry()
  registry.register(createJsonConsumer())

  assert.throws(
    () => registry.register(createJsonConsumer()),
    /already registered/,
  )
})

test("consumer registry throws when executing an unknown consumer", () => {
  const registry = createConsumerRegistry()

  assert.throws(
    () => registry.execute("discovery:unknown", { id: "session-1", hash: "abc" }),
    /Consumer not found/,
  )
})

test("consumer registry validates required projections before execution", async () => {
  const session = await createMinimalSession({
    "package.json": JSON.stringify({ name: "test" }),
    "README.md": "# Test",
  })

  const registry = createConsumerRegistry()
  registry.register({
    id: "discovery:projection-greedy",
    version: "1.0.0",
    kind: "analytical",
    description: "Requires a projection that does not exist.",
    requiredProjections: ["nonexistent-projection"],
    consume: () => "output",
  })

  assert.throws(
    () => registry.execute("discovery:projection-greedy", session),
    /requires missing projections/,
  )
})

test("consumer registry wraps output in a ConsumerResult envelope", async () => {
  const session = await createMinimalSession({
    "package.json": JSON.stringify({ name: "test" }),
    "README.md": "# Test",
  })

  const registry = createConsumerRegistry()
  registry.register(createJsonConsumer())

  const result = registry.execute(JSON_CONSUMER_ID, session)

  assert.strictEqual(result.consumerId, JSON_CONSUMER_ID)
  assert.strictEqual(result.consumerVersion, JSON_CONSUMER_VERSION)
  assert.strictEqual(typeof result.outputHash, "string")
  assert.strictEqual(result.outputHash.length, 64)
  assert.strictEqual(result.provenance.sessionId, session.id)
  assert.strictEqual(result.provenance.sessionHash, session.hash)
  assert.ok(result.durationMs >= 0, "durationMs must be non-negative")
})

test("consumer registry rethrows consumer errors with consumer id", async () => {
  const session = await createMinimalSession({
    "package.json": JSON.stringify({ name: "test" }),
    "README.md": "# Test",
  })

  const registry = createConsumerRegistry()
  registry.register({
    id: "discovery:failing-consumer",
    version: "1.0.0",
    kind: "analytical",
    description: "Always fails.",
    consume: () => {
      throw new Error("boom")
    },
  })

  assert.throws(
    () => registry.execute("discovery:failing-consumer", session),
    /discovery:failing-consumer failed: boom/,
  )
})

test("JSON consumer produces deterministic output", async () => {
  const session = await createMinimalSession({
    "package.json": JSON.stringify({ name: "test" }),
    "README.md": "# Test",
  })

  const consumer = createJsonConsumer()
  const first = consumer.consume(session)
  const second = consumer.consume(session)

  assert.strictEqual(first, second)
  assert.doesNotThrow(() => JSON.parse(first))
})

test("JSON consumer respects includeProjections", async () => {
  const session = await createMinimalSession({
    "package.json": JSON.stringify({ name: "test" }),
    "README.md": "# Test",
  })

  const consumer = createJsonConsumer()
  const full = JSON.parse(consumer.consume(session))
  const filtered = JSON.parse(
    consumer.consume(session, { includeProjections: ["project-model"] }),
  )

  assert.ok("project-model" in full.projections)
  assert.ok("findings" in full.projections)
  assert.ok("project-model" in filtered.projections)
  assert.ok(!("findings" in filtered.projections))
})

test("JSON consumer supports pretty printing", async () => {
  const session = await createMinimalSession({
    "package.json": JSON.stringify({ name: "test" }),
  })

  const consumer = createJsonConsumer()
  const compact = consumer.consume(session)
  const pretty = consumer.consume(session, { pretty: true })

  assert.ok(!compact.includes("\n"))
  assert.ok(pretty.includes("\n"))
  assert.deepStrictEqual(JSON.parse(compact), JSON.parse(pretty))
})

test("CLI consumer produces expected repository fields for brownfield examples", async () => {
  const registry = createConsumerRegistry()
  registry.register(createCliConsumer())
  const validRepositoryTypes = new Set(["empty", "node", "python", "polyglot", "brownfield", "unknown"])

  for (const example of BROWNFIELD_EXAMPLES) {
    const session = await discoverExample(example)
    const result = registry.execute(CLI_CONSUMER_ID, session)
    const output = result.output

    assert.ok(
      validRepositoryTypes.has(output.repositoryType),
      `${example.name}: repositoryType must be a valid type`,
    )
    assert.ok(Array.isArray(output.languages), `${example.name}: languages must be an array`)
    assert.ok(output.languages.length > 0, `${example.name}: languages must not be empty`)
    assert.ok(Array.isArray(output.frameworks), `${example.name}: frameworks must be an array`)
    assert.strictEqual(typeof output.hasTests, "boolean")
    assert.strictEqual(typeof output.hasPackageManager, "boolean")
    assert.ok(output.fileCount > 0, `${example.name}: fileCount must be greater than zero`)
    assert.ok(output.observationCount > 0, `${example.name}: observationCount must be greater than zero`)
    assert.strictEqual(output.discoverySessionId, session.id)
    assert.strictEqual(output.discoverySessionHash, session.hash)

    console.log(`✓ cli-consumer ${example.name}: ${output.repositoryType}, ${output.observationCount} observation(s)`)
  }
})

test("CLI consumer fails gracefully when project-model projection is missing", () => {
  const session = {
    id: "session-test",
    hash: "abc",
    projections: { findings: { items: [] } },
  }

  const registry = createConsumerRegistry()
  registry.register(createCliConsumer())

  assert.throws(
    () => registry.execute(CLI_CONSUMER_ID, session),
    /Consumer discovery:cli-consumer requires missing projections: project-model/,
  )
})

test("Replay consumer returns a ReplayReport", async () => {
  const session = await createMinimalSession({
    "package.json": JSON.stringify({ name: "test" }),
    "README.md": "# Test",
  })

  const registry = createConsumerRegistry()
  registry.register(createReplayConsumer())

  const result = registry.execute(REPLAY_CONSUMER_ID, session)
  const report = result.output

  assert.ok(report, "ReplayReport must be returned")
  assert.ok(["exact", "equivalent", "contextual", "invalid", "impossible"].includes(report.status))
  assert.strictEqual(report.sessionId, session.id)
  assert.strictEqual(report.sessionHash, session.hash)
  assert.ok(Array.isArray(report.stageResults))
  assert.ok(Array.isArray(report.adapterChecks))
  assert.ok(Array.isArray(report.provenanceChecks))
  assert.strictEqual(typeof report.tamperDetected, "boolean")
  assert.ok(report.durationMs >= 0)
})

test("Drift consumer reports zero findings for identical sessions", async () => {
  const session = await createMinimalSession({
    "package.json": JSON.stringify({ name: "test" }),
    "README.md": "# Test",
  })

  const registry = createConsumerRegistry()
  registry.register(createDriftConsumer())

  const result = registry.execute(DRIFT_CONSUMER_ID, session, {
    sessionA: session,
    sessionB: session,
  })

  assert.strictEqual(result.output.summary.added, 0)
  assert.strictEqual(result.output.summary.removed, 0)
  assert.strictEqual(result.output.summary.changed, 0)
  assert.ok(result.output.summary.unchanged > 0)
})

test("Drift consumer reports differences between sessions with different findings", async () => {
  const sessionA = await createMinimalSession({
    "package.json": JSON.stringify({ name: "test" }),
    "README.md": "# Test",
  })
  const sessionB = await createMinimalSession({
    "package.json": JSON.stringify({ name: "test" }),
  })

  const registry = createConsumerRegistry()
  registry.register(createDriftConsumer())

  const result = registry.execute(DRIFT_CONSUMER_ID, sessionA, {
    sessionA,
    sessionB,
  })

  const findingsProjectionDrift = result.output.findings.find(
    (finding) => finding.path === "projections.findings",
  )
  assert.ok(findingsProjectionDrift, "findings projection must show drift")
  assert.strictEqual(findingsProjectionDrift.kind, "changed")

  const itemDrift = result.output.findings.filter((finding) =>
    finding.path.startsWith("projections.findings.items."),
  )
  assert.ok(itemDrift.length > 0, "individual findings must show drift")
})

test("IDE/MCP/Web consumers can be implemented against the DiscoverySession shape", async () => {
  const session = await createMinimalSession({
    "package.json": JSON.stringify({ name: "test" }),
    "README.md": "# Test",
  })

  // Hypothetical IDE consumer would expect identity, languages, and frameworks.
  assert.ok(session.id, "session id is present for IDE consumer")
  assert.ok(session.hash, "session hash is present for IDE consumer")
  assert.ok(session.projections["project-model"], "project-model projection is present for IDE consumer")
  assert.ok(session.projections.findings, "findings projection is present for IDE consumer")
  assert.ok(session.replay, "replay report is present for IDE consumer")

  // Hypothetical MCP consumer would expect canonical evidence and provenance.
  assert.ok(Array.isArray(session.observations), "observations array is present for MCP consumer")
  assert.ok(session.evidenceGraph, "evidence graph is present for MCP consumer")
  assert.ok(session.pipeline, "pipeline provenance is present for MCP consumer")

  // Hypothetical Web consumer would expect serializable projections.
  assert.ok(typeof session.projections === "object", "projections are present for Web consumer")
  assert.strictEqual(
    session.projections["project-model"].schemaVersion,
    "synth-project-model-v1",
  )
  assert.strictEqual(session.projections.findings.schema, "synth-discovery-findings-v1")
})
