// ============================================================
// DOCUMENTATION EXPEDITION TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "fs/promises"
import path from "path"
import os from "os"
import {
  extractMarkdownKnowledge,
  buildKnowledgeGraph,
  normalizeGraph,
  projectToReadme,
  projectToArchitecture,
  projectToApiReference,
  projectToOperatorGuide,
  projectToDeveloperGuide,
  projectToArchitectGuide,
  projectToAiContext,
  runDocumentationExpedition,
  computeSourceStateHash,
} from "../dist/documentation/index.js"

const sampleMarkdown = `---
Title: Sample Doc
Domain: architecture
Audience: architects
---

# Sample Doc

## Purpose

This is the purpose.

## Concepts

- Concept A
- Concept B

## See Also

- [Other Doc](other.md)
`

test("extractMarkdownKnowledge extracts metadata, headings, lists, and links", () => {
  const knowledge = extractMarkdownKnowledge("sample.md", sampleMarkdown)

  assert.strictEqual(knowledge.id, "sample.md")
  assert.strictEqual(knowledge.title, "Sample Doc")
  assert.strictEqual(knowledge.domain, "architecture")
  assert.strictEqual(knowledge.audience, "architects")
  assert.ok(knowledge.headings.includes("Purpose"))
  assert.ok(knowledge.headings.includes("Concepts"))
  assert.ok(knowledge.listItems.includes("Concept A"))
  assert.ok(knowledge.listItems.includes("Concept B"))
  assert.deepStrictEqual(knowledge.links, ["other.md"])
})

test("buildKnowledgeGraph combines multiple markdown sources", () => {
  const sources = [
    extractMarkdownKnowledge("a.md", "# A\n\n- Foo"),
    extractMarkdownKnowledge("b.md", "# B\n\n- Bar"),
  ]
  const graph = buildKnowledgeGraph(sources)

  const documents = graph.nodes.filter((n) => n.kind === "document")
  assert.strictEqual(documents.length, 2)
  assert.ok(documents.some((n) => n.id === "a.md"))
  assert.ok(documents.some((n) => n.id === "b.md"))
})

test("normalizeGraph deduplicates concepts across sources", () => {
  const sources = [
    extractMarkdownKnowledge("a.md", "# A\n\n- Mission"),
    extractMarkdownKnowledge("b.md", "# B\n\n- Mission"),
  ]
  const graph = normalizeGraph(buildKnowledgeGraph(sources))

  const concepts = graph.concepts
  assert.strictEqual(concepts.filter((c) => c.name.toLowerCase() === "mission").length, 1)
})

test("projectToReadme generates a README with overview and concepts", () => {
  const sources = [extractMarkdownKnowledge("intro.md", "# Intro\n\nSynth is a deterministic execution system.")]
  const graph = normalizeGraph(buildKnowledgeGraph(sources))
  const doc = projectToReadme(graph)

  assert.ok(doc.includes("# README"))
  assert.ok(doc.includes("Synth"))
  assert.ok(doc.includes("deterministic execution system"))
})

test("projectToArchitecture generates an architecture document", () => {
  const sources = [extractMarkdownKnowledge("arch.md", "# Architecture\n\n- ExecutionGate\n- EventStore")]
  const graph = normalizeGraph(buildKnowledgeGraph(sources))
  const doc = projectToArchitecture(graph)

  assert.ok(doc.includes("# Architecture"))
  assert.ok(doc.includes("ExecutionGate"))
  assert.ok(doc.includes("EventStore"))
})

test("projectToApiReference generates an API reference", () => {
  const sources = [
    extractMarkdownKnowledge("api.md", "# API\n\n## Capabilities\n\n- CreateWorkItem\n- StartWorkItem"),
  ]
  const graph = normalizeGraph(buildKnowledgeGraph(sources))
  const doc = projectToApiReference(graph)

  assert.ok(doc.includes("# API Reference"))
  assert.ok(doc.includes("CreateWorkItem"))
  assert.ok(doc.includes("StartWorkItem"))
})

test("projectToOperatorGuide generates operator documentation", () => {
  const sources = [extractMarkdownKnowledge("operator.md", "# Operator\n\n- Start an expedition\n- Approve a mission")]
  const graph = normalizeGraph(buildKnowledgeGraph(sources))
  const doc = projectToOperatorGuide(graph)

  assert.ok(doc.includes("# Operator Guide"))
  assert.ok(doc.includes("expedition") || doc.includes("Expedition"))
})

test("projectToDeveloperGuide generates developer documentation", () => {
  const sources = [extractMarkdownKnowledge("dev.md", "# Developer\n\n- Build capabilities\n- Run tests")]
  const graph = normalizeGraph(buildKnowledgeGraph(sources))
  const doc = projectToDeveloperGuide(graph)

  assert.ok(doc.includes("# Developer Guide"))
  assert.ok(doc.includes("capabilities") || doc.includes("tests"))
})

test("projectToArchitectGuide generates architect documentation", () => {
  const sources = [extractMarkdownKnowledge("constitution.md", "# Constitution\n\n- Single mutation authority")]
  const graph = normalizeGraph(buildKnowledgeGraph(sources))
  const doc = projectToArchitectGuide(graph)

  assert.ok(doc.includes("# Architect Guide"))
  assert.ok(doc.includes("Constitution") || doc.includes("mutation authority"))
})

test("projectToAiContext generates a concise AI context document", () => {
  const sources = [extractMarkdownKnowledge("ai.md", "# AI Context\n\n- Event-sourced\n- Deterministic")]
  const graph = normalizeGraph(buildKnowledgeGraph(sources))
  const doc = projectToAiContext(graph)

  assert.ok(doc.includes("# AI Context"))
  assert.ok(doc.length < 4000, "AI Context should be concise")
})

test("runDocumentationExpedition writes all seven target documents", async () => {
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-docs-"))
  const sources = [
    extractMarkdownKnowledge("intro.md", "# Synth\n\nSynth is a deterministic execution system."),
    extractMarkdownKnowledge("arch.md", "# Architecture\n\n- ExecutionGate\n- EventStore"),
    extractMarkdownKnowledge("api.md", "# API\n\n## Capabilities\n\n- CreateWorkItem"),
    extractMarkdownKnowledge("operator.md", "# Operator\n\n- Start an expedition"),
    extractMarkdownKnowledge("dev.md", "# Developer\n\n- Build capabilities"),
    extractMarkdownKnowledge("architect.md", "# Architect\n\n- Constitution"),
  ]

  await runDocumentationExpedition(sources, outDir)

  const files = ["README.md", "ARCHITECTURE.md", "API.md", "OPERATOR_GUIDE.md", "DEVELOPER_GUIDE.md", "ARCHITECT_GUIDE.md", "AI_CONTEXT.md"]
  for (const file of files) {
    const content = await fs.readFile(path.join(outDir, file), "utf-8")
    assert.ok(content.length > 0, `${file} should not be empty`)
  }

  await fs.rm(outDir, { recursive: true, force: true })
})

test("Documentation Expedition output is deterministic", async () => {
  const outDir1 = await fs.mkdtemp(path.join(os.tmpdir(), "synth-docs-1-"))
  const outDir2 = await fs.mkdtemp(path.join(os.tmpdir(), "synth-docs-2-"))
  const sources = [extractMarkdownKnowledge("intro.md", "# Synth\n\nSynth is deterministic.")]

  await runDocumentationExpedition(sources, outDir1)
  await runDocumentationExpedition(sources, outDir2)

  const files = ["README.md", "ARCHITECTURE.md", "API.md", "OPERATOR_GUIDE.md", "DEVELOPER_GUIDE.md", "ARCHITECT_GUIDE.md", "AI_CONTEXT.md"]
  for (const file of files) {
    const a = await fs.readFile(path.join(outDir1, file), "utf-8")
    const b = await fs.readFile(path.join(outDir2, file), "utf-8")
    assert.strictEqual(a, b, `${file} should be deterministic`)
  }

  await fs.rm(outDir1, { recursive: true, force: true })
  await fs.rm(outDir2, { recursive: true, force: true })
})

test("projections embed a deterministic sourceStateHash", async () => {
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-docs-hash-"))
  const sources = [
    extractMarkdownKnowledge("intro.md", "# Synth\n\nSynth is deterministic."),
  ]

  const projections = await runDocumentationExpedition(sources, outDir)
  const expectedHash = computeSourceStateHash(sources)

  assert.ok(projections.length > 0, "projections should be generated")
  for (const projection of projections) {
    assert.strictEqual(projection.sourceStateHash, expectedHash, `${projection.filename} should carry the source state hash`)
    const content = await fs.readFile(path.join(outDir, projection.filename), "utf-8")
    assert.ok(content.includes(`sourceStateHash: ${expectedHash}`), `${projection.filename} should embed the source state hash`)
  }

  await fs.rm(outDir, { recursive: true, force: true })
})

test("sourceStateHash changes when source content changes", () => {
  const sourcesA = [extractMarkdownKnowledge("intro.md", "# Synth\n\nVersion A.")]
  const sourcesB = [extractMarkdownKnowledge("intro.md", "# Synth\n\nVersion B.")]

  const hashA = computeSourceStateHash(sourcesA)
  const hashB = computeSourceStateHash(sourcesB)

  assert.notStrictEqual(hashA, hashB, "different source content should produce different source state hashes")
})

test("architecture projection lists ADRs with status, date, and deciders", () => {
  const adrContent = `---
Title: ADR-001
---

# ADR-001

**Status:** Accepted  
**Date:** 2026-07-25  
**Deciders:** Synth Architecture  

We decided to use deterministic projections.
`
  const sources = [
    extractMarkdownKnowledge("adr/ADR-001.md", adrContent),
    extractMarkdownKnowledge("intro.md", "# Synth\n\nDeterministic execution system."),
  ]
  const graph = normalizeGraph(buildKnowledgeGraph(sources))
  const doc = projectToArchitecture(graph)

  assert.ok(doc.includes("Architecture Decisions"), "architecture doc should include Architecture Decisions section")
  assert.ok(doc.includes("ADR-001"), "architecture doc should list ADR-001")
  assert.ok(doc.includes("Accepted"), "architecture doc should show ADR status")
  assert.ok(doc.includes("2026-07-25"), "architecture doc should show ADR date")
  assert.ok(doc.includes("Synth Architecture"), "architecture doc should show ADR deciders")
})

test("operator guide projection lists expeditions with status, kind, priority, and program", () => {
  const expeditionContent = `---
Title: EXP-TEST-001
---

# EXP-TEST-001

**Status:** Completed  
**Kind:** Test Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-999  

Test expedition for metadata completeness.
`
  const sources = [
    extractMarkdownKnowledge("expeditions/EXP-TEST-001.md", expeditionContent),
    extractMarkdownKnowledge("intro.md", "# Synth\n\nDeterministic execution system."),
  ]
  const graph = normalizeGraph(buildKnowledgeGraph(sources))
  const doc = projectToOperatorGuide(graph)

  assert.ok(doc.includes("Active Expeditions"), "operator guide should include Active Expeditions section")
  assert.ok(doc.includes("EXP-TEST-001"), "operator guide should list EXP-TEST-001")
  assert.ok(doc.includes("Completed"), "operator guide should show expedition status")
  assert.ok(doc.includes("Test Expedition"), "operator guide should show expedition kind")
  assert.ok(doc.includes("High"), "operator guide should show expedition priority")
  assert.ok(doc.includes("EXP-PROGRAM-999"), "operator guide should show expedition program")
})

test("concepts are deterministically ordered in projections", () => {
  const sources = [
    extractMarkdownKnowledge("z.md", "# Z\n\n- Zebra"),
    extractMarkdownKnowledge("a.md", "# A\n\n- Apple"),
    extractMarkdownKnowledge("m.md", "# M\n\n- Mango"),
  ]
  const graph = normalizeGraph(buildKnowledgeGraph(sources))
  const doc1 = projectToReadme(graph)
  const doc2 = projectToReadme(graph)

  assert.strictEqual(doc1, doc2, "projection should be deterministic for identical inputs")
  const appleIndex = doc1.indexOf("Apple")
  const mangoIndex = doc1.indexOf("Mango")
  const zebraIndex = doc1.indexOf("Zebra")
  assert.ok(appleIndex < mangoIndex, "Apple should appear before Mango")
  assert.ok(mangoIndex < zebraIndex, "Mango should appear before Zebra")
})
