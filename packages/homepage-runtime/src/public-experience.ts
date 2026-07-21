// ============================================================
// HOMEPAGE RUNTIME: Public Experience Resolver
// ============================================================
// Maps internal Genesis state to the simplified human-facing
// interaction model. This is the boundary between SYNTH's
// governance engine and the Mission Studio product surface.
//
// Public vocabulary is frozen to nine terms:
// Idea, Question, Understanding, Contract, Mission, Plan,
// Evidence, Review, Acceptance.
// ============================================================

import type {
  GenesisState,
  PublicExperienceAction,
  PublicExperienceState,
  PublicExperienceStep,
  PublicFlowState,
} from "./types.js"

const STEP_ORDER: PublicExperienceStep[] = [
  "idea",
  "question",
  "understanding",
  "contract",
  "mission",
  "plan",
  "evidence",
  "review",
  "acceptance",
  "complete",
]

const STEP_MESSAGES: Record<PublicExperienceStep, string> = {
  idea: "What do you want to build?",
  question: "SYNTH needs a little clarity before continuing.",
  understanding: "Here is what SYNTH understands. Does this match your intent?",
  contract: "Approve this contract and SYNTH will build it.",
  mission: "This is the Mission SYNTH derived from your contract.",
  plan: "This is how SYNTH will build it.",
  evidence: "SYNTH is building. Evidence will appear here.",
  review: "Does the result match the contract?",
  acceptance: "Is this outcome complete?",
  complete: "The journey is complete. Replay proves every step.",
}

export function createPublicFlowState(): PublicFlowState {
  return {
    contractApproved: false,
    missionApproved: false,
    planApproved: false,
    executionStarted: false,
    executionComplete: false,
    reviewApproved: false,
    accepted: false,
  }
}

function hasPendingQuestions(state: GenesisState): boolean {
  return state.unknowns.items.length > 0
}

function canShowUnderstanding(state: GenesisState): boolean {
  return state.intent !== undefined && state.discovery !== undefined && !hasPendingQuestions(state)
}

function canShowContract(state: GenesisState): boolean {
  return canShowUnderstanding(state) && state.domain !== undefined
}

function canShowMission(state: GenesisState): boolean {
  return state.mission !== undefined
}

function canShowPlan(state: GenesisState): boolean {
  return state.expeditions.length > 0
}

function canShowEvidence(state: GenesisState): boolean {
  return state.repository !== undefined
}

export function resolvePublicExperience(state: GenesisState): PublicExperienceState {
  const { publicFlow } = state

  let step: PublicExperienceStep = "idea"

  if (!state.intent) {
    step = "idea"
  } else if (hasPendingQuestions(state)) {
    step = "question"
  } else if (!publicFlow.contractApproved) {
    step = canShowContract(state) ? "contract" : "understanding"
  } else if (!publicFlow.missionApproved || !canShowMission(state)) {
    step = "mission"
  } else if (!publicFlow.planApproved || !canShowPlan(state)) {
    step = "plan"
  } else if (!publicFlow.executionComplete) {
    step = publicFlow.executionStarted ? "evidence" : "plan"
  } else if (!publicFlow.reviewApproved) {
    step = "review"
  } else if (!publicFlow.accepted) {
    step = "acceptance"
  } else {
    step = "complete"
  }

  const currentIndex = STEP_ORDER.indexOf(step)

  return {
    step,
    message: STEP_MESSAGES[step],
    progress: {
      current: currentIndex + 1,
      total: STEP_ORDER.length,
    },
    actions: buildActions(state, step),
  }
}

function buildActions(state: GenesisState, currentStep: PublicExperienceStep): PublicExperienceAction[] {
  const actions: PublicExperienceAction[] = []

  switch (currentStep) {
    case "understanding":
      actions.push({ id: "approve-contract", label: "Approve contract", step: "contract" })
      break
    case "contract":
      actions.push({ id: "approve-contract", label: "Approve contract", step: "contract" })
      break
    case "mission":
      actions.push({ id: "approve-mission", label: "Approve mission", step: "mission" })
      break
    case "plan":
      if (state.expeditions.length > 0) {
        actions.push({ id: "approve-plan", label: "Approve plan", step: "plan" })
      }
      if (state.expeditions.length > 0 && !state.publicFlow.executionStarted) {
        actions.push({ id: "start-execution", label: "Start building", step: "evidence" })
      }
      break
    case "evidence":
      if (state.publicFlow.executionComplete) {
        actions.push({ id: "approve-review", label: "Approve review", step: "review" })
      }
      break
    case "review":
      actions.push({ id: "approve-review", label: "Approve review", step: "review" })
      break
    case "acceptance":
      actions.push({ id: "accept-outcome", label: "Accept outcome", step: "acceptance" })
      break
    case "complete":
      actions.push({ id: "replay", label: "Show replay", step: "complete" })
      break
  }

  return actions
}
