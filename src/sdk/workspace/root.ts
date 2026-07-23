// ============================================================
// SDK: Workspace Root
// ============================================================
// Canonical workspace root resolution. All SDK path functions
// receive an explicit root to avoid hidden process.cwd() assumptions.
// ============================================================

import path from "path"

/**
 * Return the workspace root.
 *
 * If no directory is supplied, defaults to `process.cwd()`. Callers that
 * already know their root should pass it explicitly.
 */
export function root(cwd?: string): string {
  return cwd ? path.resolve(cwd) : process.cwd()
}

/**
 * Resolve one or more path segments relative to the workspace root.
 */
export function resolve(rootDir: string, ...segments: string[]): string {
  return path.resolve(root(rootDir), ...segments)
}
