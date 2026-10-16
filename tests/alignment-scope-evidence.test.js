// Read-only synthetic Git/GitHub scope observation. No runtime approval.
import fs from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import crypto from "node:crypto"
import { spawnSync } from "node:child_process"
import { strict as assert } from "node:assert"
import { runSynth, parseJson } from "./helpers/cli-harness.js"

const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "synth-alignment-scope-"))
try {
  const git = (...args) => {
    const r = spawnSync("git", args, { cwd, encoding: "utf8" })
    assert.equal(r.status, 0, r.stderr)
    return r.stdout.trim()
  }
  git("init", "-q")
  git("config", "user.name", "Fixture")
  git("config", "user.email", "fixture@example.invalid")
  git("checkout", "-q", "-b", "fixture/review")
  git("remote", "add", "origin", "https://github.com/example/fixture.git")
  await fs.mkdir(path.join(cwd, "docs/plans"), { recursive: true })
  const entries = []
  for (let i = 1; i <= 6; i++) {
    const content = `Source ${i}\n`
    await fs.writeFile(path.join(cwd, `docs/plans/source${i}.md`), content)
    const hash = crypto.createHash("sha256").update(content).digest("hex")
    entries.push(`| S${i} | [Source ${i}](source${i}.md) — \`${hash}\` | bounded |`)
  }
  const packetPath = "docs/plans/review.md"
  await fs.writeFile(path.join(cwd, packetPath), `# Review packet\n${entries.join("\n")}\n${[1, 2, 3, 4].map(i => `| E${i} — Commitment ${i} | evidence | limit |`).join("\n")}\n`)
  git("add", "docs/plans")
  git("commit", "-qm", "Reviewed proposal")
  const reviewedCommit = git("rev-parse", "HEAD")
  await fs.writeFile(path.join(cwd, "README.md"), "Later implementation note\n")
  git("add", "README.md")
  git("commit", "-qm", "Subsequent head")
  const head = git("rev-parse", "HEAD")
  const pr = { number: 17, url: "https://github.com/example/fixture/pull/17", state: "OPEN", headRefOid: head, headRefName: "fixture/review" }
  const comment = {
    id: 42, html_url: `${pr.url}#issuecomment-42`, issue_url: "https://api.github.com/repos/example/fixture/issues/17",
    user: { login: "jtanori" }, created_at: "2026-10-16T02:50:46Z", updated_at: "2026-10-16T02:50:46Z",
    body: `I confirm the Mission meaning and proposed first Expedition scope described in \`${packetPath}\` at reviewed head \`${reviewedCommit}\`, with amendments.\nE4 is a bounded synthetic comparison.`,
  }
  const bin = path.join(cwd, "bin")
  await fs.mkdir(bin)
  await fs.writeFile(path.join(bin, "gh"), `#!/usr/bin/env node
const fs=require('node:fs'), path=require('node:path');
const cwd=process.cwd(), args=process.argv.slice(2);
if(args[0]==='pr' && args[1]==='view') console.log(fs.readFileSync(path.join(cwd,'pr.json'),'utf8'));
else if(args[0]==='api') {
  const c=JSON.parse(fs.readFileSync(path.join(cwd,'comment.json'),'utf8'));
  const marker=path.join(cwd,'edited-marker');
  if(process.env.MOCK_EDIT_BETWEEN==='yes') {
    if(fs.existsSync(marker)) { c.body+=' changed'; c.updated_at='2026-10-16T03:00:00Z'; }
    else fs.writeFileSync(marker,'1');
  }
  console.log(JSON.stringify(c));
} else {console.error('Unexpected gh invocation',args);process.exit(1)}
`, { mode: 0o755 })
  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` }
  const args = ["alignment", "create", "--dry-run", "--review-pr", "17", "--comment-id", "42", "--reviewed-commit", reviewedCommit, "--packet", packetPath, "--expected-account", "jtanori"]
  const run = (extraEnv = {}) => runSynth(args, cwd, { env: { ...env, ...extraEnv } })
  await fs.writeFile(path.join(cwd, "pr.json"), JSON.stringify(pr))
  await fs.writeFile(path.join(cwd, "comment.json"), JSON.stringify(comment))
  const good = run()
  assert.equal(good.status, 0, good.stdout + good.stderr)
  const observed = parseJson(good.stdout)
  assert.equal(observed.kind, "AlignmentScopeEvidencePreview")
  assert.equal(observed.runtimeAuthorization, false)
  assert.equal(observed.comment.body, comment.body, "exact account-attributed text must be preserved")
  assert.equal(observed.reviewedCommit, reviewedCommit)
  assert.equal(observed.sources.length, 6)
  assert.equal(observed.reviewedCommitments.length, 4)
  assert.equal(observed.packetChangedAfterReview, false)
  assert.equal(observed.sources[0].path, "docs/plans/source1.md")
  assert.equal(observed.attribution, "github-account-not-human-authentication")
  await assert.rejects(fs.access(path.join(cwd, ".synth")), /ENOENT/, "inspection must not create runtime state")

  const fails = async (label, modify) => {
    await fs.writeFile(path.join(cwd, "pr.json"), JSON.stringify(pr))
    await fs.writeFile(path.join(cwd, "comment.json"), JSON.stringify(comment))
    const invocation = await modify()
    assert.notEqual(invocation.status, 0, `${label} should fail closed`)
    await assert.rejects(fs.access(path.join(cwd, ".synth", "data", "event-stream")), /ENOENT/, `${label} must not append governance events`)
  }
  await fs.writeFile(path.join(cwd, "pr.json"), JSON.stringify(pr))
  await fs.writeFile(path.join(cwd, "comment.json"), JSON.stringify(comment))
  await fails("missing dry-run", async () => runSynth(args.filter(x => x !== "--dry-run"), cwd, { env }))
  await fails("wrong account", async () => { await fs.writeFile(path.join(cwd, "comment.json"), JSON.stringify({ ...comment, user: { login: "agent" } })); return run() })
  await fails("generic comment", async () => { await fs.writeFile(path.join(cwd, "comment.json"), JSON.stringify({ ...comment, body: `Looks good: \`${packetPath}\` at \`${reviewedCommit}\`` })); return run() })
  await fails("wrong PR head", async () => { await fs.writeFile(path.join(cwd, "pr.json"), JSON.stringify({ ...pr, headRefOid: "0".repeat(40) })); return run() })
  await fails("wrong issue", async () => { await fs.writeFile(path.join(cwd, "comment.json"), JSON.stringify({ ...comment, issue_url: "https://api.github.com/repos/example/fixture/issues/18" })); return run() })
  await fails("previously edited comment", async () => { await fs.writeFile(path.join(cwd, "comment.json"), JSON.stringify({ ...comment, updated_at: "2026-10-16T03:00:00Z" })); return run() })
  await fails("edited during lookup", async () => { await fs.rm(path.join(cwd, "edited-marker"), { force: true }); return run({ MOCK_EDIT_BETWEEN: "yes" }) })
  // Git-object bytes, not working-directory bytes, are the reviewed sources.
  await fs.writeFile(path.join(cwd, "docs/plans/source1.md"), "uncommitted replacement\n")
  assert.equal(run().status, 0, "a later working-tree edit cannot rewrite the reviewed Git object")
  await fs.writeFile(path.join(cwd, "comment.json"), JSON.stringify(comment))
  assert.equal(run().status, 0)
  git("checkout", "--", "docs/plans/source1.md")
  const packet = await fs.readFile(path.join(cwd, packetPath), "utf8")
  await fs.writeFile(path.join(cwd, packetPath), packet.replace(entries[0], entries[0].replace(/`[0-9a-f]{64}`/, `\`${"0".repeat(64)}\``)))
  git("add", packetPath)
  git("commit", "-qm", "Incorrect source binding fixture")
  const badHead = git("rev-parse", "HEAD")
  await fs.writeFile(path.join(cwd, "pr.json"), JSON.stringify({ ...pr, headRefOid: badHead }))
  await fs.writeFile(path.join(cwd, "comment.json"), JSON.stringify({ ...comment, body: comment.body.replace(reviewedCommit, badHead) }))
  const badArgs = args.map(item => item === reviewedCommit ? badHead : item)
  const badHash = runSynth(badArgs, cwd, { env })
  assert.notEqual(badHash.status, 0, "mismatched source hash at reviewed Git head must fail")
  git("checkout", reviewedCommit, "--", packetPath)
  git("commit", "-qm", "Restore reviewed packet")
  await fs.writeFile(path.join(cwd, "docs/plans/source1.md"), "changed after review\n")
  git("add", "docs/plans/source1.md")
  git("commit", "-qm", "Change reviewed source")
  await fs.writeFile(path.join(cwd, "pr.json"), JSON.stringify({ ...pr, headRefOid: git("rev-parse", "HEAD") }))
  await fs.writeFile(path.join(cwd, "comment.json"), JSON.stringify(comment))
  assert.notEqual(run().status, 0, "a source changed after the comment must be re-reviewed")
  await assert.rejects(fs.access(path.join(cwd, ".synth", "data", "event-stream")), /ENOENT/)
  console.log("[PASS] exact PR comment and six reviewed source bytes observed without runtime mutation; mismatches fail closed")
} finally {
  await fs.rm(cwd, { recursive: true, force: true })
}
