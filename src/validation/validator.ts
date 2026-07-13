// ============================================================
// VALIDATION: Intent Validation Layer
// ============================================================
// Introduces correctness constraints BEFORE execution.
// All intents must pass validation before proceeding.
// ============================================================

import type { IntentRequest, CapabilityInvocation } from "../types/index.js"

/** Validation error */
export type ValidationError = {
  field: string
  message: string
  severity: "error" | "warning"
}

/** Validation result */
export type ValidationResult = {
  valid: boolean
  errors: ValidationError[]
}

/** Validate an intent request */
export function validateIntentRequest(req: IntentRequest): ValidationResult {
  const errors: ValidationError[] = []

  // Must have actor
  if (!req.actor || typeof req.actor !== "string" || req.actor.length === 0) {
    errors.push({
      field: "actor",
      message: "INVALID_INTENT: missing or empty actor",
      severity: "error",
    })
  }

  // Must have capability
  if (!req.capability || typeof req.capability !== "string" || req.capability.length === 0) {
    errors.push({
      field: "capability",
      message: "INVALID_INTENT: missing or empty capability",
      severity: "error",
    })
  }

  // Must have payload (can be empty object)
  if (!req.payload || typeof req.payload !== "object") {
    errors.push({
      field: "payload",
      message: "INVALID_INTENT: payload must be an object",
      severity: "error",
    })
  }

  // Capability name format check
  if (req.capability && !/^[A-Za-z][A-Za-z0-9]*$/.test(req.capability)) {
    errors.push({
      field: "capability",
      message: `INVALID_INTENT: invalid capability name format: ${req.capability}`,
      severity: "error",
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/** Validate a capability invocation */
export function validateInvocation(invocation: CapabilityInvocation): ValidationResult {
  const errors: ValidationError[] = []

  if (!invocation.actor || invocation.actor.length === 0) {
    errors.push({ field: "actor", message: "Missing actor", severity: "error" })
  }

  if (!invocation.capability || invocation.capability.length === 0) {
    errors.push({ field: "capability", message: "Missing capability", severity: "error" })
  }

  if (!invocation.payload || typeof invocation.payload !== "object") {
    errors.push({ field: "payload", message: "Missing or invalid payload", severity: "error" })
  }

  // Check payload has required 'id' for most operations
  const idRequired = [
    "StartWorkItem",
    "CompleteWorkItem",
    "BlockWorkItem",
    "CreateWorkItem",
    "CreatePlan",
    "CreateMilestone",
    "CreateProject",
    "ActivatePlan",
    "CompletePlan",
    "StartMilestone",
    "CompleteMilestone",
    "CreateMission",
    "ApproveMission",
    "CompleteMission",
    "ArchiveMission",
    "CreateExpedition",
    "ApproveExpedition",
    "StartExpedition",
    "CompleteExpedition",
    "AddObjective",
    "RecordDiscovery",
    "AcceptDecision",
    "RejectDecision",
  ]

  if (idRequired.includes(invocation.capability)) {
    const id = (invocation.payload as Record<string, unknown>)?.id
    if (!id || (typeof id !== "string" && typeof id !== "number")) {
      errors.push({
        field: "payload.id",
        message: `Capability ${invocation.capability} requires payload.id`,
        severity: "error",
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/** Check if payload matches expected schema (basic type checking) */
export function validatePayloadSchema(
  payload: Record<string, unknown>,
  schema: { required?: string[]; types?: Record<string, string> }
): ValidationResult {
  const errors: ValidationError[] = []

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in payload)) {
        errors.push({
          field,
          message: `Missing required field: ${field}`,
          severity: "error",
        })
      }
    }
  }

  // Check types
  if (schema.types) {
    for (const [field, expectedType] of Object.entries(schema.types)) {
      const value = payload[field]
      if (value !== undefined) {
        const actualType = Array.isArray(value) ? "array" : typeof value
        if (actualType !== expectedType) {
          errors.push({
            field,
            message: `Expected ${expectedType}, got ${actualType}`,
            severity: "error",
          })
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/** Compose multiple validators into one */
export function composeValidators(
  ...validators: ((req: IntentRequest) => ValidationResult)[]
): (req: IntentRequest) => ValidationResult {
  return (req: IntentRequest) => {
    const allErrors: ValidationError[] = []

    for (const validator of validators) {
      const result = validator(req)
      allErrors.push(...result.errors)
    }

    return {
      valid: allErrors.filter((e) => e.severity === "error").length === 0,
      errors: allErrors,
    }
  }
}
