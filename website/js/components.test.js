// ============================================================
// HOMEPAGE: Mission Studio Component Catalog Tests
// ============================================================

import { describe, it } from "node:test"
import assert from "node:assert"
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
  renderPhaseControls,
} from "./components.js"

void describe("Component Catalog", () => {
  void it("renders workspace header in idle and active states", () => {
    const idle = renderWorkspaceHeader({ status: "Idle", active: false })
    assert.ok(idle.includes("Idle"))
    assert.ok(!idle.includes("ms-status-active"))

    const active = renderWorkspaceHeader({ status: "Discovery", active: true })
    assert.ok(active.includes("Discovery"))
    assert.ok(active.includes("ms-status-active"))
  })

  void it("renders workspace footer with status and meta", () => {
    const html = renderWorkspaceFooter({ status: "Replay 3/8", meta: "hash abc123" })
    assert.ok(html.includes("Replay 3/8"))
    assert.ok(html.includes("hash abc123"))
  })

  void it("renders sidebar with active and past phases", () => {
    const phases = ["intent", "discovery", "mission", "expeditions"]
    const html = renderSidebar({ phases, activePhase: "mission" })
    assert.ok(html.includes('data-phase="mission"'))
    assert.ok(html.includes("ms-phase-active"))
    assert.ok(html.includes("ms-phase-past"))
  })

  void it("renders all artifact card kinds", () => {
    const cards = [
      { kind: "intent", description: "Build a CRM", goals: [], successCriteria: [], mode: "greenfield" },
      { kind: "discovery", findings: [], capabilities: [], constraints: [] },
      { kind: "unknowns", items: [] },
      { kind: "domain", entities: [], relationships: [], boundedContexts: [] },
      { kind: "mission", id: "m1", name: "M", purpose: "P", objectives: [], successCriteria: [] },
      { kind: "expedition", id: "e1", missionId: "m1", name: "E", goal: "G", status: "draft" },
      { kind: "evidence", id: "ev1", observation: "O", confidence: 0.8, source: "S" },
      { kind: "architecture", layer: "L", responsibility: "R", dependencies: [] },
      { kind: "repository", status: "governed", artifacts: [], eventCount: 0 },
    ]

    for (const card of cards) {
      const html = renderArtifactCard(card)
      assert.ok(html.length > 0, `expected render output for ${card.kind}`)
      assert.ok(html.includes(`ms-card-${card.kind}`), `expected css class for ${card.kind}`)
    }
  })

  void it("renders artifact grid from projection", () => {
    const projection = {
      phase: "mission",
      intent: { kind: "intent", description: "Build a CRM", goals: [], successCriteria: [], mode: "greenfield" },
      discovery: { kind: "discovery", findings: [], capabilities: [], constraints: [] },
      unknowns: { kind: "unknowns", items: [] },
      domain: { kind: "domain", entities: [], relationships: [], boundedContexts: [] },
      mission: { kind: "mission", id: "m1", name: "M", purpose: "P", objectives: [], successCriteria: [] },
      expeditions: [],
      evidence: [],
    }
    const html = renderArtifactGrid(projection)
    assert.ok(html.includes("ms-card-intent"))
    assert.ok(html.includes("ms-card-mission"))
  })

  void it("renders intent surface with examples and modes", () => {
    const html = renderIntentSurface({ examples: [{ id: "crm", name: "CRM" }], mode: "brownfield" })
    assert.ok(html.includes('data-mode="brownfield"'))
    assert.ok(html.includes("ms-source-active"))
    assert.ok(html.includes("CRM"))
  })

  void it("renders replay controls with correct range", () => {
    const html = renderReplayControls({ offset: 2, total: 8 })
    assert.ok(html.includes('max="7"'))
    assert.ok(html.includes('value="2"'))
  })

  void it("renders content and feedback components", () => {
    assert.ok(renderEmptyState({}).includes("Nothing to show"))
    assert.ok(renderLoading({}).includes("Loading"))
    assert.ok(renderError({ message: "Oops" }).includes("Oops"))
    assert.ok(renderCallout({ variant: "warning", message: "Careful" }).includes("warning"))
  })

  void it("renders phase controls for each phase category", () => {
    assert.ok(renderPhaseControls({ phase: "idle" }).includes("Type an idea"))
    assert.ok(renderPhaseControls({ phase: "discovery" }).includes("Advance"))
    assert.ok(renderPhaseControls({ phase: "expeditions" }).includes("Show Replay"))
    assert.ok(renderPhaseControls({ phase: "replay", onReplay: true }).includes("Scrub through"))
  })
})
