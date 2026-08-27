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
