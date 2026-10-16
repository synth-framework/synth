// ============================================================
// SYNTH — guided-journey trial evidence capture tests
// ============================================================
// The capture script is the only supported way to turn a finished TEST_PATH into
// filed evidence. These tests run it end to end against synthetic workspaces and
// assert the properties the operator depends on: byte-for-byte raw copies, revisions
// recomputed against the frozen record, citation hashes re-checked with the CLI's
// rule, the launch line taken from the setup manifest, operator-only rows left as
// placeholders, no invented human words, nothing written into TEST_PATH, and a
// rendered document whose own relative links resolve.
// ============================================================

import test from "node:test"
import { strict as assert } from "node:assert"
import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"

const REPO_ROOT = process.cwd()
const SCRIPT = path.resolve(REPO_ROOT, "scripts", "guided-installed-trial-evidence.mjs")
const SETUP_SCRIPT = path.resolve(REPO_ROOT, "scripts", "guided-installed-trial-setup.mjs")
const LIB = path.resolve(REPO_ROOT, "scripts", "lib", "guided-trial-fixtures.mjs")

const sha256 = (value) => createHash("sha256").update(value).digest("hex")
const tempPath = (prefix) => path.join(os.tmpdir(), `${prefix}-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`)

const runScript = (args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf-8", cwd: REPO_ROOT, timeout: 60000 })
const loadLib = () => import(pathToFileURL(LIB).href)
const loadSetup = () => import(pathToFileURL(SETUP_SCRIPT).href)

async function makeRepo() {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "trial-evidence-repo-"))
  // The documents a rendered evidence file links to, so the link assertion below
  // checks the renderer's own relative paths rather than the real repository.
  await writeTree(repo, {
    "docs/analysis/guided-three-path-installed-trial-evidence-template.md": "# template\n",
    "docs/analysis/guided-three-path-matched-comparison.md": "# comparison\n",
    "docs/plans/guided-installed-cli-trial-instructions.md": "# runbook\n",
  })
  return repo
}

async function writeTree(root, files) {
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, relative)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, content)
  }
}

async function inventory(root) {
  const rows = []
  const walk = async (dir) => {
    for (const entry of (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else rows.push(`${path.relative(root, full)}:${sha256(await fs.readFile(full))}`)
    }
  }
  await walk(root)
  return rows
}

/** A synthetic staging directory shaped exactly like the one setup leaves behind. */
async function makeStaging({ tarballSha = "a".repeat(64), dirty = false, inputs = null } = {}) {
  const staging = await fs.mkdtemp(path.join(os.tmpdir(), "trial-evidence-staging-"))
  await writeTree(staging, {
    "cli-manifest.json": `${JSON.stringify({
      status: "cli-installed",
      testedRevision: { commit: "917d662a31bd176293c7696bec02f468c8bcbc4f", branch: "arena/f3c711cb-synth", subject: "Keep the check counts current in the trial docs", workingTreeDirty: dirty },
      installedCli: { bin: path.join(staging, "global", "synth.cmd"), tarball: path.join(staging, "pack", "synth-framework-synth-2.6.1.tgz"), tarballSha256: tarballSha, version: { status: "ok", version: "2.6.1", schema: "synth-cli-v1" } },
      trialTestsRun: 0,
    }, null, 2)}\n`,
    "transcripts/tarball.sha256": `${tarballSha}  ${path.join(staging, "pack", "synth-framework-synth-2.6.1.tgz")}\n`,
    "transcripts/version.json": `${JSON.stringify({ status: "ok", version: "2.6.1", schema: "synth-cli-v1" })}\n`,
    "transcripts/setup.log": "$ npm run build\n> synth@2.6.1 build\n",
    "transcripts/setup-manifest.json": `${JSON.stringify({
      status: "setup-complete-stop-before-agent",
      condition: "guided",
      testedRevision: { commit: "917d662a31bd176293c7696bec02f468c8bcbc4f", branch: "arena/f3c711cb-synth", subject: "Keep the check counts current in the trial docs", workingTreeDirty: dirty },
      ...(inputs ? { inputs } : {}),
      revisions: {},
      launchInstruction: "RECORDED LAUNCH LINE: this trial uses SYNTH, installed here as `synth`.",
      trialTestsRun: 0,
    }, null, 2)}\n`,
  })
  return staging
}

/**
 * A synthetic finished TEST_PATH. Only the inputs come from the frozen fixtures;
 * the report, offer and CLI state are shaped like the real ones, including an
 * offer file that omits the hashes the CLI adds to its own recorded copy, one
 * correct citation hash and one deliberately wrong one.
 */
async function makeWorkspace({ condition = "guided", cases = ["green", "brown"], staging = null, tamper = null, reportExtra = "", omitInputs = [], environmentWorkspace = null, offerShape = "guided", reportShape = "labelled" } = {}) {
  const lib = await loadLib()
  const setup = await loadSetup()
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), `trial-evidence-ws-${condition}-`))
  const files = {}
  const testDirs = cases.map((caseId) => setup.TEST_DIRS[caseId])

  for (const caseId of cases) {
    const dirName = setup.TEST_DIRS[caseId]
    for (const [relative, content] of Object.entries(lib.FIXTURES[caseId])) {
      if (omitInputs.includes(caseId)) continue
      files[`${dirName}/${relative}`] = relative === tamper?.path && caseId === tamper.case ? tamper.content : content
    }
    const quote = caseId === "brown" ? "export const render = label => `<text>${label}</text>`;" : null
    const recorded = {
      id: `offer-11111111-2222-3333-4444-55555555555${caseId === "brown" ? "0" : "1"}`,
      journeyId: `journey-${caseId}`,
      version: 1,
      scope: `scope for ${caseId}`,
      question: `question for ${caseId}?`,
      options: quote
        ? [
          { id: "first-option", label: "First option", tradeoff: "t", acceptanceExample: "a", source: { path: "src/board.js", line: 1, quote, sha256: sha256(lib.FIXTURES.brown["src/board.js"]) } },
          { id: "second-option", label: "Second option", tradeoff: "t", acceptanceExample: "a", source: { path: "docs/limitation.md", line: 1, quote: lib.FIXTURES.brown["docs/limitation.md"].trim(), sha256: "0".repeat(64) } },
        ]
        : [{ id: "intent-option", label: "Intent option", tradeoff: "t", acceptanceExample: "a", source: { kind: "operator-intent", quote: lib.TASKS[caseId], sha256: sha256(lib.TASKS[caseId]) } }],
      originIntent: lib.TASKS[caseId],
      offeredAt: "2026-10-15T10:00:00.000Z",
      attribution: "agent-authored-offer",
    }
    const agentOffer = {
      scope: recorded.scope,
      question: recorded.question,
      options: recorded.options.map((option) => ({
        id: option.id,
        label: option.label,
        tradeoff: option.tradeoff,
        acceptanceExample: option.acceptanceExample,
        source: Object.fromEntries(Object.entries(option.source).filter(([key]) => key !== "sha256")),
      })),
    }
    files[`${dirName}/REPORT.md`] = [
      `TEST: ${caseId} (${dirName}/)`,
      "COMMANDS: each run inside the directory",
      `- \`synth first-contact --dry-run\` -> exit 0${reportExtra}`,
      "CLI OUTPUT: what SYNTH showed at each step",
      "- final status: state draft, workingBrief status awaiting-response",
      "OFFER: path to offer.json",
      `- Path: ${dirName}/offer.json`,
      "CITATIONS: each citation and whether it matched",
      "- matched the live line",
      "APPLICATION TESTS: command, exit code and result",
      "- `npm test` -> exit 0, 1 pass",
      "ASSUMPTIONS: assumed nothing",
      "- none",
      "STILL OPEN: decisions left to a person",
      "- the offer question",
      "PROBLEMS: the CLI refused a malformed offer once",
      "- schema error, recorded",
      "EFFORT: rough elapsed time for this test",
      "- ~9 minutes.",
      "",
    ].join("\n")
    if (reportShape === "markdown") {
      files[`${dirName}/REPORT.md`] = [
        `# Trial report for ${dirName}`,
        "",
        "## Commands",
        "",
        `- \`synth first-contact --dry-run\` -> exit 0`,
        "",
        "## What I assumed",
        "",
        "- nothing beyond the task text",
        "",
        "## Still open",
        "",
        "- the offer question",
        "",
      ].join("\n")
    } else if (reportShape === "prose") {
      files[`${dirName}/REPORT.md`] = `I read the directory, which was empty, and wrote offer.json with one question and three options.\n\nNo commands were needed. Everything is still open.\n`
    }
    // The plain instruction set asks for `offer.json` "in whatever shape you
    // consider clear", so a plain offer is written the way a real one came back.
    const looseOffer = {
      case_id: caseId,
      directory: `${dirName}/`,
      proposed_scope: `scope for ${caseId}`,
      question: `question for ${caseId}?`,
      task_text: lib.TASKS[caseId],
      options: [{
        label: "Option A",
        description: "description",
        tradeoff: "tradeoff",
        shows_it_works: "an acceptance example",
        grounded_in: caseId === "brown"
          ? [
            { path: "src/board.js", line: 1, quote: lib.FIXTURES.brown["src/board.js"].split(/\r?\n/)[0] },
            // A free shape may name the same fields differently; the aliases must read.
            { file: "tests/board.test.js", lineNumber: 4, snippet: lib.FIXTURES.brown["tests/board.test.js"].split(/\r?\n/)[3] },
            { path: "docs/limitation.md", line: 1, quote: "a line that is not in the staged file" },
          ]
          : [
            { source: "task_text", quote: lib.TASKS[caseId] },
            { source: "task_text", quote: "a quote that is not this case's task text" },
          ],
      }],
    }
    files[`${dirName}/offer.json`] = `${JSON.stringify(offerShape === "loose-plain" ? looseOffer : agentOffer, null, 2)}\n`
    // A plain run leaves no CLI state at all: no .synth, no transcript, no errors.
    if (condition === "guided") files[`${dirName}/.synth/first-contact/draft.json`] = `${JSON.stringify({
      schema: "synth-first-contact-draft-v1",
      status: "draft",
      journeyId: recorded.journeyId,
      openAgentChoices: [],
      choiceReviews: [],
      sourceOffers: [recorded],
      sourceAnswers: [],
      updatedAt: "2026-10-15T10:00:01.000Z",
    }, null, 2)}\n`
    if (condition === "guided") files[`${dirName}/.synth/first-contact/transcript.jsonl`] = `${[
      JSON.stringify({ turn: 1, actor: "operator", type: "input", content: lib.TASKS[caseId], timestamp: "2026-10-15T09:59:00.000Z" }),
      JSON.stringify({ turn: 2, actor: "agent", type: "proposal", content: `Source offer ${recorded.id}: ${recorded.question}`, timestamp: "2026-10-15T10:00:00.000Z" }),
    ].join("\n")}\n`
    if (condition === "guided") files[`${dirName}/.synth/data/cli-errors.jsonl`] = `${JSON.stringify({ timestamp: "2026-10-15T09:59:30.000Z", kind: "CLIError", error: "Source offer was not recorded: option id must be nonempty text", exitCode: 1 })}\n`
  }

  files["INSTRUCTIONS.md"] = condition === "guided"
    ? "# Trial instruction set — guided condition\n\n**You are using SYNTH.** An operator installed it.\n"
    : "# Trial instruction set\n\nFollow these steps with the tools you have.\n"
  if (condition === "guided") {
    files["ENVIRONMENT.md"] = setup.renderEnvironment({
      workspace: environmentWorkspace ?? workspace,
      testDirs,
      stagingRoot: staging ?? path.join(os.tmpdir(), "no-such-staging"),
      installedCli: path.join(staging ?? "/tmp/no-such-staging", process.platform === "win32" ? "global\\synth.cmd" : "global/bin/synth"),
      manifestPath: path.join(staging ?? "/tmp/no-such-staging", "cli-manifest.json"),
      revision: { commit: "917d662a31bd176293c7696bec02f468c8bcbc4f", subject: "Keep the check counts current in the trial docs" },
    })
  }
  await writeTree(workspace, files)
  return { workspace, cases, testDirs }
}

async function capture(args) {
  const result = runScript(args)
  assert.equal(result.status, 0, `capture failed: ${result.stdout}\n${result.stderr}`)
  return result
}

/** The evidence file the run says it wrote — the default name is not the operator's job. */
function writtenEvidence(result) {
  const match = result.stdout.match(/evidence file\s+:\s+(\S+)/)
  assert.ok(match, `the capture must print the file it wrote:\n${result.stdout}`)
  return match[1]
}

// #region guards

test("help names the one input that matters and the operator-only contract", () => {
  const result = runScript(["--help"])
  assert.equal(result.status, 0)
  for (const needle of ["--workspace <dir>", "--staging <dir>", "to confirm", "never into TEST_PATH", "--dry-run"]) {
    assert(result.stdout.includes(needle), `usage must mention ${needle}`)
  }
})

test("argument guards refuse bad input before touching anything", () => {
  const cases = [
    [[], /--workspace is required/],
    [["--workspace", "relative/path"], /must be an absolute path/],
    [["--workspace", "/tmp", "--condition", "sideways"], /--condition must be guided or plain/],
    [["--workspace", "/tmp", "--date", "yesterday"], /--date must be yyyy-mm-dd/],
    [["--workspace", "/tmp", "--nope", "1"], /Unknown argument: --nope/],
    [["--workspace", path.join(REPO_ROOT, "docs")], /must live outside the checkout/],
  ]
  for (const [args, pattern] of cases) {
    const result = runScript(args)
    assert.notEqual(result.status, 0, `expected a refusal for ${args.join(" ")}`)
    assert(pattern.test(result.stderr), `expected ${pattern} for ${args.join(" ")} — got ${result.stderr}`)
  }
})

test("a missing TEST_PATH and a contradicting --condition are refused", async () => {
  const repo = await makeRepo()
  try {
    const missing = runScript(["--workspace", tempPath("trial-absent-"), "--repo", repo])
    assert.notEqual(missing.status, 0)
    assert(/does not exist or is not a directory/.test(missing.stderr), missing.stderr)
    const { workspace } = await makeWorkspace({ condition: "guided", cases: ["green"] })
    const contradicting = runScript(["--workspace", workspace, "--repo", repo, "--condition", "plain"])
    assert.notEqual(contradicting.status, 0)
    assert(/contradicts the layout/.test(contradicting.stderr), contradicting.stderr)
    await fs.rm(workspace, { recursive: true, force: true })
  } finally {
    await fs.rm(repo, { recursive: true, force: true })
  }
})

// #endregion guards

// #region capture

test("a matched captured workspace files byte-identical raw copies and a resolving document", async () => {
  const repo = await makeRepo()
  const staging = await makeStaging()
  const { workspace } = await makeWorkspace({ condition: "guided", cases: ["green", "brown"], staging, reportExtra: " — see [the offer](missing.md) for detail" })
  const before = await inventory(workspace)
  try {
    const result = await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15", "--json"])
    const out = path.join(repo, writtenEvidence(result))
    const raw = `${out.replace(/\.md$/, "")}-raw`
    const doc = await fs.readFile(out, "utf-8")

    // Raw copies are byte-for-byte, including the report that had to change suffix.
    const sources = JSON.parse(await fs.readFile(path.join(raw, "SOURCES.json"), "utf-8"))
    const report = sources.sources.find((entry) => entry.bundlePath === "brownfield/REPORT.md.txt")
    assert(report, "the report copy must be listed in SOURCES.json")
    assert.equal(report.sha256, sha256(await fs.readFile(path.join(workspace, "brownfield", "REPORT.md"))), "the copied report must keep its digest")
    assert.equal(sha256(await fs.readFile(path.join(raw, "brownfield", "REPORT.md.txt"))), report.sha256, "the copied bytes must match the recorded digest")
    assert.equal(await fs.readFile(path.join(raw, "brownfield", "offer.json"), "utf-8"), await fs.readFile(path.join(workspace, "brownfield", "offer.json"), "utf-8"), "the offer copy must be verbatim")
    assert(await fs.stat(path.join(raw, "brownfield", "synth-state", "first-contact", "transcript.jsonl")), "CLI-stored state must be copied")
    assert(await fs.stat(path.join(raw, "brownfield", "synth-state", "data", "cli-errors.jsonl")), "every CLI-stored data file must be copied")
    assert(await fs.stat(path.join(raw, "INSTRUCTIONS.md.txt")), "the staged instruction set must be copied")
    assert(await fs.stat(path.join(raw, "ENVIRONMENT.md.txt")), "the guided environment note must be copied")
    assert(await fs.stat(path.join(raw, "staging", "transcripts", "setup-manifest.json")), "staging transcripts must be copied when reachable")

    // The frozen revision is recomputed, not trusted.
    const lib = await loadLib()
    assert(doc.includes(`| brownfield | \`${lib.E4_REVISIONS.brown}\` | \`${lib.E4_REVISIONS.brown}\` | yes |`), "the brownfield row must show the recomputed, matched revision")
    assert(doc.includes(`| greenfield | \`${lib.E4_REVISIONS.green}\``), "the greenfield row must be present")
    assert(doc.includes("| knowledge-led |"), "optional cases must stay visible as not captured")

    // The launch line comes from the manifest, verbatim.
    assert(doc.includes("RECORDED LAUNCH LINE: this trial uses SYNTH, installed here as `synth`."), "the recorded launch line must appear verbatim")

    // Install proof is filled from the staging directory.
    assert(doc.includes(`\`${"a".repeat(64)}\``), "the tarball digest must be read from the staging transcript")
    assert(doc.includes("setup writes this transcript only after every step succeeded"), "install exits must be reported as the scripted successes they are")

    // Citations: one recorded hash recomputes, one does not.
    assert(doc.includes("`first-option` → `src/board.js:1`: verified"), "a correct recorded hash must be reported as verified")
    assert(doc.includes("`second-option` → `docs/limitation.md:1`: NO — recomputed sha256"), "a wrong recorded hash must be reported as a mismatch")
    assert(doc.includes("`intent-option` → operator-intent"), "operator-intent citations must be checked against the journey's own request")

    // Operator-only rows stay placeholders; nothing human is invented.
    assert(doc.includes("<to confirm — operator: your name>"), "the operator name must stay a placeholder")
    assert(/Terminal state: `pass` \/ `fail` \/ `blocked` \/ `not run` — reason: <to confirm — operator/.test(doc), "the terminal state stays with the operator")
    assert(doc.includes("Human words fabricated in any cell: `none` — required; the captured CLI state holds no recorded human response"), "the no-invented-words statement must be machine-checked")
    assert(doc.includes("Recommendation for ordinary PR #347 review: <to confirm — operator:"), "the recommendation stays with the operator")

    // Quoted text cannot be read as a repository link, and every link resolves.
    const links = [...doc.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].map((match) => match[2])
    assert(links.length > 0, "the document must link the template and the runbook")
    for (const href of links) {
      const target = path.resolve(path.dirname(out), href.replace(/#.*$/, ""))
      await fs.stat(target).then(() => {}, () => assert.fail(`rendered link does not resolve: ${href}`))
    }
    assert.equal(doc.includes("](missing.md)"), false, "a quoted sentence must not survive as a live link")
    assert(doc.includes("]\\(missing.md)"), "the quoted link must survive escaped, so the raw copy stays the authority")

    // The summary is machine-readable and names the conditions it saw.
    const summary = JSON.parse(await fs.readFile(path.join(raw, "SUMMARY.json"), "utf-8"))
    assert.equal(summary.condition.resolved, "guided")
    assert.equal(summary.cases.length, 2)
    assert.equal(summary.cases.find((entry) => entry.caseId === "brown").inputs.matched, true)
    assert.equal(summary.install.tarballSha256, "a".repeat(64))

    // Every raw copy is byte-identical, and none of them keeps a .md name: the
    // repository link checker walks every .md file it can find.
    const bundleRows = (await inventory(raw)).map((row) => row.split(":")[0])
    const manifest = JSON.parse(await fs.readFile(path.join(raw, "SOURCES.json"), "utf-8"))
    const selfDescribing = new Set(["SOURCES.json", "SUMMARY.json"])
    assert.equal(bundleRows.filter((name) => !selfDescribing.has(name)).length, manifest.sources.length, "the manifest must account for every bundled copy")
    assert.equal(bundleRows.every((name) => selfDescribing.has(name) || manifest.sources.some((entry) => entry.bundlePath === name)), true, "the bundle must hold nothing the manifest does not name")
    assert.equal(bundleRows.some((name) => name.endsWith(".md")), false, "no bundled copy may keep a .md name")
    for (const entry of manifest.sources) {
      if (!entry.copied || !entry.sourcePath) continue
      assert.equal(sha256(await fs.readFile(entry.sourcePath)), entry.sha256, `${entry.bundlePath} must match its source digest`)
    }

    // TEST_PATH is never written to.
    assert.deepEqual(await inventory(workspace), before, "capture must not modify TEST_PATH")
  } finally {
    await fs.rm(repo, { recursive: true, force: true })
    await fs.rm(workspace, { recursive: true, force: true })
    await fs.rm(staging, { recursive: true, force: true })
  }
})

test("a changed input is reported as a revision mismatch, not smoothed over", async () => {
  const repo = await makeRepo()
  const { workspace } = await makeWorkspace({
    condition: "guided",
    cases: ["green", "brown"],
    tamper: { case: "brown", path: "docs/limitation.md", content: "edited by the agent during the cell\n" },
  })
  try {
    const result = await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15"])
    const doc = await fs.readFile(path.join(repo, writtenEvidence(result)), "utf-8")
    const lib = await loadLib()
    assert(doc.includes(`| brownfield | \`${lib.E4_REVISIONS.brown}\` | \`${lib.revisionFor({ ...lib.FIXTURES.brown, "docs/limitation.md": "edited by the agent during the cell\n" })}\` | NO |`), "an edited input must produce a recomputed, non-matching revision")
    assert(doc.includes("Input files whose bytes are not the frozen fixture bodies — this is starting-input drift, not fixture drift:"), "the drift must be named")
    assert(doc.includes("frozen fixture"), "the drift line must show the frozen digest for comparison")
  } finally {
    await fs.rm(repo, { recursive: true, force: true })
    await fs.rm(workspace, { recursive: true, force: true })
  }
})

test("a case whose starting inputs were not handed over is not computable, not a mismatch", async () => {
  const repo = await makeRepo()
  const { workspace } = await makeWorkspace({ omitInputs: ["brown"] })
  const out = path.join(repo, "docs", "analysis", "handoff.md")
  await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15", "--out", out])
  const doc = await fs.readFile(out, "utf-8")

  const row = doc.split("\n").find((line) => line.startsWith("| brownfield |"))
  assert.ok(row, "the brownfield row must still be rendered")
  assert.match(row, /not computable/, "an absent input set must read as not computable")
  assert.doesNotMatch(row, /\| NO \|/, "absence is not a revision mismatch and must not be presented as one")

  // The missing inputs are named, and the operator sees the capture never guessed a revision.
  assert.match(doc, /input file\(s\) missing from this capture/)
  assert.match(doc, /package\.json/)
  assert.ok(!(await fs.readdir(path.join(repo, "docs", "analysis"))).some((name) => name.endsWith(".md.tmp")), "no scratch files are left behind")
})

test("a workspace that is a copy of the staged one says so, with both paths", async () => {
  const repo = await makeRepo()
  const { workspace } = await makeWorkspace({ environmentWorkspace: "C:\\Users\\j\\Projects\\board-test" })
  const out = path.join(repo, "docs", "analysis", "copy.md")
  await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15", "--out", out])
  const doc = await fs.readFile(out, "utf-8")
  assert.match(doc, /This is a copy: the staged `ENVIRONMENT\.md` records the workspace as `C:\\Users\\j\\Projects\\board-test`/)
  assert.ok(doc.includes(workspace), "the copy path must be named too, so no reader confuses the two machines")
  const copyParagraph = doc.split("\n").find((line) => line.startsWith("This is a copy:"))
  assert.ok(copyParagraph, "the copy note must be its own paragraph")
  assert.equal(copyParagraph.includes("<to confirm"), false, "the copy note is machine-read, not an operator row")
})

test("a plain workspace gets a -plain file and no ENVIRONMENT-derived condition", async () => {
  const repo = await makeRepo()
  const { workspace } = await makeWorkspace({ condition: "plain", cases: ["green"] })
  try {
    const result = await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15"])
    assert(result.stdout.includes("condition          : plain"), result.stdout)
    const doc = await fs.readFile(path.join(repo, "docs", "analysis", "guided-installed-cli-trial-2026-10-15-plain.md"), "utf-8")
    assert(doc.includes("### greenfield / plain"), "the plain cell must be labelled plain")
    assert(doc.includes("`none — the plain condition writes nothing outside TEST_PATH`"), "the manifest row must say the plain condition writes nothing")
    assert.equal(/### greenfield \/ guided/.test(doc), false, "a plain capture must not render guided cells")
  } finally {
    await fs.rm(repo, { recursive: true, force: true })
    await fs.rm(workspace, { recursive: true, force: true })
  }
})

test("--dry-run renders without writing, and existing evidence is not clobbered without --force", async () => {
  const repo = await makeRepo()
  const { workspace } = await makeWorkspace({ condition: "guided", cases: ["green"] })
  try {
    await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15", "--dry-run"])
    const directory = path.join(repo, "docs", "analysis")
    await fs.readdir(directory).then((names) => assert.equal(names.includes("guided-installed-cli-trial-2026-10-15.md"), false), () => {})
    const first = await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15"])
    const out = path.join(repo, writtenEvidence(first))
    const original = await fs.readFile(out, "utf-8")
    // A second run of the same day names itself rather than overwriting, and says where it went.
    const second = await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15"])
    const secondPath = path.join(repo, writtenEvidence(second))
    assert.notEqual(secondPath, out, "the second capture must not write over the first")
    assert(/an evidence file for this date and revision already existed/.test(second.stdout), second.stdout)
    assert.equal(await fs.readFile(out, "utf-8"), original, "the first file must be untouched")
    // An explicit --out is the operator naming a file: that one is never clobbered unasked.
    const explicit = runScript(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15", "--out", out])
    assert.notEqual(explicit.status, 0, "an explicit --out that exists must refuse without --force")
    assert(/already exists/.test(explicit.stderr), explicit.stderr)
    await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15", "--out", out, "--force"])
    assert((await fs.readFile(out, "utf-8")).startsWith("# Installed-CLI guided-journey trial — evidence"), "the forced capture must rewrite the file")
  } finally {
    await fs.rm(repo, { recursive: true, force: true })
    await fs.rm(workspace, { recursive: true, force: true })
  }
})

test("--cases narrows the capture and --out refuses to write into TEST_PATH", async () => {
  const repo = await makeRepo()
  const { workspace } = await makeWorkspace({ condition: "guided", cases: ["green", "brown"] })
  try {
    const result = await capture(["--workspace", workspace, "--repo", repo, "--cases", "brown", "--date", "2026-10-15"])
    const doc = await fs.readFile(path.join(repo, writtenEvidence(result)), "utf-8")
    assert(doc.includes("### brownfield / guided"), "the selected case must be captured")
    assert.equal(/### greenfield \/ guided/.test(doc), false, "an unselected case must not be captured")
    const inside = runScript(["--workspace", workspace, "--repo", repo, "--out", path.join(workspace, "evidence.md")])
    assert.notEqual(inside.status, 0)
    assert(/must live inside the checkout|refusing to write evidence into TEST_PATH/.test(inside.stderr), inside.stderr)
  } finally {
    await fs.rm(repo, { recursive: true, force: true })
    await fs.rm(workspace, { recursive: true, force: true })
  }
})

test("a plain report written with markdown headings is read, not quoted wholesale", async () => {
  const repo = await makeRepo()
  const { workspace } = await makeWorkspace({ condition: "plain", cases: ["green"], reportShape: "markdown", offerShape: "loose-plain" })
  const out = path.join(repo, "docs", "analysis", "plain-markdown.md")
  await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15", "--out", out])
  const doc = await fs.readFile(out, "utf-8")
  assert.ok(doc.includes("synth first-contact --dry-run"), "the heading-style COMMANDS section must be read")
  assert.ok(doc.includes("- the offer question"), "the alias for STILL OPEN must be read")
  assert.equal(doc.includes("The whole `REPORT.md`, verbatim"), false, "a fully labelled report must not be quoted wholesale")
})

test("a plain report with no labels at all is quoted in full, and the gap says why", async () => {
  const repo = await makeRepo()
  const { workspace } = await makeWorkspace({ condition: "plain", cases: ["green"], reportShape: "prose", offerShape: "loose-plain" })
  const out = path.join(repo, "docs", "analysis", "plain-prose-report.md")
  const result = await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15", "--out", out])
  const doc = await fs.readFile(out, "utf-8")
  assert.ok(doc.includes("The whole `REPORT.md`, verbatim"), "an unlabelled report must be quoted whole")
  assert.ok(doc.includes("I read the directory, which was empty, and wrote offer.json"), "the report text must appear verbatim")
  assert.ok(doc.includes("It recognised none in this file"), "the note must say nothing was recognised")
  assert.ok(result.stdout.includes("REPORT.md is quoted in the cell"), "the printed gap must point at the quoted report instead of asking for a retype")
  assert.equal(result.stdout.includes("write it yourself"), false, "the old retype wording must be gone")
})

test("a plain capture marks the install proof not applicable and never asks for staging", async () => {
  const repo = await makeRepo()
  const { workspace } = await makeWorkspace({ condition: "plain", cases: ["green"], offerShape: "loose-plain" })
  const out = path.join(repo, "docs", "analysis", "plain-install.md")
  const result = await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15", "--out", out])
  const doc = await fs.readFile(out, "utf-8")
  assert.ok(doc.includes("not applicable — the plain condition installs nothing"), "§2 must say the plain arm installs nothing")
  assert.ok(doc.includes("(artifact mtimes in UTC — this condition records no CLI timestamps)"), "§1 must show artifact mtimes for the plain arm")
  // No setup manifest for this arm, so the timezone row stays the operator's — but the
  // mtimes themselves are the machine's, and the row says whose clock they are.
  assert.ok(doc.includes("not a clock the operator set") || doc.includes("Timezone `"), "the row must say whose clock the times came from")
  assert.equal(result.stdout.includes("--staging"), false, "the plain gap list must not ask for a scratch directory")
  assert.match(result.stdout, /citations 1\/2 verified/, "the summary must count a recomputed citation as verified and show the one that failed")
})

test("--condition that contradicts the layout is refused", async () => {
  const repo = await makeRepo()
  const { workspace } = await makeWorkspace({ condition: "plain", cases: ["green"], offerShape: "loose-plain" })
  const out = path.join(repo, "docs", "analysis", "plain-mislabelled.md")
  const result = runScript(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15", "--out", out, "--condition", "guided"])
  assert.notEqual(result.status, 0, "a declared condition that contradicts the workspace must fail")
  assert.match(result.stderr, /contradicts the layout/)
})

test("a plain offer whose grounding is prose says so instead of leaving the row empty", async () => {
  const repo = await makeRepo()
  const { workspace } = await makeWorkspace({ condition: "plain", cases: ["green"] })
  const offerPath = path.join(workspace, "greenfield", "offer.json")
  await fs.writeFile(offerPath, `${JSON.stringify({ case_id: "green", options: [{ label: "Option A", grounded_in: "I read the directory and nothing else was there." }] }, null, 2)}\n`)
  const out = path.join(repo, "docs", "analysis", "plain-prose.md")
  await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15", "--out", out])
  const doc = await fs.readFile(out, "utf-8")
  assert.ok(doc.includes("No quote-with-a-path, and no quote marked as the task text, was found in `offer.json`"), "the miss must be explained, not silent")
  assert.ok(doc.includes("its keys: `case_id`, `options`"), "the note must name the keys it did read")
})

test("a plain offer in whatever shape is re-checked line by line, without pretending a hash exists", async () => {
  const repo = await makeRepo()
  const { workspace } = await makeWorkspace({ condition: "plain", offerShape: "loose-plain" })
  const out = path.join(repo, "docs", "analysis", "plain-loose.md")
  await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15", "--out", out])
  const doc = await fs.readFile(out, "utf-8")

  // Both plain cases carry two citations, one correct and one invented.
  assert.ok(doc.includes("Re-checked here from `offer.json`"), "the capture must re-check plain grounding, not just quote it")
  assert.match(doc, /3 citation\(s\), 2 matched \(2 file line\(s\), 0 task-text quote\(s\)\), 1 did NOT/, "the brownfield grounding must be counted by kind, aliases included")
  assert.match(doc, /2 citation\(s\), 1 matched \(0 file line\(s\), 1 task-text quote\(s\)\), 1 did NOT/, "the greenfield grounding must be counted by kind")
  assert.ok(doc.includes("docs/limitation.md:1 — the staged file line reads"), "a wrong file line must be named with what the file actually reads")
  assert.ok(doc.includes("not this case's staged task text"), "a wrong task-text quote must be flagged as such")
  const noteLine = doc.split("Re-checked here from")[1].split("\n")[0]
  assert.ok(noteLine.includes("the plain condition records no citation hashes"), "the note must say plainly that no hash exists to compare")
  assert.equal(noteLine.includes("the hash the CLI recorded recomputes"), false, "the plain note must not imply a recorded hash exists")
  assert.match(doc, /in the plain condition the capture re-checked 5 grounding citation\(s\) found in the offer files, with 3 matching/, "the summary must count the plain citations it checked")

  // Nothing about the plain run is upgraded into a guided claim.
  assert.ok(doc.includes("no `ENVIRONMENT.md` (plain condition)"), "the plain condition must stay visible as such")
  assert.ok(doc.includes("<to confirm — operator: your name>"), "operator-only rows stay placeholders")
})

test("staging that cannot be reached is reported instead of guessed", async () => {
  const repo = await makeRepo()
  const { workspace } = await makeWorkspace({ condition: "guided", cases: ["green"] })
  try {
    const result = await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15"])
    assert(result.stdout.includes("install proof      : not reachable"), result.stdout)
    const doc = await fs.readFile(path.join(repo, writtenEvidence(result)), "utf-8")
    assert(doc.includes("Staging notes:"), "the unreachable staging directory must be named in §2")
    assert(doc.includes("<to confirm — operator: the tarball digest"), "the digest must stay an operator value")
    assert(doc.includes("<to confirm — operator: the exit code from your own run>"), "install exits must not be invented")
  } finally {
    await fs.rm(repo, { recursive: true, force: true })
    await fs.rm(workspace, { recursive: true, force: true })
  }
})

// #endregion capture

test("a report label carrying a qualifier is read, not skipped as unlabelled", async () => {
  const repo = await makeRepo()
  const { workspace } = await makeWorkspace({ condition: "plain", cases: ["green"], offerShape: "loose-plain" })
  await fs.writeFile(path.join(workspace, "greenfield", "REPORT.md"), [
    "# Report — greenfield",
    "",
    "COMMANDS (all in greenfield/, exit 0 unless noted):",
    "- `node scripts/nothing.mjs` -> exit 0, nothing to run",
    "",
    "APPROACH (why this process):",
    "- read the directory, then wrote the proposal.",
    "",
    "STILL OPEN: decisions you left to a person",
    "- the board kind.",
    "",
  ].join("\n"))
  const out = path.join(repo, "docs", "analysis", "plain-qualified.md")
  const result = await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-16", "--out", out])
  const doc = await fs.readFile(out, "utf-8")
  assert.ok(doc.includes("`node scripts/nothing.mjs` -> exit 0, nothing to run"), "a qualified COMMANDS label must still yield the command list")
  assert.ok(doc.includes("section APPROACH"), "the plain instruction set's APPROACH section must be quoted, not dropped")
  assert.equal(doc.includes("The whole `REPORT.md`, verbatim"), false, "a report written in the documented shape must not be quoted wholesale")
  assert.equal(result.stdout.includes("no labelled COMMANDS section was recognised"), false, "the gap list must not claim the section was missing")
})

test("a report line the capture cannot read is surfaced instead of half-read", async () => {
  const repo = await makeRepo()
  const { workspace } = await makeWorkspace({ condition: "plain", cases: ["green"], offerShape: "loose-plain" })
  await fs.writeFile(path.join(workspace, "greenfield", "REPORT.md"), [
    "# Report",
    "",
    "SCOPE (all files): the exporter only, nothing else.",
    "",
    "COMMANDS: nothing to run",
    "",
  ].join("\n"))
  const out = path.join(repo, "docs", "analysis", "plain-unread-line.md")
  await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-16", "--out", out])
  const doc = await fs.readFile(out, "utf-8")
  assert.ok(doc.includes("The whole `REPORT.md`, verbatim"), "an unrecognised label line must trigger the whole-report quote")
  assert.ok(doc.includes("SCOPE (all files): the exporter only, nothing else."), "the note must name the line it did not recognise")
})

test("grounding written the way §4 asks is read: the sentence, the path, the line and the quote", async () => {
  const repo = await makeRepo()
  const lib = await loadLib()
  const { workspace } = await makeWorkspace({ condition: "plain", cases: ["green", "brown"], offerShape: "loose-plain" })
  const boardLine = lib.FIXTURES.brown["src/board.js"].split("\n")[0]
  await fs.writeFile(path.join(workspace, "brownfield", "offer.json"), `${JSON.stringify({
    question: "How should the fill colour be accepted?",
    options: [
      // The grounding sentence carries the citation and the quote sits beside it.
      { id: "A", label: "Optional fill argument", grounded_in: "src/board.js:1", quote: boardLine, tradeoff: "t", shows_it_works: "a" },
      // A path written from the TEST_PATH root, a line written as text.
      { id: "B", label: "Options object", grounded_in: { path: "brownfield/tests/board.test.js", line: "4", quote: lib.FIXTURES.brown["tests/board.test.js"].split("\n")[3] }, tradeoff: "t", shows_it_works: "a" },
      // A quote that differs from the live line only in whitespace: reported, never accepted.
      { id: "C", label: "Separate function", grounded_in: { path: "docs/limitation.md", line: 1, quote: `  ${lib.FIXTURES.brown["docs/limitation.md"].trim().replace(/ /g, "  ")}  ` }, tradeoff: "t", shows_it_works: "a" },
    ],
  }, null, 2)}\n`)
  const out = path.join(repo, "docs", "analysis", "plain-grounding.md")
  const result = await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-16", "--out", out])
  const doc = await fs.readFile(out, "utf-8")
  assert.match(result.stdout, /brownfield\s+:.*citations 2\/3 verified/, result.stdout)
  assert.match(doc, /3 citation\(s\), 2 matched \(2 file line\(s\), 0 task-text quote\(s\)\), 1 did NOT/, "each shape must be counted")
  assert.ok(doc.includes("1 resolved against the TEST_PATH root rather than the case directory"), "a citation resolved from the TEST_PATH root must say so")
  assert.ok(doc.includes("1 wrote the line number as text and it was read as a number"), "a line written as text must be reported as read")
  assert.ok(doc.includes("differs from that live line only in whitespace"), "a near miss must say what differs, and still count as a mismatch")
})

test("a file the agent left in TEST_PATH is copied into the raw bundle, never left behind", async () => {
  const repo = await makeRepo()
  const { workspace } = await makeWorkspace({ condition: "plain", cases: ["green"], offerShape: "loose-plain" })
  const transcript = "# Session transcript (agent-reconstructed)\n\nThe trial is over; this was written at the operator's request.\n"
  const notes = "The board kind is the decision that blocks everything else.\n"
  await fs.writeFile(path.join(workspace, "TRANSCRIPT.md"), transcript)
  await fs.writeFile(path.join(workspace, "greenfield", "NOTES.md"), notes)
  const out = path.join(repo, "docs", "analysis", "plain-handoff.md")
  const raw = path.join(repo, "docs", "analysis", "plain-handoff-raw")
  await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-16", "--out", out])
  const doc = await fs.readFile(out, "utf-8")
  assert.ok(doc.includes(`\`TRANSCRIPT.md\` (${Buffer.byteLength(transcript)} B`), "a root-level file must be named in §1 with its size")
  assert.ok(doc.includes("copied into the raw bundle"), "the row must say the file was captured")
  assert.equal(await fs.readFile(path.join(raw, "TRANSCRIPT.md.txt"), "utf-8"), transcript, "the root file must be copied byte-for-byte")
  assert.equal(await fs.readFile(path.join(raw, "greenfield", "NOTES.md.txt"), "utf-8"), notes, "a file inside a case directory must be copied too")
  const sources = JSON.parse(await fs.readFile(path.join(raw, "SOURCES.json"), "utf-8"))
  const roots = sources.sources.filter((entry) => entry.kind === "other file in TEST_PATH root")
  assert.equal(roots.length, 1, "the root file must be listed in the manifest")
  assert.equal(roots[0].bundlePath, "TRANSCRIPT.md.txt")
  assert.equal(roots[0].sha256, sha256(Buffer.from(transcript)))
  assert(sources.sources.some((entry) => entry.kind === "other file the agent wrote" && entry.bundlePath === "greenfield/NOTES.md.txt"))
  const summary = JSON.parse(await fs.readFile(path.join(raw, "SUMMARY.json"), "utf-8"))
  assert.deepEqual(summary.rootExtras.map((entry) => entry.relative), ["TRANSCRIPT.md"], "the summary must name the root files it saw")
})

test("a report that lists its commands inline is read, and not reported as silent", async () => {
  const repo = await makeRepo()
  const { workspace } = await makeWorkspace({ condition: "plain", cases: ["green"], offerShape: "loose-plain" })
  await fs.writeFile(path.join(workspace, "greenfield", "REPORT.md"), [
    "TEST: green / greenfield/",
    "COMMANDS: npm test (before change) -> exit 0; npm test (after, no source change) -> exit 0. Both run with workdir greenfield/.",
    "APPROACH: read first, then proposed.",
    "STILL OPEN: the offer question.",
    "",
  ].join("\n"))
  const out = path.join(repo, "docs", "analysis", "plain-inline-commands.md")
  const result = await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-16", "--out", out])
  const doc = await fs.readFile(out, "utf-8")
  assert.ok(doc.includes("npm test (before change) -> exit 0; npm test (after, no source change) -> exit 0"), "an inline command line must be quoted in the cell")
  assert.equal(result.stdout.includes("REPORT.md lists no commands"), false, "a report that lists commands must not be reported as listing none")
})

test("a COMMANDS section that records no command is quoted, not called silent", async () => {
  const repo = await makeRepo()
  const { workspace } = await makeWorkspace({ condition: "plain", cases: ["green"], offerShape: "loose-plain" })
  await fs.writeFile(path.join(workspace, "greenfield", "REPORT.md"), [
    "TEST: green / greenfield/",
    "COMMANDS: (no shell commands run for this test; directory listing done via file read)",
    "APPROACH: read first, then proposed.",
    "",
  ].join("\n"))
  const out = path.join(repo, "docs", "analysis", "plain-no-commands.md")
  const result = await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-16", "--out", out])
  assert.match(result.stdout, /the report's own COMMANDS section records no command — it reads \(no shell commands run for this test/, "the gap must quote the agent's own words")
  assert.equal(result.stdout.includes("REPORT.md lists no commands"), false, "the capture must not overrule the report's own sentence")
})

test("a citation recorded twice is counted once as distinct", async () => {
  const repo = await makeRepo()
  const lib = await loadLib()
  const { workspace } = await makeWorkspace({ condition: "plain", cases: ["brown"], offerShape: "loose-plain" })
  const grounding = [
    { path: "src/board.js", line: 1, quote: lib.FIXTURES.brown["src/board.js"].split("\n")[0] },
    { path: "tests/board.test.js", line: 4, quote: lib.FIXTURES.brown["tests/board.test.js"].split("\n")[3] },
    { path: "docs/limitation.md", line: 1, quote: lib.FIXTURES.brown["docs/limitation.md"].trim() },
  ]
  await fs.writeFile(path.join(workspace, "brownfield", "offer.json"), `${JSON.stringify({
    question: "How should the fill colour be accepted?",
    options: grounding.map((entry, index) => ({ id: `option-${index}`, label: `Option ${index}`, grounded_in: entry })),
    // The same three citations again, as a plain agent may well record them.
    citations: grounding,
  }, null, 2)}\n`)
  const out = path.join(repo, "docs", "analysis", "plain-repeats.md")
  await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-16", "--out", out])
  const doc = await fs.readFile(out, "utf-8")
  assert.ok(doc.includes("6 citation(s) — 3 distinct, 3 of them recorded twice"), "a repeated citation must be named as a repeat")
  assert.match(doc, /6 citation\(s\) — 3 distinct, 3 of them recorded twice, 6 matched/, "both readings are still reported")
  assert.ok(doc.includes("3 distinct — the rest record a path, line and quote already read"), "the summary clause must carry the distinct count too")
})

test("a command list written on one line reads as its clauses", async () => {
  const evidence = await import(pathToFileURL(SCRIPT).href)
  const inline = evidence.parseReportSections("COMMANDS: npm test (before change) -> exit 0; npm test (after, no source change) -> exit 0. Both run with workdir brownfield/.\n")
  assert.deepEqual(evidence.commandsFromReport(inline), [
    "npm test (before change) -> exit 0",
    "npm test (after, no source change) -> exit 0. Both run with workdir brownfield/.",
  ], "each clause is a command, as written")
  const nothingRan = evidence.parseReportSections("COMMANDS: (no shell commands run for this test; directory listing done via file read)\n")
  assert.deepEqual(evidence.commandsFromReport(nothingRan), [], "a sentence saying nothing ran is not a command list, and its clauses are prose")
  // A label may be written as a bullet; the bullet is not part of the label.
  const bulleted = evidence.parseReportSections("- Commands: npm test -> exit 0\n- Approach: read first, then proposed.\n")
  assert.deepEqual(evidence.commandsFromReport(bulleted), ["npm test -> exit 0"], "a bulleted COMMANDS label is a label")
  assert.equal(bulleted.APPROACH !== undefined, true, "a bulleted APPROACH label is a label too")
  // A semicolon inside a parenthetical, or inside a quoted argument, belongs to the
  // prose it sits in: it must not cut a command into a command and a fragment.
  const parenthetical = evidence.parseReportSections("COMMANDS:\n- synth first-contact clarify --source-offer missing.json => exit non-zero (expected probe; ENOENT, not recorded)\n")
  assert.deepEqual(evidence.commandsFromReport(parenthetical), ["synth first-contact clarify --source-offer missing.json => exit non-zero (expected probe; ENOENT, not recorded)"], "a parenthetical semicolon does not end a command")
  assert.deepEqual(evidence.commandClauses('synth first-contact start "one; two" -> exit 0; synth status -> exit 0'), ['synth first-contact start "one; two" -> exit 0', 'synth status -> exit 0'], "a quoted semicolon does not end a command, a bare one does")
})

test("a quote that is part of the staged task text reads as a partial quote, not a miss", async () => {
  const repo = await makeRepo()
  const lib = await loadLib()
  const { workspace } = await makeWorkspace({ condition: "plain", cases: ["green"], offerShape: "loose-plain" })
  await fs.writeFile(path.join(workspace, "greenfield", "offer.json"), `${JSON.stringify({
    question: "What board input and editing interaction should the first slice support?",
    options: [
      { label: "A", grounded_in: "task text", quote: "Board input and editing interaction are undecided." },
      { label: "B", grounded_in: "task text", quote: "a quote that appears nowhere in the request" },
    ],
  }, null, 2)}\n`)
  const out = path.join(repo, "docs", "analysis", "plain-partial.md")
  try {
    await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-16", "--out", out])
    const doc = await fs.readFile(out, "utf-8")
    assert.ok(doc.includes("1 quote part of the staged task text rather than all of it"), `the partial quote must be counted apart from a full one:\n${doc.slice(0, 4000)}`)
    assert.ok(doc.includes("1 did NOT"), "the quote that is nowhere in the request is still a miss")
    assert.equal(doc.includes("2 did NOT"), false, "a fragment of the task text must not be counted as a miss")
    assert.ok(doc.includes("Board input and editing interaction are undecided."), "the partial quote is named beside the count, so the operator sees what was read")
    assert.ok(doc.replace(/\s+/g, " ").includes("1 quote part of the staged task text"), "the fragment is read as the task text it came from")
  } finally {
    await fs.rm(workspace, { recursive: true, force: true })
    await fs.rm(repo, { recursive: true, force: true })
  }
})

test("every filed raw bundle is present, recomputes to its own digests and would be committed", async (t) => {
  const analysis = path.join(REPO_ROOT, "docs", "analysis")
  const bundles = (await fs.readdir(analysis, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.endsWith("-raw"))
    .map((entry) => entry.name)
    .sort()
  assert.ok(bundles.length > 0, "at least one filed evidence bundle must exist")
  const absent = []
  for (const bundle of bundles) {
    const dir = path.join(analysis, bundle)
    const sources = JSON.parse(await fs.readFile(path.join(dir, "SOURCES.json"), "utf-8"))
    for (const entry of sources.sources ?? []) {
      if (!entry.copied) continue
      const target = path.join(dir, entry.bundlePath)
      const bytes = await fs.readFile(target).catch(() => null)
      if (!bytes) {
        absent.push(`${bundle}/${entry.bundlePath}`)
        continue
      }
      assert.equal(sha256(bytes), entry.sha256, `${bundle}/${entry.bundlePath}: the filed bytes must recompute to the digest SOURCES.json records`)
      if (entry.bytes !== null && entry.bytes !== undefined) {
        assert.equal(bytes.length, entry.bytes, `${bundle}/${entry.bundlePath}: the filed file must be the size SOURCES.json records`)
      }
      // A bundle whose files this checkout's ignore rules exclude cannot be filed at
      // all: the operator's `git add` drops them and the digests record bytes that
      // never reach the branch. That is how a copied setup transcript was lost.
      const ignored = spawnSync("git", ["-C", REPO_ROOT, "check-ignore", "--quiet", path.relative(REPO_ROOT, target)], { encoding: "utf-8" })
      assert.notEqual(ignored.status, 0, `${bundle}/${entry.bundlePath} is excluded by this checkout's ignore rules and would not be committed — widen the rule so the bundle travels whole`)
    }
  }
  if (absent.length > 0) {
    t.diagnostic(`recorded in SOURCES.json but not filed in the repository: ${absent.join(", ")} — captured, then dropped by an ignore rule before it was committed; restore the file or re-run the capture on the machine that holds it`)
  }
})

test("the setup manifest's own facts fill the rows it can, and a dirty build is named", async () => {
  const repo = await makeRepo()
  const staging = await makeStaging({ dirty: true, inputs: { repo: "C:\\Users\\j\\Projects\\synth", workspace: "C:\\Users\\j\\Projects\\board-test" } })
  const { workspace } = await makeWorkspace({ condition: "guided", cases: ["green"], staging })
  const out = path.join(repo, "docs", "analysis", "setup-facts.md")
  try {
    await capture(["--workspace", workspace, "--repo", repo, "--staging", staging, "--date", "2026-10-16", "--out", out])
    const doc = await fs.readFile(out, "utf-8")
    // The command is rebuilt from the two inputs the manifest names — not retyped.
    assert.ok(doc.includes("`node scripts/guided-installed-trial-setup.mjs --workspace C:\\Users\\j\\Projects\\board-test`"), `the setup command is rebuilt from the manifest's inputs:\n${doc.split("\n").filter((line) => line.includes("setup-installed-trial-setup") || line.includes("guided-installed-trial-setup")).join("\n")}`)
    assert.ok(doc.includes("run from `C:\\Users\\j\\Projects\\synth`"), "the checkout setup ran from is named too")
    assert.ok(doc.includes("exit 0, since setup writes `setup-manifest.json` only after every step succeeded"), "the exit code follows from the manifest existing at all")
    assert.ok(doc.includes("yes — `setup-manifest.json` records `setup-complete-stop-before-agent` with `trialTestsRun: 0`"), "setup stopping before the agent is a recorded fact, not a question")
    // A tarball built from a dirty checkout is pinned by its digest, and the document says so.
    assert.ok(doc.includes("the checkout held **uncommitted changes** when setup read it"), "a dirty build is named, never smoothed over")
    assert.equal(doc.includes("clean — the working tree matched the pinned commit"), false, "a dirty build must not also read as clean")
  } finally {
    await fs.rm(workspace, { recursive: true, force: true })
    await fs.rm(staging, { recursive: true, force: true })
    await fs.rm(repo, { recursive: true, force: true })
  }
})

test("the plain arm's identity rows say what does not apply instead of asking", async () => {
  const repo = await makeRepo()
  const { workspace } = await makeWorkspace({ condition: "plain", cases: ["green"], offerShape: "loose-plain" })
  const out = path.join(repo, "docs", "analysis", "plain-identity.md")
  try {
    await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-16", "--out", out])
    const doc = await fs.readFile(out, "utf-8")
    assert.ok(doc.includes("not applicable — the plain condition builds and installs nothing, so no CLI commit applies"), `plain pins no CLI commit, and the row says so:\n${doc.slice(0, 3000)}`)
    assert.equal(doc.includes("the commit the CLI was built from"), false, "the plain arm must not ask for a commit nothing was built from")
  } finally {
    await fs.rm(workspace, { recursive: true, force: true })
    await fs.rm(repo, { recursive: true, force: true })
  }
})

test("each comparative row carries what this capture measured, never the judgement", async () => {
  const repo = await makeRepo()
  const staging = await makeStaging()
  const { workspace } = await makeWorkspace({ condition: "guided", cases: ["green", "brown"], staging })
  const out = path.join(repo, "docs", "analysis", "cross-cutting.md")
  try {
    await capture(["--workspace", workspace, "--repo", repo, "--staging", staging, "--date", "2026-10-16", "--out", out])
    const doc = await fs.readFile(out, "utf-8")
    const section = doc.split("## 5. Cross-cutting observations")[1].split("## 6.")[0]
    for (const question of ["better questions", "verifiable provenance", "fewer operator steps", "clearer next slice"]) {
      const row = section.split("\n").find((line) => line.includes(question))
      assert.ok(row, `§5 must still ask: ${question}`)
      assert.ok(row.includes("a comparative judgement — only a person who watched both conditions can answer it"), `the judgement stays with the operator: ${question}`)
      assert.ok(row.includes("measured in this capture") || row.includes("nothing mechanical"), `the measured facts sit beside the question: ${question}`)
    }
    assert.ok(section.includes("citation(s) carry a hash the CLI recorded"), "the provenance row counts the hashes this arm recorded")
    assert.ok(section.includes("operator input event(s) across the cells"), "the steps row counts the recorded operator events")
    // The question text itself names the plain condition; what must not appear is the
    // plain arm's own measurement, which lives in that arm's capture.
    assert.equal(section.includes("this arm stores no CLI state"), false, "the guided capture must not speak for the other arm")
  } finally {
    await fs.rm(workspace, { recursive: true, force: true })
    await fs.rm(staging, { recursive: true, force: true })
    await fs.rm(repo, { recursive: true, force: true })
  }
})

test("the terminal-state checklist counts, and says when it cannot decide", async () => {
  const repo = await makeRepo()
  // The guided fixture carries a CLI error log with one failed command — the case
  // the checklist must refuse to call either way.
  const staging = await makeStaging()
  const { workspace } = await makeWorkspace({ condition: "guided", cases: ["brown"], staging })
  const guidedOut = path.join(repo, "docs", "analysis", "checklist-guided.md")
  try {
    await capture(["--workspace", workspace, "--repo", repo, "--staging", staging, "--date", "2026-10-16", "--out", guidedOut])
    const guided = await fs.readFile(guidedOut, "utf-8")
    assert.ok(guided.includes("**Not derivable here**"), "a failed command the report may or may not have intended is not called a pass")
    assert.ok(guided.includes("the CLI's own error log records 1 failed command(s)"), "the error log is read as evidence about the terminal state")
    assert.ok(guided.includes("This rule never returns `fail` or `blocked`"), "the rule's own limit is stated")
  } finally {
    await fs.rm(workspace, { recursive: true, force: true })
    await fs.rm(staging, { recursive: true, force: true })
  }

  // A plain cell with no CLI state at all and every recorded exit at 0: nothing in
  // the evidence contradicts a pass, and the document says so — as a confirmation.
  const plain = await makeWorkspace({ condition: "plain", cases: ["brown"], offerShape: "loose-plain" })
  const lib = await loadLib()
  await fs.writeFile(path.join(plain.workspace, "brownfield", "offer.json"), `${JSON.stringify({
    question: "How should the fill colour be accepted?",
    options: [{ label: "A", grounded_in: { path: "src/board.js", line: 1, quote: lib.FIXTURES.brown["src/board.js"].split("\n")[0] } }],
  }, null, 2)}\n`)
  await fs.writeFile(path.join(plain.workspace, "brownfield", "REPORT.md"), [
    "TEST: brown / brownfield/",
    "COMMANDS: npm test (before proposal) -> exit 0; npm test (after, source untouched) -> exit 0.",
    "APPROACH: read first, then proposed.",
    "CITATIONS: src/board.js line 1 matched.",
    "",
  ].join("\n"))
  const plainOut = path.join(repo, "docs", "analysis", "checklist-plain.md")
  try {
    await capture(["--workspace", plain.workspace, "--repo", repo, "--date", "2026-10-16", "--out", plainOut])
    const doc = await fs.readFile(plainOut, "utf-8")
    assert.ok(doc.includes("**Nothing in the captured evidence contradicts a pass, pending your confirmation.**"), `a clean cell reads as a confirmation, not a verdict:\n${doc.slice(0, 3000)}`)
    assert.ok(doc.includes("commands recorded: 2 — stating exit 0: 2, stating another exit: 0, stating no exit: 0"), "the checklist counts what it read")
    assert.ok(doc.includes("recorded human responses: 0"), "no response is recorded, and the count says so")
  } finally {
    await fs.rm(plain.workspace, { recursive: true, force: true })
    await fs.rm(repo, { recursive: true, force: true })
  }
})

test("the operator facts are recorded once and read back, never retyped", async () => {
  const repo = await makeRepo()
  const staging = await makeStaging({ inputs: { repo: "C:\\Users\\j\\Projects\\synth", workspace: "C:\\Users\\j\\Projects\\board-test" } })
  const setup = await loadSetup()
  // Write the facts the way setup does, through setup's own helper.
  const facts = setup.operatorFacts({ operator: "the operator", setupAgent: "Arena Agent Mode", agent: "some model, build 7", tools: "shell, editor", timeBox: "30 minutes" })
  const manifestPath = path.join(staging, "transcripts", "setup-manifest.json")
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"))
  await fs.writeFile(manifestPath, `${JSON.stringify({ ...manifest, operatorFacts: facts, machineFacts: { node: "v22.22.3", npm: "10.9.8", platform: "win32", release: "10.0.26100", arch: "x64", timezone: "America/Hermosillo" } }, null, 2)}\n`)

  const { workspace } = await makeWorkspace({ condition: "guided", cases: ["green"], staging })
  const out = path.join(repo, "docs", "analysis", "operator-facts.md")
  try {
    await capture(["--workspace", workspace, "--repo", repo, "--staging", staging, "--date", "2026-10-16", "--out", out])
    const doc = await fs.readFile(out, "utf-8")
    assert.ok(doc.includes("| Operator (who ran the trial) | `the operator` (recorded by the guided setup manifest) |"), "the operator is read from the manifest")
    assert.ok(doc.includes("| Running agent, model and version | `some model, build 7` (recorded by the guided setup manifest)"), "the agent is read from the manifest")
    assert.ok(doc.includes("| Tool access given to the agent | `shell, editor`"), "tool access is read from the manifest")
    assert.ok(doc.includes("| Time box set before starting | `30 minutes`"), "the time box is read from the manifest")
    assert.ok(doc.includes("recorded by setup on the machine that staged the run: node `v22.22.3`, npm `10.9.8`, `win32 10.0.26100` (`x64`), timezone `America/Hermosillo`"), "machine facts come from setup, not from the operator")
    assert.equal(doc.includes("| Operator (who ran the trial) | <to confirm"), false, "a recorded fact must not also be asked for")

    // A capture flag wins over the manifest, and fills the rows for an arm whose
    // setup writes no manifest at all.
    const plain = await makeWorkspace({ condition: "plain", cases: ["green"], offerShape: "loose-plain" })
    const plainOut = path.join(repo, "docs", "analysis", "operator-facts-plain.md")
    await capture(["--workspace", plain.workspace, "--repo", repo, "--date", "2026-10-16", "--out", plainOut, "--operator", "the operator", "--agent", "another model"])
    const plainDoc = await fs.readFile(plainOut, "utf-8")
    assert.ok(plainDoc.includes("| Operator (who ran the trial) | `the operator` (recorded by this capture's flags) |"), "the flags fill the rows too")
    await fs.rm(plain.workspace, { recursive: true, force: true })
  } finally {
    await fs.rm(workspace, { recursive: true, force: true })
    await fs.rm(staging, { recursive: true, force: true })
    await fs.rm(repo, { recursive: true, force: true })
  }
})

test("the other arm's capture is paired automatically, and §5 says where its counts came from", async () => {
  const repo = await makeRepo()
  const analysis = path.join(repo, "docs", "analysis")
  // A previously filed plain capture of the same date, in the shape the capture writes.
  const sibling = path.join(analysis, "guided-installed-cli-trial-2026-10-15-plain-raw")
  await fs.mkdir(sibling, { recursive: true })
  await fs.writeFile(path.join(sibling, "SUMMARY.json"), `${JSON.stringify({
    capturedAt: "2026-10-15T12:00:00.000Z",
    date: { value: "2026-10-15", source: "argument" },
    condition: { resolved: "plain" },
    revision: { short: null },
    cases: [
      { dir: "greenfield", commands: [], citations: [] },
      { dir: "brownfield", commands: ["npm test -> exit 0"], citations: [{ hashRecorded: false }, { hashRecorded: false }, { hashRecorded: false, repeatedReading: true }] },
    ],
  }, null, 2)}\n`)
  const { workspace } = await makeWorkspace({ condition: "guided", cases: ["green"] })
  const out = path.join(analysis, "paired.md")
  try {
    const result = await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15", "--out", out])
    const doc = await fs.readFile(out, "utf-8")
    const section = doc.split("## 5. Cross-cutting observations")[1].split("## 6.")[0]
    assert.ok(section.includes("the plain arm's capture of this date (`docs/analysis/guided-installed-cli-trial-2026-10-15-plain-raw/SUMMARY.json`)"), `§5 must name the counterpart's capture:\n${section.slice(0, 1200)}`)
    assert.ok(section.includes("brownfield 1 command(s), 3 citation reading(s) (none hashed — that arm stores no CLI state), 1 repeating an earlier reading"), "the counterpart's counts are read from its own summary")
    assert.ok(section.includes("greenfield 0 command(s)"), "a cell with no commands is reported as such")
    assert.match(result.stdout, /evidence file\s+:\s+docs\/analysis\/paired\.md/, "the run prints the file it wrote")
  } finally {
    await fs.rm(repo, { recursive: true, force: true })
    await fs.rm(workspace, { recursive: true, force: true })
  }
})

// #region source contract

test("the capture script reads the workspace and writes only inside the repository", async () => {
  const source = await fs.readFile(SCRIPT, "utf-8")
  assert(source.includes("export const EVIDENCE_DIR = 'docs/analysis'"), "the evidence lands in docs/analysis")
  assert(source.includes("export const EVIDENCE_PREFIX = 'guided-installed-cli-trial'"), "the file name follows the trial convention")
  assert(source.includes("refusing to write evidence into TEST_PATH"), "writing into TEST_PATH must be impossible")
  assert(source.includes("const SKIP_DIRS = new Set(['.git', 'node_modules'])"), "the walk must skip VCS and dependency trees")
  assert(source.includes("must live outside the checkout"), "the layout guard must be stated")
  assert.equal(/spawnSync|execFile|execSync|child_process/.test(source), false, "capture runs no child process at all")
  assert.equal(/\.writeFile\([^)]*workspace/.test(source), false, "no write may target the workspace")
  assert.equal(/synth first-contact (start|clarify|--dry-run|--source-offer)/.test(source), false, "capture never runs a product command")
  assert.equal(/\bspawn\b|spawnSync/.test(source), false, "capture spawns nothing")
})

test("the evidence rule matches the CLI's own citation semantics", async () => {
  const source = await fs.readFile(SCRIPT, "utf-8")
  assert(source.includes("CITATION_PATH_RE = /^(?:(?:docs|knowledge)\\/.+\\.(?:md|mdx)|(?:src|tests)\\/.+\\.(?:js|jsx|ts|tsx|json)|package\\.json)$/i"), "the file-citation allowlist must be copied from source-brief")
  assert(source.includes("CITATION_READ_LIMIT = 64 * 1024"), "the 64 KiB read cap must be carried over")
  assert(source.includes("content.split(/\\r?\\n/)[line - 1]"), "the exact-line rule must be carried over")
  assert(source.includes("sha256(content)"), "a file citation hashes the whole file")
  const brief = await fs.readFile(path.resolve(REPO_ROOT, "src", "first-contact", "source-brief.ts"), "utf-8")
  assert(brief.includes("64 * 1024"), "the CLI still caps citation reads at 64 KiB")
  assert(brief.includes("content.split(/\\r?\\n/)["), "the CLI still compares the exact line")
})

// #endregion source contract
