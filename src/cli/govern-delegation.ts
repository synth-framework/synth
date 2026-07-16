// ============================================================
// GOVERN DELEGATION GUARD (EXP-TRUST-001)
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
// ============================================================

import fs from "fs"
import path from "path"

export const GOVERN_DEPTH_ENV = "SYNTH_GOVERN_DEPTH"

const MAX_GOVERN_DEPTH = 1

const CYCLIC_GOVERN_PATTERNS: RegExp[] = [
  /\bnpm\s+run\s+govern\b/,
  /\bsynth(?:\.js)?\s+govern\b/,
  /\bsynth(?:\.js)?\s+validate\b/,
]

export type GovernDelegationVerdict =
  | { allowed: true; childEnv: NodeJS.ProcessEnv }
  | { allowed: false; message: string }

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

function readGovernScript(cwd: string): string | undefined {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8")) as {
      scripts?: Record<string, unknown>
    }
    const govern = pkg.scripts?.govern
    return typeof govern === "string" ? govern : undefined
  } catch {
    return undefined
  }
}

// Verdict for one `npm run govern` delegation from `cwd`. Callers must
// refuse to spawn when not allowed, and must spawn with `childEnv` when
// allowed so the marker propagates to the child.
export function checkGovernDelegation(cwd: string, env: NodeJS.ProcessEnv = process.env): GovernDelegationVerdict {
  const rawDepth = env[GOVERN_DEPTH_ENV]
  const depth = rawDepth === undefined ? 0 : Number(rawDepth)

  if (!Number.isFinite(depth) || depth < 0 || depth >= MAX_GOVERN_DEPTH) {
    return { allowed: false, message: markerMessage(rawDepth ?? String(depth)) }
  }

  const script = readGovernScript(cwd)
  if (script !== undefined && CYCLIC_GOVERN_PATTERNS.some((pattern) => pattern.test(script))) {
    return { allowed: false, message: cyclicScriptMessage(script) }
  }

  return {
    allowed: true,
    childEnv: { ...env, [GOVERN_DEPTH_ENV]: String(depth + 1) },
  }
}
