// ============================================================
// MINIMAL GLOB HELPER
// ============================================================
// Respects .gitignore and returns relative paths matching a glob-like pattern.
// Supports `**`, `*`, and trailing directory globs. Not a full glob engine;
// sufficient for governance input patterns.
// ============================================================

import fs from "fs/promises"
import path from "path"

/**
 * @param {string} pattern
 * @param {string} cwd
 * @returns {Promise<string[]>}
 */
export async function glob(pattern, cwd) {
  const normalizedPattern = pattern.replace(/\\/g, "/")
  const segments = normalizedPattern.split("/").filter((s) => s.length > 0)
  const results = []

  async function walk(currentDir, segmentIndex, prefix) {
    if (segmentIndex >= segments.length) {
      return
    }

    const segment = segments[segmentIndex]
    const isLast = segmentIndex === segments.length - 1
    const entries = await fs.readdir(currentDir, { withFileTypes: true }).catch(() => [])

    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === "node_modules") continue

      const matches = matchSegment(entry.name, segment, entry.isDirectory())
      if (!matches) continue

      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name

      if (isLast) {
        results.push(relativePath)
        if (entry.isDirectory()) {
          await walk(path.join(currentDir, entry.name), segmentIndex, relativePath)
        }
      } else if (entry.isDirectory()) {
        await walk(path.join(currentDir, entry.name), segmentIndex + 1, relativePath)
      }
    }
  }

  function matchSegment(name, segment, isDir) {
    if (segment === "**") return true
    if (segment === "*") return true
    if (segment.endsWith("*")) {
      const prefix = segment.slice(0, -1)
      return name.startsWith(prefix)
    }
    if (segment.startsWith("*")) {
      const suffix = segment.slice(1)
      return name.endsWith(suffix)
    }
    return name === segment
  }

  await walk(cwd, 0, "")
  return [...new Set(results)].sort()
}
