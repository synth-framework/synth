// Canonical names of the planning/intelligence factories registered by the
// default Mission Studio adapter registry. Read-only projections need these
// names, not the adapter implementations or the Git/discovery catalog.
// The registry's factory map is type-checked against this list and seeded in
// this order so its public list() result cannot silently diverge.
export const PLANNING_ADAPTER_NAMES = Object.freeze([
  "repository",
  "github",
  "tdd",
  "bdd",
  "conversation",
  "document",
  "filesystem",
  "specification",
  "knowledge-extraction",
  "confidence",
  "dependency",
  "architecture",
  "mission-builder",
  "expedition-builder",
  "objective-builder",
  "wizard",
] as const)

export type PlanningAdapterName = (typeof PLANNING_ADAPTER_NAMES)[number]
