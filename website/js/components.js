// ============================================================
// HOMEPAGE: Mission Studio Component Catalog
// ============================================================
// Token-driven, state-machine-aware UI primitives for Mission Studio.
// Every component maps to a SYNTH concept and resolves visual values
// through LDS-002 CSS tokens.
// ============================================================

/**
 * @typedef {import("./homepage-runtime/index.js").ArtifactProjection} ArtifactProjection
 * @typedef {import("./homepage-runtime/index.js").WorkspacePhase} WorkspacePhase
 */

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

const PHASE_LABELS = {
  idle: "Idle",
  intent: "Intent",
  discovery: "Discovery",
  constraints: "Constraints",
  domain: "Domain",
  mission: "Mission",
  expeditions: "Expeditions",
  governance: "Governance",
  replay: "Replay",
  architecture: "Architecture",
  repository: "Repository",
}

/**
 * Render the Mission Studio workspace header.
 * @param {{ title?: string; status?: string; active?: boolean }} props
 * @returns {string}
 */
export function renderWorkspaceHeader({ title = "Mission Studio", status = "Idle", active = false } = {}) {
  const statusClass = active ? "ms-header-status ms-status-active" : "ms-header-status"
  return `
    <div class="ms-header-title">
      <span class="ms-logo-mark">S</span>
      <span>${escapeHtml(title)}</span>
    </div>
    <div class="${statusClass}">${escapeHtml(status)}</div>
  `
}

/**
 * Render the Mission Studio footer / status bar.
 * @param {{ status?: string; meta?: string }} props
 * @returns {string}
 */
export function renderWorkspaceFooter({ status = "Ready", meta = "" } = {}) {
  return `
    <div class="ms-footer-status">${escapeHtml(status)}</div>
    <div class="ms-footer-meta">${escapeHtml(meta)}</div>
  `
}

/**
 * Render a single sidebar phase item.
 * @param {{ id: WorkspacePhase; label?: string; active?: boolean; past?: boolean }} props
 * @returns {string}
 */
export function renderSidebarPhase({ id, label, active = false, past = false }) {
  const resolvedLabel = label ?? PHASE_LABELS[id] ?? id
  const cls = active ? "ms-phase ms-phase-active" : past ? "ms-phase ms-phase-past" : "ms-phase"
  return `<div class="${cls}" data-phase="${id}">${escapeHtml(resolvedLabel)}</div>`
}

/**
 * Render the sidebar phase list.
 * @param {{ phases: WorkspacePhase[]; activePhase: WorkspacePhase }} props
 * @returns {string}
 */
export function renderSidebar({ phases, activePhase }) {
  const activeIndex = phases.indexOf(activePhase)
  const items = phases
    .filter((p) => p !== "idle")
    .map((phase, index) => renderSidebarPhase({
      id: phase,
      active: phase === activePhase,
      past: activeIndex > index,
    }))
    .join("")
  return `<nav class="ms-phase-list" aria-label="Mission phases">${items}</nav>`
}

/**
 * Render a document-like Mission Studio artifact card from a runtime card object.
 * @param {ArtifactProjection[keyof ArtifactProjection]} card
 * @returns {string}
 */
export function renderArtifactCard(card) {
  if (!card || typeof card !== "object") return ""

  switch (card.kind) {
    case "intent": {
      const goals = card.goals?.length
        ? `<div class="ms-card-section"><div class="ms-card-section-title">Goals</div><ul>${card.goals.map((g) => `<li>${escapeHtml(g)}</li>`).join("")}</ul></div>`
        : ""
      return `
        <article class="ms-card ms-card-intent">
          <div class="ms-card-header">
            <div class="ms-card-kind">Intent</div>
            <span class="ms-confidence">${Math.round((card.confidence ?? 1) * 100)}% confidence</span>
          </div>
          <h4 class="ms-card-title">${escapeHtml(card.description)}</h4>
          <div class="ms-card-body">
            ${goals}
          </div>
        </article>
      `
    }
    case "discovery": {
      const findings = card.findings?.length
        ? `<div class="ms-card-section"><div class="ms-card-section-title">Findings</div><ul>${card.findings.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul></div>`
        : ""
      const capabilities = card.capabilities?.length
        ? `<div class="ms-tags">${card.capabilities.map((c) => `<span class="ms-tag">${escapeHtml(c)}</span>`).join("")}</div>`
        : ""
      return `
        <article class="ms-card ms-card-discovery">
          <div class="ms-card-header">
            <div class="ms-card-kind">Discovery</div>
          </div>
          <div class="ms-card-body">
            ${findings}
            ${capabilities}
          </div>
        </article>
      `
    }
    case "unknowns": {
      const items = card.items?.length
        ? `<ul>${card.items.map((u) => `<li><strong>${escapeHtml(u.field)}</strong> — ${escapeHtml(u.description)}</li>`).join("")}</ul>`
        : "<p>All critical unknowns resolved.</p>"
      return `
        <article class="ms-card ms-card-unknowns">
          <div class="ms-card-header">
            <div class="ms-card-kind">Unknowns</div>
            <span class="ms-status ms-status-draft">${card.items?.length ?? 0} open</span>
          </div>
          <div class="ms-card-body">
            ${items}
          </div>
        </article>
      `
    }
    case "domain": {
      const entities = card.entities?.length
        ? `<div class="ms-card-section"><div class="ms-card-section-title">Entities</div><p>${card.entities.map(escapeHtml).join(", ")}</p></div>`
        : ""
      const contexts = card.boundedContexts?.length
        ? `<div class="ms-card-section"><div class="ms-card-section-title">Bounded Contexts</div><p>${card.boundedContexts.map(escapeHtml).join(", ")}</p></div>`
        : ""
      return `
        <article class="ms-card ms-card-domain">
          <div class="ms-card-header">
            <div class="ms-card-kind">Domain</div>
          </div>
          <div class="ms-card-body">
            ${entities}
            ${contexts}
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
    case "expedition":
      return `
        <article class="ms-card ms-card-expedition">
          <div class="ms-card-header">
            <div class="ms-card-kind">Expedition</div>
            <span class="ms-status ms-status-${card.status}">${escapeHtml(card.status)}</span>
          </div>
          <h4 class="ms-card-title">${escapeHtml(card.name)}</h4>
          <div class="ms-card-body">
            <p>${escapeHtml(card.goal)}</p>
          </div>
        </article>
      `
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
            <div class="ms-card-kind">Architecture Layer</div>
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
            <div class="ms-card-kind">Repository Summary</div>
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
 * Render the full artifact grid from a projection.
 * @param {ArtifactProjection} projection
 * @returns {string}
 */
export function renderArtifactGrid(projection) {
  const cards = []
  if (projection.intent) cards.push(renderArtifactCard(projection.intent))
  if (projection.discovery) cards.push(renderArtifactCard(projection.discovery))
  if (projection.unknowns) cards.push(renderArtifactCard(projection.unknowns))
  if (projection.domain) cards.push(renderArtifactCard(projection.domain))
  if (projection.mission) cards.push(renderArtifactCard(projection.mission))
  for (const expedition of projection.expeditions) cards.push(renderArtifactCard(expedition))
  for (const evidence of projection.evidence) cards.push(renderArtifactCard(evidence))
  if (projection.architecture) for (const layer of projection.architecture) cards.push(renderArtifactCard(layer))
  if (projection.repository) cards.push(renderArtifactCard(projection.repository))

  return cards.join("") || `<p class="ms-placeholder">Artifacts will appear here.</p>`
}

/**
 * Render the intent input surface with example buttons.
 * @param {{ examples: Array<{ id: string; name: string }>; inputValue?: string }} props
 * @returns {string}
 */
export function renderIntentSurface({ examples, inputValue = "", mode = "greenfield" }) {
  const modes = [
    { id: "greenfield", label: "Greenfield" },
    { id: "brownfield", label: "Brownfield" },
    { id: "knowledge", label: "Knowledge" },
    { id: "conversation", label: "Conversation" },
  ]
  return `
    <div class="ms-intro" id="ms-intro">
      <h2>Turn intent into a governed Mission.</h2>
      <p>Type an idea below or pick a curated example. Watch SYNTH extract intent, model the domain, propose expeditions, project architecture, and summarize the repository.</p>
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
 * Render replay controls.
 * @param {{ offset: number; total: number; hidden?: boolean }} props
 * @returns {string}
 */
export function renderReplayControls({ offset, total, hidden = false }) {
  const cls = hidden ? "ms-replay-controls ms-hidden" : "ms-replay-controls"
  return `
    <div id="ms-replay-controls" class="${cls}" aria-label="Replay controls">
      <button id="ms-replay-prev" class="ms-btn ms-btn-icon" aria-label="Previous event">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <label for="ms-replay-slider">Replay</label>
      <input id="ms-replay-slider" type="range" min="0" max="${Math.max(0, total - 1)}" value="${offset}" aria-label="Scrub through event history" />
      <button id="ms-replay-next" class="ms-btn ms-btn-icon" aria-label="Next event">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  `
}

/**
 * Render an empty state callout.
 * @param {{ title?: string; message?: string }} props
 * @returns {string}
 */
export function renderEmptyState({ title = "Nothing to show", message = "Artifacts will appear here." } = {}) {
  return `
    <article class="ms-card">
      <div class="ms-card-header">
        <div class="ms-card-kind">Empty State</div>
      </div>
      <h4 class="ms-card-title">${escapeHtml(title)}</h4>
      <div class="ms-card-body"><p>${escapeHtml(message)}</p></div>
    </article>
  `
}

/**
 * Render a loading placeholder.
 * @param {{ message?: string }} props
 * @returns {string}
 */
export function renderLoading({ message = "Loading..." } = {}) {
  return `<p class="ms-placeholder">${escapeHtml(message)}</p>`
}

/**
 * Render an error callout with recovery action.
 * @param {{ message: string; actionLabel?: string }} props
 * @returns {string}
 */
export function renderError({ message, actionLabel = "Retry" }) {
  return `
    <article class="ms-card ms-card-unknowns">
      <div class="ms-card-header">
        <div class="ms-card-kind">Error</div>
      </div>
      <h4 class="ms-card-title">Something went wrong</h4>
      <div class="ms-card-body"><p>${escapeHtml(message)}</p></div>
      <div class="ms-card-meta">
        <button class="ms-btn ms-btn-primary" id="ms-error-retry">${escapeHtml(actionLabel)}</button>
      </div>
    </article>
  `
}

/**
 * Render a callout notice.
 * @param {{ variant?: "info" | "warning" | "success"; title?: string; message: string }} props
 * @returns {string}
 */
export function renderCallout({ variant = "info", title, message }) {
  const borderColor = variant === "warning" ? "var(--ms-warning)" : variant === "success" ? "var(--ms-success)" : "var(--ms-accent)"
  return `
    <div class="ms-card" style="border-left-color: ${borderColor}">
      <div class="ms-card-kind">${escapeHtml(variant)}</div>
      ${title ? `<h4>${escapeHtml(title)}</h4>` : ""}
      <p>${escapeHtml(message)}</p>
    </div>
  `
}

/**
 * Render the primary action controls for the current phase.
 * @param {{ phase: WorkspacePhase; onReplay?: boolean }} props
 * @returns {string}
 */
export function renderPhaseControls({ phase, onReplay = false }) {
  if (phase === "idle") {
    return `<p class="ms-hint">Type an idea or pick an example to begin.</p>`
  }

  if (phase === "replay" || onReplay) {
    return `<p class="ms-hint">Scrub through the replay to verify state reconstruction.</p>`
  }

  if (["expeditions", "governance", "architecture", "repository"].includes(phase)) {
    return `<button id="ms-replay-btn" class="ms-btn ms-btn-secondary">Show Replay</button>`
  }

  return `<button id="ms-advance-btn" class="ms-btn ms-btn-primary">Advance</button>`
}
