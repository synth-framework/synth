// ============================================================
// PUBLIC VOCABULARY AUDIT TEST
// ============================================================
// Ensures public-facing docs do not leak implementation terminology.
//
// Public docs must explain Synth using only the seven public concepts:
// Mission, Expedition, Evidence, Plan, Event, State, Replay.
//
// This test scans designated public docs for forbidden implementation terms
// outside of code blocks and fails if any are found.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "fs/promises"
import path from "path"

const PUBLIC_DOC_GLOBS = [
  "docs/operator/*.md",
  "docs/guides/philosophy/00-introduction.md",
  "docs/reference/public-architecture.md",
]

const VOCAB_DOC = "docs/reference/public-vocabulary.md"

const FORBIDDEN_TERMS = [
  // Core internal components
  "ExecutionGate",
  "CapabilityRegistry",
  "AdapterRegistry",
  "EventStore",
  "StateStore",
  "CheckpointStore",
  "RuntimeEngine",
  "PlanningEngine",
  "PlanningCoordinator",
  "ExecutionContext",
  "CapabilityInvocation",

  // Internal terms
  "ApprovedMissionModelSnapshot",
  "WorldModel",
  "Canonical State",
  "canonical state",
  "Bootstrap",
  // "Seal" is ambiguous; only flag when paired with technical context
]

const EXCLUDED_FILES = [
  // Generated docs are allowed to contain implementation terms
  "docs/generated",
]

function stripCodeBlocks(text) {
  // Remove fenced code blocks
  let cleaned = text.replace(/```[\s\S]*?```/g, "")
  // Remove inline code
  cleaned = cleaned.replace(/`[^`]*`/g, "")
  return cleaned
}

async function resolvePublicDocs() {
  const docsDir = path.join(process.cwd(), "docs")
  const files = new Set()

  for (const glob of PUBLIC_DOC_GLOBS) {
    if (glob.includes("*")) {
      const dir = path.dirname(glob)
      const ext = path.extname(glob)
      const entries = await fs.readdir(path.join(process.cwd(), dir), { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(ext)) {
          files.add(path.join(process.cwd(), dir, entry.name))
        }
      }
    } else {
      files.add(path.join(process.cwd(), glob))
    }
  }

  return Array.from(files).filter((f) => !EXCLUDED_FILES.some((ex) => f.includes(ex)))
}

function findViolations(filePath, content) {
  const prose = stripCodeBlocks(content)
  const violations = []

  for (const term of FORBIDDEN_TERMS) {
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
    let match
    while ((match = regex.exec(prose)) !== null) {
      const lineStart = prose.lastIndexOf("\n", match.index) + 1
      const lineEnd = prose.indexOf("\n", match.index)
      const line = prose.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim()
      violations.push({ term, line })
    }
  }

  return violations
}

test("Public docs do not leak forbidden implementation terminology", async () => {
  const files = await resolvePublicDocs()
  assert.ok(files.length > 0, "Should find public docs to audit")

  const allViolations = []

  for (const file of files) {
    const content = await fs.readFile(file, "utf-8")
    const violations = findViolations(file, content)
    for (const v of violations) {
      allViolations.push({ file: path.relative(process.cwd(), file), ...v })
    }
  }

  if (allViolations.length > 0) {
    const summary = allViolations
      .map((v) => `  - ${v.file}: "${v.term}" in "${v.line.slice(0, 80)}"`)
      .join("\n")
    assert.fail(`Forbidden implementation terms found in public docs:\n${summary}`)
  }
})

test("Public vocabulary doc lists exactly seven public concepts", async () => {
  const vocabPath = path.join(process.cwd(), VOCAB_DOC)
  const content = await fs.readFile(vocabPath, "utf-8")

  const publicConcepts = [
    "Mission",
    "Expedition",
    "Evidence",
    "Plan",
    "Event",
    "State",
    "Replay",
  ]

  for (const concept of publicConcepts) {
    const headingRe = new RegExp(`###\\s+(?:\\d+\\.\\s+)?${concept}\\b`)
    const boldRe = new RegExp(`\\*\\*${concept}\\*\\*`)
    assert.ok(
      headingRe.test(content) || boldRe.test(content),
      `Public vocabulary should define ${concept}`
    )
  }
})
