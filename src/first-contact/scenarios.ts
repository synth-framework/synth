// ============================================================
// FIRST CONTACT: Canonical Scenarios
// ============================================================
// Scenario definitions for EXP-FIRSTCONTACT-010 — Agent Ground Truth
// Discovery. These are the controlled environments in which an agent's
// initial interpretation is observed and scored.
//
// Each scenario describes:
//   - the human prompt that starts the session
//   - the repository state before the agent acts
//   - the expected trajectory (commands + reasoning states)
//
// The actual command execution and telemetry capture is performed by the
// experiment runner (experiment.ts).
// ============================================================

export interface AgentReasoningState {
  understoodAs: string
  confidence: number
  unknowns: string[]
}

export interface Turn {
  /** CLI command to execute, e.g. ["status"] or ["mission", "list"] */
  command: string[]
  /** Natural-language intent the agent attributes to this action */
  intent?: string
  /** The agent's own model of the project before executing the command */
  agentReasoningState?: AgentReasoningState
}

export interface Scenario {
  id: string
  humanPrompt: string
  description: string
  /** Files to place in the repository before the session begins */
  repositoryFiles: Record<string, string>
  /** Whether the runner should initialize the directory as a SYNTH project */
  initializeSynth: boolean
  /** Ordered turns that constitute the expected canonical trajectory */
  turns: Turn[]
}

export const SCENARIO_SCHEMA_VERSION = "1.0.0"

// ------------------------------------------------------------
// Scenario 1: Repository Introduction
// ------------------------------------------------------------
// The agent should inspect before acting.
// ------------------------------------------------------------
export const repositoryIntroductionScenario: Scenario = {
  id: "repository-introduction",
  humanPrompt: "I want to understand this project before making any changes.",
  description:
    "Agent enters a SYNTH-governed knowledge repository and discovers project intent through status, explain, and docs commands.",
  initializeSynth: true,
  repositoryFiles: {
    "knowledge/overview.md": "# Hospitality Automation Platform\n\nA guest-service system for hotels and resorts.\n",
    "docs/architecture.md": "# Architecture\n\nThe system is described as a set of bounded contexts: reservations, housekeeping, guest-services.\n",
  },
  turns: [
    {
      command: ["status"],
      intent: "Determine the current governance state of the repository.",
      agentReasoningState: {
        understoodAs: "unknown repository",
        confidence: 0.1,
        unknowns: ["project purpose", "lifecycle phase", "next valid action"],
      },
    },
    {
      command: ["explain"],
      intent: "Read the operator briefing to understand project intent and constraints.",
      agentReasoningState: {
        understoodAs: "governed project with documentation",
        confidence: 0.4,
        unknowns: ["specific domain", "active mission"],
      },
    },
    {
      command: ["docs", "generate"],
      intent: "Materialize documentation projections from the knowledge base.",
      agentReasoningState: {
        understoodAs: "specification-stage hospitality automation platform",
        confidence: 0.7,
        unknowns: ["implementation plan"],
      },
    },
  ],
}

// ------------------------------------------------------------
// Scenario 2: Create New Capability
// ------------------------------------------------------------
// The agent should treat the request as a governed transformation,
// not an immediate coding task.
// ------------------------------------------------------------
export const createNewCapabilityScenario: Scenario = {
  id: "create-new-capability",
  humanPrompt: "I need to add authentication to this project.",
  description:
    "Agent receives a feature request and must align it with the governed lifecycle before creating an expedition.",
  initializeSynth: true,
  repositoryFiles: {
    "knowledge/overview.md": "# Hospitality Automation Platform\n\nGuest-service system.\n",
    "docs/decisions/identity-model.md": "# Identity Model Decision\n\nGuests and staff have distinct identity contexts.\n",
  },
  turns: [
    {
      command: ["status"],
      intent: "Establish current state before proposing a change.",
      agentReasoningState: {
        understoodAs: "feature request: authentication",
        confidence: 0.3,
        unknowns: ["existing identity model", "governance state"],
      },
    },
    {
      command: ["explain"],
      intent: "Understand existing decisions and project boundaries.",
      agentReasoningState: {
        understoodAs: "system transformation requiring governed change",
        confidence: 0.5,
        unknowns: ["mission alignment", "expedition scope"],
      },
    },
    {
      command: ["mission", "create", "--subject", "Authentication", "--purpose", "Add identity and access control to the hospitality platform"],
      intent: "Create a governed mission for the capability.",
      agentReasoningState: {
        understoodAs: "governed transformation: authentication mission",
        confidence: 0.75,
        unknowns: ["approval path"],
      },
    },
  ],
}

// ------------------------------------------------------------
// Scenario 3: Ambiguous Request
// ------------------------------------------------------------
// The agent should preserve uncertainty instead of hallucinating intent.
// ------------------------------------------------------------
export const ambiguousRequestScenario: Scenario = {
  id: "ambiguous-request",
  humanPrompt: "Make the app better.",
  description:
    "Agent receives an underspecified request and must surface uncertainty rather than generate changes.",
  initializeSynth: true,
  repositoryFiles: {
    "knowledge/overview.md": "# Hospitality Automation Platform\n\nGuest-service system.\n",
  },
  turns: [
    {
      command: ["status"],
      intent: "Check current state before interpreting the request.",
      agentReasoningState: {
        understoodAs: "ambiguous improvement request",
        confidence: 0.1,
        unknowns: ["target outcome", "user impact", "current limitations", "acceptance criteria"],
      },
    },
    {
      command: ["explain"],
      intent: "Gather enough context to identify what 'better' could mean.",
      agentReasoningState: {
        understoodAs: "ambiguous improvement request on specification-stage project",
        confidence: 0.2,
        unknowns: ["target outcome", "user impact", "current limitations", "acceptance criteria"],
      },
    },
  ],
}

// ------------------------------------------------------------
// Scenario 4: Recovering From Wrong Model
// ------------------------------------------------------------
// The agent initially assumes an existing application, then evidence
// corrects it toward a specification repository.
// ------------------------------------------------------------
export const recoveringFromWrongModelScenario: Scenario = {
  id: "recovering-from-wrong-model",
  humanPrompt: "I want to understand this project before making any changes.",
  description:
    "Repository contains implementation-shaped artifacts (UI, components, navigation). Agent must recover to the correct specification interpretation once SYNTH evidence is introduced.",
  initializeSynth: false,
  repositoryFiles: {
    "UI/components/GuestCard.tsx": "export function GuestCard() { return <div>Guest</div> }\n",
    "navigation/routes.ts": "export const routes = []\n",
    "design/tokens.json": "{}\n",
  },
  turns: [
    {
      command: ["status"],
      intent: "Initial inspection before any SYNTH evidence exists.",
      agentReasoningState: {
        understoodAs: "existing React Native / frontend application",
        confidence: 0.8,
        unknowns: [],
      },
    },
    {
      command: ["init", "--name", "Hospitality Design System"],
      intent: "Initialize SYNTH governance so intent-shaped evidence becomes visible.",
      agentReasoningState: {
        understoodAs: "existing React Native / frontend application",
        confidence: 0.6,
        unknowns: ["why initialize if app exists"],
      },
    },
    {
      command: ["status"],
      intent: "Re-evaluate interpretation after SYNTH initialization evidence is available.",
      agentReasoningState: {
        understoodAs: "specification-stage design repository",
        confidence: 0.7,
        unknowns: ["implementation timeline"],
      },
    },
  ],
}

/** All canonical first-contact scenarios. */
export const canonicalScenarios: Scenario[] = [
  repositoryIntroductionScenario,
  createNewCapabilityScenario,
  ambiguousRequestScenario,
  recoveringFromWrongModelScenario,
]

/** Look up a scenario by id. */
export function getScenario(id: string): Scenario | undefined {
  return canonicalScenarios.find((s) => s.id === id)
}
