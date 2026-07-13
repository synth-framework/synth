#!/usr/bin/env node
// ============================================================
// Version Synchronization Verification
// ============================================================
// Ensures package.json, CHANGELOG.md, and the latest Git tag
// agree on the current version. Supports prerelease identifiers.
//
// Usage: node scripts/verify-version-sync.js
// ============================================================

import { promises as fs } from "fs"
import path from "path"
import { spawnSync } from "child_process"

const PACKAGE_PATH = path.join(process.cwd(), "package.json")
const CHANGELOG_PATH = path.join(process.cwd(), "CHANGELOG.md")

function isValidVersion(version) {
  return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/.test(version)
}

async function readPackageVersion() {
  const packageJson = JSON.parse(await fs.readFile(PACKAGE_PATH, "utf-8"))
  return packageJson.version
}

async function readChangelogVersion() {
  const content = await fs.readFile(CHANGELOG_PATH, "utf-8")
  // Match headings like ## [2.0.0] or ## 2.0.0 or ## [2.0.0-rc.1]
  const match = content.match(/##\s+\[?(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)\]?/)
  return match ? match[1] : null
}

function readLatestGitTag() {
  const result = spawnSync("git", ["describe", "--tags", "--abbrev=0"], {
    encoding: "utf-8",
    timeout: 10000,
  })
  if (result.status !== 0 || !result.stdout.trim()) {
    return null
  }
  const tag = result.stdout.trim()
  return tag.startsWith("v") ? tag.slice(1) : tag
}

async function main() {
  const packageVersion = await readPackageVersion()
  const changelogVersion = await readChangelogVersion()
  const tagVersion = readLatestGitTag()

  console.log("Version synchronization check:")
  console.log(`  package.json: ${packageVersion}`)
  console.log(`  CHANGELOG.md: ${changelogVersion || "not found"}`)
  console.log(`  latest tag:   ${tagVersion || "none"}`)

  const errors = []

  if (!isValidVersion(packageVersion)) {
    errors.push(`package.json version "${packageVersion}" is not a valid semantic version`)
  }

  if (changelogVersion && changelogVersion !== packageVersion) {
    errors.push(`CHANGELOG.md version ${changelogVersion} does not match package.json ${packageVersion}`)
  }

  if (tagVersion && tagVersion !== packageVersion) {
    errors.push(`Latest tag ${tagVersion} does not match package.json ${packageVersion}`)
  }

  if (errors.length === 0) {
    console.log("✅ Version sources are synchronized.")
    process.exit(0)
  }

  console.log("❌ Version mismatch detected:")
  for (const err of errors) {
    console.log(`  - ${err}`)
  }
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
