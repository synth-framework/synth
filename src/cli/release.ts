// ============================================================
// CLI: Release (EXP-RELEASE-001)
// ============================================================
// Deterministic, operator-approved release versioning.
//
// Reads the current version from package.json and the latest git tag,
// analyses conventional commits since that tag, proposes a semver bump,
// and — on --approve — updates package.json, prepends CHANGELOG.md,
// commits, and creates an annotated git tag. npm publish remains a
// CI concern triggered by tag push.
//
// Usage:
//   synth release [--dry-run] [--approve] [--bump patch|minor|major]
// ============================================================

import { spawnSync } from "child_process"
import fs from "node:fs/promises"
import path from "node:path"
import { printJson, printError } from "./print.js"

export type BumpLevel = "patch" | "minor" | "major"

interface Commit {
  hash: string
  subject: string
  body: string
}

interface ReleasePlan {
  status: string
  kind: string
  currentVersion: string
  latestTag?: string
  nextVersion: string
  bump: BumpLevel
  commitsSinceTag: Commit[]
  changes: {
    added: string[]
    changed: string[]
    deprecated: string[]
    removed: string[]
    fixed: string[]
    security: string[]
    other: string[]
  }
  actions: string[]
  approved: boolean
  note: string
}

function runGit(args: string[], cwd: string): { stdout: string; stderr: string; status: number } {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf-8",
    timeout: 30000,
  })
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status ?? 1,
  }
}

async function readPackageVersion(cwd: string): Promise<string> {
  const packagePath = path.join(cwd, "package.json")
  const content = await fs.readFile(packagePath, "utf-8")
  const pkg = JSON.parse(content) as Record<string, unknown>
  const version = pkg.version
  if (typeof version !== "string") {
    throw new Error("package.json missing version field")
  }
  return version
}

async function writePackageVersion(cwd: string, version: string): Promise<void> {
  const packagePath = path.join(cwd, "package.json")
  const content = await fs.readFile(packagePath, "utf-8")
  const pkg = JSON.parse(content) as Record<string, unknown>
  pkg.version = version
  await fs.writeFile(packagePath, JSON.stringify(pkg, null, 2) + "\n", "utf-8")
}

const SEMVER_TAG_RE = /^v?\d+\.\d+\.\d+$/

function parseSemver(tag: string): { prefix: string; major: number; minor: number; patch: number } | undefined {
  const match = tag.match(/^(v?)(\d+)\.(\d+)\.(\d+)$/)
  if (!match) return undefined
  return {
    prefix: match[1],
    major: Number(match[2]),
    minor: Number(match[3]),
    patch: Number(match[4]),
  }
}

function compareSemverDesc(a: string, b: string): number {
  const av = parseSemver(a)
  const bv = parseSemver(b)
  if (!av && !bv) return a.localeCompare(b)
  if (!av) return 1
  if (!bv) return -1
  if (av.major !== bv.major) return bv.major - av.major
  if (av.minor !== bv.minor) return bv.minor - av.minor
  return bv.patch - av.patch
}

function getLatestTag(cwd: string): string | undefined {
  const result = runGit(["tag", "--list", "--sort=-v:refname"], cwd)
  if (result.status !== 0) return undefined
  const tags = result.stdout.split("\n").map((t) => t.trim()).filter(Boolean)
  const semverTags = tags.filter((t) => SEMVER_TAG_RE.test(t)).sort(compareSemverDesc)
  return semverTags[0]
}

function parseCommits(logText: string): Commit[] {
  const commits: Commit[] = []
  const entries = logText.split("\u0000").filter((entry) => entry.trim())
  for (const entry of entries) {
    const lines = entry.trim().split("\n")
    const hash = lines[0]?.trim() || ""
    const subject = lines[1]?.trim() || ""
    const body = lines.slice(2).join("\n").trim()
    if (hash && subject) {
      commits.push({ hash, subject, body })
    }
  }
  return commits
}

function getCommitsSinceTag(cwd: string, tag?: string): Commit[] {
  const range = tag ? `${tag}..HEAD` : "HEAD"
  const result = runGit(
    ["log", range, `--format=%H%n%s%n%b%x00`],
    cwd,
  )
  if (result.status !== 0) return []
  return parseCommits(result.stdout)
}

function classifyCommit(subject: string, body: string): keyof ReleasePlan["changes"] {
  const text = `${subject}\n${body}`.toLowerCase()
  if (text.includes("security")) return "security"
  if (subject.startsWith("fix") || subject.startsWith("bugfix")) return "fixed"
  if (subject.startsWith("feat") || subject.startsWith("feature") || subject.startsWith("add")) return "added"
  if (subject.startsWith("deprecate")) return "deprecated"
  if (subject.startsWith("remove") || subject.startsWith("delete")) return "removed"
  if (subject.startsWith("change") || subject.startsWith("update") || subject.startsWith("refactor")) return "changed"
  return "other"
}

function determineBump(commits: Commit[]): BumpLevel {
  let bump: BumpLevel = "patch"
  for (const commit of commits) {
    const text = `${commit.subject}\n${commit.body}`
    if (/BREAKING CHANGE/i.test(text) || /\bfeat!:|fix!:|refactor!:|BREAKING-CHANGE/i.test(text)) {
      return "major"
    }
    if (/^feat(\(.+\))?:/i.test(commit.subject) || commit.subject.startsWith("feature:")) {
      bump = "minor"
    }
  }
  return bump
}

function bumpVersion(version: string, bump: BumpLevel): string {
  const parts = version.replace(/^v/, "").split(".").map(Number)
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid semver version: ${version}`)
  }
  const [major, minor, patch] = parts
  switch (bump) {
    case "major":
      return `${major + 1}.0.0`
    case "minor":
      return `${major}.${minor + 1}.0`
    case "patch":
      return `${major}.${minor}.${patch + 1}`
  }
}

function groupChanges(commits: Commit[]): ReleasePlan["changes"] {
  const changes: ReleasePlan["changes"] = {
    added: [],
    changed: [],
    deprecated: [],
    removed: [],
    fixed: [],
    security: [],
    other: [],
  }
  for (const commit of commits) {
    const key = classifyCommit(commit.subject, commit.body)
    changes[key].push(commit.subject)
  }
  return changes
}

function formatChangelogEntry(version: string, date: string, changes: ReleasePlan["changes"]): string {
  const lines: string[] = []
  lines.push(`## [${version}] — ${date}`)
  lines.push("")

  const sections: [keyof ReleasePlan["changes"], string][] = [
    ["added", "### Added"],
    ["changed", "### Changed"],
    ["deprecated", "### Deprecated"],
    ["removed", "### Removed"],
    ["fixed", "### Fixed"],
    ["security", "### Security"],
    ["other", "### Other"],
  ]

  for (const [key, heading] of sections) {
    const items = changes[key]
    if (items.length > 0) {
      lines.push(heading)
      lines.push("")
      for (const item of items) {
        lines.push(`- ${item}`)
      }
      lines.push("")
    }
  }

  return lines.join("\n")
}

async function updateChangelog(cwd: string, version: string, changes: ReleasePlan["changes"]): Promise<void> {
  const changelogPath = path.join(cwd, "CHANGELOG.md")
  let existing: string
  try {
    existing = await fs.readFile(changelogPath, "utf-8")
  } catch {
    existing = "# Changelog\n\n"
  }

  const date = new Date().toISOString().split("T")[0]
  const entry = formatChangelogEntry(version, date, changes)

  // Insert the new entry right after the Unreleased section header.
  const unreleasedMarker = "## [Unreleased]\n"
  const index = existing.indexOf(unreleasedMarker)
  if (index === -1) {
    existing = `${existing.trim()}\n\n${entry}\n`
  } else {
    const insertAt = index + unreleasedMarker.length
    existing = existing.slice(0, insertAt) + "\n" + entry + "\n" + existing.slice(insertAt)
  }

  await fs.writeFile(changelogPath, existing, "utf-8")
}

function commitAndTag(cwd: string, version: string): { commitHash: string; tagName: string } {
  const tagName = `v${version}`
  const commitResult = runGit(
    ["commit", "-a", "-m", `chore(release): ${tagName}`],
    cwd,
  )
  if (commitResult.status !== 0) {
    throw new Error(`Failed to commit release: ${commitResult.stderr}`)
  }
  const hashResult = runGit(["rev-parse", "HEAD"], cwd)
  const commitHash = hashResult.stdout.trim()

  const tagResult = runGit(
    ["tag", "-a", tagName, "-m", `Release ${tagName}`],
    cwd,
  )
  if (tagResult.status !== 0) {
    throw new Error(`Failed to create tag: ${tagResult.stderr}`)
  }

  return { commitHash, tagName }
}

function buildPlan(
  currentVersion: string,
  latestTag: string | undefined,
  commits: Commit[],
  requestedBump: BumpLevel | undefined,
): ReleasePlan {
  const bump = requestedBump ?? determineBump(commits)
  const nextVersion = bumpVersion(currentVersion, bump)
  const changes = groupChanges(commits)

  const actions = [
    `Update package.json version to ${nextVersion}`,
    `Prepend CHANGELOG.md entry for ${nextVersion}`,
    `Commit changes as "chore(release): v${nextVersion}"`,
    `Create annotated git tag "v${nextVersion}"`,
    "Push the tag to trigger CI npm publish",
  ]

  return {
    status: "ok",
    kind: "ReleasePlan",
    currentVersion,
    latestTag,
    nextVersion,
    bump,
    commitsSinceTag: commits,
    changes,
    actions,
    approved: false,
    note: "Dry-run: no files were modified. Run with --approve to execute.",
  }
}

/**
 * CLI handler for `synth release`.
 */
export async function cmdRelease(flags: Record<string, string | boolean>): Promise<void> {
  const cwd = process.cwd()
  const dryRun = flags["dry-run"] === true || flags["dry-run"] === "true" || flags.approve !== true
  const approve = flags.approve === true || flags.approve === "true"
  const requestedBump =
    typeof flags.bump === "string" && ["patch", "minor", "major"].includes(flags.bump)
      ? (flags.bump as BumpLevel)
      : undefined

  let currentVersion: string
  try {
    currentVersion = await readPackageVersion(cwd)
  } catch (err) {
    printError(`Failed to read package.json version: ${err instanceof Error ? err.message : String(err)}`)
    return
  }

  const latestTag = getLatestTag(cwd)
  const commits = getCommitsSinceTag(cwd, latestTag)

  if (commits.length === 0) {
    printJson({
      status: "ok",
      kind: "ReleasePlan",
      currentVersion,
      latestTag,
      nextVersion: currentVersion,
      bump: undefined,
      commitsSinceTag: [],
      changes: { added: [], changed: [], deprecated: [], removed: [], fixed: [], security: [], other: [] },
      actions: [],
      approved: false,
      note: "No commits since the latest tag. Nothing to release.",
    })
    return
  }

  const plan = buildPlan(currentVersion, latestTag, commits, requestedBump)

  if (!approve) {
    printJson(plan)
    return
  }

  try {
    await writePackageVersion(cwd, plan.nextVersion)
    await updateChangelog(cwd, plan.nextVersion, plan.changes)
    const { commitHash, tagName } = commitAndTag(cwd, plan.nextVersion)

    printJson({
      ...plan,
      approved: true,
      commitHash,
      tagName,
      note: `Released ${tagName}. Push the tag to trigger CI npm publish.`,
    })
  } catch (err) {
    printError(`Release failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}
