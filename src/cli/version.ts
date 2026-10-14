// ============================================================
// SYNTH v2 — canonical `version` output (EXP-CLI-001)
// ============================================================
// ONE implementation reached from both entry points. The dispatcher used to
// print a bare semver while the monolith printed a JSON envelope, so
// `synth --version` answered differently depending on which file you ran.
//
// Operator decision, 2026-10-13: the JSON envelope is canonical for every
// caller — machine-readable and consistent with every other verb — with the
// documented global `--human` flag opting into the bare string.
//
// Light by construction: node builtins plus ./output.js only.
// ============================================================
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { printJson } from "./output.js"

export const VERSION_SCHEMA = "synth-cli-v1"

/**
 * Installed version, read from the package.json that ships alongside dist/.
 * Falls back to "unknown" (the monolith's historical fallback) rather than
 * throwing, so `synth --version` still answers on a damaged install.
 */
export function projectVersion(): string {
  try {
    const pkgPath = fileURLToPath(new URL("../../package.json", import.meta.url))
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string }
    return String(pkg.version || "unknown")
  } catch {
    return "unknown"
  }
}

/** Print the version envelope, or the bare string when the caller asked for prose. */
export function printVersion(version: string, human?: boolean): void {
  if (human) {
    console.log(version)
    return
  }
  printJson({ status: "ok", version, name: "synth", schema: VERSION_SCHEMA })
}
