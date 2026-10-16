// Synthetic pre-merge review: agent choices stay attributed, triviality is a
// reviewer assessment, and material human responses are never authenticated
// merely because an agent passed a CLI flag. No real PR or approval occurs.
import fs from "node:fs/promises"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { assert } from "./helpers/assert.js"
import { parseJson, runSynth, withTempDir } from "./helpers/cli-harness.js"

const call = (args, cwd, options) => {
  const result = runSynth(["first-contact", ...args], cwd, options)
  assert(result.status === 0, `${args.join(" ")} failed: ${result.stdout}\n${result.stderr}`)
  return parseJson(result.stdout)
}

await withTempDir("synth-review-", async (cwd) => {
  call(["start", "Render specimen boards"], cwd)
  const minor = call(["clarify", "--agent-choice", "Wrap long labels", "--reason", "Prevent clipping", "--scope", "card layout"], cwd).choice
  const major = call(["clarify", "--agent-choice", "Persist layout in a database", "--reason", "Keep positions between sessions", "--scope", "storage format"], cwd).choice

  const invalid = runSynth(["first-contact", "clarify", "--review-choice", major.id, "--impact", "material", "--reason", "Changes stored format", "--decision", "keep"], cwd)
  assert(invalid.status !== 0, "material keep cannot be attributed to a human without the response text")
  assert(call(["status"], cwd).choiceReviews.length === 0, "invalid review must not write a record")

  const trivial = call(["clarify", "--review-choice", minor.id, "--impact", "trivial", "--reason", "Only card spacing; cheap to undo"], cwd)
  assert(trivial.review.impact === "trivial" && trivial.review.disposition === "recorded-agent-choice", "trivial review records, but does not relabel the agent choice as human-selected")
  assert(trivial.review.attribution === "cli-caller-unverified", "CLI cannot attest reviewer identity")

  const material = call(["clarify", "--review-choice", major.id, "--impact", "material", "--reason", "Public stored format is costly to reverse", "--decision", "defer", "--human-response", "Synthetic human: defer storage design until next slice"], cwd)
  assert(material.review.disposition === "defer" && material.review.humanResponse.includes("defer"), "record the exact supplied response")
  assert(material.review.attribution === "human-response-supplied-unverified", "a CLI flag is not proof of human identity")
  const status = call(["status"], cwd)
  assert(status.openAgentChoices.length === 2 && status.choiceReviews.length === 2, "original choices remain visible next to reviews")
  assert(status.choiceReviewStatus === "material-human-confirmation-needed", "unverified material response is not a completed human review")
  assert(status.reviewPacket.choices.find((c) => c.id === minor.id).review.disposition === "recorded-agent-choice", "trivial assessment visible at review")
  assert(status.reviewPacket.choices.find((c) => c.id === major.id).review.attribution === "human-response-supplied-unverified", "material decision remains labelled unverified")
  assert(status.reviewPacket.choices.find((c) => c.id === major.id).review.disposition === "defer", "deferred scope is not called approved")

  // A later assessment supersedes the previous one without erasing it.
  call(["clarify", "--review-choice", minor.id, "--impact", "material", "--reason", "Label rules became part of a public format", "--decision", "change", "--human-response", "Synthetic human: change the export contract"], cwd)
  call(["clarify", "--review-choice", major.id, "--impact", "material", "--reason", "Storage format is now ready for discussion", "--decision", "keep", "--human-response", "Synthetic human: keep the storage format"], cwd)
  const revised = call(["status"], cwd)
  assert(revised.choiceReviews.length === 4, "review history is append-only within the draft")
  assert(revised.reviewPacket.choices.find((c) => c.id === major.id).review.disposition === "keep", "later keep assessment supersedes defer, without erasing it")
  assert(revised.reviewPacket.choices.find((c) => c.id === minor.id).review.disposition === "change", "latest review governs the packet without rewriting history")
  assert(call(["start", "A new idea"], cwd).choiceReviews.length === 4, "new request must not discard reviews")

  const absent = call(["status", "--pr", "123"], cwd)
  assert(absent.reviewPacket.pr.status === "unavailable", "without a Git checkout and verified PR metadata do not invent a PR binding")
})

// A POSIX executable mocks gh for the positive PR-head check. Windows still
// exercises the portable no-PR path above; do not try to exec a .cmd via spawn.
if (process.platform !== "win32") await withTempDir("synth-review-pr-", async (cwd) => {
  const git = (args) => {
    const r = spawnSync("git", args, { cwd, encoding: "utf8" })
    assert(r.status === 0, `git ${args.join(" ")} failed: ${r.stderr}`)
    return r.stdout.trim()
  }
  git(["init", "-q"])
  git(["config", "user.email", "fixture@example.invalid"])
  git(["config", "user.name", "Synthetic Fixture"])
  git(["checkout", "-q", "-b", "fixture/review"])
  git(["remote", "add", "origin", "https://github.com/example/repo.git"])
  await fs.writeFile(path.join(cwd, "README.md"), "# Synthetic review\n")
  git(["add", "README.md"])
  git(["commit", "-qm", "Synthetic review base"])
  call(["start", "A reviewable fixture"], cwd)
  const choice = call(["clarify", "--agent-choice", "Keep original names", "--reason", "Existing tests depend on them", "--scope", "public API"], cwd).choice
  const sha = git(["rev-parse", "HEAD"])

  // Mock gh's read-only PR view; a real invocation must prove both branch and
  // exact head SHA, never just accept a caller-supplied PR number.
  const bin = path.join(cwd, "mock-bin")
  await fs.mkdir(bin)
  const gh = path.join(bin, "gh")
  const response = { number: 17, state: "OPEN", headRefName: "fixture/review", headRefOid: sha, baseRefName: "main", url: "https://github.com/example/repo/pull/17" }
  await fs.writeFile(gh, `#!/bin/sh\nprintf '%s\\n' '${JSON.stringify(response)}'\n`, { mode: 0o755 })
  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` }
  const linked = call(["status", "--pr", "17"], cwd, { env })
  assert(linked.reviewPacket.pr.status === "verified-head" && linked.reviewPacket.pr.headCommit === sha, "review packet should bind only to matching PR head")
  assert(linked.reviewPacket.choices.some((c) => c.id === choice.id), "choice appears in PR-bound review packet")
  assert(linked.reviewPacket.choices.find((c) => c.id === choice.id).needsImpactAssessment, "unassessed choice must remain visible")
  git(["remote", "remove", "origin"])
  const noRemote = call(["status", "--pr", "17"], cwd, { env })
  assert(noRemote.reviewPacket.pr.status === "unavailable", "no origin is not a verified PR repository")
  git(["remote", "add", "origin", "https://github.com/example/repo.git"])
  response.url = "https://github.com/other/repo/pull/17"
  await fs.writeFile(gh, `#!/bin/sh\nprintf '%s\\n' '${JSON.stringify(response)}'\n`, { mode: 0o755 })
  const wrongRepo = call(["status", "--pr", "17"], cwd, { env })
  assert(wrongRepo.reviewPacket.pr.status === "mismatch", "matching branch and SHA in a different repo must not bind")
  response.url = "https://github.com/example/repo/pull/17"
  response.headRefOid = "0".repeat(40)
  await fs.writeFile(gh, `#!/bin/sh\nprintf '%s\\n' '${JSON.stringify(response)}'\n`, { mode: 0o755 })
  const stale = call(["status", "--pr", "17"], cwd, { env })
  assert(stale.reviewPacket.pr.status === "mismatch", "a different PR head cannot attest this checkout")
})

console.log("[PASS] pre-merge choice assessments and conditional PR-head review packet remain honest")
