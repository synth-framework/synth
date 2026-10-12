#!/usr/bin/env node
// ============================================================
// check-artifact-policy — CI guard for the artifact classification
// ============================================================
// The policy table lives in src/state/artifact-policy.ts. This script asserts
// that the repository actually obeys it:
//
//   1. no tracked path is classified derived/cache/legacy (must not be in git)
//   2. no tracked path is ignored (a tracked file is never "ignored"; a rule
//      that says otherwise is a lie that breaks `git add` — audit D3/D4)
//   3. every committable class (durable, input) is NOT ignored
//   4. every non-committable class IS ignored
//   5. --ci: the branch policy is back at `mode: enforce` (no suspended
//      window may reach main)
//
// Usage: node scripts/check-artifact-policy.js [--ci]
// Exit: 0 = policy holds, 1 = violations (printed as a report)

import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const POLICY_MODULE = "../dist/state/artifact-policy.js"

const ci = process.argv.includes("--ci")

let policy
try {
  policy = await import(POLICY_MODULE)
} catch (error) {
  console.error(`check-artifact-policy: cannot load ${POLICY_MODULE} — run \`npm run build\` first.`)
  console.error(String(error?.message ?? error))
  process.exit(1)
}

const { ARTIFACT_RULES, classifyArtifact, isCommittableArtifact } = policy

function git(args, { input } = {}) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf-8",
    input,
    stdio: input === undefined ? ["pipe", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
  })
}

function trackedPaths() {
  const raw = git(["ls-files", "-z"])
  return raw.split("\0").filter(Boolean)
}

function ignoredAmong(paths) {
  if (paths.length === 0) return new Set()
  try {
    const out = git(["check-ignore", "--no-index", "--stdin"], { input: paths.join("\n") })
    return new Set(out.split("\n").map((line) => line.trim()).filter(Boolean))
  } catch (error) {
    // git check-ignore exits 1 when nothing is ignored.
    if (error?.status === 1) return new Set()
    throw error
  }
}

function isIgnored(probe) {
  try {
    git(["check-ignore", "--no-index", "--", probe])
    return true
  } catch (error) {
    if (error?.status === 1) return false
    throw error
  }
}

function probePath(rule) {
  if (rule.probe) return rule.probe
  return rule.pattern.endsWith("/") ? `${rule.pattern}probe-artifact-policy.json` : rule.pattern
}

const failures = []
const notes = []

// 1 + 2 — the index must not contain non-committable or ignored paths.
const tracked = trackedPaths()
const misclassified = tracked.filter((relPath) => !isCommittableArtifact(relPath) && classifyArtifact(relPath) !== undefined)
if (misclassified.length > 0) {
  failures.push({
    check: "tracked non-committable artifacts",
    detail: misclassified,
    hint: "git rm --cached <path> (keep the file on disk; it is regenerable/legacy)",
  })
}

const ignoredTracked = [...ignoredAmong(tracked)].sort()
if (ignoredTracked.length > 0) {
  failures.push({
    check: "tracked but ignored",
    detail: ignoredTracked,
    hint: "remove the .gitignore rule (a tracked file must never be ignored) or untrack the file",
  })
}

// 3 + 4 — .gitignore must agree with the policy, class by class.
const wronglyIgnored = []
const wronglyTracked = []
for (const rule of ARTIFACT_RULES) {
  const probe = probePath(rule)
  const ignored = isIgnored(probe)
  if (isCommittableArtifact(probe) && ignored) {
    wronglyIgnored.push(`${rule.pattern} (${rule.class}) — ${rule.note}`)
  }
  if (!isCommittableArtifact(probe) && !ignored) {
    wronglyTracked.push(`${rule.pattern} (${rule.class}) — ${rule.note}`)
  }
}
if (wronglyIgnored.length > 0) {
  failures.push({
    check: "committable artifacts are ignored",
    detail: wronglyIgnored,
    hint: "remove the rule from .gitignore (durable/input artifacts must be committable)",
  })
}
if (wronglyTracked.length > 0) {
  failures.push({
    check: "non-committable artifacts are not ignored",
    detail: wronglyTracked,
    hint: "add the pattern to .gitignore (derived/cache/legacy artifacts must never be committed)",
  })
}

// 5 — CI mode: the branch-policy suspension must not reach main.
if (ci) {
  let mode = "unknown"
  try {
    const config = fs.readFileSync(path.join(ROOT, ".synth", "config.yaml"), "utf-8")
    const match = config.match(/branchPolicy:[\s\S]*?mode:\s*(\S+)/)
    mode = match ? match[1] : "unknown"
  } catch {
    failures.push({
      check: "branch policy config",
      detail: [".synth/config.yaml is missing"],
      hint: "restore the committed config",
    })
  }
  if (mode !== "enforce") {
    failures.push({
      check: "branch policy suspended",
      detail: [`git.branchPolicy.mode = ${mode}, expected enforce`],
      hint: "this is the bootstrap window suspension — restore `mode: enforce` before merging",
    })
  } else {
    notes.push("branch policy: enforce")
  }
}

if (failures.length > 0) {
  console.error("check-artifact-policy: FAIL")
  for (const failure of failures) {
    console.error(`\n  ✗ ${failure.check}`)
    for (const line of failure.detail) console.error(`      ${line}`)
    console.error(`      → ${failure.hint}`)
  }
  process.exit(1)
}

const classCounts = ARTIFACT_RULES.reduce((acc, rule) => {
  acc[rule.class] = (acc[rule.class] ?? 0) + 1
  return acc
}, {})
const summary = Object.entries(classCounts)
  .map(([klass, count]) => `${klass}:${count}`)
  .join(" ")
console.log(`check-artifact-policy: PASS (${tracked.length} tracked paths; rules ${summary})`)
for (const note of notes) console.log(`  · ${note}`)
