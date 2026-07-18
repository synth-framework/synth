#!/usr/bin/env node
// ============================================================
// SYNTH: First Contact Quick-Start Projection Generator
// ============================================================
// Projects canonical ConversationPattern artifacts into operator-facing
// quick-start documentation under docs/first-contact/quick-start/.
//
// Authoritative source:
//   first-contact/conversation-patterns/*-pattern.json
//   Only patterns with status === "canonical" are projected.
//
// Outputs (committed, regeneration-verified):
//   docs/first-contact/quick-start/*.md
//
// Usage:
//   node scripts/generate-first-contact-quickstart.js           write outputs
//   node scripts/generate-first-contact-quickstart.js --check   verify committed outputs match a fresh projection
// ============================================================

import fs from "fs/promises"
import path from "path"

const PATTERNS_DIR_REL = path.join("first-contact", "conversation-patterns")
const OUT_DIR_REL = path.join("docs", "first-contact", "quick-start")
const INDEX_REL = path.join(OUT_DIR_REL, "README.md")

const PROJECTION_BANNER = `> **Projection notice.** This document is a deterministic projection of the canonical [ConversationPattern](../../first-contact/conversation-patterns/) artifacts. Do not edit by hand; regenerate with \`node scripts/generate-first-contact-quickstart.js\`.`

function toFilename(id) {
  return `${id.replace(/[\s_/]+/g, "-")}.md`
}

function renderPattern(pattern) {
  const lines = []
  lines.push(PROJECTION_BANNER)
  lines.push("")
  lines.push(`# ${pattern.title}`)
  lines.push("")
  lines.push(`**Trigger:** ${pattern.trigger}`)
  lines.push("")
  lines.push(`**Canonical confidence:** ${pattern.confidence}`)
  lines.push("")

  lines.push("## Preconditions")
  lines.push("")
  const pre = pattern.preconditions || {}
  if (typeof pre.initialized === "boolean") {
    lines.push(`- Repository initialized: ${pre.initialized}`)
  }
  if (pre.phase) {
    lines.push(`- Lifecycle phase: ${pre.phase}`)
  }
  if (pre.repositoryStateSummary) {
    lines.push(`- State summary: ${pre.repositoryStateSummary}`)
  }
  if (Array.isArray(pre.files) && pre.files.length > 0) {
    lines.push(`- Expected status fields: ${pre.files.join(", ")}`)
  }
  lines.push("")

  if (Array.isArray(pattern.trajectory) && pattern.trajectory.length > 0) {
    lines.push("## Suggested trajectory")
    lines.push("")
    for (const turn of pattern.trajectory) {
      lines.push(`### Turn ${turn.turn}: \`${turn.command}\``)
      lines.push("")
      if (turn.intent) {
        lines.push(`**Intent:** ${turn.intent}`)
        lines.push("")
      }
      if (turn.expectedReasoningState) {
        const rs = turn.expectedReasoningState
        lines.push("**Expected reasoning state:**")
        lines.push("")
        lines.push(`- Understood as: ${rs.understoodAs || "(unspecified)"}`)
        lines.push(`- Confidence: ${typeof rs.confidence === "number" ? rs.confidence : "(unspecified)"}`)
        if (Array.isArray(rs.unknowns) && rs.unknowns.length > 0) {
          lines.push(`- Unknowns: ${rs.unknowns.join("; ")}`)
        }
        lines.push("")
      }
    }
  }

  if (Array.isArray(pattern.decisionPoints) && pattern.decisionPoints.length > 0) {
    lines.push("## Decision points")
    lines.push("")
    for (const dp of pattern.decisionPoints) {
      lines.push(`- **Turn ${dp.turn}:** ${dp.description}`)
    }
    lines.push("")
  }

  if (Array.isArray(pattern.successfulPrompts) && pattern.successfulPrompts.length > 0) {
    lines.push("## Successful prompts")
    lines.push("")
    for (const prompt of pattern.successfulPrompts) {
      lines.push(`- ${prompt}`)
    }
    lines.push("")
  }

  if (Array.isArray(pattern.antiPatterns) && pattern.antiPatterns.length > 0) {
    lines.push("## Anti-patterns")
    lines.push("")
    for (const ap of pattern.antiPatterns) {
      lines.push(`- ${ap}`)
    }
    lines.push("")
  }

  if (Array.isArray(pattern.misinterpretationCategories) && pattern.misinterpretationCategories.length > 0) {
    const categories = pattern.misinterpretationCategories.filter((c) => c && c !== "none")
    if (categories.length > 0) {
      lines.push("## Misinterpretation categories")
      lines.push("")
      for (const category of categories) {
        lines.push(`- ${category}`)
      }
      lines.push("")
    }
  }

  if (Array.isArray(pattern.supportingEvidence) && pattern.supportingEvidence.length > 0) {
    lines.push("## Supporting evidence")
    lines.push("")
    for (const ev of pattern.supportingEvidence) {
      lines.push(`- Session \`${ev.sessionId}\` — [evidence](${ev.evidencePath})`)
    }
    lines.push("")
  }

  return lines.join("\n").trimEnd() + "\n"
}

function renderIndex(patterns) {
  const lines = []
  lines.push(PROJECTION_BANNER)
  lines.push("")
  lines.push("# First Contact — Quick Start Scenarios")
  lines.push("")
  lines.push("These scenarios are projections of canonical ConversationPattern artifacts derived from observed first-contact sessions. They show low-friction trajectories for common SYNTH entry points.")
  lines.push("")
  lines.push("| Scenario | Trigger | Confidence |")
  lines.push("|---|---|---|")
  for (const pattern of patterns) {
    const filename = toFilename(pattern.id)
    lines.push(`| [${pattern.title}](${filename}) | ${pattern.trigger} | ${pattern.confidence} |`)
  }
  lines.push("")
  lines.push("## Regenerating")
  lines.push("")
  lines.push("```bash")
  lines.push("node scripts/generate-first-contact-quickstart.js")
  lines.push("```")
  lines.push("")
  return lines.join("\n")
}

async function loadPatterns(root) {
  const patternsDir = path.join(root, PATTERNS_DIR_REL)
  const entries = await fs.readdir(patternsDir)
  const files = entries
    .filter((name) => name.endsWith("-pattern.json"))
    .sort()
  const patterns = []
  for (const file of files) {
    const fullPath = path.join(patternsDir, file)
    const content = JSON.parse(await fs.readFile(fullPath, "utf-8"))
    if (content.status === "canonical") {
      patterns.push(content)
    }
  }
  return patterns
}

async function generate(root, { check = false } = {}) {
  const patterns = await loadPatterns(root)
  if (patterns.length === 0) {
    throw new Error("No canonical conversation patterns found.")
  }

  const outDir = path.join(root, OUT_DIR_REL)
  if (!check) {
    await fs.mkdir(outDir, { recursive: true })
  }

  const expected = new Map()
  expected.set("README.md", renderIndex(patterns))
  for (const pattern of patterns) {
    expected.set(toFilename(pattern.id), renderPattern(pattern))
  }

  if (check) {
    const mismatches = []
    try {
      await fs.access(outDir)
    } catch {
      mismatches.push(`missing output directory ${OUT_DIR_REL}`)
    }

    if (mismatches.length === 0) {
      const existingEntries = await fs.readdir(outDir)
      const expectedNames = new Set(expected.keys())
      for (const name of existingEntries) {
        if (!expectedNames.has(name)) {
          mismatches.push(`unexpected file ${path.join(OUT_DIR_REL, name)}`)
        }
      }
      for (const [name, content] of expected) {
        const filePath = path.join(outDir, name)
        let actual
        try {
          actual = await fs.readFile(filePath, "utf-8")
        } catch {
          mismatches.push(`missing ${path.join(OUT_DIR_REL, name)}`)
          continue
        }
        if (actual !== content) {
          mismatches.push(`drift in ${path.join(OUT_DIR_REL, name)}`)
        }
      }
    }

    if (mismatches.length > 0) {
      throw new Error(`QUICKSTART_PROJECTION_DRIFT:\n  ${mismatches.join("\n  ")}`)
    }
    return { patterns, written: Array.from(expected.keys()) }
  }

  for (const [name, content] of expected) {
    await fs.writeFile(path.join(outDir, name), content, "utf-8")
  }

  return { patterns, written: Array.from(expected.keys()) }
}

async function main() {
  const root = process.cwd()
  const check = process.argv.includes("--check")
  const result = await generate(root, { check })
  const action = check ? "verified" : "wrote"
  console.log(`Quick-start projections ${action}: ${result.written.join(", ")}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
