// ============================================================
// HOMEPAGE: Public Experience Views
// ============================================================
// Thin, public-vocabulary-only UI views for the simplified SYNTH
// interaction model: Idea, Question, Understanding, Contract,
// Mission, Plan, Evidence, Review, Acceptance.
//
// These views deliberately avoid internal governance terminology.
// They render what the user needs to see at each public step.
// ============================================================

import { renderArtifactCard } from "./components.js"

/**
 * @typedef {import("./homepage-runtime/index.js").PublicExperienceState} PublicExperienceState
 * @typedef {import("./homepage-runtime/index.js").PublicExperienceStep} PublicExperienceStep
 * @typedef {import("./homepage-runtime/index.js").GenesisState} GenesisState
 * @typedef {import("./homepage-runtime/index.js").ArtifactProjection} ArtifactProjection
 * @typedef {import("./homepage-runtime/index.js").DiscoveryCard} DiscoveryCard
 * @typedef {import("./homepage-runtime/index.js").ExpeditionCard} ExpeditionCard
 * @typedef {import("./homepage-runtime/index.js").ArchitectureCard} ArchitectureCard
 * @typedef {import("./homepage-runtime/index.js").RepositoryCard} RepositoryCard
 * @typedef {import("./homepage-runtime/index.js").EvidenceCard} EvidenceCard
 * @typedef {import("./homepage-runtime/index.js").MissionCard} MissionCard
 * @typedef {import("./homepage-runtime/index.js").IntentCard} IntentCard
 */

const PUBLIC_STEPS = [
  { id: "idea", label: "Idea" },
  { id: "question", label: "Question" },
  { id: "understanding", label: "Understanding" },
  { id: "contract", label: "Contract" },
  { id: "mission", label: "Mission" },
  { id: "plan", label: "Plan" },
  { id: "evidence", label: "Evidence" },
  { id: "review", label: "Review" },
  { id: "acceptance", label: "Acceptance" },
]

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * Render a public-facing artifact card using only public vocabulary.
 * Internal artifact kind names are relabeled for the homepage surface.
 * @param {IntentCard | DiscoveryCard | MissionCard | ExpeditionCard | EvidenceCard | ArchitectureCard | RepositoryCard} card
 * @returns {string}
 */
function renderPublicArtifactCard(card) {
  if (!card || typeof card !== "object") return ""

  switch (card.kind) {
    case "intent": {
      const goals = card.goals?.length
        ? `<div class="ms-card-section"><div class="ms-card-section-title">Goals</div><ul>${card.goals.map((g) => `<li>${escapeHtml(g)}</li>`).join("")}</ul></div>`
        : ""
      return `
        <article class="ms-card ms-card-intent">
          <div class="ms-card-header">
            <div class="ms-card-kind">Idea</div>
            <span class="ms-confidence">${Math.round((card.confidence ?? 1) * 100)}% confidence</span>
          </div>
          <h4 class="ms-card-title">${escapeHtml(card.description)}</h4>
          <div class="ms-card-body">${goals}</div>
        </article>
      `
    }
    case "discovery": {
      const findings = card.findings?.length
        ? `<div class="ms-card-section"><div class="ms-card-section-title">Understanding</div><ul>${card.findings.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul></div>`
        : ""
      const capabilities = card.capabilities?.length
        ? `<div class="ms-tags">${card.capabilities.map((c) => `<span class="ms-tag">${escapeHtml(c)}</span>`).join("")}</div>`
        : ""
      const constraints = card.constraints?.length
        ? `<div class="ms-card-section"><div class="ms-card-section-title">Constraints</div><ul>${card.constraints.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul></div>`
        : ""
      return `
        <article class="ms-card ms-card-discovery">
          <div class="ms-card-header">
            <div class="ms-card-kind">Understanding</div>
          </div>
          <div class="ms-card-body">
            ${findings}
            ${constraints}
            ${capabilities}
          </div>
        </article>
      `
    }
    case "mission": {
      const objectives = card.objectives?.length
        ? `<div class="ms-card-section"><div class="ms-card-section-title">Objectives</div><ul>${card.objectives.map((o) => `<li>${escapeHtml(o)}</li>`).join("")}</ul></div>`
        : ""
      return `
        <article class="ms-card ms-card-mission">
          <div class="ms-card-header">
            <div class="ms-card-kind">Mission</div>
            <span class="ms-status ms-status-completed">Approved</span>
          </div>
          <h4 class="ms-card-title">${escapeHtml(card.name)}</h4>
          <div class="ms-card-body">
            <p>${escapeHtml(card.purpose)}</p>
            ${objectives}
          </div>
        </article>
      `
    }
    case "expedition": {
      const status = card.status === "completed" ? "completed" : "draft"
      return `
        <article class="ms-card ms-card-expedition">
          <div class="ms-card-header">
            <div class="ms-card-kind">Plan item</div>
            <span class="ms-status ms-status-${status}">${escapeHtml(status)}</span>
          </div>
          <h4 class="ms-card-title">${escapeHtml(card.name)}</h4>
          <div class="ms-card-body">
            <p>${escapeHtml(card.goal)}</p>
          </div>
        </article>
      `
    }
    case "evidence":
      return `
        <article class="ms-card ms-card-evidence">
          <div class="ms-card-header">
            <div class="ms-card-kind">Evidence</div>
            <span class="ms-confidence">${Math.round(card.confidence * 100)}% confidence</span>
          </div>
          <div class="ms-card-body">
            <p>${escapeHtml(card.observation)}</p>
            ${card.source ? `<div class="ms-card-meta"><span class="ms-tag">${escapeHtml(card.source)}</span></div>` : ""}
          </div>
        </article>
      `
    case "architecture": {
      const dependencies = card.dependencies?.length
        ? `<div class="ms-card-section"><div class="ms-card-section-title">Dependencies</div><p>${card.dependencies.map(escapeHtml).join(", ")}</p></div>`
        : ""
      return `
        <article class="ms-card ms-card-architecture">
          <div class="ms-card-header">
            <div class="ms-card-kind">Structure</div>
          </div>
          <h4 class="ms-card-title">${escapeHtml(card.layer)}</h4>
          <div class="ms-card-body">
            <p>${escapeHtml(card.responsibility)}</p>
            ${dependencies}
          </div>
        </article>
      `
    }
    case "repository": {
      const artifactList = card.artifacts?.length
        ? `<div class="ms-card-section"><div class="ms-card-section-title">Artifacts</div><ul>${card.artifacts.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul></div>`
        : ""
      return `
        <article class="ms-card ms-card-repository">
          <div class="ms-card-header">
            <div class="ms-card-kind">Summary</div>
            <span class="ms-status ms-status-completed">${escapeHtml(card.status)}</span>
          </div>
          <div class="ms-card-body">
            ${artifactList}
            <div class="ms-card-meta">
              <span class="ms-tag">${card.eventCount} events</span>
            </div>
          </div>
        </article>
      `
    }
    default:
      return ""
  }
}

/**
 * Render the public step progress indicator.
 * @param {{ step: PublicExperienceStep }} props
 * @returns {string}
 */
export function renderStepIndicator({ step }) {
  const currentIndex = PUBLIC_STEPS.findIndex((s) => s.id === step)
  return `
    <div class="ms-public-steps" aria-label="Progress">
      ${PUBLIC_STEPS.map((s, index) => {
        const state = index < currentIndex ? "past" : index === currentIndex ? "active" : "future"
        return `<div class="ms-public-step ms-public-step-${state}" data-step="${s.id}">
          <span class="ms-public-step-number">${index + 1}</span>
          <span class="ms-public-step-label">${escapeHtml(s.label)}</span>
        </div>`
      }).join("")}
    </div>
  `
}

/**
 * Render action buttons for the current public step.
 * @param {{ actions: Array<{ id: string; label: string }> }} props
 * @returns {string}
 */
export function renderPublicActions({ actions }) {
  if (actions.length === 0) return ""
  return `
    <div class="ms-public-actions">
      ${actions.map((action) => `
        <button type="button" class="ms-btn ms-btn-primary ms-public-action" data-action="${escapeHtml(action.id)}">
          ${escapeHtml(action.label)}
        </button>
      `).join("")}
    </div>
  `
}

/**
 * Render the public experience header for the workspace.
 * @param {{ experience: PublicExperienceState }} props
 * @returns {string}
 */
export function renderPublicHeader({ experience }) {
  const current = PUBLIC_STEPS.find((s) => s.id === experience.step)
  return `
    <div class="ms-public-header">
      <div class="ms-public-step-title">${escapeHtml(current?.label ?? experience.step)}</div>
      <div class="ms-public-step-message">${escapeHtml(experience.message)}</div>
    </div>
  `
}

/**
 * Render the Idea step: intent input surface.
 * @param {{ examples: Array<{ id: string; name: string }>; inputValue?: string; mode?: string }} props
 * @returns {string}
 */
export function renderIdeaView({ examples, inputValue = "", mode = "greenfield" }) {
  const modes = [
    { id: "greenfield", label: "Greenfield" },
    { id: "brownfield", label: "Brownfield" },
    { id: "knowledge", label: "Knowledge" },
    { id: "conversation", label: "Conversation" },
  ]
  return `
    <div class="ms-public-view ms-public-view-idea">
      <h2>What do you want to build?</h2>
      <p>Type an idea below or pick a curated example.</p>
      <div class="ms-source-selector" role="group" aria-label="Entry mode">
        ${modes.map((m) => `
          <button type="button" class="ms-btn ms-source-option ${m.id === mode ? "ms-source-active" : ""}" data-mode="${m.id}">
            ${escapeHtml(m.label)}
          </button>
        `).join("")}
      </div>
      <form id="ms-intent-form" class="ms-intent-form" aria-label="Intent discovery">
        <input id="ms-intent-input" type="text" placeholder="e.g., Build a CRM" autocomplete="off" aria-label="Describe what you want to build" value="${escapeHtml(inputValue)}" />
        <button type="submit" class="ms-btn ms-btn-primary">Discover</button>
      </form>
      <div id="ms-examples" class="ms-examples">
        ${examples.map((e) => `<button class="ms-btn ms-btn-secondary ms-example" data-example="${escapeHtml(e.id)}">${escapeHtml(e.name)}</button>`).join("")}
      </div>
    </div>
  `
}

/**
 * Render the Question step: clarification form.
 * @param {{ state: GenesisState }} props
 * @returns {string}
 */
export function renderQuestionView({ state }) {
  const questions = state.unknowns.items.map((unknown, index) => ({
    id: `q-${index}`,
    field: unknown.field,
    description: unknown.description,
  }))

  return `
    <div class="ms-public-view ms-public-view-question">
      <h3>Help SYNTH understand</h3>
      <p>Answer a few quick questions so SYNTH can refine its understanding.</p>
      <form id="ms-question-form" class="ms-question-form">
        ${questions.map((q) => `
          <div class="ms-question-item">
            <label for="${escapeHtml(q.id)}">${escapeHtml(q.description)}</label>
            <input id="${escapeHtml(q.id)}" type="text" name="${escapeHtml(q.field)}" data-field="${escapeHtml(q.field)}" placeholder="Your answer" />
          </div>
        `).join("")}
        <button type="submit" class="ms-btn ms-btn-primary">Continue</button>
      </form>
    </div>
  `
}

/**
 * Render the Understanding step: show what SYNTH understood.
 * @param {{ state: GenesisState }} props
 * @returns {string}
 */
export function renderUnderstandingView({ state }) {
  const cards = []
  if (state.intent) cards.push(renderPublicArtifactCard(state.intent))
  if (state.discovery) cards.push(renderPublicArtifactCard(state.discovery))
  return `
    <div class="ms-public-view ms-public-view-understanding">
      <h3>Here is what SYNTH understood</h3>
      <p>Review this before approving the contract.</p>
      <div class="ms-public-artifacts">${cards.join("")}</div>
    </div>
  `
}

/**
 * Render the Contract step: show the contract for approval.
 * @param {{ state: GenesisState }} props
 * @returns {string}
 */
export function renderContractView({ state }) {
  const cards = []
  if (state.intent) cards.push(renderPublicArtifactCard(state.intent))
  if (state.discovery) cards.push(renderPublicArtifactCard(state.discovery))
  if (state.domain) cards.push(renderPublicArtifactCard(state.domain))
  return `
    <div class="ms-public-view ms-public-view-contract">
      <h3>Contract</h3>
      <p>Approve this contract and SYNTH will derive a Mission and Plan.</p>
      <div class="ms-public-artifacts">${cards.join("")}</div>
    </div>
  `
}

/**
 * Render the Mission step: show derived mission.
 * @param {{ state: GenesisState }} props
 * @returns {string}
 */
export function renderMissionView({ state }) {
  const cards = []
  if (state.mission) cards.push(renderPublicArtifactCard(state.mission))
  return `
    <div class="ms-public-view ms-public-view-mission">
      <h3>Mission</h3>
      <p>This is what SYNTH will build.</p>
      <div class="ms-public-artifacts">${cards.join("")}</div>
    </div>
  `
}

/**
 * Render the Plan step: show expeditions.
 * @param {{ state: GenesisState }} props
 * @returns {string}
 */
export function renderPlanView({ state }) {
  const cards = state.expeditions.map((expedition) => renderPublicArtifactCard(expedition))
  return `
    <div class="ms-public-view ms-public-view-plan">
      <h3>Plan</h3>
      <p>This is how SYNTH will build it.</p>
      <div class="ms-public-artifacts">${cards.join("") || `<p class="ms-placeholder">No plan items yet.</p>`}</div>
    </div>
  `
}

/**
 * Render the Evidence step: show execution progress and evidence.
 * @param {{ state: GenesisState; projection: ArtifactProjection }} props
 * @returns {string}
 */
export function renderEvidenceView({ state, projection }) {
  const cards = []
  if (projection.architecture) for (const layer of projection.architecture) cards.push(renderPublicArtifactCard(layer))
  if (projection.repository) cards.push(renderPublicArtifactCard(projection.repository))
  for (const evidence of projection.evidence) cards.push(renderPublicArtifactCard(evidence))

  const status = state.publicFlow.executionComplete ? "Complete" : "In progress"

  return `
    <div class="ms-public-view ms-public-view-evidence">
      <h3>Evidence</h3>
      <p>Status: <strong>${escapeHtml(status)}</strong></p>
      <div class="ms-public-artifacts">${cards.join("") || `<p class="ms-placeholder">Building evidence...</p>`}</div>
    </div>
  `
}

/**
 * Render the Review step: show result for review against contract.
 * @param {{ state: GenesisState; projection: ArtifactProjection }} props
 * @returns {string}
 */
export function renderReviewView({ state, projection }) {
  const cards = []
  if (projection.repository) cards.push(renderPublicArtifactCard(projection.repository))
  if (projection.architecture) for (const layer of projection.architecture) cards.push(renderPublicArtifactCard(layer))
  // Show completed plan items as part of the reviewable outcome.
  for (const expedition of state.expeditions) cards.push(renderPublicArtifactCard(expedition))

  return `
    <div class="ms-public-view ms-public-view-review">
      <h3>Review</h3>
      <p>Does this result match the contract?</p>
      <div class="ms-public-artifacts">${cards.join("")}</div>
    </div>
  `
}

/**
 * Render the Acceptance step: final sign-off.
 * @param {{ state: GenesisState; projection: ArtifactProjection }} props
 * @returns {string}
 */
export function renderAcceptanceView({ state, projection }) {
  return `
    <div class="ms-public-view ms-public-view-acceptance">
      <h3>Acceptance</h3>
      <p>Is this outcome complete?</p>
      <div class="ms-public-summary">
        <p><strong>Idea:</strong> ${escapeHtml(state.input)}</p>
        <p><strong>Mission:</strong> ${escapeHtml(state.mission?.name ?? "")}</p>
        <p><strong>Plan items:</strong> ${state.expeditions.length}</p>
        <p><strong>Events:</strong> ${projection.repository?.eventCount ?? 0}</p>
      </div>
    </div>
  `
}

/**
 * Render the Complete step: journey finished, replay available.
 * @param {{ state: GenesisState }} props
 * @returns {string}
 */
export function renderCompleteView({ state }) {
  return `
    <div class="ms-public-view ms-public-view-complete">
      <h3>Complete</h3>
      <p>The journey from idea to accepted outcome is complete.</p>
      <div class="ms-public-summary">
        <p><strong>Idea:</strong> ${escapeHtml(state.input)}</p>
        <p><strong>Mission:</strong> ${escapeHtml(state.mission?.name ?? "")}</p>
        <p><strong>Accepted:</strong> Yes</p>
      </div>
    </div>
  `
}

/**
 * Render the appropriate view for the current public experience state.
 * @param {{ experience: PublicExperienceState; state: GenesisState; projection: ArtifactProjection; examples: Array<{ id: string; name: string }> }} props
 * @returns {string}
 */
export function renderPublicExperience({ experience, state, projection, examples }) {
  const viewArgs = { experience, state, projection, examples }

  switch (experience.step) {
    case "idea":
      return renderIdeaView({ examples })
    case "question":
      return renderQuestionView({ state })
    case "understanding":
      return renderUnderstandingView({ state })
    case "contract":
      return renderContractView({ state })
    case "mission":
      return renderMissionView({ state })
    case "plan":
      return renderPlanView({ state })
    case "evidence":
      return renderEvidenceView({ state, projection })
    case "review":
      return renderReviewView({ state, projection })
    case "acceptance":
      return renderAcceptanceView({ state, projection })
    case "complete":
      return renderCompleteView({ state })
    default:
      return renderIdeaView({ examples })
  }
}
