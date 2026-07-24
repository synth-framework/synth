// ============================================================
// HOMEPAGE PUBLIC VOCABULARY AUDIT
// ============================================================
// Ensures the Mission Studio homepage does not leak internal
// governance terminology to first-time users.
//
// The homepage must explain the SYNTH journey using only the
// nine public concepts from the simplified interaction model:
// Idea, Question, Understanding, Contract, Mission, Plan,
// Evidence, Review, Acceptance.
//
// This test scans homepage source files (HTML + JS) for forbidden
// internal terms. Single-word internal terms are intentionally
// excluded because they appear in legitimate contexts; only
// clearly internal multi-word phrases are forbidden.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "fs/promises"
import path from "path"

const HOMEPAGE_FILES = [
  "website/index.html",
  "website/mission-studio.html",
  "website/js/mission-studio-app.js",
  "website/js/public-experience-views.js",
]

const FORBIDDEN_TERMS = [
  "Alignment Contract",
  "Divergence Gate",
  "Mission Projection Package",
  "Projection Certification",
  "Review Gate Package",
  "Acceptance Gate Package",
  "Governance State Machine",
  "Refinement Session",
  "Refinement Report",
  "Refined Intent",
  "Gate Policy",
  "Reviewer Kind",
]

async function resolveHomepageFiles() {
  const files = []
  for (const relative of HOMEPAGE_FILES) {
    files.push(path.join(process.cwd(), relative))
  }
  return files
}

function findViolations(filePath, content) {
  const violations = []
  const lowerContent = content.toLowerCase()

  for (const term of FORBIDDEN_TERMS) {
    const lowerTerm = term.toLowerCase()
    let index = lowerContent.indexOf(lowerTerm)
    while (index !== -1) {
      const lineStart = content.lastIndexOf("\n", index) + 1
      const lineEnd = content.indexOf("\n", index)
      const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim()
      violations.push({ term, line })
      index = lowerContent.indexOf(lowerTerm, index + lowerTerm.length)
    }
  }

  return violations
}

test("Homepage does not leak forbidden internal governance terminology", async () => {
  const files = await resolveHomepageFiles()
  assert.ok(files.length > 0, "Should find homepage files to audit")

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
    assert.fail(`Forbidden internal terms found in homepage:\n${summary}`)
  }
})

test("Public experience resolver output does not contain forbidden terms", async () => {
  const module = await import("../website/js/homepage-runtime/public-experience.js")
  const { resolvePublicExperience, createPublicFlowState } = module

  const state = {
    mode: "greenfield",
    input: "Build a homepage for my AI tool",
    intent: {
      kind: "intent",
      description: "Build a homepage for my AI tool",
      goals: ["build a homepage"],
      successCriteria: ["Users can view the homepage"],
      mode: "greenfield",
    },
    discovery: {
      kind: "discovery",
      findings: ["Intent: Build a homepage for my AI tool"],
      capabilities: ["html-rendering"],
      constraints: ["Runtime: web"],
    },
    unknowns: { kind: "unknowns", items: [] },
    evidence: [],
    answers: [],
    expeditions: [],
    publicFlow: createPublicFlowState(),
  }

  const experience = resolvePublicExperience(state)
  const text = JSON.stringify(experience).toLowerCase()

  for (const term of FORBIDDEN_TERMS) {
    assert.ok(
      !text.includes(term.toLowerCase()),
      `Public experience output should not contain "${term}"`
    )
  }
})
