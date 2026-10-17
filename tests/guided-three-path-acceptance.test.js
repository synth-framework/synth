// Proposed Expedition 1: red-first, synthetic path-specific acceptance.
// These tests do not authenticate an owner answer, start a runtime Expedition,
// or exercise the separately authorized SVG-board pilot.
import test from "node:test"
import fs from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"
import { spawnSync } from "node:child_process"
import { strict as assert } from "node:assert"
import { runSynth, parseJson, withTempDir } from "./helpers/cli-harness.js"

function call(cwd, ...args) {
  const result = runSynth(["first-contact", ...args], cwd)
  assert.equal(result.status, 0, `${args.join(" ")}: ${result.stdout}\n${result.stderr}`)
  return parseJson(result.stdout)
}
async function offer(cwd, proposal) {
  await fs.writeFile(path.join(cwd, "offer.json"), JSON.stringify(proposal))
  return call(cwd, "clarify", "--source-offer", "offer.json").offer
}
const option = (id, source, label = id) => ({ id, label, tradeoff: `Trade-off for ${id}`, acceptanceExample: `Observe ${id}`, source })

await test("greenfield: attribute the original idea, not an invented file citation", async () => withTempDir("synth-three-green-", async cwd => {
  const dryRun = call(cwd, "--dry-run")
  assert.match(dryRun.nextStep, /first-contact start .*clarify --source-offer/)
  assert.doesNotMatch(dryRun.nextStep, /--approve/)
  const idea = "Build a small editable specimen-board tool; source format still undecided"
  call(cwd, "start", idea)
  const initial = call(cwd, "clarify")
  assert.equal(initial.sourceHandoff.files.length, 0)
  assert.equal(initial.nextStep, "synth first-contact clarify --source-offer <file>")
  const proposal = { scope: "First input slice", question: "What should the first board take as input?", options: [
    option("drop", { kind: "operator-intent", quote: idea }, "Parse a dropped source file"),
    option("manual", { kind: "operator-intent", quote: idea }, "Start with manual entries"),
  ] }
  const forged = structuredClone(proposal)
  forged.options[0].source.quote = "An invented user request"
  await fs.writeFile(path.join(cwd, "offer.json"), JSON.stringify(forged))
  const rejected = runSynth(["first-contact", "clarify", "--source-offer", "offer.json"], cwd)
  assert.notEqual(rejected.status, 0)
  assert.match(rejected.stdout, /exact original request/)
  const offered = await offer(cwd, proposal)
  assert.equal(offered.options[0].source.kind, "operator-intent")
  assert.equal(offered.options[0].source.quote, idea)
  assert.equal(offered.options[0].source.path, undefined)
  assert.equal(offered.options[0].source.sha256, crypto.createHash("sha256").update(idea).digest("hex"))
  const afterOfferStatus = call(cwd, "status")
  assert.equal(afterOfferStatus.workingBrief.status, "awaiting-response")
  assert.doesNotMatch(afterOfferStatus.nextStep, /\bsynth\b|(?:^|[\s`"'])(?:--approve|--selection|--human-response|-approve|materialize|mission\s+(?:build|approve|start)|expedition\s+(?:start|complete)|deliver|seal|git\s+push)(?=$|[\s`"',;])/i)
  assert.equal(afterOfferStatus.sourceOffers.length, 1, "a misattributed idea writes no offer")
}))

await test("brownfield: executable baseline, code/test citations, bounded offer and no rewrite", async t => withTempDir("synth-three-brown-", async cwd => {
  await fs.mkdir(path.join(cwd, "src"))
  await fs.mkdir(path.join(cwd, "tests"))
  const code = "export const renderPrimitive = label => `<text>${label}</text>`;\n"
  const check = "import test from 'node:test';\nimport { strict as assert } from 'node:assert';\nimport { renderPrimitive } from '../src/board.js';\ntest('existing label', () => assert.equal(renderPrimitive('A'), '<text>A</text>'));\n"
  await fs.writeFile(path.join(cwd, "package.json"), JSON.stringify({ type: "module", scripts: { test: "node --test tests/board.test.js" } }))
  await fs.writeFile(path.join(cwd, "src/board.js"), code)
  await fs.writeFile(path.join(cwd, "tests/board.test.js"), check)
  // Nested node --test inherits the outer runner's NODE_TEST_CONTEXT unless
  // explicitly removed, which suppresses its TAP output even on exit 0.
  const { NODE_TEST_CONTEXT: _outerTestContext, ...appEnv } = process.env
  const baseline = spawnSync(process.execPath, ["--test", "tests/board.test.js"], { cwd, encoding: "utf8", env: appEnv })
  assert.equal(baseline.status, 0, baseline.stderr)
  assert.match(baseline.stdout, /# pass 1/)
  const fixtureRevision = crypto.createHash("sha256").update(code + check).digest("hex")
  assert.match(fixtureRevision, /^[a-f0-9]{64}$/)
  t.diagnostic(`app baseline: node --test tests/board.test.js; exit=${baseline.status}; pass=1 fail=0; fixture source+test sha256=${fixtureRevision}`)
  const preview = call(cwd, "--dry-run").sourceHandoff
  assert(preview.excerpts.some(x => x.path === "src/board.js"))
  assert(preview.excerpts.some(x => x.path === "tests/board.test.js"))
  call(cwd, "start", "Keep the working SVG label renderer and consider editable attributes")
  const offered = await offer(cwd, { scope: "Only extend the renderer", question: "How should the first editable attribute be represented?", options: [
    option("preserve", { path: "src/board.js", line: 1, quote: code.trim() }, "Preserve rendering, add an attribute input"),
    option("test-first", { path: "tests/board.test.js", line: 4, quote: check.split("\n")[3] }, "Add a failing attribute example first"),
  ] })
  assert.equal(offered.options[0].source.path, "src/board.js")
  assert.equal(offered.options[1].source.path, "tests/board.test.js")
  assert.equal(call(cwd, "status").workingBrief.status, "awaiting-response")
  assert.equal(await fs.readFile(path.join(cwd, "src/board.js"), "utf8"), code)
  assert.equal(await fs.readFile(path.join(cwd, "tests/board.test.js"), "utf8"), check)
  await fs.writeFile(path.join(cwd, "src/board.js"), code.replace("<text>", "<label>"))
  assert.equal(call(cwd, "status").workingBrief.sourceFreshness, "stale")
  const response = runSynth(["first-contact", "clarify", "--source-answer", offered.id,
    "--selection", "preserve", "--human-response", "Unverified test response"], cwd)
  assert.notEqual(response.status, 0, "a stale source cannot be answered")
  assert.equal(call(cwd, "status").sourceAnswers.length, 0)
  await fs.writeFile(path.join(cwd, "src/board.js"), code)
  assert.equal(call(cwd, "status").workingBrief.sourceFreshness, "current")
  // Offer-only fixture: source tampering was restored after the freshness check.
  // Baseline command/exit/revision are recorded here; no application feature
  // delta or post-change app-test pass is claimed.
}))

await test("documentation-led: separate docs-only and knowledge-only offers, explicit routing", async t => {
  for (const root of ["docs", "knowledge"]) await t.test(root, async () => withTempDir(`synth-three-${root}-`, async cwd => {
    await fs.mkdir(path.join(cwd, root))
    await fs.writeFile(path.join(cwd, root, "requirements.md"), "# Board\nA board must export one SVG.\n")
    const handoff = call(cwd, "--dry-run").sourceHandoff
    assert.equal(handoff.selectionRequired, false)
    assert(handoff.nextSteps.includes(`synth docs generate --knowledge-base ./${root}`))
    call(cwd, "start", "Make a board exporter using the supplied notes")
    const source = { path: `${root}/requirements.md`, line: 2, quote: "A board must export one SVG." }
    const offered = await offer(cwd, { scope: "First export", question: "Which export behavior should we validate first?", options: [
      option("single", source, "One SVG"), option("batch-later", source, "One now, batch later"),
    ] })
    assert.equal(offered.options[0].source.path, source.path)
    assert.equal(call(cwd, "status").workingBrief.status, "awaiting-response")
  }))
})

await test("conflicting documents: both cited, no inferred resolution", async () => withTempDir("synth-three-conflict-", async cwd => {
  await fs.mkdir(path.join(cwd, "docs"))
  await fs.mkdir(path.join(cwd, "knowledge"))
  await fs.writeFile(path.join(cwd, "docs", "scope.md"), "Boards must remain local-only.\n")
  await fs.writeFile(path.join(cwd, "knowledge", "scope.md"), "Boards must support cloud sync.\n")
  call(cwd, "start", "Help decide the export approach")
  assert.equal(call(cwd, "clarify").sourceHandoff.selectionRequired, true)
  const offered = await offer(cwd, { scope: "Export", question: "Local-only or cloud sync?", options: [
    option("local", { path: "docs/scope.md", line: 1, quote: "Boards must remain local-only." }),
    option("sync", { path: "knowledge/scope.md", line: 1, quote: "Boards must support cloud sync." }),
  ] })
  assert.equal(offered.options.length, 2)
  assert.equal(call(cwd, "status").workingBrief.status, "awaiting-response")
  assert.equal(call(cwd, "status").sourceAnswers.length, 0)
}))

await test("unsupported code under conventional roots: warn before proposing discovery", async () => withTempDir("synth-three-python-", async cwd => {
  await fs.mkdir(path.join(cwd, "src"))
  await fs.writeFile(path.join(cwd, "src", "main.py"), "print('source exists')\n")
  const handoff = call(cwd, "--dry-run").sourceHandoff
  assert.equal(handoff.files.length, 0)
  assert(handoff.warnings.some(w => w.includes("src/main.py") && w.includes("partial")))
  assert(handoff.nextSteps.includes("synth discover . --export"))
}))

await test("nonconventional root layout: report partial coverage, never an empty project", async () => withTempDir("synth-three-root-", async cwd => {
  await fs.mkdir(path.join(cwd, "app"))
  await fs.writeFile(path.join(cwd, "app", "main.py"), "def render(label): return f'<text>{label}</text>'\n")
  await fs.writeFile(path.join(cwd, "pyproject.toml"), "[project]\nname='board'\n")
  const handoff = call(cwd, "--dry-run").sourceHandoff
  assert.equal(handoff.files.length, 0, "current bounded preview must not pretend Python files were read")
  assert(handoff.warnings.some(w => w.includes("app/") || w.includes("pyproject.toml")), "name unseen root inputs as partial coverage")
  assert(handoff.nextSteps.includes("synth discover . --export"), "hand off unknown layout for broader discovery")
}))
