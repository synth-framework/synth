// ============================================================
// TEST HELPERS — Adapter fixtures
// ============================================================
// Shared fixtures for adapter tests, consolidated from duplicated
// makeObservation() definitions across the adapter test suite.
// ============================================================

/** Build a canonical test observation used across adapter tests. */
export function makeObservation(category, subject, snippet = "") {
  return {
    id: `obs-${category}-${subject.toLowerCase().replace(/\s+/g, "-")}`,
    source: { adapter: "test", locator: "test" },
    category,
    subject,
    evidence: [{ description: "test evidence", snippet, fingerprint: "abc" }],
    confidence: "high",
    timestamp: Date.now(),
  }
}

/**
 * Build a planning observation with overrides (mission-studio shape).
 * Single home for the identical copies across mission-studio,
 * validation-expansion, adapter-integration, and genesis tests.
 */
export function makePlanningObservation(type, subject, overrides = {}) {
  return {
    id: `obs-${type}-${subject.toLowerCase().replace(/\s+/g, "-")}`,
    sourceAdapter: "test-adapter",
    type,
    payload: { subject, name: subject, ...overrides },
    evidenceReference: `evidence-${type}-${subject}`,
    confidence: "high",
    timestamp: 1000,
  }
}
