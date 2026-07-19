// ============================================================
// GOVERN DELEGATION GUARD (EXP-TRUST-001, EXP-CLI-001)
// ============================================================
// The governance pipeline must never re-enter itself. A project
// whose "govern" script invokes `synth govern`, `synth validate`,
// or `npm run govern` delegates back to `npm run govern` and
// recurses without bound. Two independent layers stop the loop:
//
// 1. Marker layer: every guarded delegation stamps
//    SYNTH_GOVERN_DEPTH into the child environment. A nested
//    delegation attempt refuses to run.
// 2. Static layer: before delegating, the project's "govern"
//    script is inspected and cyclic invocations are refused
//    with a prescriptive message.
//
// EXP-CLI-001: diagnostics now distinguish the exact condition
// that prevented delegation so callers can report accurate,
// actionable messages instead of a generic "govern skipped".
// ============================================================

import fs from "fs"
import path from "path"

export const GOVERN_DEPTH_ENV = "SYNTH_GOVERN_DEPTH"

const MAX_GOVERN_DEPTH = 1

/**
 * Cross-platform npm executable name.
 * Windows npm is `npm.cmd`; everywhere else it is `npm`.
 * Using this avoids the `shell: true` deprecation warning while still
 * spawning npm correctly on all supported platforms.
 */
export function npmCommand(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm"
}

const CYCLIC_GOVERN_PATTERNS: RegExp[] = [
  /\bnpm\s+run\s+govern\b/,
  /\bsynth(?:\.js)?\s+govern\b/,
  /\bsynth(?:\.js)?\s+validate\b/,
]

export type GovernDelegationCondition =
  | "delegated"
  | "missing-package-json"
  | "missing-govern-script"
  | "cyclic-script"
  | "depth-marker"

export type GovernDelegationVerdict =
  | { allowed: true; childEnv: NodeJS.ProcessEnv; condition: "delegated" }
  | { allowed: false; message: string; condition: Exclude<GovernDelegationCondition, "delegated"> }

function cyclicScriptMessage(script: string): string {
  return [
    `Governance delegation cycle detected. The "govern" script in package.json: "${script}" re-enters the SYNTH governance pipeline.`,
    `Point "govern" at the project's own validation (e.g. "govern": "npm test").`,
    `Must not appear in it: "synth govern", "synth validate", "npm run govern" — they delegate back to "npm run govern" and recurse.`,
    `Read-only commands such as "synth status" are safe.`,
  ].join(" ")
}

function markerMessage(marker: string): string {
  return [
    `Governance delegation cycle detected: already inside a SYNTH governance delegation (${GOVERN_DEPTH_ENV}=${marker}).`,
    `Refusing to run "npm run govern" again.`,
    `Point the project's "govern" script at its own validation (e.g. "govern": "npm test"), not at the SYNTH governance pipeline.`,
  ].join(" ")
}

function missingPackageJsonMessage(): string {
  return [
    `No package.json found in the project directory; there is no project script to delegate to.`,
    `SYNTH will use its internal governance pipeline.`,
    `To enable project-specific governance, initialize npm and add a "govern" script running the project's own validation (e.g. "govern": "npm test").`,
    `Do not point "govern" at "synth govern", "synth validate", or "npm run govern" — they delegate back to "npm run govern" and would recurse.`,
  ].join(" ")
}

function missingGovernScriptMessage(): string {
  return [
    `No "govern" script defined in package.json; using internal governance pipeline.`,
    `A good "govern" script runs the project's own validation suite, not the SYNTH CLI.`,
    `Example: "govern": "npm test" or "govern": "npm run lint && npm test".`,
    `Avoid: "synth govern", "synth validate", or "npm run govern" — they would recurse through the delegation guard.`,
  ].join(" ")
}

function readGovernScript(cwd: string): { script?: string; packageJsonFound: boolean } {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8")) as {
      scripts?: Record<string, unknown>
    }
    const govern = pkg.scripts?.govern
    return {
      script: typeof govern === "string" ? govern : undefined,
      packageJsonFound: true,
    }
  } catch {
    return { packageJsonFound: false }
  }
}

/**
 * Build the human-readable diagnostic message for a delegation condition.
 */
export function governDelegationMessage(condition: GovernDelegationCondition, detail?: string): string {
  switch (condition) {
    case "delegated":
      return "Delegating governance to project \"govern\" script."
    case "missing-package-json":
      return missingPackageJsonMessage()
    case "missing-govern-script":
      return missingGovernScriptMessage()
    case "cyclic-script":
      return cyclicScriptMessage(detail || "")
    case "depth-marker":
      return markerMessage(detail || "")
  }
}

// Verdict for one `npm run govern` delegation from `cwd`. Callers must
// refuse to spawn when not allowed, and must spawn with `childEnv` when
// allowed so the marker propagates to the child.
export function checkGovernDelegation(cwd: string, env: NodeJS.ProcessEnv = process.env): GovernDelegationVerdict {
  const rawDepth = env[GOVERN_DEPTH_ENV]
  const depth = rawDepth === undefined ? 0 : Number(rawDepth)

  if (!Number.isFinite(depth) || depth < 0 || depth >= MAX_GOVERN_DEPTH) {
    const condition = "depth-marker"
    return { allowed: false, condition, message: governDelegationMessage(condition, rawDepth ?? String(depth)) }
  }

  const { script, packageJsonFound } = readGovernScript(cwd)

  if (!packageJsonFound) {
    const condition = "missing-package-json"
    return { allowed: false, condition, message: governDelegationMessage(condition) }
  }

  if (script === undefined) {
    const condition = "missing-govern-script"
    return { allowed: false, condition, message: governDelegationMessage(condition) }
  }

  if (CYCLIC_GOVERN_PATTERNS.some((pattern) => pattern.test(script))) {
    const condition = "cyclic-script"
    return { allowed: false, condition, message: governDelegationMessage(condition, script) }
  }

  return {
    allowed: true,
    condition: "delegated",
    childEnv: { ...env, [GOVERN_DEPTH_ENV]: String(depth + 1) },
  }
}
