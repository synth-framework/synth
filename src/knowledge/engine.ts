// ============================================================
// KNOWLEDGE: Canonical Knowledge Graph Engine
// ============================================================
// Entry point for building a Canonical Knowledge Graph from intent and
// domain models, projecting artifacts, and detecting drift
// (EXP-KNOWLEDGE-001).
// ============================================================

import type {
  DriftFinding,
  KnowledgeGraph,
  KnowledgeModelingAdapter,
  KnowledgeModelingOptions,
  KnowledgeProjections,
} from "./types.js"
import { RuleBasedKnowledgeAdapter } from "./adapters/rule-based-adapter.js"

export type {
  DriftFinding,
  KnowledgeGraph,
  KnowledgeModelingAdapter,
  KnowledgeModelingOptions,
  KnowledgeProjections,
}

const defaultAdapter = new RuleBasedKnowledgeAdapter()

/**
 * Build a Canonical Knowledge Graph from intent and domain models.
 */
export function buildKnowledgeGraph(
  options: KnowledgeModelingOptions,
  adapter: KnowledgeModelingAdapter = defaultAdapter,
): KnowledgeGraph {
  return adapter.buildGraph(options)
}

/**
 * Project Mission, Expedition, ADR, and documentation artifacts from a
 * knowledge graph.
 */
export function projectKnowledge(graph: KnowledgeGraph, adapter: KnowledgeModelingAdapter = defaultAdapter): KnowledgeProjections {
  return adapter.project(graph)
}

/**
 * Detect drift between a knowledge graph and a prior projection snapshot.
 */
export function detectDrift(
  graph: KnowledgeGraph,
  snapshot: KnowledgeProjections,
  adapter: KnowledgeModelingAdapter = defaultAdapter,
): DriftFinding[] {
  return adapter.detectDrift(graph, snapshot)
}
