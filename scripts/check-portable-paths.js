#!/usr/bin/env node
import { execFileSync } from "node:child_process"
import { portablePathProblems } from "./lib/portable-paths.js"

// The index is what a commit/check-out receives. NUL records handle whitespace
// and newlines without hiding an invalid path behind Git's quoted output.
const paths = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean)
const problems = portablePathProblems(paths)
if (problems.length) {
  console.error(`Portable paths: FAIL\n${problems.join("\n")}`)
  process.exitCode = 1
} else console.log(`Portable paths: PASS (${paths.length} tracked paths; Win32 names and case collisions)`)
