// ============================================================
// SDK: Workspace Discovery
// ============================================================
// Walk upward from a starting directory looking for a SYNTH project
// marker. The canonical marker is `.synth/manifest.json`.
// ============================================================

import path from "node:path"
import { existsSync } from "../files/index.js"
import { root } from "./root.js"

/**
 * Discover the nearest workspace root by searching upward for
 * `.synth/manifest.json`.
 *
 * Returns `undefined` if no marker is found before reaching the
 * filesystem root.
 */
export function discover(startDir?: string): string | undefined {
  let current = root(startDir)

  while (true) {
    const manifestPath = path.join(current, ".synth", "manifest.json")
    if (existsSync(manifestPath)) {
      return current
    }

    const parent = path.dirname(current)
    if (parent === current) {
      return undefined
    }
    current = parent
  }
}
