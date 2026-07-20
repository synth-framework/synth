// ============================================================
// HOMEPAGE: Mission Studio App v2
// ============================================================
// Persistent Mission Studio shell with scroll-driven state machine.
// Maps page scroll through phases: Intent → Discovery → Mission →
// Expeditions → Governance → Replay → Architecture → Repository.
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

/** @type {string} */
let activePhase = "idle"

/** @type {boolean} */
let autoDemoStarted = false

/** @type {boolean} */
let manualMode = false

/** @type {import("./homepage-runtime/index.js").EntryMode} */
let selectedMode = "greenfield"

const PHASES = [
  { id: "idle", label: "Idle", stage: 0 },
  { id: "intent", label: "Intent", stage: 1 },
  { id: "discovery", label: "Discovery", stage: 2 },
  { id: "constraints", label: "Constraints", stage: 2 },
  { id: "domain", label: "Domain", stage: 3 },
  { id: "mission", label: "Mission", stage: 4 },
  { id: "expeditions", label: "Expeditions", stage: 5 },
  { id: "governance", label: "Governance", stage: 6 },
  { id: "replay", label: "Replay", stage: 6 },
  { id: "architecture", label: "Architecture", stage: 7 },
  { id: "repository", label: "Repository", stage: 8 },
]

const SCROLL_PHASES = [
  "intent",
  "discovery",
  "constraints",
  "domain",
  "mission",
  "expeditions",
  "governance",
  "replay",
  "architecture",
  "repository",
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

const elements = {
  shell: /** @type {HTMLDivElement} */ (document.getElementById("ms-shell")),
  headerStatus: /** @type {HTMLDivElement} */ (document.getElementById("ms-header-status")),
  phaseList: /** @type {HTMLDivElement} */ (document.getElementById("ms-phase-list")),
  workspaceScroll: /** @type {HTMLDivElement} */ (document.getElementById("ms-workspace-scroll")),
  intro: /** @type {HTMLDivElement} */ (document.getElementById("ms-intro")),
  input: /** @type {HTMLInputElement} */ (document.getElementById("ms-intent-input")),
  form: /** @type {HTMLFormElement} */ (document.getElementById("ms-intent-form")),
  examples: /** @type {HTMLDivElement} */ (document.getElementById("ms-examples")),
  artifacts: /** @type {HTMLDivElement} */ (document.getElementById("ms-artifacts")),
  controls: /** @type {HTMLDivElement} */ (document.getElementById("ms-controls")),
  replayControls: /** @type {HTMLDivElement} */ (document.getElementById("ms-replay-controls")),
  replaySlider: /** @type {HTMLInputElement} */ (document.getElementById("ms-replay-slider")),
  replayPrev: /** @type {HTMLButtonElement} */ (document.getElementById("ms-replay-prev")),
  replayNext: /** @type {HTMLButtonElement} */ (document.getElementById("ms-replay-next")),
  footerStatus: /** @type {HTMLDivElement} */ (document.getElementById("ms-footer-status")),
  footerMeta: /** @type {HTMLDivElement} */ (document.getElementById("ms-footer-meta")),
  capabilitiesGrid: /** @type {HTMLDivElement} */ (document.getElementById("ms-capabilities-grid")),
  missionStudioSection: /** @type {HTMLElement} */ (document.getElementById("mission-studio")),
  themeToggle: /** @type {HTMLButtonElement} */ (document.getElementById("ms-theme-toggle")),
  liveRegion: /** @type {HTMLDivElement} */ (document.getElementById("ms-live-region")),
}

function getPhaseIndex(phaseId) {
  return PHASES.findIndex((p) => p.id === phaseId)
}

function renderPhaseList(activePhaseId) {
  const activeIndex = getPhaseIndex(activePhaseId)
  elements.phaseList.innerHTML = PHASES.filter((p) => p.id !== "idle").map((phase) => {
    const phaseIndex = getPhaseIndex(phase.id)
    const isActive = phase.id === activePhaseId
    const isPast = activeIndex > phaseIndex
    const cls = isActive ? "ms-phase ms-phase-active" : isPast ? "ms-phase ms-phase-past" : "ms-phase"
    return `<div class="${cls}" data-phase="${phase.id}">${phase.label}</div>`
  }).join("")
}

function renderHeaderStatus(projection) {
  const label = projection.phase === "idle" ? "Idle" : projection.phase
  elements.headerStatus.textContent = label
  elements.headerStatus.classList.toggle("ms-status-active", projection.phase !== "idle")
}

function renderFooterStatus(projection) {
  const replay = projection.replay
  if (replay) {
    elements.footerStatus.textContent = `Replay ${replay.offset + 1}/${replay.totalEvents}`
    elements.footerMeta.textContent = `hash ${replay.stateHash}`
    return
  }

  const labels = {
    idle: "Ready",
    intent: "Waiting for input",
    discovery: "Extracting intent",
    constraints: "Clarifying unknowns",
    domain: "Modeling domain",
    mission: "Building mission",
    expeditions: "Planning expeditions",
    governance: "Validating governance",
    replay: "Replaying events",
    architecture: "Projecting architecture",
    repository: "Summarizing repository",
  }

  elements.footerStatus.textContent = labels[projection.phase] ?? projection.phase
  elements.footerMeta.textContent = projection.repository
    ? `${projection.repository.eventCount} events`
    : projection.expeditions.length > 0
      ? `${projection.expeditions.length} expeditions`
      : ""
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
    case "architecture":
      return `
        <div class="ms-card ms-card-architecture">
          <div class="ms-card-kind">Architecture Layer</div>
          <h4>${escapeHtml(card.layer)}</h4>
          <p>${escapeHtml(card.responsibility)}</p>
          ${card.dependencies.length ? `<p><strong>Depends on:</strong> ${card.dependencies.map(escapeHtml).join(", ")}</p>` : ""}
        </div>
      `
    case "repository":
      return `
        <div class="ms-card ms-card-repository">
          <div class="ms-card-kind">Repository Summary</div>
          <h4>Status: ${escapeHtml(card.status)}</h4>
          <p><strong>Artifacts:</strong></p>
          <ul>${card.artifacts.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul>
          <p><strong>Events:</strong> ${card.eventCount}</p>
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
  if (projection.architecture) {
    for (const layer of projection.architecture) {
      cards.push(renderCard(layer))
    }
  }
  if (projection.repository) {
    cards.push(renderCard(projection.repository))
  }

  elements.artifacts.innerHTML = cards.join("") || `<p class="ms-placeholder">Artifacts will appear here.</p>`
}

function renderControls(projection) {
  if (projection.phase === "idle") {
    elements.controls.innerHTML = `<p class="ms-hint">Type an idea or pick an example to begin.</p>`
    return
  }

  if (projection.phase === "replay") {
    elements.controls.innerHTML = `<p class="ms-hint">Scrub through the replay to verify state reconstruction.</p>`
    return
  }

  if (["expeditions", "governance", "architecture", "repository"].includes(projection.phase)) {
    elements.controls.innerHTML = `<button id="ms-replay-btn" class="ms-btn ms-btn-secondary">Show Replay</button>`
    document.getElementById("ms-replay-btn")?.addEventListener("click", startReplay)
    return
  }

  elements.controls.innerHTML = `<button id="ms-advance-btn" class="ms-btn ms-btn-primary">Advance</button>`
  document.getElementById("ms-advance-btn")?.addEventListener("click", advancePhase)
}

function announcePhase(phase) {
  if (!elements.liveRegion) return
  elements.liveRegion.textContent = `Mission Studio phase: ${phase}`
}

function updateUI(projection) {
  activePhase = projection.phase
  announcePhase(projection.phase)
  renderHeaderStatus(projection)
  renderPhaseList(projection.phase)
  renderArtifacts(projection)
  renderFooterStatus(projection)
  renderControls(projection)

  // Hide intro once we have intent.
  if (projection.phase !== "idle" && projection.intent) {
    elements.intro.classList.add("ms-hidden")
  } else {
    elements.intro.classList.remove("ms-hidden")
  }

  // Scroll workspace to top on phase change to reveal new artifacts.
  if (elements.workspaceScroll.scrollTop > 0 && projection.phase !== "replay") {
    elements.workspaceScroll.scrollTop = 0
  }
}

async function startDiscovery(input, mode = selectedMode) {
  manualMode = true
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
    ? (state.expeditions.length > 0
      ? (state.architecture
        ? (state.repository ? "repository" : "architecture")
        : "expeditions")
      : "mission")
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
    } else if (phase === "expeditions") {
      const result = await runtime.buildArchitecture(state)
      state = result.state
    } else if (phase === "architecture") {
      const result = await runtime.buildRepository(state)
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

async function stepReplayDirection(direction) {
  if (!currentReplayState) return
  currentReplayState = await runtime.stepReplay(currentReplayState, direction)
  elements.replaySlider.value = String(currentReplayState.offset)
  updateUI(currentReplayState.projection)
}

async function buildGenesisToPhase(targetPhase) {
  const example = demoExamples[0]
  let { state } = await runtime.discover(example.input, example.mode)

  const targetIndex = SCROLL_PHASES.indexOf(targetPhase)

  if (targetIndex >= SCROLL_PHASES.indexOf("constraints")) {
    const operator = new DemoOperator()
    const questions = state.unknowns.items.map((u, i) => ({ id: `q-${i}`, field: u.field, description: u.description }))
    const answers = await operator.answerClarification(questions)
    ;({ state } = await runtime.clarify(state, answers))
  }

  if (targetIndex >= SCROLL_PHASES.indexOf("domain")) {
    ;({ state } = await runtime.buildMission(state))
  }

  if (targetIndex >= SCROLL_PHASES.indexOf("expeditions")) {
    ;({ state } = await runtime.buildExpeditions(state))
  }

  if (targetIndex >= SCROLL_PHASES.indexOf("architecture")) {
    ;({ state } = await runtime.buildArchitecture(state))
  }

  if (targetIndex >= SCROLL_PHASES.indexOf("repository")) {
    ;({ state } = await runtime.buildRepository(state))
  }

  currentGenesisState = state

  if (targetPhase === "replay") {
    const events = buildDemoReplay(state)
    currentReplayState = await runtime.loadReplay(events)
    elements.replayControls.classList.remove("ms-hidden")
    elements.replaySlider.max = String(events.length - 1)
    elements.replaySlider.value = "0"
    return currentReplayState.projection
  }

  elements.replayControls.classList.add("ms-hidden")

  // Force the requested conceptual phase even if runtime.currentArtifacts
  // would report a later completed phase. This keeps scroll and UI in sync.
  const projection = runtime.currentArtifacts(state)
  if (targetPhase === "governance") {
    return { ...projection, phase: "governance", replay: undefined }
  }
  return projection
}

function getScrollPhase() {
  const section = elements.missionStudioSection
  if (!section) return "intent"

  const rect = section.getBoundingClientRect()
  const headerOffset = 57
  const viewportHeight = window.innerHeight - headerOffset
  const sectionTop = rect.top - headerOffset
  const sectionHeight = rect.height - viewportHeight

  if (sectionTop >= 0) return "intent"
  if (sectionTop <= -sectionHeight) return "repository"

  const progress = Math.max(0, Math.min(1, -sectionTop / sectionHeight))
  const index = Math.min(
    SCROLL_PHASES.length - 1,
    Math.floor(progress * SCROLL_PHASES.length)
  )
  return SCROLL_PHASES[index]
}

async function handleScroll() {
  if (manualMode || !autoDemoStarted) return

  const targetPhase = getScrollPhase()
  if (targetPhase === activePhase) return

  if (targetPhase === "intent") {
    updateUI({ phase: "idle", unknowns: { kind: "unknowns", items: [] }, expeditions: [], evidence: [] })
    currentGenesisState = null
    currentReplayState = null
    return
  }

  const projection = await buildGenesisToPhase(targetPhase)
  updateUI(projection)
}

function renderCapabilities() {
  if (!elements.capabilitiesGrid) return
  elements.capabilitiesGrid.innerHTML = CAPABILITIES.map((cap) => {
    const isAdapter = cap.id === "adapters"
    return `
      <div class="ms-capability-card ${isAdapter ? "ms-capability-adapter" : ""}">
        <h4>${escapeHtml(cap.name)}</h4>
        <p>${escapeHtml(cap.description)}</p>
      </div>
    `
  }).join("")
}

function escapeHtml(text) {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

function initThemeToggle() {
  if (!elements.themeToggle || !elements.shell) return

  const stored = localStorage.getItem("synth-ms-theme")
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
  const initialDark = stored ? stored === "dark" : prefersDark

  if (initialDark) {
    elements.shell.setAttribute("data-theme", "dark")
  }

  elements.themeToggle.addEventListener("click", () => {
    const isDark = elements.shell.getAttribute("data-theme") === "dark"
    if (isDark) {
      elements.shell.removeAttribute("data-theme")
      localStorage.setItem("synth-ms-theme", "light")
    } else {
      elements.shell.setAttribute("data-theme", "dark")
      localStorage.setItem("synth-ms-theme", "dark")
    }
  })
}

function init() {
  renderCapabilities()

  // Render example buttons.
  elements.examples.innerHTML = demoExamples.map((example) => `
    <button class="ms-btn ms-btn-secondary ms-example" data-example="${example.id}">
      ${escapeHtml(example.name)}
    </button>
  `).join("")

  document.querySelectorAll(".ms-source-option").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".ms-source-option").forEach((b) => b.classList.remove("ms-source-active"))
      button.classList.add("ms-source-active")
      selectedMode = /** @type {import("./homepage-runtime/index.js").EntryMode} */ (button.dataset.mode)
    })
  })

  document.querySelectorAll(".ms-example").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.example
      const example = demoExamples.find((e) => e.id === id)
      if (example) {
        elements.input.value = example.input
        selectedMode = example.mode
        document.querySelectorAll(".ms-source-option").forEach((b) => {
          b.classList.toggle("ms-source-active", b.dataset.mode === example.mode)
        })
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

  elements.replayPrev.addEventListener("click", () => {
    void stepReplayDirection("backward")
  })

  elements.replayNext.addEventListener("click", () => {
    void stepReplayDirection("forward")
  })

  // Start the scroll-driven demo once Mission Studio is in view.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !autoDemoStarted && !manualMode) {
          autoDemoStarted = true
          void buildGenesisToPhase("intent").then((projection) => {
            updateUI(projection)
          })
        }
      }
    },
    { threshold: 0.1 }
  )

  if (elements.missionStudioSection) {
    observer.observe(elements.missionStudioSection)
  }

  window.addEventListener("scroll", handleScroll, { passive: true })

  initThemeToggle()

  updateUI({ phase: "idle", unknowns: { kind: "unknowns", items: [] }, expeditions: [], evidence: [] })
}

init()
