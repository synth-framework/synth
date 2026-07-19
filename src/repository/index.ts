// ============================================================
// REPOSITORY: Public API
// ============================================================

export * from "./forge-adapter.js"
export * from "./branch-taxonomy.js"
export * from "./governance.js"

// Register built-in forge adapters as a side effect of importing the
// repository module. This keeps adapter registration declarative and
// avoids requiring consumers to register adapters manually.
import "./adapters/github-adapter.js"
