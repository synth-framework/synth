// ============================================================
// GOVERNANCE: Derived Files & Expedition Scope
// ============================================================
// Central catalog of paths that are derived from the event log and
// therefore read-only outside the kernel mutation paths, plus a
// lightweight glob matcher for expedition scope declarations.
// ============================================================

import path from "node:path"
import { root } from "../sdk/workspace/index.js"

/** Paths that are derived from the authoritative event log.
 *  Direct writes through the public SDK are rejected; kernel stores
 *  (EventStore, StateStore, CheckpointStore) write these through their
 *  own module-private authorization tokens. */
const DERIVED_PATH_PATTERNS: readonly string[] = [
  ".synth/data/canonical-state.json",
  ".synth/data/event-log.jsonl",
  "AGENTS.md",
  "docs/generated/*.md",
]

/** Convert a POSIX glob pattern into a RegExp.
 *  Supports:
 *    **  → match any number of path segments (including zero)
 *    *   → match any characters except '/'
 *    ?   → match a single character except '/'
 */
function globToRegex(glob: string): RegExp {
  let regex = "^"
  let i = 0
  while (i < glob.length) {
    const c = glob[i]
    if (c === "*" && glob[i + 1] === "*") {
      regex += "(?:.*)"
      i += 2
      // Consume a following slash so '**/' and '/**' both mean "any depth".
      if (glob[i] === "/") {
        regex += "(?:/)?"
        i += 1
      }
    } else if (c === "*") {
      regex += "[^/]*"
      i += 1
    } else if (c === "?") {
      regex += "[^/]"
      i += 1
    } else if ("/\\^$.|+{}[]()".includes(c)) {
      regex += `\\${c}`
      i += 1
    } else {
      regex += c
      i += 1
    }
  }
  regex += "$"
  return new RegExp(regex)
}

/** Return a POSIX-style path relative to the project root. */
export function toProjectRelativePath(filePath: string): string {
  const absolute = path.resolve(filePath)
  const projectRoot = root()
  let relative = path.relative(projectRoot, absolute)
  // Normalize to POSIX separators for matching.
  relative = relative.split(path.sep).join("/")
  if (relative === "") {
    // The path is the project root itself; cannot match any pattern.
    return "."
  }
  return relative
}

/** True if `relativePath` matches the POSIX glob `pattern`. */
export function matchesScope(relativePath: string, pattern: string): boolean {
  const normalized = relativePath.split(path.sep).join("/")
  return globToRegex(pattern).test(normalized)
}

/** True if the given file path is a derived file that must not be
 *  written directly through the public SDK. */
export function isDerivedPath(filePath: string): boolean {
  const relative = toProjectRelativePath(filePath)
  return DERIVED_PATH_PATTERNS.some((pattern) => matchesScope(relative, pattern))
}

/** Return the list of patterns that matched the path, for diagnostics. */
function matchingDerivedPatterns(filePath: string): string[] {
  const relative = toProjectRelativePath(filePath)
  return DERIVED_PATH_PATTERNS.filter((pattern) => matchesScope(relative, pattern))
}
