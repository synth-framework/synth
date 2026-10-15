// EXP-CLI-003 item 4: prove the shipped bin's behavior before repointing the
// shared harness. Both processes get the SAME restored directory, clock, UUID
// sequence and git dates. Compare complete output and actual durable effects;
// never erase IDs, event hashes or git hashes to make a comparison pass.
import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { makeTempDir, runGit, gitInitWithCommit } from "./helpers/workspace.js"

const REPO = fileURLToPath(new URL("../", import.meta.url))
const LEGACY = path.join(REPO, "dist/cli/synth.js")
const SHIPPED = path.join(REPO, JSON.parse(await fs.readFile(path.join(REPO, "package.json"), "utf8")).bin.synth)
const INPUTS = fileURLToPath(new URL("./helpers/cli-parity-inputs.js", import.meta.url))

async function filesAt(root) {
  const files = {}
  async function walk(dir, relative = "") {
    for (const entry of (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const rel = path.posix.join(relative, entry.name)
      // Git's object/index machinery and disposable adapter caches are not
      // project artifacts. Git refs/trees/status are compared independently.
      if ([".git", ".synth/anchor", ".synth/worktrees", ".synth/cache"].includes(rel)) continue
      const absolute = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(absolute, rel)
      else if (entry.isSymbolicLink()) files[rel] = `symlink:${await fs.readlink(absolute)}`
      else files[rel] = crypto.createHash("sha256").update(await fs.readFile(absolute)).digest("hex")
    }
  }
  await walk(root)
  return files
}

async function withFixture(t, git, body) {
  const outer = await makeTempDir("synth-entry-parity-")
  const root = path.join(outer, "project")
  const snapshot = path.join(outer, "before")
  await fs.mkdir(root)
  await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "cli-parity-fixture", version: "1.0.0" }))
  if (git) {
    gitInitWithCommit(root)
    runGit(["add", "package.json"], root)
    runGit(["commit", "-m", "seed project"], root)
  }
  let turn = 0
  const gitState = () => git ? {
    head: runGit(["rev-parse", "HEAD"], root),
    refs: runGit(["show-ref"], root),
    tree: runGit(["rev-parse", "HEAD^{tree}"], root),
    status: runGit(["status", "--porcelain"], root),
    history: runGit(["log", "--all", "--format=%H %s"], root),
  } : undefined

  async function pair(args, { status = 0, kind, ceremony, readonly = false } = {}) {
    const label = args.join(" ")
    await t.test(label, async () => {
      await fs.rm(snapshot, { recursive: true, force: true })
      await fs.cp(root, snapshot, { recursive: true })
      const before = await filesAt(root)
      const beforeGit = gitState()
      const time = Date.UTC(2026, 0, 1) + (++turn * 1000)
      const env = {
        ...process.env,
        SYNTH_CLI_PARITY_FIXTURE: "1",
        SYNTH_CLI_PARITY_TIME: String(time),
        SYNTH_QUIET_LOGS: "1",
        SYNTH_AGENT_ID: "cli-parity-fixture",
        SYNTH_SESSION_ID: `cli-parity-${turn}`,
        SYNTH_APPROVAL_MODE: "autonomous",
        GIT_AUTHOR_DATE: new Date(time).toISOString(),
        GIT_COMMITTER_DATE: new Date(time).toISOString(),
      }
      const invoke = (entry) => {
        const result = spawnSync(process.execPath, ["--import", INPUTS, entry, ...args, "--json"], {
          cwd: root, env, encoding: "utf8", timeout: 60000, maxBuffer: 8 * 1024 * 1024,
        })
        assert.ifError(result.error)
        assert.equal(result.signal, null, `${label}: killed by ${result.signal}`)
        assert.equal(result.status, status, `${label}: ${result.stdout}\n${result.stderr}`)
        return { stdout: result.stdout, stderr: result.stderr, status: result.status }
      }
      const legacy = invoke(LEGACY)
      const legacyFiles = await filesAt(root)
      const legacyGit = gitState()
      await fs.rm(root, { recursive: true, force: true })
      await fs.cp(snapshot, root, { recursive: true })
      const shipped = invoke(SHIPPED)
      assert.deepEqual(shipped, legacy, `${label}: output/exit differs`)
      assert.deepEqual(await filesAt(root), legacyFiles, `${label}: durable files differ`)
      assert.deepEqual(gitState(), legacyGit, `${label}: git refs/trees/status/history differ`)
      const json = JSON.parse(shipped.stdout)
      if (kind) assert.equal(json.kind, kind)
      if (readonly) {
        assert.deepEqual(legacyFiles, before, `${label}: read-only invocation wrote files`)
        assert.deepEqual(legacyGit, beforeGit, `${label}: read-only invocation changed git`)
      }
      if (ceremony) {
        assert.equal(runGit(["rev-list", "--count", `${beforeGit.head}..HEAD`], root), "1", `${label}: must land one commit`)
        assert.match(runGit(["log", "-1", "--format=%s"], root), ceremony)
        assert.equal(runGit(["status", "--porcelain", "--", ".synth/data", "proof"], root), "", `${label}: ledger must be clean`)
      }
      pair.last = json
    })
    // A failed subtest must stop the scenario, not silently feed stale IDs to
    // subsequent commands (node:test records failures without throwing here).
    assert.ok(pair.last, `${label}: did not produce a successful comparison`)
    const output = pair.last
    pair.last = undefined
    return output
  }
  try { await body({ root, pair }) }
  finally { await fs.rm(outer, { recursive: true, force: true }) }
}

test("entry parity: initialization, first-contact proposals, task and read-only routes", { timeout: 180000 }, async (t) => {
  await withFixture(t, false, async ({ root, pair }) => {
    await pair(["init", "--name", "CLI parity fixture"])
    const state = JSON.parse(await fs.readFile(path.join(root, ".synth/data/canonical-state.json"), "utf8"))
    assert.equal(state.lifecycle, "initialized", "init must actually initialize the project")
    await pair(["init", "--name", "CLI parity fixture"])
    await pair(["first-contact", "start", "Build a TypeScript web application for tracking engineering missions"], { kind: "FirstContactDraft" })
    await pair(["first-contact", "clarify"], { readonly: true })
    await pair(["first-contact", "status"], { readonly: true })
    await pair(["status"], { readonly: true })
    for (const sub of ["replay", "identity", "resume", "governance", "agents", "lineage", "proposals", "snapshots", "graph", "diagnostics", "status", "all"]) {
      await pair(["explain", sub], { readonly: true })
    }
    await pair(["task", "list"], { kind: "TaskList", readonly: true })
    await pair(["task", "graph"], { readonly: true })
  })
})

test("entry parity: bootstrap, alignment and real git-backed lifecycle ceremonies", { timeout: 180000 }, async (t) => {
  await withFixture(t, true, async ({ root, pair }) => {
    await pair(["bootstrap", ".", "--approve"])
    runGit(["add", "-A"], root)
    runGit(["commit", "--allow-empty", "-m", "checkpoint bootstrapped fixture"], root)
    const alignment = await pair(["alignment", "prepare"], { kind: "AlignmentPrepared" })
    assert.ok(alignment.contractId)
    let draft = await pair(["mission", "create", "--subject", "Parity mission", "--purpose", "Verify shipped CLI ceremonies"], {
      ceremony: /^chore\(synth\): MISSION_DRAFTED mission /,
    })
    for (let i = 0; draft.confidence.overall < 0.72; i++) {
      assert.ok(i < 10, "mission confidence must converge")
      draft = await pair(["mission", "evidence", "add", "--draft-id", draft.draftId, "--subject", `Evidence ${i}`, "--purpose", "Parity acceptance", "--confidence", "high"], {
        ceremony: /^chore\(synth\): MISSION_EVIDENCE_ADDED mission /,
      })
    }
    const approved = await pair(["mission", "approve", "--draft-id", draft.draftId, "--alignment-contract-id", alignment.contractId], {
      ceremony: /^chore\(synth\): MISSION_APPROVED mission /,
    })
    const missionId = approved.runtime.missionId
    const expedition = await pair(["expedition", "create", "--mission", missionId, "--subject", "Parity expedition", "--goal", "Exercise the lazy dispatcher"], {
      ceremony: /^chore\(synth\): EXPEDITION_DRAFTED expedition /,
    })
    const id = expedition.draftId
    await pair(["expedition", "approve", "--draft-id", id], { ceremony: /^chore\(synth\): EXPEDITION_APPROVED expedition / })
    await pair(["expedition", "commit", "--proposal-id", id], { ceremony: /^chore\(synth\): EXPEDITION_COMMITTED expedition / })
    await pair(["expedition", "start", "--id", id], { ceremony: /^chore\(synth\): EXPEDITION_STARTED expedition / })
    await fs.writeFile(path.join(root, "parity-evidence.txt"), "CLI parity evidence\n")
    await pair(["expedition", "evidence", "--id", id, "--attach", "parity-evidence.txt"], { ceremony: /^chore\(synth\): EVIDENCE_ATTACHED expedition / })
    await fs.rm(path.join(root, "parity-evidence.txt"))
    await pair(["expedition", "pause", "--id", id], { ceremony: /^chore\(synth\): EXPEDITION_PAUSED expedition / })
    await pair(["expedition", "cancel", "--id", id, "--reason", "Parity scenario complete"], { ceremony: /^chore\(synth\): EXPEDITION_CANCELLED expedition / })
    await pair(["expedition", "show", "--id", id], { readonly: true })
    const head = runGit(["rev-parse", "HEAD"], root)
    await pair(["mission", "create", "--subject", "Uncommitted parity draft", "--purpose", "Check no-auto-commit", "--no-auto-commit"])
    assert.equal(runGit(["rev-parse", "HEAD"], root), head, "--no-auto-commit must leave the branch unchanged")
    await pair(["mission", "delete", "--id", "missing-mission"], { status: 1 })
    assert.equal(runGit(["rev-parse", "HEAD"], root), head, "a refused operation must not commit")
  })
})
