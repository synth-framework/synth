// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import { resolveGovernanceContext, isGovernanceResolutionFailure } from "../runtime/governance-resolver.js"
import { loadGovernanceInventory } from "../governance/inventory.js"


export const PROGRAM_INFERENCE_STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "into", "over", "under", "through", "before", "after", "above", "below", "between", "among", "within", "without", "during", "while", "about", "against", "around", "behind", "beyond", "except", "inside", "outside", "until", "upon", "toward", "towards", "across", "along", "beside", "beyond", "concerning", "despite", "following", "including", "regarding", "regardless", "since", "throughout", "unless", "whether", "which", "their", "there", "where", "when", "what", "who", "how", "why", "will", "would", "could", "should", "may", "might", "must", "shall", "can", "cannot", "has", "have", "had", "was", "were", "been", "being", "are", "is", "am", "do", "does", "did", "done", "get", "gets", "got", "make", "makes", "made", "take", "takes", "took", "come", "comes", "came", "use", "uses", "used", "using", "need", "needs", "needed", "want", "wants", "wanted", "like", "likes", "liked", "work", "works", "worked", "working",
])


export function extractMeaningfulTokens(text: string): string[] {
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ")
  return normalized
    .split(/\s+/)
    .map((t) => t.replace(/s$/, ""))
    .filter((t) => t.length >= 4 && !PROGRAM_INFERENCE_STOP_WORDS.has(t))
}


export function scoreProgramMatch(
  missionTokens: Set<string>,
  programName: string,
  programExpeditionNames: string[],
): number {
  let score = 0
  for (const token of extractMeaningfulTokens(programName)) {
    if (missionTokens.has(token)) score += 3
  }
  for (const name of programExpeditionNames) {
    for (const token of extractMeaningfulTokens(name)) {
      if (missionTokens.has(token)) score += 1
    }
  }
  return score
}


// Infer a mission's owning program from its expeditions' charter records.
// If all charter-backed expeditions under the mission belong to the same program,
// return that program. Otherwise, fall back to a keyword match against program
// names and their charter expedition names so CLI-created missions without
// charters still surface a plausible program.
export async function inferMissionProgram(
  charterDir: string,
  missionId: string,
  resolved: Awaited<ReturnType<typeof resolveGovernanceContext>>,
): Promise<{ id: string; name: string } | undefined> {
  if (isGovernanceResolutionFailure(resolved)) return undefined
  const inventory = await loadGovernanceInventory(charterDir)
  const missionExpeditions = Object.values(resolved.authoritative.replayedState.expeditions).filter(
    (e) => e.missionId === missionId,
  )

  const expeditionPrograms = missionExpeditions
    .map((e) => {
      const charter = inventory.expeditions.find((ce) => ce.id === e.id)
      return charter?.program
    })
    .filter((program): program is string => Boolean(program))

  const distinct = Array.from(new Set(expeditionPrograms))
  if (distinct.length === 1) {
    const program = inventory.programs.find((p) => p.id === distinct[0])
    return program ? { id: program.id, name: program.name } : { id: distinct[0], name: distinct[0] }
  }

  const mission = resolved.authoritative.replayedState.missions[missionId]
  if (!mission) return undefined
  const missionText = [mission.name, mission.purpose, ...missionExpeditions.map((e) => e.name), ...missionExpeditions.map((e) => e.goal)].join(" ")
  const missionTokens = new Set(extractMeaningfulTokens(missionText))
  if (missionTokens.size === 0) return undefined

  const programExpeditionsMap = new Map<string, string[]>()
  for (const p of inventory.programs) {
    programExpeditionsMap.set(p.id, inventory.expeditions.filter((e) => e.program === p.id).map((e) => e.name))
  }

  let bestProgram: { id: string; name: string } | undefined
  let bestScore = 0
  for (const program of inventory.programs) {
    const score = scoreProgramMatch(missionTokens, program.name, programExpeditionsMap.get(program.id) || [])
    if (score > bestScore) {
      bestScore = score
      bestProgram = { id: program.id, name: program.name }
    }
  }

  // Require a minimum signal to avoid spurious matches.
  if (bestScore >= 4) {
    return bestProgram
  }
  return undefined
}
