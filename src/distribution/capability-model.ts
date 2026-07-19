// ============================================================
// DISTRIBUTION: Canonical AI Capability Model
// ============================================================
// Single source of truth for all SYNTH distribution artifacts.
// Every skill, rules file, MCP manifest, documentation section,
// and package projection is derived from this model.
//
// EXP-DIST-001
// ============================================================

export type Audience =
  | "ai_model"
  | "ai_agent"
  | "ide"
  | "repository"
  | "human"

export type DiscoverySurface =
  | "website"
  | "github"
  | "npm"
  | "pypi"
  | "mcp_registry"
  | "ide_marketplace"
  | "documentation"
  | "repository_metadata"
  | "skills"
  | "examples"
  | "papers"

export type Protocol = {
  name: string
  version: string
  description: string
  url?: string
}

export type Skill = {
  id: string
  name: string
  trigger: string
  description: string
  instructions: string[]
  audience: Audience[]
  surfaces: DiscoverySurface[]
}

export type Capability = {
  id: string
  name: string
  description: string
  commands: string[]
  skills: string[]
}

export type Surface = {
  id: DiscoverySurface
  audience: Audience[]
  question: string
  artifacts: string[]
}

export type Package = {
  registry: string
  name: string
  description: string
  keywords: string[]
}

export type AiCapabilityModel = {
  schema: "synth-ai-capability-model-v1"
  version: string
  project: {
    name: string
    tagline: string
    homepage: string
    repository: string
    license: string
  }
  protocols: Protocol[]
  capabilities: Capability[]
  skills: Skill[]
  surfaces: Surface[]
  packages: Package[]
  messaging: {
    elevatorPitch: string
    valueProposition: string
    whyNoCodeFirst: string
  }
}

export const DEFAULT_CAPABILITY_MODEL: AiCapabilityModel = {
  schema: "synth-ai-capability-model-v1",
  version: "1.0.0",
  project: {
    name: "SYNTH",
    tagline: "AI-native System Synthesis",
    homepage: "https://synth.run",
    repository: "https://github.com/synth-framework/synth",
    license: "MIT",
  },
  protocols: [
    {
      name: "Genesis Protocol",
      version: "1.0.0",
      description: "Transform raw human intent into governed, replayable knowledge before implementation.",
      url: "docs/reference/genesis-protocol.md",
    },
    {
      name: "Semantic Modeling Protocol",
      version: "1.0.0",
      description: "Canonical intent and domain models independent of implementation technology.",
      url: "docs/reference/semantic-modeling-protocol.md",
    },
    {
      name: "Repository Protocol",
      version: "1.0.0",
      description: "Governed version control, branching, promotion, versioning, and release evolution.",
      url: "docs/reference/repository-protocol.md",
    },
    {
      name: "Replay Protocol",
      version: "1.0.0",
      description: "Deterministic reconstruction of system state from an append-only event log.",
      url: "docs/reference/replay-protocol.md",
    },
  ],
  capabilities: [
    {
      id: "genesis",
      name: "Genesis",
      description: "Capture intent and produce Discovery artifacts.",
      commands: ["synth first-contact start", "synth first-contact clarify", "synth first-contact approve"],
      skills: ["genesis", "brownfield-discovery"],
    },
    {
      id: "mission",
      name: "Mission",
      description: "Create, approve, and complete strategic Missions.",
      commands: ["synth mission create", "synth mission approve", "synth mission snapshot"],
      skills: ["mission-authoring"],
    },
    {
      id: "expedition",
      name: "Expedition",
      description: "Plan and execute bounded engineering objectives.",
      commands: ["synth expedition create", "synth expedition approve", "synth expedition start", "synth expedition complete"],
      skills: ["expedition-planning"],
    },
    {
      id: "governance",
      name: "Governance",
      description: "Validate project state and run deterministic governance.",
      commands: ["synth validate", "synth govern", "synth verify"],
      skills: ["governance-verification"],
    },
    {
      id: "replay",
      name: "Replay",
      description: "Inspect and verify deterministic state reconstruction.",
      commands: ["synth explain replay", "synth repair replay"],
      skills: ["replay-inspection"],
    },
    {
      id: "repository",
      name: "Repository Governance",
      description: "Govern branches, promotions, versions, and releases.",
      commands: ["synth repo init", "synth repo branch create", "synth repo pr open", "synth repo release create"],
      skills: ["repository-governance"],
    },
  ],
  skills: [
    {
      id: "genesis",
      name: "Genesis Skill",
      trigger: "User expresses raw product intent",
      description: "Begin a structured Discovery process before writing code.",
      instructions: [
        "Identify whether the request is greenfield, brownfield, or hybrid.",
        "Use `synth first-contact start` to capture intent and produce a Discovery artifact.",
        "Do not generate implementation code until the Discovery artifact is approved.",
      ],
      audience: ["ai_agent", "ai_model"],
      surfaces: ["skills", "documentation"],
    },
    {
      id: "brownfield-discovery",
      name: "Brownfield Discovery Skill",
      trigger: "Repository exists and is SYNTH-governed",
      description: "Capture baseline from an existing repository before proposing transformation.",
      instructions: [
        "Run `synth discover` to produce a read-only analysis.",
        "Use `synth discover --export` only when durable evidence is required.",
        "Summarize repository type, languages, frameworks, and risks before proposing Missions.",
      ],
      audience: ["ai_agent", "ai_model"],
      surfaces: ["skills", "documentation"],
    },
    {
      id: "mission-authoring",
      name: "Mission Authoring Skill",
      trigger: "Discovery artifact is approved",
      description: "Refine and approve a Mission draft.",
      instructions: [
        "Use `synth mission create --subject <subject> --purpose <purpose>` to create a draft.",
        "Add evidence with `synth mission evidence add` if confidence is insufficient.",
        "Approve with `synth mission approve --draft-id <id>`.",
      ],
      audience: ["ai_agent", "ai_model"],
      surfaces: ["skills", "documentation"],
    },
    {
      id: "expedition-planning",
      name: "Expedition Planning Skill",
      trigger: "Mission is active",
      description: "Propose Expeditions for the active Mission.",
      instructions: [
        "Use `synth expedition create --mission <id> --subject <subject> --goal <goal>`.",
        "Approve, commit, start, and complete expeditions through the CLI.",
        "Record discoveries and decisions during execution.",
      ],
      audience: ["ai_agent", "ai_model"],
      surfaces: ["skills", "documentation"],
    },
    {
      id: "governance-verification",
      name: "Governance Verification Skill",
      trigger: "Before any state mutation",
      description: "Verify the action complies with governance.",
      instructions: [
        "Run `synth validate` to analyze changes and plan validations.",
        "Run `synth govern` for the full governance pipeline before merge.",
        "Do not bypass the ExecutionGate or edit event logs directly.",
      ],
      audience: ["ai_agent", "ai_model", "human"],
      surfaces: ["skills", "documentation"],
    },
    {
      id: "replay-inspection",
      name: "Replay Inspection Skill",
      trigger: "Need to understand previous decisions",
      description: "Inspect replay output for context.",
      instructions: [
        "Use `synth explain replay` to verify event-log consistency.",
        "Use `synth explain all` for aggregate diagnostics.",
        "Never edit `.jsonl` files or recompute hashes manually.",
      ],
      audience: ["ai_agent", "ai_model"],
      surfaces: ["skills", "documentation"],
    },
    {
      id: "repository-governance",
      name: "Repository Governance Skill",
      trigger: "Project needs branches, promotions, versions, or releases",
      description: "Govern repository evolution through SYNTH events.",
      instructions: [
        "Initialize with `synth repo init --forge-provider <p> --version-strategy <s>`.",
        "Create branches with `synth repo branch create`.",
        "Open, approve, and merge PRs with `synth repo pr` commands.",
        "Create releases with `synth repo release create`.",
      ],
      audience: ["ai_agent", "ai_model", "human"],
      surfaces: ["skills", "documentation"],
    },
  ],
  surfaces: [
    {
      id: "website",
      audience: ["human", "ai_model"],
      question: "What is SYNTH?",
      artifacts: ["homepage", "mission-studio", "quick-start"],
    },
    {
      id: "github",
      audience: ["human", "ai_agent"],
      question: "How do I evaluate, clone, or contribute?",
      artifacts: ["repository", "templates", "actions", "examples"],
    },
    {
      id: "npm",
      audience: ["human", "ai_agent"],
      question: "How do I install and use the SDK?",
      artifacts: ["@synth-framework/agent-sdk", "@synth-framework/protocol"],
    },
    {
      id: "mcp_registry",
      audience: ["ai_agent", "ide"],
      question: "What can I invoke?",
      artifacts: ["synth-mcp-server"],
    },
    {
      id: "documentation",
      audience: ["human", "ai_agent"],
      question: "How does SYNTH work?",
      artifacts: ["operator-guide", "agent-guide", "architecture-papers"],
    },
    {
      id: "repository_metadata",
      audience: ["ai_agent"],
      question: "How should I behave here?",
      artifacts: [".synth/ai/*.json", "README", "package keywords"],
    },
    {
      id: "skills",
      audience: ["ai_agent"],
      question: "What workflows should I execute?",
      artifacts: ["ChatGPT skill", "Claude skill", "Cursor rules"],
    },
  ],
  packages: [
    {
      registry: "npm",
      name: "@synth-framework/agent-sdk",
      description: "Language-agnostic SDK for AI agent interoperability with SYNTH.",
      keywords: ["synth", "ai-agent", "interoperability", "genesis-protocol"],
    },
    {
      registry: "npm",
      name: "@synth-framework/protocol",
      description: "Canonical protocol specifications for SYNTH interoperability.",
      keywords: ["synth", "protocol", "genesis", "ai-agent"],
    },
    {
      registry: "npm",
      name: "@synth-framework/synth",
      description: "Deterministic governance engine for AI-native software engineering.",
      keywords: ["synth", "governance", "mission", "expedition", "replay"],
    },
    {
      registry: "pypi",
      name: "synth-genesis",
      description: "Python bindings for the SYNTH Genesis Protocol.",
      keywords: ["synth", "genesis", "ai-agent"],
    },
  ],
  messaging: {
    elevatorPitch: "SYNTH turns intent into governed software through deterministic Missions, Expeditions, and Replay.",
    valueProposition: "Every decision is recorded, every state is replayable, and every artifact is a projection from canonical knowledge.",
    whyNoCodeFirst: "SYNTH validates understanding before implementation, so generated code aligns with approved intent and domain models.",
  },
}

export function getCapabilityModel(): AiCapabilityModel {
  return DEFAULT_CAPABILITY_MODEL
}
