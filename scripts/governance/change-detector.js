// ============================================================
// CHANGE DETECTOR (EXP-GOVERN-004)
// ============================================================
// Detects which files have changed since the last commit. Uses git diff by
// default and supports an explicit --changes override for testing and tooling.
// ============================================================

import { spawnSync } from "child_process"

/**
 * @param {Object} [options]
 * @param {string} [options.cwd]
 * @param {string[]} [options.explicit]
 * @returns {string[]}
 */
export function detectChangedFiles(options = {}) {
  if (options.explicit && options.explicit.length > 0) {
    return options.explicit
  }

  const result = spawnSync("git", ["diff", "--name-only", "HEAD"], {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf-8",
  })

  if (result.error || result.status !== 0) {
    // If git is unavailable, treat as no changes (safe fallback).
    return []
  }

  return result.stdout
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}
