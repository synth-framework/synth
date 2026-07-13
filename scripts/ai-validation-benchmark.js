#!/usr/bin/env node
// ============================================================
// SYNTH AI Validation Benchmark
// ============================================================
// Validates that SYNTH can be operated deterministically by AI agents.
//
// Dry-run mode (default): verifies prompt templates, CLI commands, and
// expected artifacts without calling external model APIs.
//
// Live mode: set SYNTH_AI_MODEL and the provider API key environment
// variables to run the same tasks through a frontier model.
//
// Supported models: claude, gpt, gemini, codex, cursor
// ============================================================

import { promises as fs } from "fs"
import path from "path"
import { spawnSync } from "child_process"
import os from "os"

const MODELS = ["claude", "gpt", "gemini", "codex", "cursor"]

const PROMPT_TEMPLATES = [
  "docs/guides/agents/bootstrap.md",
  "docs/guides/agents/prompts/bootstrap-repository.md",
]

function findCliPath() {
  return path.resolve(process.cwd(), "dist", "cli", "synth.js")
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function runSynth(args, cwd) {
  return spawnSync("node", [findCliPath(), ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 120000,
  })
}

function parseJson(stdout) {
  try {
    return JSON.parse(stdout.trim())
  } catch {
    return null
  }
}

async function runDryRun() {
  console.log("Running AI validation benchmark in dry-run mode...")
  const results = []
  let allPassed = true

  for (const model of MODELS) {
    console.log(`\nModel: ${model}`)
    const modelResults = { model, tasks: [] }

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), `synth-ai-${model}-`))
    try {
      // Task 1: Initialize and bootstrap a repository.
      const bootstrapResult = runSynth(["bootstrap", "--approve"], tmpDir)
      const bootstrapParsed = parseJson(bootstrapResult.stdout)
      const bootstrapPassed =
        bootstrapResult.status === 0 &&
        bootstrapParsed &&
        bootstrapParsed.status === "ok" &&
        bootstrapParsed.applied &&
        bootstrapParsed.applied.manifest &&
        (await fileExists(path.join(tmpDir, ".synth", "manifest.json")))
      console.log(`  ${bootstrapPassed ? "✓" : "✗"} Bootstrap repository`)
      modelResults.tasks.push({ name: "Bootstrap repository", passed: bootstrapPassed })
      if (!bootstrapPassed) allPassed = false

      // Task 2: Explain Replay.
      const replayResult = runSynth(["explain", "replay"], tmpDir)
      const replayParsed = parseJson(replayResult.stdout)
      const replayPassed = replayResult.status === 0 && replayParsed && typeof replayParsed.consistent === "boolean"
      console.log(`  ${replayPassed ? "✓" : "✗"} Explain Replay`)
      modelResults.tasks.push({ name: "Explain Replay", passed: replayPassed })
      if (!replayPassed) allPassed = false
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }

    results.push(modelResults)
  }

  // Verify the canonical governance command is defined.
  const packageJson = JSON.parse(await fs.readFile(path.join(process.cwd(), "package.json"), "utf-8"))
  const governScriptDefined = typeof packageJson.scripts.govern === "string"
  console.log(`\n  ${governScriptDefined ? "✓" : "✗"} Govern script defined`)
  if (!governScriptDefined) allPassed = false

  console.log("\nPrompt template files:")
  for (const template of PROMPT_TEMPLATES) {
    const exists = await fileExists(path.join(process.cwd(), template))
    console.log(`  ${exists ? "✓" : "✗"} ${template}`)
    if (!exists) allPassed = false
  }

  if (allPassed) {
    console.log("\n✅ AI validation benchmark dry-run passed.")
    process.exit(0)
  }

  console.log("\n❌ AI validation benchmark dry-run failed.")
  process.exit(1)
}

async function runLive() {
  const model = process.env.SYNTH_AI_MODEL
  if (!MODELS.includes(model)) {
    console.error(`SYNTH_AI_MODEL must be one of: ${MODELS.join(", ")}`)
    process.exit(1)
  }

  const apiKey =
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.CODEX_API_KEY ||
    process.env.CURSOR_API_KEY

  if (!apiKey) {
    console.error("No supported API key found. Set one of ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, CODEX_API_KEY, CURSOR_API_KEY.")
    process.exit(1)
  }

  console.log(`Running live AI validation benchmark with ${model}...`)
  console.log("Live benchmarking is not yet implemented. Contributions welcome.")
  process.exit(1)
}

async function main() {
  const dryRun = process.env.SYNTH_AI_DRY_RUN !== "false"
  if (dryRun) {
    await runDryRun()
  } else {
    await runLive()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
