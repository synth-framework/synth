// Shared test-runner helper. Replaces the per-file `TESTS`/`run()` boilerplate
// (see dedupe-plan.md, finding F1). Usage:
//   import { createSuite } from "../helpers/runner.js"
//   const suite = createSuite()
//   const { test } = suite
//   test("does a thing", async () => { ... })
//   await suite.run("SKR-001: Extension Tests")

export function createSuite() {
  const tests = []

  function test(name, fn) {
    tests.push({ name, fn, skip: false })
    return { name, fn }
  }

  function skip(name, _fn) {
    tests.push({ name, fn: null, skip: true })
    return { name, fn: null }
  }

  async function run(label) {
    console.log(`\n  ─── ${label} ───`)
    let passed = 0
    let failed = 0
    let skipped = 0
    const failures = []
    for (const t of tests) {
      if (t.skip || !t.fn) {
        console.log(`  [SKIP] ${t.name}`)
        skipped++
        continue
      }
      try {
        await t.fn()
        console.log(`  [PASS] ${t.name}`)
        passed++
      } catch (err) {
        console.log(`  [FAIL] ${t.name}`)
        console.log(`         ${err && err.message ? err.message : err}`)
        failed++
        failures.push({ name: t.name, message: err && err.message ? err.message : String(err) })
      }
    }
    const tail = `  ${passed} passed, ${failed} failed` + (skipped ? `, ${skipped} skipped` : "") + "\n"
    console.log(tail)
    if (failed > 0) {
      const detail = failures.map((f) => `  ${f.name}: ${f.message}`).join("\n")
      throw new Error(`Suite "${label}" failed:\n${detail}`)
    }
  }

  return { test, skip, run }
}
