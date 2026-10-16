// Synthetic PR publication and read-only GitHub review observations. Never
// creates a real PR or claims that a GitHub account authenticates a human.
import fs from "node:fs/promises"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { assert } from "./helpers/assert.js"
import { parseJson, runSynth, withTempDir } from "./helpers/cli-harness.js"
import { choiceDescription, mergeChoiceDescription } from "../dist/first-contact/review/pr-description.js"

const sample = { id: "choice-test", choice: "Use <local> storage", reason: "cost & simplicity", scope: "public interface", alternatives: ["remote"] }
const preview = choiceDescription([sample], [{ choiceId: sample.id, impact: "material", reason: "Cannot reverse cheaply", disposition: "awaiting-human" }])
assert(preview.includes("awaiting a reviewer") && preview.includes("&lt;local&gt;") && !preview.includes("human-approved"), "pending material preview is safe and explicit")
const unverified = choiceDescription([sample], [{ choiceId: sample.id, impact: "material", reason: "Migration cost", disposition: "keep", humanResponse: "PRIVATE_RESPONSE_NOT_FOR_PR" }])
assert(unverified.includes("unverified") && !unverified.includes("PRIVATE_RESPONSE_NOT_FOR_PR"), "do not publish raw CLI-supplied human-response text")
assert(mergeChoiceDescription("Other PR text", preview).startsWith("Other PR text\n\n"), "append without removing ordinary text")
assert(mergeChoiceDescription(mergeChoiceDescription("Other PR text", preview), preview) === mergeChoiceDescription("Other PR text", preview), "unchanged section is idempotent")
for (const malformed of ["<!-- synth:agent-choices:start -->", "<!-- synth:agent-choices:end -->", `${preview}\n${preview}`]) {
  let failed = false
  try { mergeChoiceDescription(malformed, preview) } catch { failed = true }
  assert(failed, "incomplete or duplicate markers must fail closed")
}

const call = (args, cwd, env) => {
  const r = runSynth(["first-contact", ...args], cwd, { env })
  assert(r.status === 0, `${args.join(" ")} failed: ${r.stdout}\n${r.stderr}`)
  return parseJson(r.stdout)
}

await withTempDir("synth-review-pending-", async (cwd) => {
  assert(runSynth(["first-contact", "status", "--pr", "17", "--publish-review"], cwd).status !== 0, "empty workspace cannot report a successful publication")
  call(["start", "A local board"], cwd)
  const choice = call(["clarify", "--agent-choice", "Store state locally", "--reason", "Offline use", "--scope", "storage"], cwd).choice
  const invalid = runSynth(["first-contact", "clarify", "--review-choice", choice.id, "--impact", "material", "--reason", "Public API", "--decision", "keep"], cwd)
  assert(invalid.status !== 0 && call(["status"], cwd).choiceReviews.length === 0, "incomplete response may not write")
  const pending = call(["clarify", "--review-choice", choice.id, "--impact", "material", "--reason", "Public format"], cwd)
  assert(pending.review.disposition === "awaiting-human" && !pending.review.humanResponse, "material can now wait for human")
  const packet = call(["status"], cwd).reviewPacket
  assert(packet.prDescriptionSection.includes("awaiting a reviewer") && packet.pr.status === "not-requested", "no fabricated PR context")
  const noPr = runSynth(["first-contact", "status", "--publish-review"], cwd)
  assert(noPr.status !== 0, "publishing requires an explicit PR number")
})

if (process.platform !== "win32") await withTempDir("synth-review-publication-", async (cwd) => {
  const git = (args) => {
    const r = spawnSync("git", args, { cwd, encoding: "utf8" })
    assert(r.status === 0, `git ${args.join(" ")} failed: ${r.stderr}`)
    return r.stdout.trim()
  }
  git(["init", "-q"])
  git(["config", "user.name", "Fixture"])
  git(["config", "user.email", "fixture@example.invalid"])
  git(["checkout", "-q", "-b", "fixture/review"])
  git(["remote", "add", "origin", "https://github.com/example/repo.git"])
  await fs.writeFile(path.join(cwd, "README.md"), "Synthetic repository\n")
  git(["add", "README.md"])
  git(["commit", "-qm", "Base"])
  const sha = git(["rev-parse", "HEAD"])
  call(["start", "A new board idea"], cwd)
  const old = call(["clarify", "--agent-choice", "Choose legacy color", "--reason", "Prior task", "--scope", "colors"], cwd).choice
  call(["start", "A new board idea"], cwd)
  const choice = call(["clarify", "--agent-choice", "Store data locally", "--reason", "Offline use", "--scope", "storage"], cwd).choice
  call(["clarify", "--review-choice", choice.id, "--impact", "material", "--reason", "Hard to migrate later"], cwd)
  const bin = path.join(cwd, "mock-bin")
  await fs.mkdir(bin)
  const pr = { number: 17, state: "OPEN", headRefName: "fixture/review", headRefOid: sha, baseRefName: "main", url: "https://github.com/example/repo/pull/17" }
  await fs.writeFile(path.join(cwd, "pr.json"), JSON.stringify(pr))
  const bodyPath = path.join(cwd, "pr-body.md")
  await fs.writeFile(bodyPath, "Human-owned introduction\n\n## Checks\n- pending\n")
  await fs.writeFile(path.join(cwd, "edit-count"), "0")
  await fs.writeFile(path.join(cwd, "reviews.json"), JSON.stringify([
    { body: "Looks good!", state: "APPROVED", commit_id: sha, user: { login: "generic-reviewer" }, submitted_at: "2026-01-01T00:00:00Z", html_url: `${pr.url}#review-1` },
    { body: `SYNTH choice ${choice.id}: keep\nFor offline use.`, state: "COMMENTED", commit_id: sha, user: { login: "specific-reviewer" }, submitted_at: "2026-01-01T01:00:00Z", html_url: `${pr.url}#review-2` },
    { body: `SYNTH choice ${choice.id}: change`, state: "COMMENTED", commit_id: "0".repeat(40), user: { login: "older-reviewer" }, submitted_at: "2026-01-01T02:00:00Z", html_url: `${pr.url}#review-3` },
  ]))
  const mock = `#!/usr/bin/env node
const fs=require('node:fs');const path=require('node:path');const root=process.cwd(), args=process.argv.slice(2);
if(args[0]==='pr' && args[1]==='view'){const pr=JSON.parse(fs.readFileSync(path.join(root,'pr.json')));pr.body=fs.readFileSync(path.join(root,'pr-body.md'),'utf8');console.log(JSON.stringify(pr));}
else if(args[0]==='pr' && args[1]==='edit'){const file=args[args.indexOf('--body-file')+1];fs.writeFileSync(path.join(root,'pr-body.md'),fs.readFileSync(file));const count=path.join(root,'edit-count');fs.writeFileSync(count,String(Number(fs.readFileSync(count))+1));}
else if(args[0]==='api'){JSON.parse(fs.readFileSync(path.join(root,'reviews.json'))).forEach((review,i)=>console.log(i===0?JSON.stringify(JSON.stringify(review)):JSON.stringify(review)));}
else {console.error('Unexpected gh command',args);process.exit(1);}
`
  await fs.writeFile(path.join(bin, "gh"), mock, { mode: 0o755 })
  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` }
  const before = await fs.readFile(bodyPath, "utf8")
  const status = call(["status", "--pr", "17"], cwd, env)
  assert((await fs.readFile(bodyPath, "utf8")) === before && (await fs.readFile(path.join(cwd, "edit-count"), "utf8")) === "0", "status --pr must be read-only")
  assert(status.reviewPacket.prDescriptionSection.includes(choice.id) && !status.reviewPacket.prDescriptionSection.includes(old.id), "publish current intent, not historical choices")
  assert(status.reviewPacket.omittedHistoricalChoiceCount === 1, "old choices remain recoverable locally")
  assert(status.reviewPacket.githubReviews.observations.length === 2, "generic PR approval does not decide a choice")
  assert(status.reviewPacket.githubReviews.observations[0].headStatus === "current-head" && status.reviewPacket.githubReviews.observations[0].attribution === "github-account-not-human-authentication", "explicit review at head is an attributed observation only")
  assert(status.reviewPacket.githubReviews.observations[1].headStatus === "earlier-head", "old commit must remain visibly old")
  assert(status.reviewPacket.choices.find((c) => c.id === choice.id).needsHumanConfirmation, "observed GitHub account is not automatic human confirmation")

  const published = call(["status", "--pr", "17", "--publish-review"], cwd, env)
  assert(published.reviewPacket.publication.status === "published", "explicit publication reports result")
  assert((await fs.readFile(bodyPath, "utf8")).startsWith(before), "preserve existing PR text")
  assert((await fs.readFile(path.join(cwd, "edit-count"), "utf8")) === "1", "published once")
  const again = call(["status", "--pr", "17", "--publish-review"], cwd, env)
  assert(again.reviewPacket.publication.status === "unchanged" && (await fs.readFile(path.join(cwd, "edit-count"), "utf8")) === "1", "republication is idempotent")

  await fs.writeFile(bodyPath, `Human edit\n\n${await fs.readFile(bodyPath, "utf8")}`)
  call(["clarify", "--review-choice", choice.id, "--impact", "material", "--reason", "Now affects public token export"], cwd)
  const refreshed = call(["status", "--pr", "17", "--publish-review"], cwd, env)
  assert(refreshed.reviewPacket.publication.status === "published", "updated assessment refreshes the managed section")
  assert((await fs.readFile(bodyPath, "utf8")).startsWith("Human edit\n\nHuman-owned introduction") &&
    (await fs.readFile(bodyPath, "utf8")).includes("Now affects public token export"), "preserve unrelated human edits while replacing only the managed block")
  await fs.writeFile(bodyPath, "Human edit\n<!-- synth:agent-choices:start -->")
  const malformed = runSynth(["first-contact", "status", "--pr", "17", "--publish-review"], cwd, { env })
  assert(malformed.status !== 0 && (await fs.readFile(bodyPath, "utf8")).endsWith("<!-- synth:agent-choices:start -->"), "damaged marker must not overwrite the PR")
  await fs.writeFile(bodyPath, before)
  pr.headRefOid = "0".repeat(40)
  await fs.writeFile(path.join(cwd, "pr.json"), JSON.stringify(pr))
  const mismatch = runSynth(["first-contact", "status", "--pr", "17", "--publish-review"], cwd, { env })
  assert(mismatch.status !== 0 && (await fs.readFile(bodyPath, "utf8")) === before, "mismatched PR head must not publish")
})
console.log("[PASS] pending material choices and bounded, opt-in PR description publication")
