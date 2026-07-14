// ============================================================
// Synth Installer Manifest Generator
// ============================================================
// Generates the canonical installer manifest from repository
// state. The manifest is published alongside install.sh so the
// installer can resolve versions and backends without hardcoding
// them.
// ============================================================

import fs from "fs"
import path from "path"

const MANIFEST_SCHEMA_VERSION = 1
const PACKAGE_JSON_PATH = path.join(process.cwd(), "package.json")
const OUTPUT_PATH = process.argv[2] || path.join(process.cwd(), "website", "installer-manifest.json")

function readPackageVersion() {
  const raw = fs.readFileSync(PACKAGE_JSON_PATH, "utf-8")
  const pkg = JSON.parse(raw)
  if (!pkg.version) {
    throw new Error("package.json is missing version field")
  }
  return pkg.version
}

function generateManifest() {
  const version = readPackageVersion()

  return {
    schema: MANIFEST_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    channels: {
      latest: {
        version,
        npm: "@synth-framework/synth",
      },
      stable: {
        version,
        npm: "@synth-framework/synth",
      },
    },
  }
}

function main() {
  const manifest = generateManifest()
  const outputDir = path.dirname(OUTPUT_PATH)

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf-8")
  console.log(`Generated installer manifest at ${OUTPUT_PATH}`)
  console.log(JSON.stringify(manifest, null, 2))
}

main()
