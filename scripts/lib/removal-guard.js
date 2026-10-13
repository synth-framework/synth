// ============================================================
// removal-guard — pure logic for "tracked on the base, untracked here"
// ============================================================
// A path that the base branch tracks and the current index does not is a
// removal. Removals of tracked artifacts are never incidental: each one must be
// listed in docs/artifact-removals.json with a reason and an approver, so it is
// reviewed in the same PR that makes it.
//
// This module is pure (no git, no fs) so tests can exercise it directly.

/**
 * @param {string[]} baseTracked paths tracked on the base branch
 * @param {string[]} currentTracked paths tracked on this branch
 * @param {Array<{path: string, reason?: string, approvedBy?: string}>} manifest
 * @returns {string[]} problems; empty when every removal is approved
 */
export function findUnmanifestedRemovals(baseTracked, currentTracked, manifest) {
  const current = new Set(currentTracked)
  const approved = new Map(manifest.map((entry) => [entry.path, entry]))
  const problems = []
  for (const relPath of baseTracked) {
    if (current.has(relPath)) continue
    const entry = approved.get(relPath)
    if (!entry) {
      problems.push(`${relPath} — tracked on the base branch, untracked here, not listed in docs/artifact-removals.json`)
    } else if (!entry.reason || !entry.approvedBy) {
      problems.push(`${relPath} — docs/artifact-removals.json entry needs both "reason" and "approvedBy"`)
    }
  }
  return problems
}

/**
 * Validate the manifest shape. Returns a list of problems (empty when valid).
 * @param {unknown} manifest
 */
export function validateRemovalManifest(manifest) {
  if (!Array.isArray(manifest)) return ["docs/artifact-removals.json must be a JSON array"]
  const problems = []
  manifest.forEach((entry, index) => {
    if (!entry || typeof entry.path !== "string" || entry.path.length === 0) {
      problems.push(`entry ${index}: "path" must be a non-empty string`)
    }
  })
  return problems
}
