// ============================================================
// DISTRIBUTION: Projection Engine
// ============================================================
// Generates platform-specific artifacts from the Canonical AI
// Capability Model. Targets are registered by name; the engine
// is pure and deterministic.
//
// EXP-DIST-002
// ============================================================

import type { AiCapabilityModel, Audience, DiscoverySurface, Skill, Capability, Protocol, Package } from "./capability-model.js"

export type ProjectionTarget =
  | "chatgpt-skill"
  | "claude-skill"
  | "gemini-skill"
  | "codex-instructions"
  | "cursor-rules"
  | "windsurf-rules"
  | "cline-rules"
  | "mcp-manifest"
  | "package-metadata"
  | "website-section"

export type ProjectionResult = {
  target: ProjectionTarget
  filename: string
  content: string
  contentType: "markdown" | "json" | "yaml" | "html"
}

export type ProjectionFunction = (model: AiCapabilityModel) => ProjectionResult

const registry = new Map<ProjectionTarget, ProjectionFunction>()

export function registerProjection(target: ProjectionTarget, fn: ProjectionFunction): void {
  registry.set(target, fn)
}

export function listProjectionTargets(): ProjectionTarget[] {
  return Array.from(registry.keys())
}

export function project(model: AiCapabilityModel, target: ProjectionTarget): ProjectionResult {
  const fn = registry.get(target)
  if (!fn) {
    throw new Error(`Unknown projection target: ${target}. Available: ${listProjectionTargets().join(", ")}`)
  }
  return fn(model)
}

export function projectAll(model: AiCapabilityModel): ProjectionResult[] {
  return listProjectionTargets().map((target) => project(model, target))
}

// ============================================================
// Helpers
// ============================================================

function formatSkillInstructions(skill: Skill): string {
  return skill.instructions.map((step, i) => `${i + 1}. ${step}`).join("\n")
}

function capabilityList(model: AiCapabilityModel): string {
  return model.capabilities
    .map((cap) => `- **${cap.name}**: ${cap.description}\n  - Commands: ${cap.commands.map((c) => `\`${c}\``).join(", ")}`)
    .join("\n")
}

function skillList(model: AiCapabilityModel): string {
  return model.skills
    .map((s) => `### ${s.name}\n\n**Trigger:** ${s.trigger}\n\n**Description:** ${s.description}\n\n**Instructions:**\n${formatSkillInstructions(s)}`)
    .join("\n\n")
}

function protocolList(model: AiCapabilityModel): string {
  return model.protocols
    .map((p) => `- **${p.name}** v${p.version}: ${p.description}${p.url ? ` ([docs](${p.url}))` : ""}`)
    .join("\n")
}

// ============================================================
// Skill projections
// ============================================================

const chatgptSkillProjection: ProjectionFunction = (model) => ({
  target: "chatgpt-skill",
  filename: "synth-chatgpt-skill.md",
  contentType: "markdown",
  content: `# ${model.project.name} — ChatGPT Skill

## Role

You are a SYNTH-native engineering assistant. You help operators transform intent into governed software through deterministic Discovery, Missions, Expeditions, and Replay.

## Trigger

When a user asks to build, create, design, migrate, refactor, or improve software, and the project uses SYNTH.

## Core instructions

1. Never generate implementation code before Discovery is approved.
2. Prefer SYNTH CLI commands over ad-hoc file edits.
3. Every mutation must go through the ExecutionGate.
4. Run governance validation before proposing merge.

## Capabilities

${capabilityList(model)}

## Skills

${skillList(model)}

## Protocols

${protocolList(model)}

## Safety

- Do not edit \`.jsonl\` files directly.
- Do not recompute hashes.
- Do not bypass Mission Studio approval.
`,
})

const claudeSkillProjection: ProjectionFunction = (model) => ({
  target: "claude-skill",
  filename: "synth-claude-skill.md",
  contentType: "markdown",
  content: `# ${model.project.name} — Claude Skill

## System prompt

You operate inside a SYNTH-governed project. SYNTH is a deterministic execution system for engineering work: humans explore, SYNTH remembers, and AI executes through Missions, Expeditions, Evidence, and Replay.

## When to use SYNTH

- The user expresses product intent without a formal plan.
- The repository contains \`.synth/\` metadata.
- The user asks for governance, validation, or review.

## Behavior

${model.skills.map((s) => `### ${s.name}\n- Trigger: ${s.trigger}\n- Action: ${s.description}\n- Steps:\n${s.instructions.map((step) => `  - ${step}`).join("\n")}`).join("\n\n")}

## Allowed commands

${model.capabilities.map((c) => `- ${c.name}: ${c.commands.map((cmd) => `\`${cmd}\``).join(", ")}`).join("\n")}

## Constraints

${model.protocols.map((p) => `- Respect the ${p.name}: ${p.description}`).join("\n")}
`,
})

const geminiSkillProjection: ProjectionFunction = (model) => ({
  target: "gemini-skill",
  filename: "synth-gemini-skill.md",
  contentType: "markdown",
  content: `# ${model.project.name} — Gemini Gem Instructions

## Purpose

Guide users through SYNTH's deterministic lifecycle from intent to governed software.

## Invocation

Detect when a request is a product or engineering task that would benefit from structured Discovery, Mission, and Expedition planning.

## Workflow

1. **Genesis**: Capture intent with \`synth first-contact start\`.
2. **Discovery**: Run \`synth discover\` for brownfield contexts.
3. **Mission**: Approve a Mission before implementation.
4. **Expedition**: Execute bounded objectives with evidence.
5. **Governance**: Validate with \`synth govern\` before promotion.

## Capabilities

${capabilityList(model)}

## Protocols

${protocolList(model)}
`,
})

const codexInstructionsProjection: ProjectionFunction = (model) => ({
  target: "codex-instructions",
  filename: "synth-codex-instructions.md",
  contentType: "markdown",
  content: `# SYNTH Repository Instructions

## About this project

${model.project.tagline}. This repository uses SYNTH for deterministic governance.

## How to interact

- Use SYNTH CLI commands instead of manual edits when possible.
- Create Missions for strategic work and Expeditions for bounded objectives.
- Record decisions and discoveries during execution.
- Validate changes with \`synth validate\` and run \`synth govern\` before merging.

## Capabilities

${capabilityList(model)}

## Safety rules

- Do not edit event logs or state files directly.
- Do not bypass Mission Studio or Genesis approval.
- Use ADR-037 shell-safe command construction for multiline bodies.
`,
})

// ============================================================
// IDE rules projections
// ============================================================

const cursorRulesProjection: ProjectionFunction = (model) => ({
  target: "cursor-rules",
  filename: ".cursorrules",
  contentType: "markdown",
  content: `# SYNTH Cursor Rules

# Role
You are a SYNTH-native engineering assistant in a deterministic governance project.

# Discovery
When the user expresses product intent, use \`synth first-contact start\` to capture it.
For existing repositories, run \`synth discover\` before proposing changes.

# Governance
- Create Missions for strategic objectives: \`synth mission create --subject <s> --purpose <p>\`
- Create Expeditions for bounded work: \`synth expedition create --mission <id> --subject <s> --goal <g>\`
- Validate before merge: \`synth govern\`

# Safety
- Do not edit \`.jsonl\` or canonical state files directly.
- Do not recompute hashes.
- Do not bypass approval gates.

# Capabilities
${model.capabilities.map((c) => `- ${c.name}: ${c.commands.join(", ")}`).join("\n")}
`,
})

const windsurfRulesProjection: ProjectionFunction = (model) => ({
  target: "windsurf-rules",
  filename: ".windsurfrules",
  contentType: "markdown",
  content: `# SYNTH Windsurf Rules

## Identity
You are operating in a SYNTH-governed project. SYNTH ensures deterministic, replayable engineering work.

## Workflow
1. Capture intent through Genesis or Discovery.
2. Propose Missions and Expeditions before implementation.
3. Record evidence, decisions, and discoveries.
4. Validate with \`synth validate\` and \`synth govern\`.

## Commands
${model.capabilities.map((c) => `- ${c.name}: ${c.commands.map((cmd) => `\`${cmd}\``).join(", ")}`).join("\n")}

## Constraints
- Never edit event logs directly.
- Never bypass the ExecutionGate.
- Always use shell-safe command construction (ADR-037).
`,
})

const clineRulesProjection: ProjectionFunction = (model) => ({
  target: "cline-rules",
  filename: ".clinerules",
  contentType: "markdown",
  content: `# SYNTH Cline Rules

## Context
This project uses SYNTH for deterministic lifecycle governance.

## Instructions
- Begin product requests with Genesis Discovery.
- Break approved work into Missions and Expeditions.
- Use SYNTH CLI for state mutations.
- Run governance validation before requesting merge.

## Capabilities
${model.capabilities.map((c) => `- ${c.name}: ${c.description}`).join("\n")}

## Protocols
${model.protocols.map((p) => `- ${p.name}: ${p.description}`).join("\n")}
`,
})

// ============================================================
// MCP manifest projection
// ============================================================

const mcpManifestProjection: ProjectionFunction = (model) => ({
  target: "mcp-manifest",
  filename: "synth-mcp-manifest.json",
  contentType: "json",
  content: JSON.stringify(
    {
      schema_version: "v1",
      name: "synth",
      display_name: model.project.name,
      description: model.project.tagline,
      homepage: model.project.homepage,
      repository: model.project.repository,
      capabilities: {
        tools: model.capabilities.map((cap) => ({
          name: cap.id,
          description: cap.description,
          inputSchema: { type: "object" },
        })),
      },
      protocols: model.protocols.map((p) => ({ name: p.name, version: p.version, url: p.url })),
    },
    null,
    2,
  ),
})

// ============================================================
// Package metadata projection
// ============================================================

const packageMetadataProjection: ProjectionFunction = (model) => ({
  target: "package-metadata",
  filename: "synth-package-metadata.json",
  contentType: "json",
  content: JSON.stringify(
    {
      project: model.project,
      keywords: Array.from(new Set(model.packages.flatMap((p) => p.keywords))),
      packages: model.packages,
      aiTags: ["ai-agent", "genesis-protocol", "deterministic-governance", "mission-driven"],
      protocolVersions: model.protocols.map((p) => ({ name: p.name, version: p.version })),
      discoverySurfaces: model.surfaces.map((s) => ({ id: s.id, question: s.question, artifacts: s.artifacts })),
    },
    null,
    2,
  ),
})

// ============================================================
// Website section projection
// ============================================================

const websiteSectionProjection: ProjectionFunction = (model) => ({
  target: "website-section",
  filename: "distribution-section.html",
  contentType: "html",
  content: `<section class="distribution" id="distribution">
  <h2>Discover SYNTH everywhere</h2>
  <p>${model.messaging.elevatorPitch}</p>
  <p>${model.messaging.valueProposition}</p>

  <div class="surface-grid">
    ${model.surfaces
      .map(
        (s) => `<article class="surface-card">
      <h3>${s.id.replace(/_/g, " ")}</h3>
      <p><strong>${s.question}</strong></p>
      <ul>${s.artifacts.map((a) => `<li>${a}</li>`).join("")}</ul>
    </article>`,
      )
      .join("\n    ")}
  </div>

  <h3>Protocols</h3>
  <ul>
    ${model.protocols.map((p) => `<li><strong>${p.name}</strong> — ${p.description}</li>`).join("\n    ")}
  </ul>

  <h3>Packages</h3>
  <ul>
    ${model.packages.map((p) => `<li><code>${p.name}</code> (${p.registry}) — ${p.description}</li>`).join("\n    ")}
  </ul>
</section>`,
})

// ============================================================
// Register all built-in projections
// ============================================================

registerProjection("chatgpt-skill", chatgptSkillProjection)
registerProjection("claude-skill", claudeSkillProjection)
registerProjection("gemini-skill", geminiSkillProjection)
registerProjection("codex-instructions", codexInstructionsProjection)
registerProjection("cursor-rules", cursorRulesProjection)
registerProjection("windsurf-rules", windsurfRulesProjection)
registerProjection("cline-rules", clineRulesProjection)
registerProjection("mcp-manifest", mcpManifestProjection)
registerProjection("package-metadata", packageMetadataProjection)
registerProjection("website-section", websiteSectionProjection)
