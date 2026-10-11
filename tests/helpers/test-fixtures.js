import { makeTempDir } from "./workspace.js"
import { runSynth } from "./cli-harness.js"
import { assert, parseJson } from "./assert.js"
import { writeManifest } from "./state-fixtures.js"
import fs from "fs/promises"
import path from "path"

export async function makeTestDir(prefix) {
  return await makeTempDir(prefix)
}

export async function makeManifest(dir, opts = {}) {
  return writeManifest(dir, opts.projectName || "Test")
}

export async function makeEventLog(dir, rawEvents) {
  const dataDir = path.join(dir, ".synth", "data")
  await fs.mkdir(dataDir, { recursive: true })
  const { computeEventHash } = await import("../../dist/core/hash.js")
  const events = []
  let previousHash = "genesis"
  for (const raw of rawEvents) {
    const event = { ...raw, eventHash: "", previousHash }
    event.eventHash = await computeEventHash(event)
    previousHash = event.eventHash
    events.push(event)
  }
  await fs.writeFile(path.join(dataDir, "event-log.jsonl"), events.map(e => JSON.stringify(e)).join("\n"), "utf-8")
}

export function runAndParse(args, cwd) {
  const result = runSynth(args, cwd)
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

export { parseJson, assert }

/** Read and parse a JSON file. */
export async function loadJson(filePath) {
  const content = await fs.readFile(filePath, "utf-8")
  return JSON.parse(content)
}

/**
 * Assert the common shape of an evaluation payload. Callers opt into
 * stricter slices (rules, reasoning, evidence) they actually verify.
 */
export function assertEvaluationShape(evaluation, { checkRules = false, checkReasoning = false, checkEvidence = false } = {}) {
  assert.ok(evaluation, "Evaluation payload should exist")
  assert.ok(["aligned", "revision_required", "rejected"].includes(evaluation.decision), `Unexpected decision: ${evaluation.decision}`)
  assert.equal(typeof evaluation.confidence, "number", "Confidence should be a number")
  assert.ok(evaluation.confidence >= 0 && evaluation.confidence <= 1, "Confidence should be in [0, 1]")
  if (checkRules) {
    assert.ok(Array.isArray(evaluation.matchedRules), "matchedRules should be an array")
    assert.ok(Array.isArray(evaluation.violatedRules), "violatedRules should be an array")
  }
  assert.ok(Array.isArray(evaluation.matchedDriftClasses), "matchedDriftClasses should be an array")
  if (checkEvidence) {
    assert.ok(evaluation.evidence, "Evidence trace should exist")
    assert.equal(typeof evaluation.evidence.summary, "string", "Evidence summary should be a string")
  }
  if (checkReasoning) {
    assert.ok(Array.isArray(evaluation.reasoning), "reasoning should be an array")
    assert.ok(evaluation.reasoning.length > 0, "reasoning should not be empty")
  }
}