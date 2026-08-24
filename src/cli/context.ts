// SYNTH-CONTEXT-001: single source of truth for context inference.
//
// Resolves missing CLI identifiers (mission / draft / alignment-contract) from
// authoritative governance state instead of forcing explicit flags. This is the
// only place context inference lives; per-command ad-hoc inference is forbidden
// (see preparation plan for Expedition 68b59f0e).
//
// Precedence: explicit flag > executing-expedition / active-mission (derived
// from the current branch) > error with suggestion.
//
// Inference is disabled when SYNTH_STRICT_CONTEXT=1 so CI / automation must pass
// explicit identifiers and cannot silently target the wrong entity.

export function isStrictContext(): boolean {
  const v = process.env.SYNTH_STRICT_CONTEXT
  return v === "1" || v === "true" || v === "yes"
}

export function echoResolution(label: string, id: string, source: string): void {
  console.log(`[context] Using ${label} ${id} (inferred from ${source})`)
}

interface ExpeditionLike {
  id: string
  status: string
  missionId?: string
}
interface MissionLike {
  id: string
  status: string
  name?: string
}
interface AlignmentContractLike {
  id: string
  status: string
  intentSummary?: string
}

export function resolveInferredMissionId(state: {
  expeditions?: Record<string, ExpeditionLike>
  missions?: Record<string, MissionLike>
}): string | undefined {
  const ex = Object.values(state.expeditions ?? {}).find((e) => e.status === "executing")
  if (ex?.missionId) return ex.missionId
  const m = Object.values(state.missions ?? {}).find(
    (m) => m.status === "active" || m.status === "executing",
  )
  return m?.id
}

export function resolveInferredDraftId(
  state: { expeditions?: Record<string, ExpeditionLike> },
  missionId?: string,
): string | undefined {
  const drafts = Object.values(state.expeditions ?? {}).filter((e) => e.status === "draft")
  const scoped = missionId ? drafts.filter((e) => e.missionId === missionId) : drafts
  if (scoped.length === 1) return scoped[0].id
  return undefined
}

export function resolveInferredAlignmentContractId(derived: {
  alignmentContracts?: Record<string, AlignmentContractLike>
}): string | undefined {
  const approved = Object.values(derived.alignmentContracts ?? {}).filter(
    (c) => c.status === "approved",
  )
  if (approved.length >= 1) return approved[approved.length - 1].id
  return undefined
}
