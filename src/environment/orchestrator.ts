// ============================================================
// ENVIRONMENT: Discovery Orchestrator
// ============================================================
// The orchestrator runs discovery rules, evaluates capability
// providers, resolves the best provider per capability family,
// and produces a canonical DiscoveryEvidence artifact.
//
// This module contains no environment-specific imports. All
// observation happens through the supplied ObservationContext.
// ============================================================

import type {
  CapabilityFamily,
  CapabilityProvider,
  DiscoveryConfig,
  DiscoveryEvidence,
  DiscoveryObservation,
  DiscoveryResult,
  DiscoveryRule,
  ObservationContext,
  ResolvedProvider,
} from "./types.js"
import { createDefaultDiscoveryRules } from "./rules.js"

function classifyEnvironment(observations: DiscoveryObservation[]): DiscoveryEvidence["environment"]["classification"] {
  const envType = observations.find((o) => o.name === "environmentType")
  if (envType && (envType.value as { type?: string }).type === "ci") {
    return "ci"
  }
  const revision = observations.find((o) => o.name === "revisionSystem")
  const revisionSystems = (revision?.value as string[]) || []
  if (revisionSystems.length > 0) return "repository"
  const workspace = observations.find((o) => o.name === "workspaceStructure")
  const structure = (workspace?.value as { hasPackageJson?: boolean; hasSynthManifest?: boolean }) || {}
  if (structure.hasPackageJson || structure.hasSynthManifest) return "project"
  return "bare"
}

function platformFromObservations(observations: DiscoveryObservation[]): string {
  const runtime = observations.find((o) => o.name === "runtimes")
  const runtimes = (runtime?.value as Array<{ name: string; version?: string }>) || []
  const node = runtimes.find((r) => r.name === "node")
  return node ? `node:${node.version ?? "unknown"}` : "unknown"
}

function buildCapabilitySummaries(
  observations: DiscoveryObservation[],
): DiscoveryEvidence["capabilities"] {
  const byFamily = new Map<CapabilityFamily, DiscoveryObservation[]>()
  for (const obs of observations) {
    const list = byFamily.get(obs.family) || []
    list.push(obs)
    byFamily.set(obs.family, list)
  }

  return Array.from(byFamily.entries()).map(([family, familyObservations]) => {
    const confidence = bestConfidence(familyObservations.map((o) => o.confidence))
    return {
      family,
      available: confidence !== "none" && confidence !== "low",
      confidence,
      observations: familyObservations.map((o) => o.id),
    }
  })
}

function bestConfidence(confidences: DiscoveryObservation["confidence"][]): DiscoveryObservation["confidence"] {
  const order: DiscoveryObservation["confidence"][] = ["none", "low", "medium", "high", "certain"]
  let best: DiscoveryObservation["confidence"] = "none"
  for (const c of confidences) {
    if (order.indexOf(c) > order.indexOf(best)) {
      best = c
    }
  }
  return best
}

async function resolveProviders(
  ctx: ObservationContext,
  evidence: DiscoveryEvidence,
  providers: CapabilityProvider[],
  overrides: DiscoveryConfig["overrides"],
): Promise<ResolvedProvider[]> {
  const byFamily = new Map<CapabilityFamily, CapabilityProvider[]>()
  for (const provider of providers) {
    for (const cap of provider.capabilities) {
      const list = byFamily.get(cap.family) || []
      list.push(provider)
      byFamily.set(cap.family, list)
    }
  }

  const resolved: ResolvedProvider[] = []
  for (const [family, candidates] of byFamily.entries()) {
    const override = overrides?.find((o) => o.family === family)

    if (override) {
      resolved.push({
        family,
        providerName: override.providerName,
        confidence: "certain",
        reason: `Explicit override selected ${override.providerName}`,
        metadata: { source: "override" },
      })
      continue
    }

    const evaluations = await Promise.all(
      candidates.map((provider) => provider.evaluate(ctx, evidence)),
    )

    const available = evaluations
      .filter((e) => e.available)
      .sort((a, b) => confidenceRank(b.confidence) - confidenceRank(a.confidence))

    if (available.length === 0) {
      resolved.push({
        family,
        providerName: "none",
        confidence: "none",
        reason: "No provider reported availability",
      })
      continue
    }

    const chosen = available[0]
    resolved.push({
      family,
      providerName: chosen.providerName,
      confidence: chosen.confidence,
      reason: chosen.reason,
      metadata: chosen.metadata,
    })
  }

  return resolved
}

function confidenceRank(confidence: DiscoveryObservation["confidence"]): number {
  const order: DiscoveryObservation["confidence"][] = ["none", "low", "medium", "high", "certain"]
  return order.indexOf(confidence)
}

function buildAssumptions(
  observations: DiscoveryObservation[],
  providers: ResolvedProvider[],
): DiscoveryEvidence["assumptions"] {
  const assumptions: DiscoveryEvidence["assumptions"] = []

  for (const obs of observations) {
    if (obs.name === "workspaceStructure") {
      const value = obs.value as { hasPackageJson?: boolean; hasSynthManifest?: boolean }
      if (value.hasPackageJson) {
        assumptions.push({
          id: `asm-${obs.id}-packagejson`,
          family: obs.family,
          assumption: "A package manifest (package.json) is present and authoritative",
          source: "discovered",
          confidence: obs.confidence,
        })
      }
      if (value.hasSynthManifest) {
        assumptions.push({
          id: `asm-${obs.id}-synthmanifest`,
          family: obs.family,
          assumption: "A SYNTH manifest (.synth) is present",
          source: "discovered",
          confidence: obs.confidence,
        })
      }
    }
  }

  for (const provider of providers) {
    if (provider.providerName !== "none") {
      assumptions.push({
        id: `asm-provider-${provider.family}`,
        family: provider.family,
        assumption: `Provider '${provider.providerName}' will satisfy ${provider.family} capability`,
        source: "discovered",
        confidence: provider.confidence,
      })
    }
  }

  return assumptions
}

function buildCompatibility(
  capabilities: DiscoveryEvidence["capabilities"],
  providers: ResolvedProvider[],
): DiscoveryEvidence["compatibility"] {
  const providerByFamily = new Map(providers.map((p) => [p.family, p]))
  return capabilities.map((cap) => {
    const provider = providerByFamily.get(cap.family)
    if (!provider || provider.providerName === "none") {
      return {
        family: cap.family,
        decision: "unsupported",
        reason: "No provider available for capability family",
      }
    }
    if (cap.confidence === "low") {
      return {
        family: cap.family,
        decision: "degraded",
        reason: `Provider '${provider.providerName}' selected with low confidence`,
      }
    }
    return {
      family: cap.family,
      decision: "supported",
      reason: `Provider '${provider.providerName}' selected with ${cap.confidence} confidence`,
    }
  })
}

export class DiscoveryOrchestrator {
  private rules: DiscoveryRule[]
  private providers: CapabilityProvider[]
  private overrides: DiscoveryConfig["overrides"]

  constructor(config: DiscoveryConfig = {}) {
    this.rules = config.rules ?? createDefaultDiscoveryRules()
    this.providers = config.providers ?? []
    this.overrides = config.overrides
  }

  async discover(ctx: ObservationContext): Promise<DiscoveryResult> {
    const start = Date.now()
    const observations: DiscoveryObservation[] = []

    for (const rule of this.rules) {
      try {
        const result = await rule.observe(ctx)
        if (Array.isArray(result)) {
          observations.push(...result)
        } else {
          observations.push(result)
        }
      } catch (error) {
        observations.push({
          id: `obs-${rule.id}-error`,
          ruleId: rule.id,
          family: rule.family,
          name: "ruleError",
          value: error instanceof Error ? error.message : String(error),
          confidence: "none",
          timestamp: Date.now(),
        })
      }
    }

    const environmentClassification = classifyEnvironment(observations)
    const capabilities = buildCapabilitySummaries(observations)

    const partialEvidence: DiscoveryEvidence = {
      schema: "synth-discovery-evidence-v1",
      timestamp: start,
      environment: {
        platform: platformFromObservations(observations),
        workspaceRoot: ctx.cwd,
        classification: environmentClassification,
      },
      observations,
      capabilities,
      providers: [],
      assumptions: [],
      compatibility: [],
      provenance: {
        rulesExecuted: this.rules.map((r) => r.id),
        providersEvaluated: this.providers.map((p) => p.name),
      },
    }

    const providers = await resolveProviders(ctx, partialEvidence, this.providers, this.overrides)
    const assumptions = buildAssumptions(observations, providers)
    const compatibility = buildCompatibility(capabilities, providers)

    const evidence: DiscoveryEvidence = {
      ...partialEvidence,
      providers,
      assumptions,
      compatibility,
    }

    return {
      evidence,
      durationMs: Date.now() - start,
    }
  }
}

export function createDiscoveryOrchestrator(config?: DiscoveryConfig): DiscoveryOrchestrator {
  return new DiscoveryOrchestrator(config)
}
