/* Read-only, account-attributed scope evidence. This is not human authentication,
 * an Alignment Contract, or permission to mutate the runtime. */
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import path from "node:path"

function run(cwd: string, executable: string, args: string[], maxBuffer = 2 * 1024 * 1024): string {
  return execFileSync(executable, args, { cwd, encoding: "utf8", timeout: 15000, maxBuffer, stdio: ["ignore", "pipe", "pipe"] }).trimEnd()
}
function sha256(text: string): string { return createHash("sha256").update(text, "utf8").digest("hex") }
function projectPath(value: string): string {
  if (!value || value.startsWith("/") || value.includes("\\") || value.split("/").some(part => !part || part === "." || part === "..") || /[:\r\n\0]/.test(value)) {
    throw new Error("Evidence paths must be ordinary repository-relative paths.")
  }
  return value
}
function gitText(cwd: string, revision: string, relative: string): string {
  projectPath(relative)
  const tree = run(cwd, "git", ["ls-tree", revision, "--", relative])
  if (!/^100644 blob [0-9a-f]{40,64}\t/.test(tree) && !/^100755 blob [0-9a-f]{40,64}\t/.test(tree)) {
    throw new Error(`Reviewed source is not a regular tracked file: ${relative}`)
  }
  return execFileSync("git", ["show", `${revision}:${relative}`], {
    cwd, encoding: "utf8", timeout: 15000, maxBuffer: 2 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"],
  })
}
function repoFromOrigin(origin: string): string {
  const match = origin.match(/^(?:https:\/\/github\.com\/|git@github\.com:)([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?\/?$/)
  if (!match) throw new Error("Origin must be an unambiguous github.com repository.")
  return match[1]
}

export interface ScopeEvidenceInput {
  pr: number
  commentId: number
  reviewedCommit: string
  packetPath: string
  expectedAccount: string
}

/** Binds the exact GitHub comment and six source-file bytes to the PR's
 * reviewed Git revision. Does not infer consent to runtime approval. */
export function inspectAlignmentScopeEvidence(cwd: string, input: ScopeEvidenceInput) {
  if (!Number.isSafeInteger(input.pr) || input.pr < 1 || !Number.isSafeInteger(input.commentId) || input.commentId < 1 ||
      !/^[0-9a-f]{40}$/.test(input.reviewedCommit) || !/^[A-Za-z0-9-]+$/.test(input.expectedAccount)) {
    throw new Error("PR, comment ID, reviewed commit and account must be explicit and valid.")
  }
  const packetPath = projectPath(input.packetPath)
  const root = run(cwd, "git", ["rev-parse", "--show-toplevel"])
  if (path.resolve(root) !== path.resolve(cwd)) throw new Error("Inspect from the Git repository root to avoid ambiguous source paths.")
  const repo = repoFromOrigin(run(cwd, "git", ["remote", "get-url", "origin"]))
  const pr = JSON.parse(run(cwd, "gh", ["pr", "view", String(input.pr), "--repo", repo, "--json", "number,url,state,headRefOid,headRefName"])) as {
    number: number; url: string; state: string; headRefOid: string; headRefName: string
  }
  const head = run(cwd, "git", ["rev-parse", "HEAD"])
  const branch = run(cwd, "git", ["symbolic-ref", "--quiet", "--short", "HEAD"])
  if (pr.number !== input.pr || pr.url !== `https://github.com/${repo}/pull/${input.pr}` || pr.state !== "OPEN" ||
      pr.headRefOid !== head || pr.headRefName !== branch) throw new Error("PR repository, branch or head does not match this checkout.")
  try { run(cwd, "git", ["merge-base", "--is-ancestor", input.reviewedCommit, head]) }
  catch { throw new Error("Reviewed commit is not an ancestor of the matching PR head.") }

  const comment = JSON.parse(run(cwd, "gh", ["api", `repos/${repo}/issues/comments/${input.commentId}`])) as {
    id: number; html_url: string; issue_url: string; body: string; created_at: string; updated_at: string;
    user: { login: string }
  }
  const commentUrl = `${pr.url}#issuecomment-${input.commentId}`
  if (comment.id !== input.commentId || comment.issue_url !== `https://api.github.com/repos/${repo}/issues/${input.pr}` ||
      comment.html_url !== commentUrl || comment.user?.login !== input.expectedAccount || !comment.body ||
      !comment.created_at || !comment.updated_at) throw new Error("Comment is missing or is not attributed to the expected account on this PR.")
  if (comment.updated_at !== comment.created_at) throw new Error("Comment was edited after posting; re-review its exact scope before using it.")
  const scopeStatement = comment.body.match(/^I confirm the Mission meaning and proposed first Expedition scope described in `([^`]+)` at reviewed head `([0-9a-f]{40})`/m)
  if (!scopeStatement || scopeStatement[1] !== packetPath || scopeStatement[2] !== input.reviewedCommit) {
    throw new Error("Comment does not explicitly confirm this packet's Mission and first-Expedition scope at the reviewed commit.")
  }
  const packet = gitText(cwd, input.reviewedCommit, packetPath)
  const register = [...packet.matchAll(/^\| (S[1-6]) \| \[[^\]]+\]\(([^)]+)\) — `([0-9a-f]{64})`/gm)]
  if (register.length !== 6 || new Set(register.map(item => item[1])).size !== 6) throw new Error("Reviewed packet must contain six distinct source hash entries.")
  const sources = register.map(([, label, link, hash]) => {
    const relative = projectPath(path.posix.normalize(path.posix.join(path.posix.dirname(packetPath), link)))
    if (sha256(gitText(cwd, input.reviewedCommit, relative)) !== hash) throw new Error(`Reviewed source hash does not match ${label}: ${relative}`)
    if (sha256(gitText(cwd, head, relative)) !== hash) throw new Error(`Source changed after scope response; recheck ${label}: ${relative}`)
    return { label, path: relative, sha256: hash }
  })
  const commitments = [...packet.matchAll(/^\| (E[1-4]) — ([^|]+) \|/gm)].map(([, id, title]) => ({ id, title: title.trim() }))
  if (commitments.length !== 4 || new Set(commitments.map(item => item.id)).size !== 4) {
    throw new Error("Reviewed packet must name four distinct first-slice commitments.")
  }
  // Re-read metadata after Git work; a concurrent edit must fail rather than
  // silently bless text that was not the text returned at the first lookup.
  const second = JSON.parse(run(cwd, "gh", ["api", `repos/${repo}/issues/comments/${input.commentId}`])) as typeof comment
  if (second.body !== comment.body || second.updated_at !== comment.updated_at) throw new Error("Comment changed during inspection; retry before relying on it.")
  const currentPacketHash = sha256(gitText(cwd, head, packetPath))
  return {
    evidenceStatus: "account-attributed-scope-observation" as const,
    attribution: "github-account-not-human-authentication" as const,
    runtimeAuthorization: false as const,
    pr: pr.url,
    prHead: head,
    reviewedCommit: input.reviewedCommit,
    packetPath,
    packetSha256: sha256(packet),
    currentPacketSha256: currentPacketHash,
    packetChangedAfterReview: currentPacketHash !== sha256(packet),
    sources,
    reviewedCommitments: commitments,
    commentHeadings: [...comment.body.matchAll(/^### (.+)$/gm)].map(match => match[1]),
    comment: { id: comment.id, url: commentUrl, account: comment.user.login, body: comment.body,
      bodySha256: sha256(comment.body), createdAt: comment.created_at, updatedAt: comment.updated_at },
    note: currentPacketHash === sha256(packet)
      ? "Exact response captured as an observation, not runtime approval. Its meaning and amendments require review."
      : "Packet changed after the referenced review head. Only the original Git blob is bound; inspect later changes before any runtime approval.",
  }
}
