// ============================================================
// HOMEPAGE: Mission Studio Component Catalog (Storybook)
// ============================================================
// Renders every catalog component in representative states.
// ============================================================

import {
  renderWorkspaceHeader,
  renderWorkspaceFooter,
  renderSidebar,
  renderArtifactCard,
  renderArtifactGrid,
  renderIntentSurface,
  renderReplayControls,
  renderEmptyState,
  renderLoading,
  renderError,
  renderCallout,
} from "./components.js"

const SAMPLE_CARDS = {
  intent: {
    kind: "intent",
    description: "Build a CRM to manage customer relationships",
    goals: ["track contacts", "manage deals"],
    successCriteria: ["Users can track contacts", "Users can manage deals"],
    mode: "greenfield",
  },
  discovery: {
    kind: "discovery",
    findings: ["Intent: Build a CRM", "Target runtime: web"],
    capabilities: ["domain-modeling", "authentication"],
    constraints: ["Runtime: web", "Language: typescript"],
  },
  unknowns: {
    kind: "unknowns",
    items: [
      { kind: "unknown", field: "runtime", description: "Target runtime is not specified.", confidence: 0.2 },
    ],
  },
  domain: {
    kind: "domain",
    entities: ["customer", "contact", "deal"],
    relationships: ["customer belongs to a bounded context"],
    boundedContexts: ["core-domain"],
  },
  mission: {
    kind: "mission",
    id: "mission-12345678",
    name: "Build a CRM",
    purpose: "Build a CRM with governed Discovery, Mission, and Expedition lifecycle.",
    objectives: ["Capture intent", "Model domain", "Define expeditions"],
    successCriteria: ["Users can manage customer relationships"],
  },
  expedition: {
    kind: "expedition",
    id: "mission-12345678-exp-discovery",
    missionId: "mission-12345678",
    name: "Discovery and Domain Modeling",
    goal: "Formalize intent, unknowns, and domain model.",
    status: "draft",
  },
  evidence: {
    kind: "evidence",
    id: "ev-12345678",
    observation: "Intent extracted from operator input",
    confidence: 0.85,
    source: "rule-based-intent-extraction",
  },
  architecture: {
    kind: "architecture",
    layer: "Intent",
    responsibility: "Capture operator intent and success criteria.",
    dependencies: [],
  },
  repository: {
    kind: "repository",
    status: "governed",
    artifacts: [".synth/manifest.json", ".synth/data/event-log.jsonl"],
    eventCount: 17,
  },
}

function story(title, html) {
  return `
    <div class="sb-story">
      <h3>${title}</h3>
      ${html}
    </div>
  `
}

function renderWorkspaceStories() {
  const container = document.getElementById("sb-workspace")
  container.innerHTML = [
    story("Header — Idle", `<div class="ms-header">${renderWorkspaceHeader({ status: "Idle", active: false })}</div>`),
    story("Header — Active", `<div class="ms-header">${renderWorkspaceHeader({ status: "Discovery", active: true })}</div>`),
    story("Footer — Ready", `<div class="ms-footer">${renderWorkspaceFooter({ status: "Ready", meta: "" })}</div>`),
    story("Footer — Replay", `<div class="ms-footer">${renderWorkspaceFooter({ status: "Replay 3/8", meta: "hash 1234abcd" })}</div>`),
  ].join("")
}

function renderSidebarStories() {
  const container = document.getElementById("sb-sidebar")
  const phases = ["intent", "discovery", "constraints", "domain", "mission", "expeditions", "governance", "replay", "architecture", "repository"]
  container.innerHTML = [
    story("Sidebar — Discovery", `<div class="ms-sidebar">${renderSidebar({ phases, activePhase: "discovery" })}</div>`),
    story("Sidebar — Replay", `<div class="ms-sidebar">${renderSidebar({ phases, activePhase: "replay" })}</div>`),
    story("Sidebar — Repository", `<div class="ms-sidebar">${renderSidebar({ phases, activePhase: "repository" })}</div>`),
  ].join("")
}

function renderArtifactStories() {
  const container = document.getElementById("sb-artifacts")
  container.innerHTML = Object.entries(SAMPLE_CARDS).map(([key, card]) => {
    return story(`Artifact — ${key}`, renderArtifactCard(card))
  }).join("") + story("Artifact Grid", `<div class="sb-workspace-preview"><div class="ms-artifacts">${renderArtifactGrid({
    phase: "mission",
    intent: SAMPLE_CARDS.intent,
    discovery: SAMPLE_CARDS.discovery,
    unknowns: SAMPLE_CARDS.unknowns,
    domain: SAMPLE_CARDS.domain,
    mission: SAMPLE_CARDS.mission,
    expeditions: [SAMPLE_CARDS.expedition],
    evidence: [SAMPLE_CARDS.evidence],
  })}</div></div>`)
}

function renderContentStories() {
  const container = document.getElementById("sb-content")
  container.innerHTML = [
    story("Intent Surface", `<div class="sb-workspace-preview">${renderIntentSurface({ examples: [{ id: "crm", name: "CRM" }, { id: "todo", name: "Todo" }] })}</div>`),
    story("Replay Controls", `<div class="sb-workspace-preview">${renderReplayControls({ offset: 2, total: 8 })}</div>`),
    story("Empty State", renderEmptyState({ title: "No artifacts", message: "Start by typing an intent." })),
    story("Loading", renderLoading({ message: "Extracting intent..." })),
    story("Error", renderError({ message: "Could not reach runtime." })),
    story("Callout — Info", renderCallout({ variant: "info", title: "Tip", message: "Use public vocabulary only." })),
    story("Callout — Warning", renderCallout({ variant: "warning", title: "Caution", message: "Confidence is below threshold." })),
  ].join("")
}

function init() {
  renderWorkspaceStories()
  renderSidebarStories()
  renderArtifactStories()
  renderContentStories()
}

init()
