// ============================================================
// Synth Installer Manifest Validator
// ============================================================
// Validates that installer-manifest.json conforms to the
// expected schema. Used in CI and locally before publication.
// ============================================================

import fs from "fs"
import path from "path"

const MANIFEST_PATH = process.argv[2] || path.join(process.cwd(), "website", "installer-manifest.json")

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function validateManifest(manifest) {
  assert(typeof manifest === "object" && manifest !== null, "Manifest must be an object")
  assert(typeof manifest.schema === "number", "manifest.schema must be a number")
  assert(manifest.schema === 1, `Unsupported manifest schema version: ${manifest.schema}`)
  assert(typeof manifest.generatedAt === "string", "manifest.generatedAt must be a string")
  assert(!isNaN(Date.parse(manifest.generatedAt)), "manifest.generatedAt must be a valid ISO 8601 timestamp")
  assert(typeof manifest.channels === "object" && manifest.channels !== null, "manifest.channels must be an object")

  const supportedChannels = ["latest", "stable", "beta", "nightly"]
  for (const channel of Object.keys(manifest.channels)) {
    assert(supportedChannels.includes(channel), `Unsupported channel: ${channel}`)
    const entry = manifest.channels[channel]
    assert(typeof entry === "object" && entry !== null, `Channel ${channel} must be an object`)
    assert(typeof entry.version === "string", `Channel ${channel} must have a version string`)
    assert(entry.version.length > 0, `Channel ${channel} version must not be empty`)
    assert(typeof entry.npm === "string", `Channel ${channel} must have an npm package string`)
    assert(entry.npm.length > 0, `Channel ${channel} npm package must not be empty`)
  }

  assert(manifest.channels.latest, "manifest.channels.latest is required")
  assert(manifest.channels.stable, "manifest.channels.stable is required")
}

function main() {
  assert(fs.existsSync(MANIFEST_PATH), `Manifest not found at ${MANIFEST_PATH}`)

  const raw = fs.readFileSync(MANIFEST_PATH, "utf-8")
  let manifest
  try {
    manifest = JSON.parse(raw)
  } catch (err) {
    throw new Error(`Invalid JSON in manifest: ${err.message}`)
  }

  validateManifest(manifest)
  console.log(`✅ Installer manifest is valid: ${MANIFEST_PATH}`)
}

main()
