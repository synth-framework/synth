#!/usr/bin/env node
// ============================================================
// AI Capability Projection Engine (EXP-DIST-001, EXP-DIST-002)
// ============================================================
// Reads src/distribution/ai-capability-model.json and projects it into
// platform-specific artifacts under distribution/.
//
// Usage:
//   node scripts/project-ai-capabilities.js
//   node scripts/project-ai-capabilities.js --check
//   node scripts/project-ai-capabilities.js --out-dir <dir>
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
const CAPABILITY_LIST_PATH = path.resolve(PROJECT_ROOT, "docs", "reference", "capability-list.json")
const OUTPUT_ROOT = path.resolve(PROJECT_ROOT, "distribution")

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function readCanonicalModel() {
  const content = await fs.readFile(MODEL_PATH, "utf-8")
  return JSON.parse(content)
}

async function readCapabilityList() {
  const content = await fs.readFile(CAPABILITY_LIST_PATH, "utf-8")
  const list = JSON.parse(content)
  assert(list.schema === "synth-capability-list-v1", "Capability list must use expected schema")
  assert(Array.isArray(list.capabilities), "Capability list must declare capabilities array")
  return list
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

function modelHash(model) {
  return hashString(stableStringify(model))
}

// ============================================================
// Shared model views
// ============================================================

function readOnlyCommands(model) {
  return model.commandSafety.commands.filter((c) => c.safety === "READ_ONLY")
}

function proposalCommands(model) {
  return model.commandSafety.commands.filter((c) => c.safety === "PROPOSAL_ONLY")
}

function discoverySafeCommands(model) {
  return model.commandSafety.commands.filter((c) => c.safety === "READ_ONLY" || c.safety === "PROPOSAL_ONLY")
}

function mutatingCommands(model) {
  return model.commandSafety.commands.filter((c) => c.safety === "MUTATING")
}

function formatCommandList(commands, prefix = "") {
  return commands.map((c) => `- ${prefix ? `${prefix} ` : ""}\`${c.command}\` — ${c.description}`).join("\n")
}

function formatVocabulary(model) {
  return model.publicVocabulary.concepts.map((c) => `**${c.name}** — ${c.definition}\n> ${c.example}`).join("\n\n")
}

function formatProtectedAssets(model) {
  return model.protectedAssets.assets.map((a) => `- **${a.name}** — ${a.description}`).join("\n")
}

function formatGovernanceLifecycle(model) {
  return model.governanceLifecycle.phases.map((p) => `- **${p.name}** — ${p.description}`).join("\n")
}

function formatWorkflows(model) {
  return model.workflows.map((w) => {
    const body = w.steps
      ? w.steps.map((s) => `- ${s}`).join("\n")
      : `Commands: ${(w.commands || w.safeCommands || []).map((c) => `\`${c}\``).join(", ")}`
    return `### ${w.name}\n\n${w.description}\n\n${body}\n\n> Invariant: ${w.invariant}`
  }).join("\n\n")
}

function formatCapabilities(capabilities) {
  return capabilities.map((c) => `- **${c.name}** — ${c.description}`).join("\n")
}

// ============================================================
// Platform templates
// ============================================================

function claudeSkill(model, capabilities = []) {
  return `# ${model.platform.name} Skill

> ${model.platform.tagline}

## Public vocabulary

${formatVocabulary(model)}

${model.publicVocabulary.rule}

## Command safety

### Discovery-safe commands

${formatCommandList(discoverySafeCommands(model))}

### Mutating commands

${formatCommandList(
    model.commandSafety.commands.filter((c) => c.safety === "MUTATING" || c.safety === "POTENTIALLY_MUTATING"),
  )}

## Protected assets

${formatProtectedAssets(model)}

${model.protectedAssets.rule}

## Governance lifecycle

${formatGovernanceLifecycle(model)}

## Common workflows

${formatWorkflows(model)}

## Capabilities

${formatCapabilities(capabilities)}

## Source

- Canonical model: \`${MODEL_PATH}\`
- Capability list: \`${CAPABILITY_LIST_PATH}\`
- Model version: \`${model.version}\`
- Model hash: \`${modelHash(model)}\`
`
}

function codexInstructions(model, capabilities = []) {
  return `# ${model.platform.name} Repository Instructions

## Identity

${model.platform.tagline}

npm: \`${model.platform.npmPackage}\`
CLI: \`synth\`

## Public vocabulary (seven concepts)

${model.publicVocabulary.concepts.map((c) => `- ${c.name}: ${c.definition}`).join("\n")}

## Rules

1. During discovery, use only these read-only commands: ${readOnlyCommands(model).map((c) => `\`${c.command}\``).join(", ")}
2. Proposals are safe to generate: ${proposalCommands(model).map((c) => `\`${c.command}\``).join(", ")}
3. These commands require explicit approval before use: ${mutatingCommands(model).map((c) => `\`${c.command}\``).join(", ")}
4. Never modify protected assets without an Architecture Expedition and ADR.
5. Prefer the seven public concepts when explaining SYNTH to operators.

## Protected assets

${model.protectedAssets.assets.map((a) => `- ${a.name}`).join("\n")}

## Governance lifecycle

${model.governanceLifecycle.phases.map((p) => p.name).join(" → ")}

## Capabilities

${formatCapabilities(capabilities)}

## Source

Canonical model: \`${MODEL_PATH}\` (version ${model.version})
`
}

function chatgptSkill(model, capabilities = []) {
  return `# ${model.platform.name} Custom GPT Instructions

## Role

You are a SYNTH-aware assistant operating inside a SYNTH-governed repository.

> ${model.platform.tagline}

## Public vocabulary

Use exactly these seven concepts when explaining SYNTH:

${model.publicVocabulary.concepts.map((c) => `- **${c.name}**: ${c.definition}`).join("\n")}

## Command safety rules

- Read-only commands are safe at any time: ${readOnlyCommands(model).map((c) => `\`${c.command}\``).join(", ")}
- Proposal commands generate drafts without mutating state: ${proposalCommands(model).map((c) => `\`${c.command}\``).join(", ")}
- Mutating commands require explicit operator approval: ${mutatingCommands(model).map((c) => `\`${c.command}\``).join(", ")}

## Protected assets

${model.protectedAssets.assets.map((a) => `- ${a.name}`).join("\n")}

${model.protectedAssets.rule}

## Governance lifecycle

${model.governanceLifecycle.phases.map((p) => `- ${p.name}: ${p.description}`).join("\n")}

## Capabilities

${formatCapabilities(capabilities)}

## Source

Canonical model: \`${MODEL_PATH}\` (version ${model.version}, hash ${modelHash(model)})
`
}

function geminiSkill(model, capabilities = []) {
  return `# ${model.platform.name} Gem Instructions

## Identity

${model.platform.tagline}

## Public vocabulary

${model.publicVocabulary.concepts.map((c) => `- **${c.name}**: ${c.definition}\n  Example: ${c.example}`).join("\n")}

## Command safety

### Safe during discovery

${formatCommandList(discoverySafeCommands(model), "synth")}

### Require approval

${formatCommandList(mutatingCommands(model), "synth")}

## Protected assets

${model.protectedAssets.assets.map((a) => `- ${a.name}: ${a.description}`).join("\n")}

## Governance lifecycle

${model.governanceLifecycle.phases.map((p) => p.name).join(" → ")}

## Capabilities

${formatCapabilities(capabilities)}

## Source

Canonical model: \`${MODEL_PATH}\` (version ${model.version})
`
}

function cursorRules(model, capabilities = []) {
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

${formatCommandList(discoverySafeCommands(model), "synth")}

## Protected assets

${model.protectedAssets.assets.map((a) => `- ${a.name}`).join("\n")}

## Capabilities

${formatCapabilities(capabilities)}

## Source

Canonical model: \`${MODEL_PATH}\` (version ${model.version})
`
}

function clineRules(model, capabilities = []) {
  return `# ${model.platform.name} Rules for Cline

## Public vocabulary

Explain SYNTH with exactly these seven concepts:

${model.publicVocabulary.concepts.map((c) => `- ${c.name}: ${c.definition}`).join("\n")}

## Read-only commands (safe anytime)

${readOnlyCommands(model).map((c) => `- synth ${c.command}`).join("\n")}

## Governance rule

- All persistent state changes flow through the ExecutionGate.
- Events are immutable and append-only.
- Replay reconstructs state from events.

## Protected assets

${model.protectedAssets.assets.map((a) => `- ${a.name}`).join("\n")}

## Capabilities

${formatCapabilities(capabilities)}

## Source

Canonical model: \`${MODEL_PATH}\` (version ${model.version})
`
}

function windsurfRules(model, capabilities = []) {
  return `# ${model.platform.name} Rules for Windsurf

## Role

You are a SYNTH-aware coding assistant. Follow these rules when working in a SYNTH-governed repository.

> ${model.platform.tagline}

## Public vocabulary

${model.publicVocabulary.concepts.map((c) => `- **${c.name}**: ${c.definition}`).join("\n")}

## Command safety

### Safe during discovery

${formatCommandList(discoverySafeCommands(model), "synth")}

### Require explicit approval

${formatCommandList(mutatingCommands(model), "synth")}

## Protected assets

${model.protectedAssets.assets.map((a) => `- ${a.name}: ${a.description}`).join("\n")}

## Governance lifecycle

${model.governanceLifecycle.phases.map((p) => `- ${p.name}: ${p.description}`).join("\n")}

## Capabilities

${formatCapabilities(capabilities)}

## Source

Canonical model: \`${MODEL_PATH}\` (version ${model.version})
`
}

function rooRules(model, capabilities = []) {
  return `# ${model.platform.name} Rules for Roo

## Identity

${model.platform.tagline}

## Public vocabulary (seven concepts)

${model.publicVocabulary.concepts.map((c) => `- ${c.name}: ${c.definition}`).join("\n")}

## Rules

- Use only READ_ONLY and PROPOSAL_ONLY commands during discovery.
- Never run a MUTATING command without explicit operator approval.
- Do not modify protected assets without an Architecture Expedition and ADR.
- Prefer 'synth mission create' and 'synth expedition create' for proposing work.
- Treat the event log as immutable; state is always derived from events.

## Discovery-safe commands

${formatCommandList(discoverySafeCommands(model), "synth")}

## Protected assets

${model.protectedAssets.assets.map((a) => `- ${a.name}`).join("\n")}

## Governance lifecycle

${model.governanceLifecycle.phases.map((p) => p.name).join(" → ")}

## Capabilities

${formatCapabilities(capabilities)}

## Source

Canonical model: \`${MODEL_PATH}\` (version ${model.version})
`
}

function aiderInstructions(model, capabilities = []) {
  return `# ${model.platform.name} Instructions for Aider

## Context

${model.platform.tagline}

## Public vocabulary

${model.publicVocabulary.concepts.map((c) => `- ${c.name}: ${c.definition}`).join("\n")}

## Instructions

1. Read-only analysis is always safe: ${readOnlyCommands(model).map((c) => `\`${c.command}\``).join(", ")}
2. Proposals do not mutate state: ${proposalCommands(model).map((c) => `\`${c.command}\``).join(", ")}
3. Mutating commands require approval: ${mutatingCommands(model).map((c) => `\`${c.command}\``).join(", ")}
4. Never modify Mission Studio, Genesis, Replay, ExecutionGate, Event Model, Capability Model, Constitutional Baseline, or Public Vocabulary without an Architecture Expedition.
5. Explain SYNTH using only the seven public concepts.

## Protected assets

${model.protectedAssets.assets.map((a) => `- ${a.name}`).join("\n")}

## Governance lifecycle

${model.governanceLifecycle.phases.map((p) => p.name).join(" → ")}

## Capabilities

${formatCapabilities(capabilities)}

## Source

Canonical model: \`${MODEL_PATH}\` (version ${model.version})
`
}

function continueRules(model, capabilities = []) {
  return `# ${model.platform.name} Rules for Continue.dev

## Assistant identity

${model.platform.tagline}

## Public vocabulary

${model.publicVocabulary.concepts.map((c) => `- **${c.name}**: ${c.definition}`).join("\n")}

## Command safety

- Discovery-safe: ${discoverySafeCommands(model).map((c) => `\`${c.command}\``).join(", ")}
- Require approval: ${mutatingCommands(model).map((c) => `\`${c.command}\``).join(", ")}

## Protected assets

${model.protectedAssets.assets.map((a) => `- ${a.name}: ${a.description}`).join("\n")}

${model.protectedAssets.rule}

## Governance lifecycle

${model.governanceLifecycle.phases.map((p) => `- ${p.name}: ${p.description}`).join("\n")}

## Capabilities

${formatCapabilities(capabilities)}

## Source

Canonical model: \`${MODEL_PATH}\` (version ${model.version})
`
}

function mcpManifest(model, capabilities = []) {
  const readOnly = readOnlyCommands(model)
  const proposals = proposalCommands(model)

  return {
    schema_version: "1.0",
    name: model.platform.name,
    description: model.platform.tagline,
    version: model.platform.version,
    repository: model.platform.repository,
    npm_package: model.platform.npmPackage,
    public_vocabulary: model.publicVocabulary.concepts.map((c) => c.name),
    capabilities: capabilities.map((c) => c.name),
    capability_count: capabilities.length,
    tools: [
      ...readOnly.map((c) => ({
        name: c.command.replace(/\s+/g, "_"),
        description: c.description,
        safety: c.safety,
        command: `synth ${c.command}`,
      })),
      ...proposals.map((c) => ({
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
      hash: modelHash(model),
    },
  }
}

// ============================================================
// Projection registry
// ============================================================

const PROJECTION_REGISTRY = {
  "claude-skill": { template: claudeSkill, path: "agent-skills/claude.md" },
  "codex-instructions": { template: codexInstructions, path: "agent-skills/codex.md" },
  "chatgpt-skill": { template: chatgptSkill, path: "agent-skills/chatgpt.md" },
  "gemini-skill": { template: geminiSkill, path: "agent-skills/gemini.md" },
  "cursor-rules": { template: cursorRules, path: "ide-rules/.cursor/rules.mdc" },
  "cline-rules": { template: clineRules, path: "ide-rules/.clinerules" },
  "windsurf-rules": { template: windsurfRules, path: "ide-rules/.windsurfrules" },
  "roo-rules": { template: rooRules, path: "ide-rules/.roorules" },
  "aider-instructions": { template: aiderInstructions, path: "ide-rules/.aider-instructions.md" },
  "continue-rules": { template: continueRules, path: "ide-rules/.continue/rules.md" },
  "mcp-manifest": {
    template: (model, capabilities) => stableStringify(mcpManifest(model, capabilities)),
    path: "mcp/manifest.json",
  },
}

function getProjections(model, capabilities) {
  assert(Array.isArray(model.distributionTargets), "Canonical model must declare distributionTargets")

  const projections = []
  for (const target of model.distributionTargets) {
    const entry = PROJECTION_REGISTRY[target.id]
    if (!entry) {
      throw new Error(`Unknown distribution target: ${target.id}`)
    }
    projections.push({
      target: target.id,
      path: entry.path,
      content: entry.template(model, capabilities),
    })
  }
  return projections
}

// ============================================================
// I/O helpers
// ============================================================

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
  const capabilityList = await readCapabilityList()

  assert(model["$schema"] === "synth-ai-capability-model-v1", "Unsupported model schema")
  assert(typeof model.version === "string", "Model version must be a string")
  assert(Array.isArray(model.distributionTargets), "Canonical model must declare distributionTargets")

  const projections = getProjections(model, capabilityList.capabilities)

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
  console.log(`\nCanonical model hash: ${modelHash(model)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
