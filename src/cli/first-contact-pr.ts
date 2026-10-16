/** Optional, ordinary GitHub PR presentation. Not lifecycle or reviewer authorization. */
import { execFileSync } from "node:child_process"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { mergeChoiceDescription } from "../first-contact/review/pr-description.js"

export interface VerifiedReviewPr {
  number: number
  url: string
  headCommit: string
  headBranch: string
}

function gh(cwd: string, args: string[]): string {
  return execFileSync("gh", args, {
    cwd, encoding: "utf8", timeout: 15000, maxBuffer: 2 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()
}

function prBody(cwd: string, pr: VerifiedReviewPr): string {
  const raw = gh(cwd, ["pr", "view", String(pr.number), "--json", "body,state,url,headRefOid,headRefName"])
  const data = JSON.parse(raw) as { body?: string; state?: string; url?: string; headRefOid?: string; headRefName?: string }
  if (data.state !== "OPEN" || data.url !== pr.url || data.headRefOid !== pr.headCommit ||
      data.headRefName !== pr.headBranch || typeof data.body !== "string") {
    throw new Error("PR changed or its description is unavailable; no description update was made.")
  }
  return data.body
}

/** Explicit opt-in only. Never replace text outside the owned markers. */
export async function publishChoiceDescription(cwd: string, pr: VerifiedReviewPr, section: string) {
  const oldBody = prBody(cwd, pr)
  const nextBody = mergeChoiceDescription(oldBody, section)
  if (nextBody === oldBody) return { status: "unchanged", url: pr.url, headCommit: pr.headCommit }
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-pr-review-"))
  try {
    const bodyFile = path.join(tempDir, "body.md")
    await fs.writeFile(bodyFile, nextBody, { mode: 0o600 })
    gh(cwd, ["pr", "edit", String(pr.number), "--body-file", bodyFile])
    if (prBody(cwd, pr) !== nextBody) throw new Error("PR description could not be verified after editing; inspect the PR before relying on the summary.")
    return { status: "published", url: pr.url, headCommit: pr.headCommit }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

type Decision = "keep" | "change" | "defer"
export interface GitHubReviewObservation {
  choiceId: string
  decision: Decision
  reviewerLogin: string
  reviewState: string
  reviewedCommit: string
  headStatus: "current-head" | "earlier-head"
  submittedAt: string
  url: string
  attribution: "github-account-not-human-authentication"
}

/** A review is an account-attributed observation, not verified human consent. */
export function readChoiceReviews(cwd: string, pr: VerifiedReviewPr, choiceIds: string[]) {
  const repo = new URL(pr.url).pathname.split("/").slice(1, 3).join("/")
  try {
    // gh --paginate runs jq once per API page. @json gives one JSON value
    // per review, including bodies containing newlines or quotes. gh versions
    // may print jq strings raw or JSON-quoted; accept both.
    const output = gh(cwd, ["api", "--paginate", `repos/${repo}/pulls/${pr.number}/reviews?per_page=100`, "--jq", ".[] | @json"])
    const ids = new Set(choiceIds)
    const observations: GitHubReviewObservation[] = []
    for (const line of output.split("\n").filter(Boolean)) {
      const parsed: unknown = JSON.parse(line)
      const review = (typeof parsed === "string" ? JSON.parse(parsed) : parsed) as {
        body?: string; state?: string; commit_id?: string; submitted_at?: string;
        html_url?: string; user?: { login?: string }
      }
      if (!review.body || !review.user?.login || !review.commit_id || !review.submitted_at || !review.html_url ||
          !["APPROVED", "COMMENTED", "CHANGES_REQUESTED"].includes(review.state ?? "")) continue
      for (const match of review.body.matchAll(/^SYNTH choice (choice-[a-zA-Z0-9-]+): (keep|change|defer)[ \t]*$/gm)) {
        if (!ids.has(match[1])) continue
        observations.push({
          choiceId: match[1], decision: match[2] as Decision, reviewerLogin: review.user.login,
          reviewState: review.state!, reviewedCommit: review.commit_id,
          headStatus: review.commit_id === pr.headCommit ? "current-head" : "earlier-head",
          submittedAt: review.submitted_at, url: review.html_url,
          attribution: "github-account-not-human-authentication",
        })
      }
    }
    return { status: "observed" as const, observations, note: "No reviewer is authorized by this lookup. A PR approval without an explicit choice-ID decision does not resolve a choice; PR descriptions are editable." }
  } catch {
    return { status: "unavailable" as const, observations: [], note: "GitHub review metadata could not be read; no reviewer decision was inferred." }
  }
}
