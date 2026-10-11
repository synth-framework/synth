// ============================================================
// TEST HELPERS — Example projects
// ============================================================
// Canonical example-project list shared by brownfield-validation and
// discovery-consumers tests (expedition 7a79e79b, round 8/80).
//
// Usage:
//   import { EXAMPLE_PROJECTS as EXAMPLES } from "./helpers/example-projects.js"
// ============================================================

/** Example projects under examples/ used by discovery/brownfield tests. */
export const EXAMPLE_PROJECTS = [
  { name: "todo", dir: "examples/todo", type: "node" },
  { name: "crm", dir: "examples/crm", type: "node" },
  { name: "legacy-node", dir: "examples/legacy-node", type: "brownfield" },
  { name: "polyglot", dir: "examples/polyglot", type: "polyglot" },
  { name: "monolith", dir: "examples/monolith", type: "node" },
  { name: "blog", dir: "examples/blog", type: "node" },
]
