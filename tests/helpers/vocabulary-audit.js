// ============================================================
// TEST HELPERS — Vocabulary audit
// ============================================================
// Shared audit loop for public-vocabulary tests
// (homepage-public-vocabulary, public-vocabulary-audit). Single home for the
// identical collect-violations + fail-with-summary blocks
// (expedition 7a79e79b, round 12/120). The findViolations implementations
// differ per file (regex+code-strip vs case-insensitive) and stay local.
//
// Usage:
//   await auditFiles({ files, findViolations, failMessage })
// ============================================================

import assert from "node:assert"
import fs from "fs/promises"
import path from "path"

/** Read files, collect violations via findViolations, fail with a summary. */
export async function auditFiles({ files, findViolations, failMessage }) {
  const allViolations = []

  for (const file of files) {
    const content = await fs.readFile(file, "utf-8")
    const violations = findViolations(file, content)
    for (const v of violations) {
      allViolations.push({ file: path.relative(process.cwd(), file), ...v })
    }
  }

  if (allViolations.length > 0) {
    const summary = allViolations
      .map((v) => `  - ${v.file}: "${v.term}" in "${v.line.slice(0, 80)}"`)
      .join("\n")
    assert.fail(`${failMessage}:\n${summary}`)
  }
}
