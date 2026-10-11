// ============================================================
// TEST HELPERS — Assert / Parse helpers
// ============================================================
// Canonical home for parseJson / parseJsonStrict (see dedupe-plan.md,
// finding F6). Replaces the per-file `function parseJson(stdout) {...}`
// copies scattered across the suite. Node's built-in `assert` covers the
// rest; import it directly where needed.
//
// Usage:
//   import { assert, parseJson, parseJsonStrict } from "./helpers/assert.js"
// ============================================================

/**
 * Minimal assertion helper matching the per-file copies found across the
 * suite (`if (!condition) throw new Error("ASSERTION FAILED: " + message)`).
 * Centralized to remove that duplication (dedupe-plan.md, finding F6).
 */
export function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

/** Parse JSON output, throwing a descriptive error on failure. */
export function parseJson(stdout) {
  try {
    return JSON.parse(String(stdout).trim())
  } catch (err) {
    throw new Error(`Failed to parse CLI output as JSON: ${stdout}\nError: ${err.message}`)
  }
}

/** Parse JSON output and assert it is a non-null object. */
export function parseJsonStrict(stdout) {
  const value = parseJson(stdout)
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Expected JSON object but got: ${typeof value}`)
  }
  return value
}

/**
 * Find the first JSON object in mixed CLI output (logs + JSON).
 * Shared by agent-guide/release tests that scan noisy stdout.
 */
export function findJsonObject(stdout) {
  const trimmed = String(stdout).trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    // CLI may mix log lines with JSON; scan for the first line that starts
    // a JSON object and parse from there.
    const lines = trimmed.split("\n")
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith("{")) {
        try {
          return JSON.parse(lines.slice(i).join("\n"))
        } catch {
          // continue scanning
        }
      }
    }
  }
  throw new Error(`No JSON object found in stdout:\n${stdout}`)
}
