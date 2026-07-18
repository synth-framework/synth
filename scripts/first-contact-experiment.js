#!/usr/bin/env node
// ============================================================
// FIRST CONTACT: Experiment Runner CLI
// ============================================================
// Entry point for running the canonical first-contact scenarios
// defined in EXP-FIRSTCONTACT-010.
//
// Usage:
//   node scripts/first-contact-experiment.js --scenario repository-introduction
//   node scripts/first-contact-experiment.js --all --output ./first-contact/sessions
//
// The runner creates a temporary repository, executes the scenario turns
// through the synth CLI, and writes a session artifact + score.
// ============================================================

import path from "path"
import fs from "fs/promises"
import {
  canonicalScenarios,
  getScenario,
} from "../dist/first-contact/scenarios.js"
import {
  runScenario,
  saveSessionArtifact,
  computeSemanticAlignmentScore,
} from "../dist/first-contact/experiment.js"

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
  const cliPath = path.resolve(process.cwd(), "dist", "cli", "synth.js")
  const outputDir =
    typeof flags.output === "string"
      ? path.resolve(flags.output)
      : path.join(process.cwd(), "first-contact", "sessions")

  let scenarios = []
  if (flags.all) {
    scenarios = canonicalScenarios
  } else if (typeof flags.scenario === "string") {
    const scenario = getScenario(flags.scenario)
    if (!scenario) {
      console.error(`Unknown scenario: ${flags.scenario}`)
      console.error(`Available: ${canonicalScenarios.map((s) => s.id).join(", ")}`)
      process.exit(1)
    }
    scenarios = [scenario]
  } else {
    console.error("Usage: node scripts/first-contact-experiment.js --scenario <id> | --all [--output <dir>]")
    console.error(`Available scenarios: ${canonicalScenarios.map((s) => s.id).join(", ")}`)
    process.exit(1)
  }

  await fs.mkdir(outputDir, { recursive: true })

  const results = []
  for (const scenario of scenarios) {
    console.error(`Running scenario: ${scenario.id}`)
    const artifact = await runScenario(scenario, { cliPath })
    const filePath = await saveSessionArtifact(artifact, outputDir)
    const score = computeSemanticAlignmentScore(artifact)
    results.push({ scenarioId: scenario.id, artifactPath: filePath, score })
    console.error(`  -> ${filePath}`)
  }

  console.log(JSON.stringify({ status: "ok", outputDir, results }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
