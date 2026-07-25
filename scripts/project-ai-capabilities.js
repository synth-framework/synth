#!/usr/bin/env node
// ============================================================
// AI Capability Projection Engine (EXP-DIST-001)
// ============================================================
// Reads src/distribution/ai-capability-model.json and projects it into
// platform-specific artifacts under distribution/.
//
// Usage:
//   node scripts/project-ai-capabilities.js
//   node scripts/project-ai-capabilities.js --check
//
// --check exits with code 0 if committed projections match regenerated
// output, and code 1 if any projection is stale.
//
// The canonical model is the single source of truth. All generated files
// are deterministic projections.
// ============================================================

import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, "..")
const MODEL_PATH = path.resolve(PROJECT_ROOT, "src", "distribution", "ai-capability-model.json")
const OUTPUT_ROOT = path.resolve(PROJECT_ROOT, "distribution")

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function readCanonicalModel() {
  const content = await fs.readFile(MODEL_PATH, "utf-8")
  return JSON.parse(content)
}

function stableStringify(value, indent = 2) {
  function sortKeys(obj) {
    if (Array.isArray(obj)) {
      return obj.map(sortKeys)
    }
    if (obj !== null && typeof obj === "object") {
      const sorted = {}
      for (const key of Object.keys(obj).sort()) {
        sorted[key] = sortKeys(obj[key])
      }
      return sorted
    }
    return obj
  }
  return JSON.stringify(sortKeys(value), null, indent)
}

function hashString(input) {
  return crypto.createHash("sha256").update(input, "utf-8").digest("hex")
}

function generateClaudeSkill(model) {
  const commands = model.commandSafety.commands
    .filter((c) => c.safety === "READ_ONLY" || c.safety === "PROPOSAL_ONLY")
    .map((c) => `- \`${c.command}\` — ${c.description}`)
    .join("\n")

  const mutating = model.commandSafety.commands
    .filter((c) => c.safety === "MUTATING" || c.safety === "POTENTIALLY_MUTATING")
    .map((c) => `- \`${c.command}\` — ${c.description} (${c.safety}${c.requiresApproval ? ", requires approval" : ""})`)
    .join("\n")

  return `# ${model.platform.name} Skill

> ${model.platform.tagline}

## Public vocabulary

${model.publicVocabulary.concepts.map((c) => `**${c.name}** — ${c.definition}\n> ${c.example}`).join("\n\n")}

${model.publicVocabulary.rule}

## Command safety

### Discovery-safe commands

${commands}

### Mutating commands

${mutating}

## Protected assets

${model.protectedAssets.assets.map((a) => `- **${a.name}** — ${a.description}`).join("\n")}

${model.protectedAssets.rule}

## Governance lifecycle

${model.governanceLifecycle.phases.map((p) => `- **${p.name}** — ${p.description}`).join("\n")}

## Common workflows

${model.workflows.map((w) => {
        const body = w.steps
          ? w.steps.map((s) => `- ${s}`).join("\n")
          : `Commands: ${(w.commands || w.safeCommands || []).map((c) => `\`${c}\``).join(", ")}`
        return `### ${w.name}\n\n${w.description}\n\n${body}\n\n> Invariant: ${w.invariant}`
      }).join("\n\n")}

## Source

- Canonical model: \`${MODEL_PATH}\`
- Model version: \`${model.version}\`
- Model hash: \`${hashString(stableStringify(model))}\`
`
}

function generateCodexInstructions(model) {
  const readOnly = model.commandSafety.commands
    .filter((c) => c.safety === "READ_ONLY")
    .map((c) => c.command)

  const proposal = model.commandSafety.commands
    .filter((c) => c.safety === "PROPOSAL_ONLY")
    .map((c) => c.command)

  const mutating = model.commandSafety.commands
    .filter((c) => c.safety === "MUTATING")
    .map((c) => c.command)

  return `# ${model.platform.name} Repository Instructions

## Identity

${model.platform.tagline}

npm: \`${model.platform.npmPackage}\`
CLI: \`synth\`

## Public vocabulary (seven concepts)

${model.publicVocabulary.concepts.map((c) => `- ${c.name}: ${c.definition}`).join("\n")}

## Rules

1. During discovery, use only these read-only commands: ${readOnly.map((c) => `\`${c}\``).join(", ")}
2. Proposals are safe to generate: ${proposal.map((c) => `\`${c}\``).join(", ")}
3. These commands require explicit approval before use: ${mutating.map((c) => `\`${c}\``).join(", ")}
4. Never modify protected assets without an Architecture Expedition and ADR.
5. Prefer the seven public concepts when explaining SYNTH to operators.

## Protected assets

${model.protectedAssets.assets.map((a) => `- ${a.name}`).join("\n")}

## Governance lifecycle

${model.governanceLifecycle.phases.map((p) => p.name).join(" → ")}

## Source

Canonical model: \`${MODEL_PATH}\` (version ${model.version})
`
}

function generateCursorRules(model) {
  const rules = [
    "Always explain SYNTH using the seven public concepts: Mission, Expedition, Evidence, Plan, Event, State, Replay.",
    "During repository discovery, use only READ_ONLY and PROPOSAL_ONLY synth commands.",
    "Never invoke a MUTATING synth command without explicit operator approval.",
    "Do not modify Mission Studio, Genesis, Replay, ExecutionGate, Event Model, Capability Model, Constitutional Baseline, or Public Vocabulary without an Architecture Expedition.",
    "When proposing changes, prefer 'synth mission create' and 'synth expedition create' over ad-hoc edits.",
    "Treat events as immutable; state is always derived from events.",
  ]

  return `# ${model.platform.name} Rules for Cursor

${rules.map((r) => `- ${r}`).join("\n")}

## Discovery-safe commands

${model.commandSafety.commands
  .filter((c) => c.safety === "READ_ONLY" || c.safety === "PROPOSAL_ONLY")
  .map((c) => `- \`synth ${c.command}\` — ${c.description}`)
  .join("\n")}

## Protected assets

${model.protectedAssets.assets.map((a) => `- ${a.name}`).join("\n")}

## Source

Canonical model: \`${MODEL_PATH}\` (version ${model.version})
`
}

function generateClineRules(model) {
  const readOnly = model.commandSafety.commands
    .filter((c) => c.safety === "READ_ONLY")
    .map((c) => `- synth ${c.command}`)
    .join("\n")

  return `# ${model.platform.name} Rules for Cline

## Public vocabulary

Explain SYNTH with exactly these seven concepts:

${model.publicVocabulary.concepts.map((c) => `- ${c.name}: ${c.definition}`).join("\n")}

## Read-only commands (safe anytime)

${readOnly}

## Governance rule

- All persistent state changes flow through the ExecutionGate.
- Events are immutable and append-only.
- Replay reconstructs state from events.

## Protected assets

${model.protectedAssets.assets.map((a) => `- ${a.name}`).join("\n")}

## Source

Canonical model: \`${MODEL_PATH}\` (version ${model.version})
`
}

function generateMcpManifest(model) {
  const readOnlyCommands = model.commandSafety.commands.filter((c) => c.safety === "READ_ONLY")
  const proposalCommands = model.commandSafety.commands.filter((c) => c.safety === "PROPOSAL_ONLY")

  return {
    schema_version: "1.0",
    name: model.platform.name,
    description: model.platform.tagline,
    version: model.platform.version,
    repository: model.platform.repository,
    npm_package: model.platform.npmPackage,
    public_vocabulary: model.publicVocabulary.concepts.map((c) => c.name),
    tools: [
      ...readOnlyCommands.map((c) => ({
        name: c.command.replace(/\s+/g, "_"),
        description: c.description,
        safety: c.safety,
        command: `synth ${c.command}`,
      })),
      ...proposalCommands.map((c) => ({
        name: c.command.replace(/\s+/g, "_"),
        description: c.description,
        safety: c.safety,
        command: `synth ${c.command}`,
        note: "Produces a proposal; does not mutate state.",
      })),
    ],
    protected_assets: model.protectedAssets.assets.map((a) => a.name),
    governance_lifecycle: model.governanceLifecycle.phases.map((p) => p.name),
    source: {
      path: MODEL_PATH,
      version: model.version,
      hash: hashString(stableStringify(model)),
    },
  }
}

function getProjections(model) {
  return [
    {
      target: "claude-skill",
      path: "agent-skills/claude.md",
      content: generateClaudeSkill(model),
    },
    {
      target: "codex-instructions",
      path: "agent-skills/codex.md",
      content: generateCodexInstructions(model),
    },
    {
      target: "cursor-rules",
      path: "ide-rules/.cursor/rules.mdc",
      content: generateCursorRules(model),
    },
    {
      target: "cline-rules",
      path: "ide-rules/.clinerules",
      content: generateClineRules(model),
    },
    {
      target: "mcp-manifest",
      path: "mcp/manifest.json",
      content: stableStringify(generateMcpManifest(model)),
    },
  ]
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function writeProjections(projections, outputRoot) {
  for (const projection of projections) {
    const filePath = path.resolve(outputRoot, projection.path)
    await ensureDir(path.dirname(filePath))
    await fs.writeFile(filePath, projection.content, "utf-8")
  }
}

async function readExistingProjections(outputRoot) {
  const files = {}
  try {
    await fs.access(outputRoot)
  } catch {
    return files
  }

  async function* walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        yield* walk(full)
      } else {
        yield full
      }
    }
  }

  for await (const file of walk(outputRoot)) {
    const relative = path.relative(outputRoot, file)
    files[relative] = await fs.readFile(file, "utf-8")
  }
  return files
}

function parseArgs(argv) {
  const args = argv.slice(2)
  const flags = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--check") {
      flags.check = true
    } else if (arg === "--out-dir") {
      flags.outDir = args[i + 1]
      i++
    }
  }
  return flags
}

async function main() {
  const flags = parseArgs(process.argv)
  const checkMode = flags.check === true
  const outDir = flags.outDir ? path.resolve(flags.outDir) : OUTPUT_ROOT
  const model = await readCanonicalModel()

  assert(model["$schema"] === "synth-ai-capability-model-v1", "Unsupported model schema")
  assert(typeof model.version === "string", "Model version must be a string")

  const projections = getProjections(model)

  if (checkMode) {
    const regenerated = {}
    for (const projection of projections) {
      regenerated[projection.path] = projection.content
    }
    const existing = await readExistingProjections(outDir)

    const regenNames = Object.keys(regenerated).sort()
    const existingNames = Object.keys(existing).sort()

    let hasDiff = false
    const allNames = new Set([...regenNames, ...existingNames])

    for (const name of allNames) {
      if (!(name in regenerated)) {
        console.log(`❌ Stale: ${name} exists in ${path.relative(PROJECT_ROOT, outDir)} but is no longer generated`)
        hasDiff = true
        continue
      }
      if (!(name in existing)) {
        console.log(`❌ Stale: ${name} is newly generated but missing from ${path.relative(PROJECT_ROOT, outDir)}`)
        hasDiff = true
        continue
      }
      if (regenerated[name] !== existing[name]) {
        console.log(`❌ Stale: ${name} content differs from regenerated output`)
        hasDiff = true
      }
    }

    if (hasDiff) {
      console.log("\n📝 Run `node scripts/project-ai-capabilities.js` to regenerate distribution artifacts.")
      process.exit(1)
    }

    console.log(`✅ Distribution projections are fresh (${regenNames.length} projection(s) match committed output).`)
    process.exit(0)
  }

  await writeProjections(projections, outDir)

  for (const projection of projections) {
    console.log(`Generated ${projection.path}`)
  }
  console.log(`\nCanonical model hash: ${hashString(stableStringify(model))}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
