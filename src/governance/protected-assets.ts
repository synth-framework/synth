// ============================================================
// SYNTH Protected Asset Catalog
// ============================================================
// Canonical list of assets that SHALL NOT be modified without an
// approved Architecture Expedition (ADR-004). Used by the impact
// analyzer and validation planner to enforce escalation.
// ============================================================

export interface ProtectedAsset {
  name: string
  description: string
  /** File path patterns that identify changes touching this asset. */
  pathPatterns: RegExp[]
}

/**
 * Protected Assets per ADR-004.
 *
 * Runtime and Event Model are included because they materially affect the
 * deterministic execution contract and replay semantics, even though they
 * are not named individually in ADR-004.
 */
export const PROTECTED_ASSETS: ProtectedAsset[] = [
  {
    name: "Mission Studio",
    description: "Planning cognition environment and mission approval authority.",
    pathPatterns: [/^src\/mission-studio\//],
  },
  {
    name: "Genesis",
    description: "System initialization and seed event authority.",
    pathPatterns: [/^src\/genesis\//],
  },
  {
    name: "Replay",
    description: "Deterministic state reconstruction from events.",
    pathPatterns: [/^src\/core\/replay/, /^src\/runtime\/replay/],
  },
  {
    name: "Runtime",
    description: "Deterministic execution engine and event persistence.",
    pathPatterns: [/^src\/runtime\//],
  },
  {
    name: "ExecutionGate",
    description: "Single mutation authority and control boundary.",
    pathPatterns: [/^src\/control\//],
  },
  {
    name: "Event Model",
    description: "Canonical event types and replay contract.",
    pathPatterns: [/^src\/types\/event/],
  },
  {
    name: "Capability Model",
    description: "Capability registry and execution vocabulary.",
    pathPatterns: [/^src\/capability\//],
  },
  {
    name: "Constitutional Baseline",
    description: "Architecture constitution, active ADRs, and bootstrap order.",
    pathPatterns: [/^docs\/architecture\/constitution/, /^docs\/adr\//, /^src\/core\/bootstrap\.ts$/],
  },
  {
    name: "Public Vocabulary",
    description: "The seven public concepts exposed to operators.",
    pathPatterns: [/^docs\/reference\/public-vocabulary/],
  },
]

/**
 * Detect which Protected Assets are touched by a set of changed files.
 */
export function detectProtectedAssets(files: string[]): string[] {
  const touched = new Set<string>()
  for (const file of files) {
    for (const asset of PROTECTED_ASSETS) {
      if (asset.pathPatterns.some((pattern) => pattern.test(file))) {
        touched.add(asset.name)
      }
    }
  }
  return Array.from(touched).sort()
}

/**
 * Check whether a file path touches any Protected Asset.
 */
export function isProtectedAssetPath(filePath: string): boolean {
  return detectProtectedAssets([filePath]).length > 0
}
