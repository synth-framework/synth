#!/usr/bin/env node
// ============================================================
// FIRST CONTACT: Conversation Pattern Extractor
// ============================================================
// Reads FirstContactEvidence artifacts and produces canonical
// ConversationPattern artifacts under first-contact/conversation-patterns/.
//
// Usage:
//   node scripts/extract-conversation-patterns.js
//   node scripts/extract-conversation-patterns.js --input ./first-contact/sessions --output ./first-contact/conversation-patterns
// ============================================================

import fs from "fs/promises"
import path from "path"
import {
  extractConversationPattern,
  promoteConversationPattern,
  saveConversationPattern,
} from "../dist/first-contact/patterns.js"

function parseArgs(argv) {
  const args = argv.slice(2)
  const flags = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith("--")) {
      const name = arg.slice(2)
      if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        flags[name] = args[i + 1]
        i++
      } else {
        flags[name] = true
      }
    }
  }
  return flags
}

async function main() {
  const flags = parseArgs(process.argv)
  const inputDir =
    typeof flags.input === "string"
      ? path.resolve(flags.input)
      : path.resolve(process.cwd(), "first-contact", "sessions")
  const outputDir =
    typeof flags.output === "string"
      ? path.resolve(flags.output)
      : path.resolve(process.cwd(), "first-contact", "conversation-patterns")

  const entries = await fs.readdir(inputDir)
  const evidenceFiles = entries.filter((f) => f.endsWith("-evidence.json"))

  if (evidenceFiles.length === 0) {
    console.error(`No evidence files found in ${inputDir}`)
    process.exit(1)
  }

  await fs.mkdir(outputDir, { recursive: true })
  const results = []

  for (const file of evidenceFiles.sort()) {
    const evidencePath = path.join(inputDir, file)
    const raw = await fs.readFile(evidencePath, "utf-8")
    const evidence = JSON.parse(raw)
    const relativeEvidencePath = path.relative(outputDir, evidencePath)
    const pattern = extractConversationPattern(evidence, { evidencePath: relativeEvidencePath })
    const validated = promoteConversationPattern(pattern, { minEvidenceCount: 1, minConfidence: 0.5 })

    const scenarioId = evidence.scenarioId
    const filename = `baseline-${scenarioId}-pattern.json`
    const patternPath = await saveConversationPattern(validated, outputDir, filename)
    results.push({ scenarioId, status: validated.status, patternPath })
    console.error(`  -> ${patternPath} (${validated.status})`)
  }

  console.log(JSON.stringify({ status: "ok", outputDir, results }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
