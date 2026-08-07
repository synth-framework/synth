// ============================================================
// Human-Readable Governance Reports — CLI tests
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { spawnSync } from "node:child_process"
import path from "node:path"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

function runSynth(args) {
  return spawnSync("node", [CLI_PATH, ...args], {
    cwd: process.cwd(),
    encoding: "utf-8",
  })
}

function extractJsonObjects(text) {
  const objects = []
  let start = -1
  let depth = 0
  let inString = false
  let escape = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escape) {
        escape = false
      } else if (ch === "\\") {
        escape = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }
    if (ch === '"') {
      inString = true
    } else if (ch === "{") {
      if (depth === 0) start = i
      depth++
    } else if (ch === "}") {
      depth--
      if (depth === 0 && start !== -1) {
        try {
          objects.push(JSON.parse(text.slice(start, i + 1)))
        } catch {
          // ignore malformed segment
        }
        start = -1
      }
    }
  }
  return objects
}

function firstJson(stdout) {
  const objects = extractJsonObjects(stdout)
  if (objects.length === 0) throw new Error(`No JSON object found in stdout: ${stdout}`)
  return objects[0]
}

function getMissionId() {
  const result = runSynth(["status"])
  assert.strictEqual(result.status, 0, result.stderr)
  const output = firstJson(result.stdout)
  assert.ok(Array.isArray(output.missions) && output.missions.length > 0, "status should list missions")
  return output.missions[0].id
}

test("synth expedition report returns ExpeditionReport", () => {
  const result = runSynth(["expedition", "report", "--id", "EXP-CLI-003"])
  assert.strictEqual(result.status, 0, result.stderr)
  const output = firstJson(result.stdout)
  assert.strictEqual(output.status, "ok")
  assert.strictEqual(output.kind, "ExpeditionReport")
  assert.strictEqual(output.expedition.id, "EXP-CLI-003")
  assert.strictEqual(output.expedition.name, "Governance Inventory List Commands")
  assert.ok(typeof output.charter.purpose === "string" && output.charter.purpose.length > 0, "should include purpose")
  assert.ok(Array.isArray(output.charter.deliverables) && output.charter.deliverables.length > 0, "should include deliverables")
  assert.ok(Array.isArray(output.charter.acceptanceCriteria) && output.charter.acceptanceCriteria.length > 0, "should include acceptance criteria")
  assert.ok(typeof output.charter.expectedOutput === "string" && output.charter.expectedOutput.length > 0, "should include expected output")
  assert.ok(Array.isArray(output.attachments), "should include attachments array")
})

test("synth expedition report --human produces prose", () => {
  const result = runSynth(["expedition", "report", "--id", "EXP-CLI-003", "--human"])
  assert.strictEqual(result.status, 0, result.stderr)
  assert.ok(!result.stdout.trim().startsWith("{"), "human mode should not start with JSON")
  assert.ok(result.stdout.includes("Expedition:"), "should include expedition header")
  assert.ok(result.stdout.includes("Purpose:"), "should include purpose section")
  assert.ok(result.stdout.includes("Definition of done"), "should include definition of done section")
  assert.ok(result.stdout.includes("Evidence:"), "should include evidence section")
})

test("synth expedition report falls back to runtime state for CLI-created expedition", () => {
  const result = runSynth(["expedition", "report", "--id", "8cea04db9fd036af"])
  assert.strictEqual(result.status, 0, result.stderr)
  const output = firstJson(result.stdout)
  assert.strictEqual(output.status, "ok")
  assert.strictEqual(output.kind, "ExpeditionReport")
  assert.strictEqual(output.expedition.id, "8cea04db9fd036af")
  assert.strictEqual(output.expedition.name, "Expedition and Mission Human-Readable Reports")
  assert.strictEqual(output.expedition.status, "completed")
  assert.ok(typeof output.charter.purpose === "string", "should include purpose from runtime goal")
  assert.ok(Array.isArray(output.attachments), "should include attachments array")
})

test("synth expedition report --human falls back to runtime state for CLI-created expedition", () => {
  const result = runSynth(["expedition", "report", "--id", "8cea04db9fd036af", "--human"])
  assert.strictEqual(result.status, 0, result.stderr)
  assert.ok(!result.stdout.trim().startsWith("{"), "human mode should not start with JSON")
  assert.ok(result.stdout.includes("Expedition:"), "should include expedition header")
  assert.ok(result.stdout.includes("Expedition and Mission Human-Readable Reports"), "should include expedition name")
  assert.ok(result.stdout.includes("Purpose:"), "should include purpose section")
  assert.ok(result.stdout.includes("Evidence:"), "should include evidence section")
})

test("synth expedition report for missing id returns ExpeditionNotFound", () => {
  const result = runSynth(["expedition", "report", "--id", "EXP-MISSING-999"])
  assert.notStrictEqual(result.status, 0, "should exit non-zero for missing expedition")
  const output = firstJson(result.stdout)
  assert.strictEqual(output.status, "error")
  assert.strictEqual(output.kind, "ExpeditionNotFound")
})

test("synth mission report returns MissionReport", () => {
  const missionId = getMissionId()
  const result = runSynth(["mission", "report", "--id", missionId])
  assert.strictEqual(result.status, 0, result.stderr)
  const output = firstJson(result.stdout)
  assert.strictEqual(output.status, "ok")
  assert.strictEqual(output.kind, "MissionReport")
  assert.strictEqual(output.mission.id, missionId)
  assert.ok(typeof output.mission.name === "string", "should include mission name")
  assert.ok(typeof output.mission.status === "string", "should include mission status")
  assert.ok(output.mission.program && typeof output.mission.program.id === "string", "should include inferred program id")
  assert.ok(typeof output.mission.program.name === "string", "should include inferred program name")
  assert.ok(Array.isArray(output.expeditions), "should include expeditions array")
})

test("synth mission report --human produces prose", () => {
  const missionId = getMissionId()
  const result = runSynth(["mission", "report", "--id", missionId, "--human"])
  assert.strictEqual(result.status, 0, result.stderr)
  assert.ok(!result.stdout.trim().startsWith("{"), "human mode should not start with JSON")
  assert.ok(result.stdout.includes("Mission:"), "should include mission header")
  assert.ok(result.stdout.includes("Program:"), "should include program section")
  assert.ok(result.stdout.includes("Expeditions:"), "should include expeditions section")
})

test("synth mission report for missing id returns MissionNotFound", () => {
  const result = runSynth(["mission", "report", "--id", "missing-mission-00000000"])
  assert.notStrictEqual(result.status, 0, "should exit non-zero for missing mission")
  const output = firstJson(result.stdout)
  assert.strictEqual(output.status, "error")
  assert.strictEqual(output.kind, "MissionNotFound")
})

test("synth report returns ProjectReport", () => {
  const result = runSynth(["report"])
  assert.strictEqual(result.status, 0, result.stderr)
  const output = firstJson(result.stdout)
  assert.strictEqual(output.status, "ok")
  assert.strictEqual(output.kind, "ProjectReport")
  assert.ok(typeof output.projectName === "string" && output.projectName.length > 0, "should include project name")
  assert.ok(typeof output.phase === "string" && output.phase.length > 0, "should include phase")
  assert.ok(typeof output.summary === "string", "should include summary")
  assert.ok(output.mission && typeof output.mission.id === "string", "should include active mission id")
  assert.ok(typeof output.mission.name === "string", "should include active mission name")
  assert.ok(typeof output.mission.status === "string", "should include active mission status")
  assert.ok(output.mission.program && typeof output.mission.program.id === "string", "should include active mission program id")
  assert.ok(typeof output.mission.program.name === "string", "should include active mission program name")
  if (output.expedition) {
    assert.ok(typeof output.expedition.id === "string", "should include executing expedition id")
    assert.ok(typeof output.expedition.name === "string", "should include executing expedition name")
    assert.ok(typeof output.expedition.status === "string", "should include executing expedition status")
  }
  assert.ok(Array.isArray(output.blockers), "should include blockers array")
  assert.ok(Array.isArray(output.nextActions), "should include nextActions array")
})

test("synth report --human produces prose", () => {
  const result = runSynth(["report", "--human"])
  assert.strictEqual(result.status, 0, result.stderr)
  assert.ok(!result.stdout.trim().startsWith("{"), "human mode should not start with JSON")
  assert.ok(result.stdout.includes("Project:"), "should include project header")
  assert.ok(result.stdout.includes("Mission:"), "should include mission section")
  assert.ok(result.stdout.includes("Program:"), "should include program section")
  assert.ok(result.stdout.includes("Next step:"), "should include next step section")
})
