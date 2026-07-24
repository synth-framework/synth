// ============================================================
// HOMEPAGE: Public Experience Views
// ============================================================
// Human-facing UI for the simplified SYNTH journey:
// Idea → Question → Understanding → Contract → Mission → Plan →
// Evidence → Review → Acceptance.
//
// No internal governance vocabulary appears on this surface.
// ============================================================

/**
 * @typedef {import("./homepage-runtime/index.js").PublicExperienceState} PublicExperienceState
 * @typedef {import("./homepage-runtime/index.js").PublicExperienceStep} PublicExperienceStep
 * @typedef {import("./homepage-runtime/index.js").GenesisState} GenesisState
 * @typedef {import("./homepage-runtime/index.js").ArtifactProjection} ArtifactProjection
 * @typedef {import("./homepage-runtime/index.js").DiscoveryCard} DiscoveryCard
 * @typedef {import("./homepage-runtime/index.js").ExpeditionCard} ExpeditionCard
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

function titleCase(text) {
  return text.replace(/\b\w/g, (c) => c.toUpperCase())
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
      <div class="ms-public-step-title">Step ${experience.progress.current} of ${experience.progress.total}</div>
      <div class="ms-public-step-message">${escapeHtml(experience.message)}</div>
    </div>
  `
}

/**
 * Render a public-facing card for an artifact, using public vocabulary only.
 * @param {IntentCard | DiscoveryCard | MissionCard | ExpeditionCard} card
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
        ? `<ul>${card.findings.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>`
        : ""
      const constraints = card.constraints?.length
        ? `<div class="ms-contract-section"><div class="ms-contract-section-title">Constraints</div><ul>${card.constraints.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul></div>`
        : ""
      const capabilities = card.capabilities?.length
        ? `<div class="ms-contract-section"><div class="ms-contract-section-title">Capabilities</div><div class="ms-tags">${card.capabilities.map((c) => `<span class="ms-tag">${escapeHtml(c)}</span>`).join("")}</div></div>`
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
      const successCriteria = card.successCriteria?.length
        ? `<div class="ms-card-section"><div class="ms-card-section-title">Success criteria</div><ul>${card.successCriteria.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul></div>`
        : ""
      return `
        <article class="ms-card ms-card-mission">
          <div class="ms-card-header">
            <div class="ms-card-kind">Mission</div>
          </div>
          <h4 class="ms-card-title">${escapeHtml(card.name)}</h4>
          <div class="ms-card-body">
            <p>${escapeHtml(card.purpose)}</p>
            ${objectives}
            ${successCriteria}
          </div>
        </article>
      `
    }
    case "expedition": {
      const status = card.status === "completed" ? "completed" : "pending"
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
    default:
      return ""
  }
}

/**
 * Render the Idea step: intent input surface.
 * @param {{ examples: Array<{ id: string; name: string; input: string }>; inputValue?: string; mode?: string }} props
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
      <div class="ms-public-hero">
        <h2>What do you want to build?</h2>
        <p>Describe your idea in plain language. SYNTH will ask a few questions, confirm what it understood, and then build it with your approval.</p>
      </div>
      <div class="ms-source-selector" role="group" aria-label="Entry mode">
        ${modes.map((m) => `
          <button type="button" class="ms-btn ms-source-option ${m.id === mode ? "ms-source-active" : ""}" data-mode="${m.id}">
            ${escapeHtml(m.label)}
          </button>
        `).join("")}
      </div>
      <form id="ms-intent-form" class="ms-intent-form" aria-label="Intent discovery">
        <input id="ms-intent-input" type="text" placeholder="e.g., Create a homepage for an AI product" autocomplete="off" aria-label="Describe what you want to build" value="${escapeHtml(inputValue)}" />
        <button type="submit" class="ms-btn ms-btn-primary">Start</button>
      </form>
      <div class="ms-examples-label">Or try a curated example:</div>
      <div id="ms-examples" class="ms-examples">
        ${examples.map((e) => `<button class="ms-btn ms-btn-secondary ms-example" data-example="${escapeHtml(e.id)}" data-input="${escapeHtml(e.input)}">${escapeHtml(e.name)}</button>`).join("")}
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
      <div class="ms-public-hero">
        <h3>Before SYNTH can help, it needs to understand a few things</h3>
        <p>Your answers shape the contract. You can always revise them later.</p>
      </div>
      <form id="ms-question-form" class="ms-question-form">
        ${questions.map((q) => `
          <div class="ms-question-item">
            <label for="${escapeHtml(q.id)}">${escapeHtml(q.description)}</label>
            <input id="${escapeHtml(q.id)}" type="text" name="${escapeHtml(q.field)}" data-field="${escapeHtml(q.field)}" placeholder="${escapeHtml(defaultPlaceholder(q.field))}" />
          </div>
        `).join("")}
        <button type="submit" class="ms-btn ms-btn-primary">Continue</button>
      </form>
    </div>
  `
}

function defaultPlaceholder(field) {
  switch (field) {
    case "runtime":
      return "web, desktop, mobile..."
    case "language":
      return "typescript, python, rust..."
    case "capabilities":
      return "authentication, search, export..."
    default:
      return "Your answer"
  }
}

/**
 * Render the Understanding step: show what SYNTH understood.
 * @param {{ state: GenesisState }} props
 * @returns {string}
 */
export function renderUnderstandingView({ state }) {
  const idea = state.intent?.description ?? ""
  const constraints = state.discovery?.constraints ?? []
  const capabilities = state.discovery?.capabilities ?? []

  return `
    <div class="ms-public-view ms-public-view-understanding">
      <div class="ms-public-hero">
        <h3>Here is what SYNTH understood</h3>
        <p>Review this summary. If it matches your intent, approve it to form the contract.</p>
      </div>
      <div class="ms-public-summary">
        <div class="ms-public-summary-row">
          <span class="ms-public-summary-key">Idea</span>
          <span class="ms-public-summary-value">${escapeHtml(idea)}</span>
        </div>
        ${constraints.length > 0 ? `
          <div class="ms-public-summary-row">
            <span class="ms-public-summary-key">Constraints</span>
            <span class="ms-public-summary-value">${constraints.map(escapeHtml).join("; ")}</span>
          </div>
        ` : ""}
        ${capabilities.length > 0 ? `
          <div class="ms-public-summary-row">
            <span class="ms-public-summary-key">Capabilities</span>
            <span class="ms-public-summary-value">${capabilities.map((c) => `<span class="ms-tag">${escapeHtml(c)}</span>`).join(" ")}</span>
          </div>
        ` : ""}
      </div>
      ${state.intent ? renderPublicArtifactCard(state.intent) : ""}
    </div>
  `
}

/**
 * Render the Contract step: show the contract for approval.
 * @param {{ state: GenesisState }} props
 * @returns {string}
 */
export function renderContractView({ state }) {
  const idea = state.intent?.description ?? ""
  const constraints = state.discovery?.constraints ?? []
  const capabilities = state.discovery?.capabilities ?? []
  const entities = state.domain?.entities ?? []

  return `
    <div class="ms-public-view ms-public-view-contract">
      <div class="ms-public-hero">
        <h3>Contract</h3>
        <p>Approve this contract and SYNTH will derive a Mission and Plan. This is the boundary between understanding and building.</p>
      </div>
      <div class="ms-contract-document">
        <div class="ms-contract-title">Statement of work</div>
        <div class="ms-contract-section">
          <div class="ms-contract-section-title">Idea</div>
          <p>${escapeHtml(idea)}</p>
        </div>
        ${constraints.length > 0 ? `
          <div class="ms-contract-section">
            <div class="ms-contract-section-title">Constraints</div>
            <ul>${constraints.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul>
          </div>
        ` : ""}
        ${capabilities.length > 0 ? `
          <div class="ms-contract-section">
            <div class="ms-contract-section-title">Capabilities</div>
            <div class="ms-tags">${capabilities.map((c) => `<span class="ms-tag">${escapeHtml(c)}</span>`).join("")}</div>
          </div>
        ` : ""}
        ${entities.length > 0 ? `
          <div class="ms-contract-section">
            <div class="ms-contract-section-title">Domain</div>
            <p>${entities.map(escapeHtml).join(", ")}</p>
          </div>
        ` : ""}
      </div>
    </div>
  `
}

/**
 * Render the Mission step: show derived mission.
 * @param {{ state: GenesisState }} props
 * @returns {string}
 */
export function renderMissionView({ state }) {
  return `
    <div class="ms-public-view ms-public-view-mission">
      <div class="ms-public-hero">
        <h3>Mission</h3>
        <p>This is what SYNTH will build. Approve it to authorize the plan.</p>
      </div>
      ${state.mission ? renderPublicArtifactCard(state.mission) : ""}
    </div>
  `
}

/**
 * Render the Plan step: show plan items.
 * @param {{ state: GenesisState }} props
 * @returns {string}
 */
export function renderPlanView({ state }) {
  const items = state.expeditions.map((expedition) => renderPublicArtifactCard(expedition))

  return `
    <div class="ms-public-view ms-public-view-plan">
      <div class="ms-public-hero">
        <h3>Plan</h3>
        <p>This is how SYNTH will build the mission. Each item produces evidence.</p>
      </div>
      <div class="ms-public-artifacts">${items.join("") || `<p class="ms-placeholder">No plan items yet.</p>`}</div>
    </div>
  `
}

/**
 * Render the Evidence step: show execution progress and evidence.
 * @param {{ state: GenesisState; projection: ArtifactProjection }} props
 * @returns {string}
 */
export function renderEvidenceView({ state, projection }) {
  const status = state.publicFlow.executionComplete ? "Complete" : "In progress"
  const log = state.publicFlow.executionComplete
    ? executionLogComplete(state, projection)
    : executionLogInProgress(state)

  const cards = []
  if (projection.architecture) for (const layer of projection.architecture) cards.push(renderStructureCard(layer))
  if (projection.repository) cards.push(renderSummaryCard(projection.repository))
  for (const evidence of projection.evidence) cards.push(renderEvidenceCard(evidence))

  return `
    <div class="ms-public-view ms-public-view-evidence">
      <div class="ms-public-hero">
        <h3>Evidence</h3>
        <p>SYNTH is executing the plan. Every action produces evidence.</p>
      </div>
      <div class="ms-evidence-status">
        <span class="ms-evidence-status-label">Execution status</span>
        <span class="ms-evidence-status-value ms-status-${status.toLowerCase().replace(/\s+/g, "-")}">${escapeHtml(status)}</span>
      </div>
      <div class="ms-execution-log">${log}</div>
      <div class="ms-public-artifacts">${cards.join("")}</div>
    </div>
  `
}

function executionLogInProgress(state) {
  return state.expeditions.map((e) => `
    <div class="ms-execution-log-entry">
      <span class="ms-execution-log-dot ms-execution-log-dot-pending"></span>
      <span class="ms-execution-log-text">Executing: ${escapeHtml(e.name)}</span>
    </div>
  `).join("")
}

function executionLogComplete(state, projection) {
  const entries = []
  for (const expedition of state.expeditions) {
    entries.push(`
      <div class="ms-execution-log-entry">
        <span class="ms-execution-log-dot ms-execution-log-dot-complete"></span>
        <span class="ms-execution-log-text">Completed: ${escapeHtml(expedition.name)}</span>
      </div>
    `)
  }
  if (projection.repository) {
    entries.push(`
      <div class="ms-execution-log-entry">
        <span class="ms-execution-log-dot ms-execution-log-dot-complete"></span>
        <span class="ms-execution-log-text">Produced ${projection.repository.eventCount} events</span>
      </div>
    `)
  }
  return entries.join("")
}

function renderStructureCard(layer) {
  return `
    <article class="ms-card ms-card-architecture">
      <div class="ms-card-header">
        <div class="ms-card-kind">Structure</div>
      </div>
      <h4 class="ms-card-title">${escapeHtml(layer.layer)}</h4>
      <div class="ms-card-body">
        <p>${escapeHtml(layer.responsibility)}</p>
      </div>
    </article>
  `
}

function renderSummaryCard(repository) {
  const artifactList = repository.artifacts?.length
    ? `<div class="ms-card-section"><div class="ms-card-section-title">Artifacts</div><ul>${repository.artifacts.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul></div>`
    : ""
  return `
    <article class="ms-card ms-card-repository">
      <div class="ms-card-header">
        <div class="ms-card-kind">Summary</div>
        <span class="ms-status ms-status-completed">${escapeHtml(repository.status)}</span>
      </div>
      <div class="ms-card-body">
        ${artifactList}
        <div class="ms-card-meta">
          <span class="ms-tag">${repository.eventCount} events</span>
        </div>
      </div>
    </article>
  `
}

function renderEvidenceCard(evidence) {
  return `
    <article class="ms-card ms-card-evidence">
      <div class="ms-card-header">
        <div class="ms-card-kind">Evidence</div>
        <span class="ms-confidence">${Math.round(evidence.confidence * 100)}% confidence</span>
      </div>
      <div class="ms-card-body">
        <p>${escapeHtml(evidence.observation)}</p>
        ${evidence.source ? `<div class="ms-card-meta"><span class="ms-tag">${escapeHtml(evidence.source)}</span></div>` : ""}
      </div>
    </article>
  `
}

/**
 * Render the Review step: show result for review against contract.
 * @param {{ state: GenesisState; projection: ArtifactProjection }} props
 * @returns {string}
 */
export function renderReviewView({ state, projection }) {
  const idea = state.intent?.description ?? ""
  const mission = state.mission?.name ?? ""

  return `
    <div class="ms-public-view ms-public-view-review">
      <div class="ms-public-hero">
        <h3>Review</h3>
        <p>Compare the outcome to the original contract. Approve if it matches.</p>
      </div>
      <div class="ms-review-comparison">
        <div class="ms-review-column">
          <div class="ms-review-column-title">Contract</div>
          <div class="ms-public-summary">
            <p><strong>Idea:</strong> ${escapeHtml(idea)}</p>
            <p><strong>Mission:</strong> ${escapeHtml(mission)}</p>
          </div>
        </div>
        <div class="ms-review-column">
          <div class="ms-review-column-title">Outcome</div>
          <div class="ms-public-summary">
            <p><strong>Plan items completed:</strong> ${state.expeditions.length}</p>
            <p><strong>Events produced:</strong> ${projection.repository?.eventCount ?? 0}</p>
          </div>
        </div>
      </div>
      <div class="ms-public-artifacts">
        ${state.expeditions.map((e) => renderPublicArtifactCard(e)).join("")}
      </div>
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
      <div class="ms-public-hero">
        <h3>Acceptance</h3>
        <p>The work is complete. Accept the outcome to finish the journey.</p>
      </div>
      <div class="ms-public-summary ms-public-summary-final">
        <p><strong>Idea:</strong> ${escapeHtml(state.input)}</p>
        <p><strong>Mission:</strong> ${escapeHtml(state.mission?.name ?? "")}</p>
        <p><strong>Plan items completed:</strong> ${state.expeditions.length}</p>
        <p><strong>Evidence events:</strong> ${projection.repository?.eventCount ?? 0}</p>
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
      <div class="ms-public-hero">
        <h3>Complete</h3>
        <p>The journey from idea to accepted outcome is complete. Every step was recorded and can be replayed.</p>
      </div>
      <div class="ms-public-summary ms-public-summary-final">
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
