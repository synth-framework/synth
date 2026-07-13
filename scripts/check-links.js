#!/usr/bin/env node
// ============================================================
// Link Checker
// ============================================================
// Finds Markdown and HTML links and verifies internal targets
// exist on disk. External links are reported as warnings only.
//
// Usage: node scripts/check-links.js
// ============================================================

import { promises as fs } from "fs"
import path from "path"

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "data",
  "data-test",
  "proof",
])

const MD_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g
const HTML_HREF_RE = /href=["']([^"']+)["']/g
const HTML_SRC_RE = /src=["']([^"']+)["']/g
const ANCHOR_RE = /#.*$/

async function* walk(dir, extension) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue
      yield* walk(full, extension)
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      yield full
    }
  }
}

function isExternal(href) {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("//")
  )
}

async function checkMarkdownLinks(root, broken, checked, warnings) {
  for await (const file of walk(root, ".md")) {
    const content = await fs.readFile(file, "utf-8")
    const relativeFile = path.relative(root, file)
    const dir = path.dirname(file)

    let match
    while ((match = MD_LINK_RE.exec(content)) !== null) {
      const [_, text, rawHref] = match
      if (isExternal(rawHref)) {
        warnings.push({ from: relativeFile, to: rawHref, text, kind: "external" })
        continue
      }
      if (rawHref.startsWith("#")) continue

      const href = rawHref.replace(ANCHOR_RE, "")
      if (!href) continue

      const target = path.resolve(dir, href)
      checked.push({ from: relativeFile, to: path.relative(root, target), text, kind: "markdown" })
      try {
        const stat = await fs.stat(target)
        if (!stat.isFile() && !stat.isDirectory()) {
          broken.push({ from: relativeFile, to: path.relative(root, target), text, kind: "markdown" })
        }
      } catch {
        broken.push({ from: relativeFile, to: path.relative(root, target), text, kind: "markdown" })
      }
    }
  }
}

async function checkWebsiteLinks(root, broken, checked, warnings) {
  const websiteDir = path.join(root, "website")
  let entries
  try {
    entries = await fs.readdir(websiteDir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue
    const file = path.join(websiteDir, entry.name)
    const content = await fs.readFile(file, "utf-8")
    const relativeFile = path.relative(root, file)

    for (const re of [HTML_HREF_RE, HTML_SRC_RE]) {
      let match
      while ((match = re.exec(content)) !== null) {
        const rawHref = match[1]
        if (isExternal(rawHref)) {
          warnings.push({ from: relativeFile, to: rawHref, text: "", kind: "external" })
          continue
        }
        if (rawHref.startsWith("#") || rawHref.startsWith("javascript:")) continue

        const href = rawHref.replace(ANCHOR_RE, "")
        if (!href) continue

        const target = path.resolve(websiteDir, href)
        checked.push({ from: relativeFile, to: path.relative(root, target), text: "", kind: "website" })
        try {
          const stat = await fs.stat(target)
          if (!stat.isFile() && !stat.isDirectory()) {
            broken.push({ from: relativeFile, to: path.relative(root, target), text: "", kind: "website" })
          }
        } catch {
          broken.push({ from: relativeFile, to: path.relative(root, target), text: "", kind: "website" })
        }
      }
    }
  }
}

async function main() {
  const root = process.cwd()
  const broken = []
  const checked = []
  const warnings = []

  await checkMarkdownLinks(root, broken, checked, warnings)
  await checkWebsiteLinks(root, broken, checked, warnings)

  console.log(`Checked ${checked.length} internal link(s) in Markdown and HTML files.`)
  if (warnings.length > 0) {
    console.log(`⚠️ ${warnings.length} external link(s) skipped (warnings only):`)
    for (const w of warnings.slice(0, 20)) {
      console.log(`  ${w.from} → "${w.to}"`)
    }
    if (warnings.length > 20) {
      console.log(`  ... and ${warnings.length - 20} more`)
    }
  }

  if (broken.length === 0) {
    console.log("✅ All internal links resolve.")
    process.exit(0)
  }

  console.log(`\n❌ ${broken.length} broken internal link(s):`)
  for (const b of broken) {
    console.log(`  ${b.from} → "${b.to}" (kind: ${b.kind})`)
  }
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
