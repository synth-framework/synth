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
async function makeStaging({ tarballSha = "a".repeat(64) } = {}) {
  const staging = await fs.mkdtemp(path.join(os.tmpdir(), "trial-evidence-staging-"))
  await writeTree(staging, {
    "cli-manifest.json": `${JSON.stringify({
      status: "cli-installed",
      installedCli: { bin: path.join(staging, "global", "synth.cmd"), tarball: path.join(staging, "pack", "synth-framework-synth-2.6.1.tgz"), tarballSha256: tarballSha, version: { status: "ok", version: "2.6.1", schema: "synth-cli-v1" } },
      trialTestsRun: 0,
    }, null, 2)}\n`,
    "transcripts/tarball.sha256": `${tarballSha}  ${path.join(staging, "pack", "synth-framework-synth-2.6.1.tgz")}\n`,
    "transcripts/version.json": `${JSON.stringify({ status: "ok", version: "2.6.1", schema: "synth-cli-v1" })}\n`,
    "transcripts/setup.log": "$ npm run build\n> synth@2.6.1 build\n",
    "transcripts/setup-manifest.json": `${JSON.stringify({
      status: "setup-complete-stop-before-agent",
      condition: "guided",
      testedRevision: { commit: "917d662a31bd176293c7696bec02f468c8bcbc4f", branch: "arena/f3c711cb-synth", subject: "Keep the check counts current in the trial docs", workingTreeDirty: false },
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
async function makeWorkspace({ condition = "guided", cases = ["green", "brown"], staging = null, tamper = null, reportExtra = "", omitInputs = [], environmentWorkspace = null } = {}) {
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
    files[`${dirName}/offer.json`] = `${JSON.stringify(agentOffer, null, 2)}\n`
    files[`${dirName}/.synth/first-contact/draft.json`] = `${JSON.stringify({
      schema: "synth-first-contact-draft-v1",
      status: "draft",
      journeyId: recorded.journeyId,
      openAgentChoices: [],
      choiceReviews: [],
      sourceOffers: [recorded],
      sourceAnswers: [],
      updatedAt: "2026-10-15T10:00:01.000Z",
    }, null, 2)}\n`
    files[`${dirName}/.synth/first-contact/transcript.jsonl`] = `${[
      JSON.stringify({ turn: 1, actor: "operator", type: "input", content: lib.TASKS[caseId], timestamp: "2026-10-15T09:59:00.000Z" }),
      JSON.stringify({ turn: 2, actor: "agent", type: "proposal", content: `Source offer ${recorded.id}: ${recorded.question}`, timestamp: "2026-10-15T10:00:00.000Z" }),
    ].join("\n")}\n`
    files[`${dirName}/.synth/data/cli-errors.jsonl`] = `${JSON.stringify({ timestamp: "2026-10-15T09:59:30.000Z", kind: "CLIError", error: "Source offer was not recorded: option id must be nonempty text", exitCode: 1 })}\n`
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
    await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15", "--json"])
    const out = path.join(repo, "docs", "analysis", "guided-installed-cli-trial-2026-10-15.md")
    const raw = path.join(repo, "docs", "analysis", "guided-installed-cli-trial-2026-10-15-raw")
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
    await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15"])
    const doc = await fs.readFile(path.join(repo, "docs", "analysis", "guided-installed-cli-trial-2026-10-15.md"), "utf-8")
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
    const out = path.join(repo, "docs", "analysis", "guided-installed-cli-trial-2026-10-15.md")
    await fs.stat(out).then(() => assert.fail("--dry-run must not write the evidence file"), () => {})
    await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15"])
    const second = runScript(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15"])
    assert.notEqual(second.status, 0, "a second capture must refuse to overwrite")
    assert(/already exists/.test(second.stderr), second.stderr)
    await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15", "--force"])
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
    await capture(["--workspace", workspace, "--repo", repo, "--cases", "brown", "--date", "2026-10-15"])
    const doc = await fs.readFile(path.join(repo, "docs", "analysis", "guided-installed-cli-trial-2026-10-15.md"), "utf-8")
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

test("staging that cannot be reached is reported instead of guessed", async () => {
  const repo = await makeRepo()
  const { workspace } = await makeWorkspace({ condition: "guided", cases: ["green"] })
  try {
    const result = await capture(["--workspace", workspace, "--repo", repo, "--date", "2026-10-15"])
    assert(result.stdout.includes("install proof      : not reachable"), result.stdout)
    const doc = await fs.readFile(path.join(repo, "docs", "analysis", "guided-installed-cli-trial-2026-10-15.md"), "utf-8")
    assert(doc.includes("Staging notes:"), "the unreachable staging directory must be named in §2")
    assert(doc.includes("<to confirm — operator: the tarball digest"), "the digest must stay an operator value")
    assert(doc.includes("<to confirm — operator: the exit code from your own run>"), "install exits must not be invented")
  } finally {
    await fs.rm(repo, { recursive: true, force: true })
    await fs.rm(workspace, { recursive: true, force: true })
  }
})

// #endregion capture

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
