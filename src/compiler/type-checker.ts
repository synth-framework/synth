// ============================================================
// COMPILER: Type Checker
// ============================================================

import type { Capability } from "../types/index.js"

export type TypedCapability = {
  name: string
  input: Record<string, string>
  output: string[]
  emits: string[]
  determinism: "pure" | "effectful"
  preconditions: string[]
}

export type TypedEvent = {
  name: string
  payloadSchema: Record<string, string>
  appliesTo: string[]
}

export type TypedState = {
  name: string
  fields: Record<string, string>
  transitions: TypedTransition[]
}

export type TypedTransition = {
  from: string
  to: string
  via: string
}

export type TypedIR = {
  capabilities: TypedCapability[]
  events: TypedEvent[]
  states: TypedState[]
  transitions: TypedTransition[]
  validity: TypeCheckResult
}

export type TypeCheckResult = {
  valid: boolean
  errors: TypeError[]
  warnings: TypeWarning[]
}

export type TypeError = {
  rule: string
  message: string
  context: Record<string, unknown>
}

export type TypeWarning = {
  rule: string
  message: string
  context: Record<string, unknown>
}

export class TypeChecker {

  check(ir: TypedIR): TypeCheckResult {
    const errors: TypeError[] = []
    const warnings: TypeWarning[] = []

    errors.push(...this.checkEventCoverage(ir))
    errors.push(...this.checkTransitionValidity(ir))
    errors.push(...this.checkCapabilityClosure(ir))
    warnings.push(...this.checkDeterminism(ir))
    warnings.push(...this.checkPartitionSafety(ir))
    warnings.push(...this.checkUnusedEvents(ir))
    warnings.push(...this.checkOrphanStates(ir))
    errors.push(...this.checkUnreachableTransitions(ir))

    return { valid: errors.length === 0, errors, warnings }
  }

  private checkEventCoverage(ir: TypedIR): TypeError[] {
    const errors: TypeError[] = []
    const emittedEvents = new Set<string>()
    for (const cap of ir.capabilities) {
      for (const event of cap.emits) {
        emittedEvents.add(event)
      }
    }
    const declaredEvents = new Set(ir.events.map((e) => e.name))
    for (const event of emittedEvents) {
      if (!declaredEvents.has(event)) {
        errors.push({
          rule: "EVENT_COVERAGE",
          message: `Event '${event}' is emitted by a capability but not declared`,
          context: { event, capabilities: this.findCapabilitiesEmitting(ir, event) },
        })
      }
    }
    return errors
  }

  private checkTransitionValidity(ir: TypedIR): TypeError[] {
    const errors: TypeError[] = []
    const emittedEvents = new Set<string>()
    for (const cap of ir.capabilities) {
      for (const event of cap.emits) {
        emittedEvents.add(event)
      }
    }
    for (const transition of ir.transitions) {
      if (!emittedEvents.has(transition.via)) {
        errors.push({
          rule: "TRANSITION_VALIDITY",
          message: `Transition ${transition.from} \u2192 ${transition.to} uses event '${transition.via}' which is not emitted by any capability`,
          context: { transition },
        })
      }
    }
    return errors
  }

  private checkCapabilityClosure(ir: TypedIR): TypeError[] {
    const errors: TypeError[] = []
    const declaredEvents = new Set(ir.events.map((e) => e.name))
    for (const cap of ir.capabilities) {
      for (const event of cap.emits) {
        if (!declaredEvents.has(event)) {
          errors.push({
            rule: "CAPABILITY_CLOSURE",
            message: `Capability '${cap.name}' emits undeclared event '${event}'`,
            context: { capability: cap.name, event },
          })
        }
      }
    }
    return errors
  }

  private checkDeterminism(ir: TypedIR): TypeWarning[] {
    const warnings: TypeWarning[] = []
    for (const cap of ir.capabilities) {
      if (cap.determinism === "pure" && cap.emits.length > 3) {
        warnings.push({
          rule: "DETERMINISM",
          message: `Pure capability '${cap.name}' emits ${cap.emits.length} events \u2014 consider splitting or marking as effectful`,
          context: { capability: cap.name, eventCount: cap.emits.length },
        })
      }
    }
    return warnings
  }

  private checkPartitionSafety(ir: TypedIR): TypeWarning[] {
    const warnings: TypeWarning[] = []
    for (const cap of ir.capabilities) {
      const inputTypes = Object.values(cap.input)
      const uniqueTypes = new Set(inputTypes)
      if (uniqueTypes.size > 2) {
        warnings.push({
          rule: "PARTITION_SAFETY",
          message: `Capability '${cap.name}' operates on ${uniqueTypes.size} types \u2014 potential cross-partition mutation`,
          context: { capability: cap.name, types: Array.from(uniqueTypes) },
        })
      }
    }
    return warnings
  }

  private checkUnusedEvents(ir: TypedIR): TypeWarning[] {
    const warnings: TypeWarning[] = []
    const emittedEvents = new Set<string>()
    for (const cap of ir.capabilities) {
      for (const event of cap.emits) {
        emittedEvents.add(event)
      }
    }
    for (const event of ir.events) {
      if (!emittedEvents.has(event.name)) {
        warnings.push({
          rule: "UNUSED_EVENT",
          message: `Event '${event.name}' is declared but never emitted`,
          context: { event: event.name },
        })
      }
    }
    return warnings
  }

  private checkOrphanStates(ir: TypedIR): TypeWarning[] {
    const warnings: TypeWarning[] = []
    const statesWithTransitions = new Set<string>()
    for (const t of ir.transitions) {
      statesWithTransitions.add(t.from)
      statesWithTransitions.add(t.to)
    }
    for (const state of ir.states) {
      if (state.transitions.length === 0 && !statesWithTransitions.has(state.name)) {
        warnings.push({
          rule: "ORPHAN_STATE",
          message: `State '${state.name}' has no transitions`,
          context: { state: state.name },
        })
      }
    }
    return warnings
  }

  private checkUnreachableTransitions(_ir: TypedIR): TypeError[] {
    return []
  }

  private findCapabilitiesEmitting(ir: TypedIR, event: string): string[] {
    return ir.capabilities
      .filter((c) => c.emits.includes(event))
      .map((c) => c.name)
  }

  isValid(ir: TypedIR): boolean {
    return this.check(ir).valid
  }
}

export function buildTypedIR(capabilities: Capability[]): TypedIR {
  const eventSet = new Set<string>()
  const transitions: TypedTransition[] = []

  const typedCapabilities: TypedCapability[] = capabilities.map((cap) => {
    for (const event of cap.outputSchema.events) {
      eventSet.add(event)
    }

    const statusEvents = cap.outputSchema.events.filter((e) =>
      e.includes("_STARTED") || e.includes("_COMPLETED") || e.includes("_CREATED")
    )

    for (const event of statusEvents) {
      if (event.includes("_CREATED")) {
        transitions.push({ from: "none", to: "idle", via: event })
      } else if (event.includes("_STARTED")) {
        transitions.push({ from: "idle", to: "active", via: event })
      } else if (event.includes("_COMPLETED")) {
        transitions.push({ from: "active", to: "complete", via: event })
      }
    }

    return {
      name: cap.name,
      input: cap.inputSchema.types,
      output: cap.outputSchema.events,
      emits: cap.outputSchema.events,
      determinism: cap.sideEffects ? "effectful" : "pure",
      preconditions: cap.preconditions.map((p) => p.name),
    }
  })

  const typedEvents: TypedEvent[] = Array.from(eventSet).map((name) => ({
    name,
    payloadSchema: {},
    appliesTo: [name.split("_")[0].toLowerCase()],
  }))

  const typedStates: TypedState[] = [
    {
      name: "idle",
      fields: { status: "string" },
      transitions: transitions.filter((t) => t.from === "idle" || t.to === "idle"),
    },
    {
      name: "active",
      fields: { status: "string" },
      transitions: transitions.filter((t) => t.from === "active" || t.to === "active"),
    },
    {
      name: "complete",
      fields: { status: "string" },
      transitions: transitions.filter((t) => t.from === "complete" || t.to === "complete"),
    },
  ]

  const checker = new TypeChecker()
  const ir: TypedIR = {
    capabilities: typedCapabilities,
    events: typedEvents,
    states: typedStates,
    transitions,
    validity: { valid: true, errors: [], warnings: [] },
  }

  ir.validity = checker.check(ir)
  return ir
}
