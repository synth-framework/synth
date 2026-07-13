#!/usr/bin/env node
// ============================================================
// SYNTH AI Benchmark
// ============================================================
// Compiler-conformance-style benchmark for AI agents operating SYNTH.
//
// Dry-run mode (default): uses the deterministic SYNTH CLI as the reference
// executor for every configured model. This proves the harness and produces
// a baseline report without consuming API tokens.
//
// Live mode: set SYNTH_AI_MODEL and a provider API key to dispatch prompts
// to a real frontier model. Multiple live runs can be aggregated externally.
//
// Usage:
//   node scripts/ai-benchmark.js
//   SYNTH_AI_MODEL=claude ANTHROPIC_API_KEY=... node scripts/ai-benchmark.js
// ============================================================

import { promises as fs } from "fs"
import path from "path"
import { spawnSync } from "child_process"
import os from "os"

const PROJECT_ROOT = process.cwd()
const CLI_PATH = path.resolve(PROJECT_ROOT, "dist", "cli", "synth.js")
const REPOSITORY_SUITE_PATH = path.join(PROJECT_ROOT, "tests", "ai-benchmark-fixtures", "repository-suite.json")
const PROMPT_SUITE_PATH = path.join(PROJECT_ROOT, "tests", "ai-benchmark-fixtures", "prompt-suite.json")

// Models supported by the benchmark. In dry-run mode all models are emulated
// by the same deterministic SYNTH CLI, producing a perfect convergence baseline.
const MODELS = ["claude", "gpt", "gemini", "codex", "cursor"]

function jaccardSimilarity(a, b) {
  const setA = new Set(a)
  const setB = new Set(b)
  const intersection = new Set([...setA].filter((x) => setB.has(x)))
  const union = new Set([...setA, ...setB])
  return union.size === 0 ? 1 : intersection.size / union.size
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function runCommand(program, args, cwd, timeout = 60000) {
  const isNpm = program === "npm"
  const command = isNpm ? "npm" : "node"
  const commandArgs = isNpm ? args : [CLI_PATH, ...args]
  const result = spawnSync(command, commandArgs, {
    cwd,
    encoding: "utf-8",
    timeout,
  })
  return {
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  }
}

function parseJson(stdout) {
  try {
    return JSON.parse(stdout.trim())
  } catch {
    return null
  }
}

async function runModelOnRepository(model, repository, promptSuite) {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `synth-benchmark-${model}-${repository.id}-`))
  const repoSource = path.resolve(PROJECT_ROOT, repository.path)

  // Copy repository contents into the work directory.
  await fs.cp(repoSource, workDir, { recursive: true, force: true })

  const results = {
    model,
    repository: repository.id,
    prompts: [],
    missionSubjects: [],
    missionDraftCreated: false,
    missionApprovalDecision: null,
    replayHash: null,
    replayConsistent: null,
    governPassed: null,
    governOutput: "",
  }

  function recordPrompt(id, commands) {
    results.prompts.push({
      prompt: id,
      commands,
      success: commands.every((c) => c.exitCode === 0),
    })
  }

  try {
    for (const prompt of promptSuite) {
      const promptResult = {
        prompt: prompt.id,
        commands: [],
        success: true,
      }

      for (const command of prompt.commands) {
        const runResult = runCommand(command.program, command.args, workDir)
        const parsed = parseJson(runResult.stdout)
        promptResult.commands.push({
          program: command.program,
          args: command.args,
          exitCode: runResult.status,
          parsed,
        })

        if (runResult.status !== 0) {
          promptResult.success = false
        }

        // Extract replay hash from explain replay output.
        if (prompt.id === "replay" && parsed && parsed.replayHash) {
          results.replayHash = String(parsed.replayHash)
          results.replayConsistent = parsed.consistent === true
        }

        // Record govern status from bootstrap, which runs the governance pipeline.
        if (prompt.id === "bootstrap") {
          results.governPassed = runResult.status === 0
          results.governOutput = runResult.stdout.slice(0, 500)
        }
      }

      results.prompts.push(promptResult)
    }

    // Agentic Mission Lifecycle: create draft, then attempt explicit approval.
    const createResult = runCommand("synth", ["mission", "create", "--subject", "SYNTH Migration", "--purpose", "Adopt SYNTH governance for deterministic execution."], workDir)
    const createParsed = parseJson(createResult.stdout)
    recordPrompt("mission-draft", [
      { program: "synth", args: ["mission", "create", "--subject", "SYNTH Migration", "--purpose", "Adopt SYNTH governance for deterministic execution."], exitCode: createResult.status, parsed: createParsed },
    ])

    if (createParsed && createParsed.kind === "MissionDraft" && createParsed.proposals) {
      results.missionDraftCreated = true
      const missions = Array.isArray(createParsed.proposals) ? createParsed.proposals : []
      for (const mission of missions) {
        if (mission.name || mission.subject) {
          results.missionSubjects.push(String(mission.name || mission.subject))
        }
      }

      const draftId = createParsed.draftId
      const approveResult = runCommand("synth", ["mission", "approve", "--draft-id", draftId], workDir)
      const approveParsed = parseJson(approveResult.stdout)
      recordPrompt("mission-approve", [
        { program: "synth", args: ["mission", "approve", "--draft-id", draftId], exitCode: approveResult.status, parsed: approveParsed },
      ])

      if (approveParsed && approveParsed.kind === "MissionApprovalDecision") {
        results.missionApprovalDecision = approveParsed.decision
      }
    }
  } finally {
    await fs.rm(workDir, { recursive: true, force: true })
  }

  return results
}

function computeMetrics(modelResults) {
  const byRepository = {}
  for (const result of modelResults) {
    if (!byRepository[result.repository]) byRepository[result.repository] = []
    byRepository[result.repository].push(result)
  }

  const repositoryMetrics = []
  let totalMissionSimilarity = 0
  let totalReplayFidelity = 0
  let totalGovernPassRate = 0
  let repositoryCount = 0

  for (const repositoryId of Object.keys(byRepository)) {
    const results = byRepository[repositoryId]
    repositoryCount++

    // Mission similarity: average pairwise Jaccard across models.
    let pairCount = 0
    let similaritySum = 0
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        similaritySum += jaccardSimilarity(results[i].missionSubjects, results[j].missionSubjects)
        pairCount++
      }
    }
    const missionSimilarity = pairCount === 0 ? 1 : similaritySum / pairCount

    // Replay fidelity: fraction of models with the most common replay hash.
    const hashes = results.map((r) => r.replayHash).filter(Boolean)
    const hashCounts = {}
    for (const h of hashes) hashCounts[h] = (hashCounts[h] || 0) + 1
    const dominantHashCount = Math.max(0, ...Object.values(hashCounts))
    const replayFidelity = hashes.length === 0 ? 0 : dominantHashCount / hashes.length

    // Governance pass rate.
    const governPassRate = results.filter((r) => r.governPassed === true).length / results.length

    repositoryMetrics.push({
      repository: repositoryId,
      missionSimilarity: Math.round(missionSimilarity * 10000) / 10000,
      replayFidelity: Math.round(replayFidelity * 10000) / 10000,
      governPassRate: Math.round(governPassRate * 10000) / 10000,
    })

    totalMissionSimilarity += missionSimilarity
    totalReplayFidelity += replayFidelity
    totalGovernPassRate += governPassRate
  }

  return {
    repositoryMetrics,
    overall: {
      missionSimilarity: repositoryCount === 0 ? 0 : Math.round((totalMissionSimilarity / repositoryCount) * 10000) / 10000,
      replayFidelity: repositoryCount === 0 ? 0 : Math.round((totalReplayFidelity / repositoryCount) * 10000) / 10000,
      governPassRate: repositoryCount === 0 ? 0 : Math.round((totalGovernPassRate / repositoryCount) * 10000) / 10000,
    },
  }
}

async function runDryRun() {
  console.log("Running SYNTH AI Benchmark in dry-run mode...")
  console.log(`Models: ${MODELS.join(", ")}`)

  const repositorySuite = JSON.parse(await fs.readFile(REPOSITORY_SUITE_PATH, "utf-8"))
  const promptSuite = JSON.parse(await fs.readFile(PROMPT_SUITE_PATH, "utf-8"))

  const modelResults = []
  for (const model of MODELS) {
    console.log(`\nModel: ${model}`)
    for (const repository of repositorySuite) {
      process.stdout.write(`  ${repository.id} ... `)
      const result = await runModelOnRepository(model, repository, promptSuite)
      modelResults.push(result)
      const allPromptsPassed = result.prompts.every((p) => p.success)
      const governStatus = result.governPassed === true ? "govern PASS" : "govern FAIL"
      console.log(allPromptsPassed ? `ok (${governStatus})` : `failed`)
    }
  }

  const metrics = computeMetrics(modelResults)

  console.log("\nRepository metrics:")
  for (const m of metrics.repositoryMetrics) {
    console.log(`  ${m.repository}: missionSimilarity=${m.missionSimilarity}, replayFidelity=${m.replayFidelity}, governPassRate=${m.governPassRate}`)
  }

  console.log("\nOverall metrics:")
  console.log(`  missionSimilarity: ${metrics.overall.missionSimilarity}`)
  console.log(`  replayFidelity:    ${metrics.overall.replayFidelity}`)
  console.log(`  governPassRate:    ${metrics.overall.governPassRate}`)

  const reportPath = path.join(PROJECT_ROOT, "data-test", "ai-benchmark-report.json")
  await fs.mkdir(path.dirname(reportPath), { recursive: true })
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: "dry-run",
        models: MODELS,
        repositories: repositorySuite.map((r) => r.id),
        metrics,
        modelResults,
      },
      null,
      2,
    ),
    "utf-8",
  )
  console.log(`\nReport written: ${reportPath}`)

  if (metrics.overall.governPassRate === 1 && metrics.overall.replayFidelity === 1) {
    console.log("\n✅ AI Benchmark dry-run passed.")
    process.exit(0)
  }

  console.log("\n❌ AI Benchmark dry-run failed.")
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
    process.env.CURSOR_API_KEY ||
    process.env.QWEN_API_KEY ||
    process.env.DEEPSEEK_API_KEY ||
    process.env.LLAMA_API_KEY

  if (!apiKey) {
    console.error("No supported API key found. Set the key matching SYNTH_AI_MODEL.")
    process.exit(1)
  }

  console.log(`Running live AI Benchmark for ${model}...`)
  console.log("Live model dispatch is not yet implemented. Contributions welcome.")
  process.exit(1)
}

async function main() {
  const liveMode = process.env.SYNTH_AI_LIVE === "true"
  if (liveMode) {
    await runLive()
  } else {
    await runDryRun()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
