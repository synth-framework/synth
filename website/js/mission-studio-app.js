// ============================================================
// HOMEPAGE: Mission Studio App
// ============================================================
// Browser UI controller for the SYNTH Mission Studio homepage.
// Depends on ./homepage-runtime/index.js
// ============================================================

import {
  createHomepageRuntime,
  buildDemoReplay,
  demoExamples,
  DemoOperator,
} from "./homepage-runtime/index.js"

const runtime = createHomepageRuntime()

/** @type {import("./homepage-runtime/index.js").GenesisState | null} */
let currentGenesisState = null

/** @type {import("./homepage-runtime/index.js").ReplayState | null} */
let currentReplayState = null

const elements = {
  input: /** @type {HTMLInputElement} */ (document.getElementById("ms-intent-input")),
  form: /** @type {HTMLFormElement} */ (document.getElementById("ms-intent-form")),
  examples: /** @type {HTMLDivElement} */ (document.getElementById("ms-examples")),
  workspace: /** @type {HTMLDivElement} */ (document.getElementById("ms-workspace")),
  navigator: /** @type {HTMLDivElement} */ (document.getElementById("ms-navigator")),
  artifacts: /** @type {HTMLDivElement} */ (document.getElementById("ms-artifacts")),
  statusBar: /** @type {HTMLDivElement} */ (document.getElementById("ms-status-bar")),
  controls: /** @type {HTMLDivElement} */ (document.getElementById("ms-controls")),
  replayControls: /** @type {HTMLDivElement} */ (document.getElementById("ms-replay-controls")),
  replaySlider: /** @type {HTMLInputElement} */ (document.getElementById("ms-replay-slider")),
}

const PHASES = [
  { id: "idle", label: "Idle" },
  { id: "intent", label: "Intent" },
  { id: "discovery", label: "Discovery" },
  { id: "constraints", label: "Constraints" },
  { id: "domain", label: "Domain" },
  { id: "mission", label: "Mission" },
  { id: "expeditions", label: "Expeditions" },
  { id: "governance", label: "Governance" },
  { id: "replay", label: "Replay" },
]

const CAPABILITIES = [
  { id: "mission", name: "Mission", description: "Strategic goals and approved plans." },
  { id: "discovery", name: "Discovery", description: "Intent extraction and domain understanding." },
  { id: "governance", name: "Governance", description: "Approval boundaries and evidence." },
  { id: "replay", name: "Replay", description: "Deterministic state reconstruction." },
  { id: "compiler", name: "Compiler", description: "Transforms artifacts into execution plans." },
  { id: "kernel", name: "Kernel", description: "Protected runtime invariants." },
  { id: "knowledge", name: "Knowledge", description: "Canonical knowledge graph." },
  { id: "architecture", name: "Architecture", description: "Layered system model." },
  { id: "adapters", name: "Adapters", description: "External tools as first-class citizens." },
]

function renderNavigator(activePhase) {
  elements.navigator.innerHTML = PHASES.map((phase) => {
    const isActive = phase.id === activePhase
    const isPast = PHASES.findIndex((p) => p.id === activePhase) > PHASES.findIndex((p) => p.id === phase.id)
    const cls = isActive ? "ms-phase ms-phase-active" : isPast ? "ms-phase ms-phase-past" : "ms-phase"
    return `<div class="${cls}" data-phase="${phase.id}">${phase.label}</div>`
  }).join("")
}

function renderCard(card) {
  switch (card.kind) {
    case "intent":
      return `
        <div class="ms-card ms-card-intent">
          <div class="ms-card-kind">Intent</div>
          <h4>${escapeHtml(card.description)}</h4>
          ${card.goals.length ? `<ul>${card.goals.map((g) => `<li>${escapeHtml(g)}</li>`).join("")}</ul>` : ""}
        </div>
      `
    case "discovery":
      return `
        <div class="ms-card ms-card-discovery">
          <div class="ms-card-kind">Discovery</div>
          ${card.findings.map((f) => `<p>${escapeHtml(f)}</p>`).join("")}
          ${card.capabilities.length ? `<div class="ms-tags">${card.capabilities.map((c) => `<span class="ms-tag">${escapeHtml(c)}</span>`).join("")}</div>` : ""}
        </div>
      `
    case "unknowns":
      return `
        <div class="ms-card ms-card-unknowns">
          <div class="ms-card-kind">Unknowns</div>
          ${card.items.length ? `<ul>${card.items.map((u) => `<li>${escapeHtml(u.description)}</li>`).join("")}</ul>` : `<p>All critical unknowns resolved.</p>`}
        </div>
      `
    case "domain":
      return `
        <div class="ms-card ms-card-domain">
          <div class="ms-card-kind">Domain</div>
          <p><strong>Entities:</strong> ${card.entities.map(escapeHtml).join(", ")}</p>
          <p><strong>Contexts:</strong> ${card.boundedContexts.map(escapeHtml).join(", ")}</p>
        </div>
      `
    case "mission":
      return `
        <div class="ms-card ms-card-mission">
          <div class="ms-card-kind">Mission</div>
          <h4>${escapeHtml(card.name)}</h4>
          <p>${escapeHtml(card.purpose)}</p>
          <ul>${card.objectives.map((o) => `<li>${escapeHtml(o)}</li>`).join("")}</ul>
        </div>
      `
    case "expedition":
      return `
        <div class="ms-card ms-card-expedition">
          <div class="ms-card-kind">Expedition</div>
          <h4>${escapeHtml(card.name)}</h4>
          <p>${escapeHtml(card.goal)}</p>
          <span class="ms-status ms-status-${card.status}">${escapeHtml(card.status)}</span>
        </div>
      `
    case "evidence":
      return `
        <div class="ms-card ms-card-evidence">
          <div class="ms-card-kind">Evidence</div>
          <p>${escapeHtml(card.observation)}</p>
          <span class="ms-confidence">confidence ${Math.round(card.confidence * 100)}%</span>
        </div>
      `
    default:
      return ""
  }
}

function renderArtifacts(projection) {
  const cards = []
  if (projection.intent) cards.push(renderCard(projection.intent))
  if (projection.discovery) cards.push(renderCard(projection.discovery))
  if (projection.unknowns) cards.push(renderCard(projection.unknowns))
  if (projection.domain) cards.push(renderCard(projection.domain))
  if (projection.mission) cards.push(renderCard(projection.mission))
  for (const expedition of projection.expeditions) {
    cards.push(renderCard(expedition))
  }
  for (const evidence of projection.evidence) {
    cards.push(renderCard(evidence))
  }

  elements.artifacts.innerHTML = cards.join("") || `<p class="ms-placeholder">Artifacts will appear here.</p>`
}

function renderStatusBar(projection) {
  const replay = projection.replay
  const status = replay
    ? `Replay ${replay.offset + 1}/${replay.totalEvents} · hash ${replay.stateHash}`
    : `Phase: ${projection.phase}`
  elements.statusBar.textContent = status
}

function renderControls(projection) {
  if (projection.phase === "idle") {
    elements.controls.innerHTML = `<p class="ms-hint">Type an idea or pick an example to begin.</p>`
    return
  }

  if (projection.phase === "expeditions" || projection.phase === "governance" || projection.phase === "replay") {
    elements.controls.innerHTML = `<button id="ms-replay-btn" class="ms-btn ms-btn-primary">Show Replay</button>`
    document.getElementById("ms-replay-btn").addEventListener("click", startReplay)
    return
  }

  elements.controls.innerHTML = `<button id="ms-advance-btn" class="ms-btn ms-btn-primary">Advance</button>`
  document.getElementById("ms-advance-btn").addEventListener("click", advancePhase)
}

function renderExplainerSections(projection) {
  // Workflow highlight.
  document.querySelectorAll(".ms-workflow-step").forEach((step) => {
    const stepId = step.dataset.step
    const active = stepId === projection.phase || (stepId === "expedition" && projection.phase === "expeditions")
    step.classList.toggle("ms-workflow-step-active", active)
  })

  // Architecture highlight.
  document.querySelectorAll(".ms-arch-layer").forEach((layer) => {
    const layerId = layer.dataset.layer
    const active =
      (layerId === "intent" && projection.phase === "intent") ||
      (layerId === "knowledge" && ["discovery", "constraints"].includes(projection.phase)) ||
      (layerId === "mission" && projection.phase === "mission") ||
      (layerId === "expedition" && projection.phase === "expeditions") ||
      (layerId === "events" && projection.phase === "governance") ||
      (layerId === "runtime" && projection.phase === "replay")
    layer.classList.toggle("ms-arch-layer-active", active)
  })

  // Capabilities grid.
  const grid = document.getElementById("ms-capabilities-grid")
  if (grid) {
    grid.innerHTML = CAPABILITIES.map((cap) => {
      const isAdapter = cap.id === "adapters"
      return `
        <div class="ms-capability-card ${isAdapter ? "ms-capability-adapter" : ""}">
          <h4>${escapeHtml(cap.name)}</h4>
          <p>${escapeHtml(cap.description)}</p>
        </div>
      `
    }).join("")
  }
}

function updateUI(projection) {
  renderNavigator(projection.phase)
  renderArtifacts(projection)
  renderStatusBar(projection)
  renderControls(projection)
  renderExplainerSections(projection)
}

async function startDiscovery(input, mode = "greenfield") {
  const result = await runtime.discover(input, mode)
  currentGenesisState = result.state
  currentReplayState = null
  elements.replayControls.classList.add("ms-hidden")
  updateUI(result.projection)
}

async function advancePhase() {
  if (!currentGenesisState) return

  let state = currentGenesisState
  const phase = state.mission
    ? (state.expeditions.length > 0 ? "expeditions" : "mission")
    : (state.domain ? "domain" : (state.unknowns.items.length > 0 ? "constraints" : "discovery"))

  try {
    if (phase === "discovery" || phase === "constraints") {
      const operator = new DemoOperator()
      const questions = state.unknowns.items.map((u, i) => ({ id: `q-${i}`, field: u.field, description: u.description }))
      const answers = await operator.answerClarification(questions)
      const result = await runtime.clarify(state, answers)
      state = result.state
    } else if (phase === "domain") {
      const result = await runtime.buildMission(state)
      state = result.state
    } else if (phase === "mission") {
      const result = await runtime.buildExpeditions(state)
      state = result.state
    }

    currentGenesisState = state
    updateUI(runtime.currentArtifacts(state))
  } catch (error) {
    console.error(error)
  }
}

async function startReplay() {
  if (!currentGenesisState) return
  const events = buildDemoReplay(currentGenesisState)
  if (events.length === 0) return

  currentReplayState = await runtime.loadReplay(events)
  elements.replayControls.classList.remove("ms-hidden")
  elements.replaySlider.max = String(events.length - 1)
  elements.replaySlider.value = "0"
  updateUI(currentReplayState.projection)
}

async function onReplaySliderChange() {
  if (!currentReplayState) return
  const offset = Number(elements.replaySlider.value)
  currentReplayState = await runtime.stepReplay(currentReplayState, offset)
  updateUI(currentReplayState.projection)
}

function escapeHtml(text) {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

function init() {
  // Render example buttons.
  elements.examples.innerHTML = demoExamples.map((example) => `
    <button class="ms-btn ms-btn-secondary ms-example" data-example="${example.id}">
      ${escapeHtml(example.name)}
    </button>
  `).join("")

  document.querySelectorAll(".ms-example").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.example
      const example = demoExamples.find((e) => e.id === id)
      if (example) {
        elements.input.value = example.input
        void startDiscovery(example.input, example.mode)
      }
    })
  })

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault()
    const input = elements.input.value.trim()
    if (input) {
      void startDiscovery(input)
    }
  })

  elements.replaySlider.addEventListener("input", () => {
    void onReplaySliderChange()
  })

  updateUI({ phase: "idle", unknowns: { kind: "unknowns", items: [] }, expeditions: [], evidence: [] })
}

init()
