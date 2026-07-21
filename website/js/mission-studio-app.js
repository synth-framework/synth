// ============================================================
// HOMEPAGE: Mission Studio App v3
// ============================================================
// Human-facing SYNTH journey using only public vocabulary:
// Idea → Question → Understanding → Contract → Mission → Plan →
// Evidence → Review → Acceptance.
//
// Internal governance machinery is hidden behind the public experience
// resolver from the homepage runtime.
// ============================================================

import {
  createHomepageRuntime,
  buildDemoReplay,
  demoExamples,
  DemoOperator,
  resolvePublicExperience,
} from "./homepage-runtime/index.js"
import {
  renderPublicExperience,
  renderPublicHeader,
  renderStepIndicator,
  renderPublicActions,
} from "./public-experience-views.js"

const runtime = createHomepageRuntime()

/** @type {import("./homepage-runtime/index.js").GenesisState | null} */
let currentGenesisState = null

/** @type {import("./homepage-runtime/index.js").ReplayState | null} */
let currentReplayState = null

/** @type {import("./homepage-runtime/index.js").PublicExperienceStep} */
let activePublicStep = "idea"

/** @type {boolean} */
let autoDemoStarted = false

/** @type {boolean} */
let manualMode = false

/** @type {import("./homepage-runtime/index.js").EntryMode} */
let selectedMode = "greenfield"

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
  workspaceContent: /** @type {HTMLDivElement} */ (document.getElementById("ms-workspace-content")),
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

function announce(message) {
  if (!elements.liveRegion) return
  elements.liveRegion.textContent = message
}

function getCurrentProjection() {
  if (!currentGenesisState) {
    return { phase: "idle", unknowns: { kind: "unknowns", items: [] }, expeditions: [], evidence: [] }
  }
  return runtime.currentArtifacts(currentGenesisState)
}

function updateUI() {
  if (!currentGenesisState) {
    renderIdleExperience()
    return
  }

  const projection = getCurrentProjection()
  const experience = resolvePublicExperience(currentGenesisState)
  activePublicStep = experience.step

  announce(`SYNTH: ${experience.message}`)
  elements.headerStatus.textContent = experience.step
  elements.headerStatus.classList.toggle("ms-status-active", experience.step !== "idea")

  elements.phaseList.innerHTML = renderStepIndicator({ step: experience.step })

  elements.workspaceContent.innerHTML = `
    ${renderPublicHeader({ experience })}
    ${renderPublicExperience({ experience, state: currentGenesisState, projection, examples: demoExamples })}
  `

  elements.controls.innerHTML = renderPublicActions({ actions: experience.actions })

  elements.footerStatus.textContent = `${experience.step} • ${experience.progress.current}/${experience.progress.total}`
  elements.footerMeta.textContent = currentGenesisState.mission
    ? currentGenesisState.input.slice(0, 50)
    : "Ready"

  bindPublicActionHandlers()
  bindIntentFormHandler()
  bindQuestionFormHandler()
  bindSourceSelectorHandler()
  bindExampleButtons()

  if (currentReplayState) {
    elements.replayControls.classList.remove("ms-hidden")
  } else {
    elements.replayControls.classList.add("ms-hidden")
  }

  if (elements.workspaceScroll.scrollTop > 0 && !currentReplayState) {
    elements.workspaceScroll.scrollTop = 0
  }
}

function renderIdleExperience() {
  const experience = {
    step: "idea",
    message: "What do you want to build?",
    progress: { current: 1, total: 9 },
    actions: [],
  }

  elements.headerStatus.textContent = "Idea"
  elements.headerStatus.classList.remove("ms-status-active")
  elements.phaseList.innerHTML = renderStepIndicator({ step: "idea" })

  elements.workspaceContent.innerHTML = `
    ${renderPublicHeader({ experience })}
    ${renderPublicExperience({ experience, state: currentGenesisState ?? { input: "", mode: selectedMode, unknowns: { kind: "unknowns", items: [] }, expeditions: [], evidence: [], answers: [], publicFlow: { contractApproved: false, missionApproved: false, planApproved: false, executionStarted: false, executionComplete: false, reviewApproved: false, accepted: false } }, projection: getCurrentProjection(), examples: demoExamples })}
  `

  elements.controls.innerHTML = `<p class="ms-hint">Type an idea or pick an example to begin.</p>`
  elements.footerStatus.textContent = "Ready"
  elements.footerMeta.textContent = ""

  bindIntentFormHandler()
  bindSourceSelectorHandler()
  bindExampleButtons()
}

async function startDiscovery(input, mode = selectedMode) {
  manualMode = true
  const result = await runtime.discover(input, mode)
  currentGenesisState = result.state
  currentReplayState = null
  updateUI()
}

async function submitAnswers(event) {
  event.preventDefault()
  if (!currentGenesisState) return

  const formData = new FormData(event.currentTarget)
  const answers = []
  for (const [field, value] of formData.entries()) {
    answers.push({ questionId: field, content: String(value) })
  }

  const result = await runtime.clarify(currentGenesisState, answers)
  currentGenesisState = result.state
  updateUI()
}

async function handlePublicAction(actionId) {
  if (!currentGenesisState) return

  try {
    switch (actionId) {
      case "approve-contract": {
        const result = await runtime.approveContract(currentGenesisState)
        currentGenesisState = result.state
        break
      }
      case "approve-mission": {
        const result = await runtime.approveMission(currentGenesisState)
        currentGenesisState = result.state
        break
      }
      case "approve-plan": {
        const result = await runtime.approvePlan(currentGenesisState)
        currentGenesisState = result.state
        break
      }
      case "start-execution": {
        const result = await runtime.startExecution(currentGenesisState)
        currentGenesisState = result.state
        const completed = await runtime.completeExecution(currentGenesisState)
        currentGenesisState = completed.state
        break
      }
      case "approve-review": {
        const result = await runtime.approveReview(currentGenesisState)
        currentGenesisState = result.state
        break
      }
      case "accept-outcome": {
        const result = await runtime.acceptOutcome(currentGenesisState)
        currentGenesisState = result.state
        break
      }
      case "replay": {
        await startReplay()
        return
      }
    }

    updateUI()
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
  updateUI()
}

async function onReplaySliderChange() {
  if (!currentReplayState) return
  const offset = Number(elements.replaySlider.value)
  currentReplayState = await runtime.stepReplay(currentReplayState, offset)
  updateUI()
}

async function stepReplayDirection(direction) {
  if (!currentReplayState) return
  currentReplayState = await runtime.stepReplay(currentReplayState, direction)
  elements.replaySlider.value = String(currentReplayState.offset)
  updateUI()
}

async function buildGenesisToPublicStep(targetStep) {
  const example = demoExamples[0]
  let { state } = await runtime.discover(example.input, example.mode)

  const operator = new DemoOperator()
  const questions = state.unknowns.items.map((u, i) => ({ id: `q-${i}`, field: u.field, description: u.description }))
  const answers = await operator.answerClarification(questions)
  ;({ state } = await runtime.clarify(state, answers))

  if (targetStep === "idea" || targetStep === "question") {
    return state
  }

  ;({ state } = await runtime.approveContract(state))

  if (targetStep === "understanding" || targetStep === "contract") {
    return state
  }

  ;({ state } = await runtime.approveMission(state))

  if (targetStep === "mission") {
    return state
  }

  ;({ state } = await runtime.buildExpeditions(state))
  ;({ state } = await runtime.approvePlan(state))

  if (targetStep === "plan") {
    return state
  }

  ;({ state } = await runtime.completeExecution(state))

  if (targetStep === "evidence" || targetStep === "review") {
    return state
  }

  ;({ state } = await runtime.approveReview(state))

  if (targetStep === "acceptance") {
    return state
  }

  ;({ state } = await runtime.acceptOutcome(state))
  return state
}

const PUBLIC_STEP_ORDER = [
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

function getScrollPublicStep() {
  const section = elements.missionStudioSection
  if (!section) return "idea"

  const rect = section.getBoundingClientRect()
  const headerOffset = 57
  const viewportHeight = window.innerHeight - headerOffset
  const sectionTop = rect.top - headerOffset
  const sectionHeight = rect.height - viewportHeight

  if (sectionTop >= 0) return "idea"
  if (sectionTop <= -sectionHeight) return "complete"

  const progress = Math.max(0, Math.min(1, -sectionTop / sectionHeight))
  const index = Math.min(
    PUBLIC_STEP_ORDER.length - 1,
    Math.floor(progress * PUBLIC_STEP_ORDER.length)
  )
  return PUBLIC_STEP_ORDER[index]
}

async function handleScroll() {
  if (manualMode || !autoDemoStarted) return

  const targetStep = getScrollPublicStep()
  if (targetStep === activePublicStep) return

  if (targetStep === "idea") {
    currentGenesisState = null
    currentReplayState = null
    renderIdleExperience()
    return
  }

  const state = await buildGenesisToPublicStep(targetStep)
  currentGenesisState = state
  currentReplayState = null
  updateUI()
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

function bindPublicActionHandlers() {
  document.querySelectorAll(".ms-public-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      const actionId = event.currentTarget.dataset.action
      if (actionId) {
        void handlePublicAction(actionId)
      }
    })
  })
}

function bindIntentFormHandler() {
  const form = document.getElementById("ms-intent-form")
  if (!form) return
  form.addEventListener("submit", (event) => {
    event.preventDefault()
    const input = elements.input.value.trim()
    if (input) {
      void startDiscovery(input)
    }
  })
}

function bindQuestionFormHandler() {
  const form = document.getElementById("ms-question-form")
  if (!form) return
  form.addEventListener("submit", submitAnswers)
}

function bindSourceSelectorHandler() {
  document.querySelectorAll(".ms-source-option").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".ms-source-option").forEach((b) => b.classList.remove("ms-source-active"))
      button.classList.add("ms-source-active")
      selectedMode = /** @type {import("./homepage-runtime/index.js").EntryMode} */ (button.dataset.mode)
    })
  })
}

function bindExampleButtons() {
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
  renderIdleExperience()

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
          void buildGenesisToPublicStep("idea").then((state) => {
            currentGenesisState = state
            updateUI()
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
}

init()
