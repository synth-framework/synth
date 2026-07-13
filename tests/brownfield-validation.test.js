// ============================================================
// SYNTH Brownfield Validation Tests
// ============================================================
// Runs SYNTH bootstrap analysis against the certified example
// repositories and verifies that Mission Studio produces useful
// observations and proposals for each one.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"

const PROJECT_ROOT = process.cwd()
const CLI_PATH = path.resolve(PROJECT_ROOT, "dist", "cli", "synth.js")

const EXAMPLES = [
  { name: "todo", dir: "examples/todo", type: "node" },
  { name: "crm", dir: "examples/crm", type: "node" },
  { name: "legacy-node", dir: "examples/legacy-node", type: "brownfield" },
  { name: "polyglot", dir: "examples/polyglot", type: "polyglot" },
  { name: "monolith", dir: "examples/monolith", type: "node" },
  { name: "blog", dir: "examples/blog", type: "node" },
]

function runSynth(args, cwd) {
  const result = spawnSync("node", [CLI_PATH, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 60000,
  })
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  }
}

function parseJson(stdout) {
  // CLI logs go to stderr; stdout contains only the final JSON object.
  try {
    return JSON.parse(stdout.trim())
  } catch (err) {
    throw new Error(`Failed to parse CLI output as JSON:\n${stdout}`)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function testExample(example) {
  const exampleDir = path.resolve(PROJECT_ROOT, example.dir)
  const stats = await fs.stat(exampleDir).catch(() => null)
  assert(stats && stats.isDirectory(), `Example directory ${example.dir} must exist`)

  const result = runSynth(["bootstrap", exampleDir, "--dry-run"], PROJECT_ROOT)
  assert(result.status === 0, `bootstrap --dry-run for ${example.name} must exit 0:\n${result.stderr}`)

  const parsed = parseJson(result.stdout)
  assert(
    parsed.status === "ok" || parsed.status === "pending-approval",
    `bootstrap --dry-run for ${example.name} must return status ok or pending-approval, got ${parsed.status}`,
  )
  const observationCount = parsed.analysis && parsed.analysis.observationCount
  assert(observationCount && observationCount > 0, `bootstrap for ${example.name} must produce observations`)

  const missionProposals = parsed.proposals && (parsed.proposals.missions || parsed.proposals.missionProposals)
  const hasMissionProposal = Array.isArray(missionProposals) && missionProposals.length > 0
  assert(hasMissionProposal, `bootstrap for ${example.name} must propose at least one Mission`)

  console.log(`✓ ${example.name} (${example.type}): ${observationCount} observation(s), ${missionProposals.length} mission proposal(s)`)
}

async function main() {
  console.log("Running brownfield validation tests...")

  for (const example of EXAMPLES) {
    await testExample(example)
  }

  console.log("\nAll brownfield validation tests passed.")
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
