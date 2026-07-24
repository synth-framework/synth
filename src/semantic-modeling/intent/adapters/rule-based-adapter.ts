// ============================================================
// SEMANTIC MODELING: Rule-Based Intent Modeling Adapter
// ============================================================
// Derives a canonical IntentModel from an approved Genesis artifact.
// Deterministic for a fixed artifact and adapter version.
// ============================================================

import { stableId } from "../../../sdk/hashing/index.js"
import type {
  Ambiguity,
  AmbiguityClass,
  AssumptionNode,
  ConstraintNode,
  GoalNode,
  IntentEdge,
  IntentGraph,
  IntentModel,
  IntentModelingAdapter,
  IntentModelingOptions,
  IntentNode,
  OutcomeNode,
  ProblemNode,
  StakeholderNode,
  SuccessCriterionNode,
  UnknownNode,
} from "../types.js"
import type { IntentExtractionResult } from "../../../first-contact/extract/types.js"

const ADAPTER_ID = "rule-based-intent-modeler"
const ADAPTER_VERSION = "1.0.0"

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function inferProblems(artifact: IntentExtractionResult): ProblemNode[] {
  const description = artifact.intent.description.toLowerCase()
  const problemVerbs = ["track", "manage", "build", "create", "monitor", "validate", "edit", "view", "organize"]
  const problems: ProblemNode[] = []

  for (const verb of problemVerbs) {
    const idx = description.indexOf(verb)
    if (idx !== -1) {
      const remainder = description.slice(idx + verb.length).trim()
      const objectMatch = remainder.match(/^(?:a |an |the )?([a-z0-9\s]+?)(?:\s+(?:for|in|with|that|to|and|or|\.))?/i)
      const object = objectMatch ? objectMatch[1].trim() : remainder.split(/\s+/).slice(0, 4).join(" ")
      const label = `${verb} ${object}`.trim()
      problems.push({
        id: stableId("problem", label),
        type: "problem",
        label,
        confidence: 0.7,
        evidence: ["intent.description"],
        source: ADAPTER_ID,
      })
    }
  }

  if (problems.length === 0) {
    problems.push({
      id: stableId("problem", artifact.intent.description),
      type: "problem",
      label: `address: ${artifact.intent.description}`,
      confidence: 0.5,
      evidence: ["intent.description"],
      source: ADAPTER_ID,
    })
  }

  return problems
}

function buildGoals(artifact: IntentExtractionResult): GoalNode[] {
  return artifact.intent.goals.map((goal) => ({
    id: stableId("goal", goal),
    type: "goal",
    label: goal,
    confidence: 0.85,
    evidence: ["intent.goals"],
    source: ADAPTER_ID,
  }))
}

function buildStakeholders(artifact: IntentExtractionResult): StakeholderNode[] {
  const nodes: StakeholderNode[] = []
  for (const user of artifact.audience.primaryUsers) {
    nodes.push({
      id: stableId("stakeholder", user, "primary"),
      type: "stakeholder",
      label: user,
      kind: "primary",
      confidence: 0.9,
      evidence: ["audience.primaryUsers"],
      source: ADAPTER_ID,
    })
  }
  for (const stakeholder of artifact.audience.stakeholders) {
    nodes.push({
      id: stableId("stakeholder", stakeholder, "secondary"),
      type: "stakeholder",
      label: stakeholder,
      kind: "secondary",
      confidence: 0.85,
      evidence: ["audience.stakeholders"],
      source: ADAPTER_ID,
    })
  }
  return nodes
}

function buildOutcomes(artifact: IntentExtractionResult): OutcomeNode[] {
  return artifact.intent.successCriteria.map((criterion) => ({
    id: stableId("outcome", criterion),
    type: "outcome",
    label: criterion,
    confidence: 0.8,
    evidence: ["intent.successCriteria"],
    source: ADAPTER_ID,
  }))
}

function buildSuccessCriteria(artifact: IntentExtractionResult): SuccessCriterionNode[] {
  return artifact.intent.successCriteria.map((criterion) => ({
    id: stableId("success-criterion", criterion),
    type: "success-criterion",
    label: criterion,
    confidence: 0.8,
    evidence: ["intent.successCriteria"],
    source: ADAPTER_ID,
  }))
}

function buildAssumptions(artifact: IntentExtractionResult): AssumptionNode[] {
  const assumptions: AssumptionNode[] = []
  for (const lang of artifact.environment.languagePreferences) {
    assumptions.push({
      id: stableId("assumption", `runtime-${lang}`),
      type: "assumption",
      label: `Runtime supports ${lang}`,
      confidence: 0.75,
      evidence: ["environment.languagePreferences"],
      source: ADAPTER_ID,
    })
  }
  for (const platform of artifact.environment.platformConstraints) {
    assumptions.push({
      id: stableId("assumption", `platform-${platform}`),
      type: "assumption",
      label: `Deployment target is ${platform}`,
      confidence: 0.7,
      evidence: ["environment.platformConstraints"],
      source: ADAPTER_ID,
    })
  }
  return assumptions
}

function buildUnknowns(artifact: IntentExtractionResult): UnknownNode[] {
  return artifact.unknowns.map((unknown) => ({
    id: stableId("unknown", unknown.field, unknown.description),
    type: "unknown",
    label: unknown.description,
    confidence: unknown.confidence,
    evidence: ["unknowns"],
    source: ADAPTER_ID,
    accepted: unknown.accepted,
  }))
}

function buildConstraints(artifact: IntentExtractionResult): ConstraintNode[] {
  const nodes: ConstraintNode[] = []
  for (const c of artifact.constraints.functional) {
    nodes.push({
      id: stableId("constraint", "functional", c),
      type: "constraint",
      label: c,
      kind: "functional",
      confidence: 0.85,
      evidence: ["constraints.functional"],
      source: ADAPTER_ID,
    })
  }
  for (const c of artifact.constraints.nonFunctional) {
    nodes.push({
      id: stableId("constraint", "non-functional", c),
      type: "constraint",
      label: c,
      kind: "non-functional",
      confidence: 0.8,
      evidence: ["constraints.nonFunctional"],
      source: ADAPTER_ID,
    })
  }
  return nodes
}

function buildEdges(nodes: IntentNode[]): IntentEdge[] {
  const edges: IntentEdge[] = []
  const problems = nodes.filter((n) => n.type === "problem") as ProblemNode[]
  const goals = nodes.filter((n) => n.type === "goal") as GoalNode[]
  const outcomes = nodes.filter((n) => n.type === "outcome") as OutcomeNode[]
  const criteria = nodes.filter((n) => n.type === "success-criterion") as SuccessCriterionNode[]
  const stakeholders = nodes.filter((n) => n.type === "stakeholder") as StakeholderNode[]

  for (const problem of problems) {
    for (const goal of goals) {
      edges.push({
        id: stableId("edge", problem.id, goal.id, "derives"),
        source: problem.id,
        target: goal.id,
        type: "derives",
      })
    }
  }

  for (const goal of goals) {
    for (const outcome of outcomes) {
      edges.push({
        id: stableId("edge", goal.id, outcome.id, "produces"),
        source: goal.id,
        target: outcome.id,
        type: "produces",
      })
    }
  }

  for (const outcome of outcomes) {
    for (const criterion of criteria) {
      if (outcome.label === criterion.label) {
        edges.push({
          id: stableId("edge", outcome.id, criterion.id, "validated-by"),
          source: outcome.id,
          target: criterion.id,
          type: "validated-by",
        })
      }
    }
  }

  for (const stakeholder of stakeholders) {
    for (const goal of goals) {
      edges.push({
        id: stableId("edge", stakeholder.id, goal.id, "owns"),
        source: stakeholder.id,
        target: goal.id,
        type: "owns",
      })
    }
  }

  return edges
}

function detectAmbiguities(artifact: IntentExtractionResult, nodes: IntentNode[]): Ambiguity[] {
  const ambiguities: Ambiguity[] = []

  function add(id: string, cls: AmbiguityClass, field: string, message: string, nodeIds: string[], blocking: boolean) {
    ambiguities.push({ id, class: cls, field, message, nodeIds, blocking })
  }

  if (artifact.intent.goals.length === 0) {
    add(
      stableId("ambiguity", "missing-goals"),
      "MISSING_REQUIRED",
      "intent.goals",
      "No goals were extracted from the intent.",
      [],
      true,
    )
  }

  if (artifact.intent.successCriteria.length === 0) {
    add(
      stableId("ambiguity", "missing-success-criteria"),
      "MISSING_REQUIRED",
      "intent.successCriteria",
      "No success criteria were extracted from the intent.",
      [],
      true,
    )
  }

  if (artifact.audience.primaryUsers.length === 0) {
    add(
      stableId("ambiguity", "missing-primary-users"),
      "MISSING_REQUIRED",
      "audience.primaryUsers",
      "No primary users were identified.",
      [],
      true,
    )
  }

  const lowConfidenceNodes = nodes.filter((n) => n.confidence < 0.5)
  for (const node of lowConfidenceNodes) {
    add(
      stableId("ambiguity", "low-confidence", node.id),
      "LOW_CONFIDENCE",
      node.evidence[0] ?? "unknown",
      `Low confidence (${node.confidence.toFixed(2)}) for '${node.label}'.`,
      [node.id],
      false,
    )
  }

  const blockingUnknowns = artifact.unknowns.filter((u) => !u.accepted && u.confidence > 0.7)
  for (const unknown of blockingUnknowns) {
    add(
      stableId("ambiguity", "blocking-unknown", unknown.field),
      "NEEDS_DISAMBIGUATION",
      unknown.field,
      `Unaccepted unknown '${unknown.description}' has high confidence and should be clarified.`,
      [],
      true,
    )
  }

  const labels = new Map<string, string[]>()
  for (const node of nodes) {
    const key = node.label.toLowerCase()
    const existing = labels.get(key) ?? []
    existing.push(node.id)
    labels.set(key, existing)
  }
  for (const [label, ids] of labels) {
    if (ids.length > 1) {
      add(
        stableId("ambiguity", "conflicting", label),
        "CONFLICTING",
        "intent",
        `The label '${label}' is used by multiple intent nodes with different meanings.`,
        ids,
        false,
      )
    }
  }

  return ambiguities
}

export class RuleBasedIntentModelingAdapter implements IntentModelingAdapter {
  readonly id = ADAPTER_ID
  readonly version = ADAPTER_VERSION

  model(options: IntentModelingOptions): IntentModel {
    const { artifact } = options

    const nodes: IntentNode[] = [
      ...inferProblems(artifact),
      ...buildGoals(artifact),
      ...buildStakeholders(artifact),
      ...buildOutcomes(artifact),
      ...buildSuccessCriteria(artifact),
      ...buildAssumptions(artifact),
      ...buildUnknowns(artifact),
      ...buildConstraints(artifact),
    ]

    const edges = buildEdges(nodes)
    const ambiguities = detectAmbiguities(artifact, nodes)
    const confidences = nodes.map((n) => n.confidence)
    const aggregateConfidence = avg(confidences)

    const graph: IntentGraph = { nodes, edges }

    return {
      schema: "synth-intent-model-v1",
      version: "1.0.0",
      derivedFrom: {
        discoveryArtifactId: artifact.id,
        adapterId: this.id,
        adapterVersion: this.version,
      },
      graph,
      aggregateConfidence,
      ambiguities,
      generatedAt: new Date().toISOString(),
    }
  }
}
