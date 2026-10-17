// Synthetic guided-journey source evidence: read-only excerpts, not inferred decisions.
// This is intentionally separate from the older onboarding suite's symlinked-bin failure.
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { assert } from "./helpers/assert.js"
import { parseJson, runSynth, withTempDir } from "./helpers/cli-harness.js"

const preview = (cwd) => {
  const result = runSynth(["first-contact", "--dry-run"], cwd)
  assert(result.status === 0, `preview failed: ${result.stdout}\n${result.stderr}`)
  return parseJson(result.stdout).sourceHandoff
}

await withTempDir("synth-guided-green-", async (cwd) => {
  const handoff = preview(cwd)
  assert(handoff.files.length === 0 && handoff.excerpts.length === 0, "an empty workspace has no source evidence")
  assert((await fs.readdir(cwd)).length === 0, "preview must not write files")
  const start = runSynth(["first-contact", "start", "Build an editable SVG specimen-board utility"], cwd)
  assert(start.status === 0, `greenfield idea should start: ${start.stderr}`)
  const clarify = parseJson(runSynth(["first-contact", "clarify"], cwd).stdout)
  assert(clarify.sourceHandoff.excerpts.length === 0 && clarify.sourceReviewStatus === "no-sources", "greenfield must not invent repository facts")
  assert(clarify.questions.length > 0, "idea still needs clarification")
  assert(clarify.nextStep === "synth first-contact clarify --source-offer <file>", `fresh journey clarify nextStep should point to source-offer, got ${clarify.nextStep}`)
})

await withTempDir("synth-guided-brown-", async (cwd) => {
  await fs.mkdir(path.join(cwd, "src"))
  await fs.mkdir(path.join(cwd, "tests"))
  const code = "export function renderPrimitive(label) { return `<text>${label}</text>` }\n"
  await fs.writeFile(path.join(cwd, "src", "board.js"), code)
  await fs.writeFile(path.join(cwd, "tests", "board.test.js"), "// Test the current renderer\n")
  const evidence = preview(cwd)
  const snippet = evidence.excerpts.find((e) => e.path === "src/board.js")
  assert(snippet?.lines[0]?.number === 1 && snippet.lines[0].text === code.trim(), "brownfield preview must quote the actual renderer with a line reference")
  assert(evidence.sourceStatus === "not-ingested", "quoted code is not an agreed requirement")
  const start = runSynth(["first-contact", "start", "Improve the existing SVG utility without replacing the renderer"], cwd)
  assert(start.status === 0, `start failed: ${start.stderr}`)
  const clarify = runSynth(["first-contact", "clarify"], cwd)
  assert(clarify.status === 0, `clarify failed: ${clarify.stderr}`)
  const response = parseJson(clarify.stdout)
  assert(response.sourceHandoff.excerpts.some((e) => e.path === "src/board.js"), "clarification must carry the same live source references to the agent")
  assert(response.sourceHandoff.sourceStatus === "not-ingested", "clarification must not pretend the sources were interpreted")
  assert(response.sourceReviewStatus === "unreviewed", "quoted source code remains subject to review")
  assert(await fs.readFile(path.join(cwd, "src", "board.js"), "utf8") === code, "source inspection cannot rewrite code")
})

await withTempDir("synth-guided-docs-", async (cwd) => {
  await fs.mkdir(path.join(cwd, "docs"))
  await fs.mkdir(path.join(cwd, "knowledge"))
  await fs.writeFile(path.join(cwd, "docs", "00-hosting.md"), "# Hosting\nSource files must stay local-only.\n")
  await fs.writeFile(path.join(cwd, "knowledge", "collaboration.md"), "# Collaboration\nEditors must share boards via cloud sync.\n")
  for (let i = 0; i < 10; i++) await fs.writeFile(path.join(cwd, "docs", `extra-${i}.md`), "# More source material\n")
  const evidence = preview(cwd)
  assert(evidence.selectionRequired, "two populated roots require an explicit source choice")
  assert(evidence.excerpts.length === 8 && evidence.excerptLimitReached, "evidence quotes are capped and declare omitted excerpts")
  const docs = evidence.excerpts.find((e) => e.path === "docs/00-hosting.md")
  const knowledge = evidence.excerpts.find((e) => e.path === "knowledge/collaboration.md")
  assert(docs?.lines.some((l) => l.text.includes("local-only")), "cite the local-only statement")
  assert(knowledge?.lines.some((l) => l.text.includes("cloud sync")), "cite the cloud statement")
  assert(evidence.sourceStatus === "not-ingested", "quoted conflict is not a resolved choice")
  const start = runSynth(["first-contact", "start", "Make editable specimen boards"], cwd)
  assert(start.status === 0, `start failed: ${start.stderr}`)
  const clarify = parseJson(runSynth(["first-contact", "clarify"], cwd).stdout)
  assert(clarify.sourceHandoff.selectionRequired, "clarify must not silently pick a root")
  assert(clarify.sourceReviewStatus === "unreviewed" && clarify.nextStep.includes("choose the intended sources"), "conflicting roots must not imply agreement")
  assert(clarify.sourceHandoff.excerpts.some((e) => e.path === "knowledge/collaboration.md"), "clarify must make conflicting evidence visible")
  assert(!JSON.stringify(clarify).includes("conflict resolved"), "do not invent a human choice")
  const answer = parseJson(runSynth(["first-contact", "clarify", "--field", clarify.questions[0].field, "--answer", "synthetic operator response"], cwd).stdout)
  assert(answer.sourceReviewStatus === "unreviewed" && answer.nextStep.includes("choose the intended sources"), "answering a generic field must not resolve source selection")
})

await withTempDir("synth-guided-unreadable-", async (cwd) => {
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "synth-guided-secret-"))
  try {
    await fs.mkdir(path.join(cwd, "knowledge"))
    await fs.writeFile(path.join(outside, "secret.md"), "SECRET_OUTSIDE_WORKSPACE\n")
    await fs.symlink(path.join(outside, "secret.md"), path.join(cwd, "knowledge", "link.md"))
    await fs.writeFile(path.join(cwd, "knowledge", "unparsed.pdf"), "UNSUPPORTED_CONTENT")
    await fs.writeFile(path.join(cwd, "knowledge", "large.md"), `# Long\n${"x".repeat(12000)}\n`)
    const evidence = preview(cwd)
    assert(!JSON.stringify(evidence).includes("SECRET_OUTSIDE_WORKSPACE"), "never follow source symlinks outside the workspace")
    assert(evidence.excerpts.some((e) => e.path === "knowledge/large.md" && e.truncated), "oversized excerpts must admit truncation")
    assert(evidence.warnings.some((w) => w.includes("link.md")), "skipped symlinks must be visible")
    assert(evidence.warnings.some((w) => w.includes("unparsed.pdf")), "unsupported intended sources must be visible")
  } finally {
    await fs.rm(outside, { recursive: true, force: true })
  }
})

await withTempDir("synth-guided-unsupported-", async (cwd) => {
  await fs.mkdir(path.join(cwd, "knowledge"))
  await fs.writeFile(path.join(cwd, "knowledge", "requirements.pdf"), "Unsupported fixture")
  const result = parseJson(runSynth(["first-contact", "--dry-run"], cwd).stdout)
  assert(result.sourceHandoff.files.length === 0, "an unsupported source must not be counted as scanned")
  assert(result.sourceHandoff.warnings.some((w) => w.includes("requirements.pdf")), "name the unsupported input")
  assert(result.sourceHandoff.warnings.some((w) => w.includes("no supported readable sources")), "missing intended sources should be actionable")
  assert(result.nextStep.includes("Review source warnings"), "do not suggest approval of an unread source")
})

await withTempDir("synth-guided-binary-", async (cwd) => {
  await fs.mkdir(path.join(cwd, "knowledge"))
  await fs.writeFile(path.join(cwd, "knowledge", "binary.md"), Buffer.from([0, 1, 2]))
  const result = parseJson(runSynth(["first-contact", "--dry-run"], cwd).stdout)
  assert(result.sourceHandoff.excerpts.length === 0, "a binary file with a text extension is not a quotation")
  assert(result.sourceHandoff.warnings.some((w) => w.includes("binary content")), "binary input must be reported")
  assert(!result.sourceHandoff.nextSteps.some((s) => s.includes("docs generate")), "do not recommend generating from an unread binary source")
  assert(result.nextStep.includes("Review source warnings"), "ask for readable source evidence instead")
})

console.log("[PASS] guided source excerpts: greenfield, brownfield, competing docs, bounded/unsafe input")
