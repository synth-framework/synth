// ============================================================
// HOMEPAGE: Mission Studio Design Reference (Storybook)
// ============================================================
// Renders Mission Studio surfaces, artifacts, interactions,
// typography, and tokens as a canonical design reference.
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

const PHASES = ["intent", "discovery", "constraints", "domain", "mission", "expeditions", "governance", "replay", "architecture", "repository"]

const SAMPLE_CARDS = {
  intent: {
    kind: "intent",
    description: "Build a CRM to manage customer relationships",
    goals: ["Track contacts and companies", "Manage deals through a pipeline"],
    successCriteria: ["Users can track contacts", "Users can manage deals"],
    mode: "greenfield",
    confidence: 0.92,
  },
  discovery: {
    kind: "discovery",
    findings: ["Operator wants a web-based CRM", "Core capability is customer relationship management"],
    capabilities: ["domain-modeling", "authentication", "persistence"],
    constraints: ["Runtime: web", "Language: TypeScript"],
  },
  unknowns: {
    kind: "unknowns",
    items: [
      { kind: "unknown", field: "runtime", description: "Target runtime is not specified.", confidence: 0.2 },
      { kind: "unknown", field: "auth", description: "Authentication provider is undefined.", confidence: 0.4 },
    ],
  },
  domain: {
    kind: "domain",
    entities: ["Customer", "Contact", "Deal", "Activity"],
    relationships: ["Customer owns Contacts", "Deal belongs to Customer"],
    boundedContexts: ["crm-core", "identity"],
  },
  mission: {
    kind: "mission",
    id: "mission-12345678",
    name: "Build a CRM",
    purpose: "Build a CRM with governed Discovery, Mission, and Expedition lifecycle.",
    objectives: ["Capture intent", "Model domain", "Define expeditions", "Project architecture"],
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
    observation: "Intent extracted from operator input with high confidence.",
    confidence: 0.85,
    source: "rule-based-intent-extraction",
  },
  architecture: {
    kind: "architecture",
    layer: "Intent Layer",
    responsibility: "Capture operator intent and success criteria.",
    dependencies: [],
  },
  repository: {
    kind: "repository",
    status: "governed",
    artifacts: [".synth/manifest.json", ".synth/data/event-log.jsonl", ".synth/data/decisions.jsonl"],
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
  container.innerHTML = [
    story("Sidebar — Discovery", `<div class="sb-lifecycle-preview"><div class="ms-sidebar">${renderSidebar({ phases: PHASES, activePhase: "discovery" })}</div></div>`),
    story("Sidebar — Replay", `<div class="sb-lifecycle-preview"><div class="ms-sidebar">${renderSidebar({ phases: PHASES, activePhase: "replay" })}</div></div>`),
    story("Sidebar — Repository", `<div class="sb-lifecycle-preview"><div class="ms-sidebar">${renderSidebar({ phases: PHASES, activePhase: "repository" })}</div></div>`),
  ].join("")
}

function renderLifecycleStories() {
  const container = document.getElementById("sb-lifecycle")
  const projectionFor = (phase) => ({
    phase,
    intent: SAMPLE_CARDS.intent,
    discovery: SAMPLE_CARDS.discovery,
    unknowns: SAMPLE_CARDS.unknowns,
    domain: SAMPLE_CARDS.domain,
    mission: SAMPLE_CARDS.mission,
    expeditions: [SAMPLE_CARDS.expedition],
    evidence: [SAMPLE_CARDS.evidence],
    architecture: [SAMPLE_CARDS.architecture],
    repository: SAMPLE_CARDS.repository,
  })

  container.innerHTML = [
    story("Intent Phase", `<div class="sb-workspace-preview"><div class="ms-artifacts">${renderArtifactCard(SAMPLE_CARDS.intent)}</div></div>`),
    story("Discovery Phase", `<div class="sb-workspace-preview"><div class="ms-artifacts">${renderArtifactCard(SAMPLE_CARDS.discovery)}${renderArtifactCard(SAMPLE_CARDS.unknowns)}</div></div>`),
    story("Mission Phase", `<div class="sb-workspace-preview"><div class="ms-artifacts">${renderArtifactCard(SAMPLE_CARDS.mission)}</div></div>`),
    story("Expeditions Phase", `<div class="sb-workspace-preview"><div class="ms-artifacts">${renderArtifactCard(SAMPLE_CARDS.expedition)}</div></div>`),
    story("Governance Phase", `<div class="sb-workspace-preview"><div class="ms-artifacts">${renderArtifactCard(SAMPLE_CARDS.evidence)}</div></div>`),
    story("Replay Phase", `<div class="sb-workspace-preview"><div class="ms-artifacts">${renderArtifactCard(SAMPLE_CARDS.repository)}</div></div>`),
    story("Repository Summary", `<div class="sb-workspace-preview"><div class="ms-artifacts">${renderArtifactCard(SAMPLE_CARDS.repository)}</div></div>`),
    story("Full Artifact Grid", `<div class="sb-workspace-preview"><div class="ms-artifacts">${renderArtifactGrid(projectionFor("repository"))}</div></div>`),
  ].join("")
}

function renderArtifactStories() {
  const container = document.getElementById("sb-artifacts")
  container.innerHTML = Object.entries(SAMPLE_CARDS).map(([key, card]) => {
    return story(`Artifact — ${key}`, renderArtifactCard(card))
  }).join("")
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

function renderTypographyStories() {
  const container = document.getElementById("sb-typography")
  const sizes = [
    { label: "4xl — Hero", cls: "ms-text-4xl", weight: "var(--ms-font-weight-bold)" },
    { label: "3xl — Section", cls: "ms-text-3xl", weight: "var(--ms-font-weight-bold)" },
    { label: "2xl — Page Title", cls: "ms-text-2xl", weight: "var(--ms-font-weight-semibold)" },
    { label: "xl — Artifact Title", cls: "ms-text-xl", weight: "var(--ms-font-weight-semibold)" },
    { label: "lg — Subsection", cls: "ms-text-lg", weight: "var(--ms-font-weight-medium)" },
    { label: "base — Body", cls: "ms-text-base", weight: "var(--ms-font-weight-normal)" },
    { label: "sm — Caption", cls: "ms-text-sm", weight: "var(--ms-font-weight-normal)" },
    { label: "xs — Label", cls: "ms-text-xs", weight: "var(--ms-font-weight-bold)" },
  ]
  container.innerHTML = sizes.map(({ label, cls, weight }) => `
    <div class="sb-typo-sample">
      <div class="sb-typo-label">${label}</div>
      <p style="font-size: var(--${cls}); font-weight: ${weight}; letter-spacing: ${cls.includes("xl") || cls.includes("4xl") || cls.includes("3xl") || cls.includes("2xl") ? "var(--ms-letter-spacing-tight)" : "normal"};">Synth turns intent into missions.</p>
    </div>
  `).join("")
}

function renderTokenStories() {
  const container = document.getElementById("sb-tokens")
  const concepts = ["genesis", "mission", "expedition", "evidence", "governance", "replay", "knowledge", "architecture", "repository"]
  const variants = ["", "-soft", "-bg", "-text", "-icon"]
  container.innerHTML = concepts.map((concept) => `
    <div class="sb-story sb-full-width">
      <h3>${concept}</h3>
      <div class="sb-token-grid">
        ${variants.map((variant) => {
          const name = `--ms-${concept}${variant}`
          return `
            <div class="sb-token">
              <div class="sb-token-swatch" style="background: var(${name});"></div>
              <div>
                <div class="sb-token-name">${name}</div>
              </div>
            </div>
          `
        }).join("")}
      </div>
    </div>
  `).join("")
}

function init() {
  renderWorkspaceStories()
  renderSidebarStories()
  renderLifecycleStories()
  renderArtifactStories()
  renderContentStories()
  renderTypographyStories()
  renderTokenStories()
}

init()
