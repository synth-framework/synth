import { makeTempDir } from "./workspace.js"
import { runSynth } from "./cli-harness.js"
import { assert, parseJson } from "./assert.js"
import fs from "fs/promises"
import path from "path"

export async function makeTestDir(prefix) {
  return await makeTempDir(prefix)
}

export async function makeManifest(dir, opts = {}) {
  const synthDir = path.join(dir, ".synth")
  await fs.mkdir(synthDir, { recursive: true })
  const manifest = {
    schema: "synth-bootstrap-manifest-v1",
    version: "2.0.0",
    projectName: opts.projectName || "Test",
    root: dir,
    generatedAt: new Date().toISOString(),
    bootstrapped: true,
    commands: [{ name: "status", description: "Report state" }],
    capabilities: [],
    layout: { data: ".synth/data/" },
    publicVocabulary: ["Mission", "Expedition", "Replay"],
  }
  await fs.writeFile(path.join(synthDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8")
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