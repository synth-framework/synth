#!/usr/bin/env node
// ============================================================
// Website Synchronization Verification
// ============================================================
// Ensures the static website does not drift from the README and
// operator docs. This is intentionally a lightweight copy audit,
// not a full HTML generator.
//
// Usage: node scripts/verify-website-sync.js
// ============================================================

import { promises as fs } from "fs"
import path from "path"

const README_PATH = path.join(process.cwd(), "README.md")
const WEBSITE_DIR = path.join(process.cwd(), "website")
const INDEX_HTML_PATH = path.join(WEBSITE_DIR, "index.html")
const QUICK_START_HTML_PATH = path.join(WEBSITE_DIR, "quick-start.html")

async function readFile(filePath) {
  return fs.readFile(filePath, "utf-8")
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function extractTagline(readme) {
  // Match the blockquote tagline in README.md:
  // > **Humans explore. SYNTH remembers. AI executes deterministically.**
  const match = readme.match(/>\s*\*\*([^*]+)\*\*\s*$/m)
  return match ? match[1].trim() : null
}

async function main() {
  console.log("Verifying website synchronization...")

  const errors = []

  if (!(await fileExists(README_PATH))) {
    errors.push(`README.md not found at ${README_PATH}`)
  }
  if (!(await fileExists(INDEX_HTML_PATH))) {
    errors.push(`website/index.html not found at ${INDEX_HTML_PATH}`)
  }
  if (!(await fileExists(QUICK_START_HTML_PATH))) {
    errors.push(`website/quick-start.html not found at ${QUICK_START_HTML_PATH}`)
  }

  if (errors.length > 0) {
    console.log("❌ Website synchronization failed:")
    for (const err of errors) console.log(`  - ${err}`)
    process.exit(1)
  }

  const readme = await readFile(README_PATH)
  const indexHtml = await readFile(INDEX_HTML_PATH)
  const quickStartHtml = await readFile(QUICK_START_HTML_PATH)

  const tagline = extractTagline(readme)
  if (!tagline) {
    errors.push("Could not extract tagline from README.md")
  } else if (!indexHtml.includes(tagline)) {
    errors.push(`index.html is missing README tagline: "${tagline}"`)
  }

  const installCommand = "npm install -g @synth-framework/synth"
  if (!indexHtml.includes(installCommand)) {
    errors.push(`index.html is missing canonical install command: ${installCommand}`)
  }
  if (!quickStartHtml.includes(installCommand)) {
    errors.push(`quick-start.html is missing canonical install command: ${installCommand}`)
  }

  if (!indexHtml.includes("AGENTS.md")) {
    errors.push("index.html does not reference AGENTS.md")
  }

  if (!quickStartHtml.includes("synth validate")) {
    errors.push("quick-start.html does not mention synth validate")
  }

  if (!quickStartHtml.includes("synth mission create")) {
    errors.push("quick-start.html does not mention synth mission create")
  }

  if (!quickStartHtml.includes("synth mission approve")) {
    errors.push("quick-start.html does not mention synth mission approve")
  }

  // Canonical repository check: every GitHub URL on the website must
  // point at the canonical repository. Wrong-org links rotted once
  // before (22 dead links to synth-dev/synth-v2) and passed unnoticed.
  const CANONICAL_REPO = "https://github.com/synth-framework/synth"
  const websiteFiles = (await fs.readdir(WEBSITE_DIR)).filter((f) => f.endsWith(".html"))
  for (const file of websiteFiles) {
    const html = await readFile(path.join(WEBSITE_DIR, file))
    const githubUrls = html.match(/https:\/\/github\.com\/[^"'\s<]+/g) || []
    for (const url of githubUrls) {
      if (!url.startsWith(CANONICAL_REPO)) {
        errors.push(`${file}: non-canonical GitHub URL: ${url}`)
      }
    }
  }

  if (errors.length === 0) {
    console.log("✅ Website content is synchronized with README and operator docs.")
    process.exit(0)
  }

  console.log("❌ Website synchronization failed:")
  for (const err of errors) console.log(`  - ${err}`)
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
