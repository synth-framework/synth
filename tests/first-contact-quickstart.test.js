import assert from "node:assert"
import { describe, it } from "node:test"
import fs from "node:fs/promises"
import path from "node:path"
import { execSync } from "node:child_process"
import os from "node:os"

const SCRIPT = path.join(process.cwd(), "scripts", "generate-first-contact-quickstart.js")
const PATTERNS_DIR = path.join(process.cwd(), "first-contact", "conversation-patterns")
const OUT_DIR = path.join(process.cwd(), "docs", "first-contact", "quick-start")

async function loadCanonicalPatterns() {
  const names = (await fs.readdir(PATTERNS_DIR)).filter((name) => name.endsWith("-pattern.json"))
  const patterns = []
  for (const name of names) {
    const content = JSON.parse(await fs.readFile(path.join(PATTERNS_DIR, name), "utf-8"))
    if (content.status === "canonical") {
      patterns.push(content)
    }
  }
  return patterns.sort((a, b) => a.id.localeCompare(b.id))
}

describe("First Contact quick-start projections", () => {
  it("generates docs for all canonical patterns", () => {
    execSync(`node "${SCRIPT}"`, { stdio: "pipe" })
  })

  it("creates an index and one file per canonical pattern", async () => {
    const entries = await fs.readdir(OUT_DIR)
    const patterns = await loadCanonicalPatterns()

    assert(entries.includes("README.md"), "index missing")
    for (const pattern of patterns) {
      const expected = `${pattern.id.replace(/[\s_/]+/g, "-")}.md`
      assert(entries.includes(expected), `missing projection for ${pattern.id}`)
    }
  })

  it("index references each canonical pattern", async () => {
    const index = await fs.readFile(path.join(OUT_DIR, "README.md"), "utf-8")
    const patterns = await loadCanonicalPatterns()

    for (const pattern of patterns) {
      assert(index.includes(pattern.title), `index missing title for ${pattern.id}`)
      assert(index.includes(pattern.trigger), `index missing trigger for ${pattern.id}`)
    }
  })

  it("projection notice appears in generated docs", async () => {
    const entries = (await fs.readdir(OUT_DIR)).filter((n) => n.endsWith(".md"))
    for (const entry of entries) {
      const content = await fs.readFile(path.join(OUT_DIR, entry), "utf-8")
      assert(content.includes("Projection notice"), `${entry} missing projection notice`)
      assert(
        content.includes("node scripts/generate-first-contact-quickstart.js"),
        `${entry} missing regeneration command`
      )
    }
  })

  it("--check passes when projections are up to date", () => {
    execSync(`node "${SCRIPT}" --check`, { stdio: "pipe" })
  })

  it("--check fails when a projection is drifted", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-quickstart-"))
    await fs.cp(PATTERNS_DIR, path.join(tmpDir, "first-contact", "conversation-patterns"), {
      recursive: true,
      force: true,
    })
    await fs.cp(OUT_DIR, path.join(tmpDir, "docs", "first-contact", "quick-start"), {
      recursive: true,
      force: true,
    })
    const readme = path.join(tmpDir, "docs", "first-contact", "quick-start", "README.md")
    await fs.writeFile(readme, "drifted\n", "utf-8")

    assert.throws(
      () => execSync(`node "${SCRIPT}" --check`, { cwd: tmpDir, stdio: "pipe" }),
      /QUICKSTART_PROJECTION_DRIFT/
    )
  })
})
