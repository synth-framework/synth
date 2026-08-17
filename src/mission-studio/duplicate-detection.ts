// ============================================================
// MISSION STUDIO: Duplicate-Aware Creation (EXP-DUP-001)
// ============================================================
// Deterministic duplicate / similarity detection for mission and
// expedition create commands. Purely lexical: no ML, no LLM, no
// runtime dependencies. Existing records always compare from
// their text (name/purpose/goal) on the fly, so retroactive
// coverage requires no stored metadata or migration.
// ============================================================

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "for", "to", "in", "on",
  "with", "from", "this", "that", "these", "those", "as", "at",
  "by", "be", "is", "are", "was", "were", "it", "its", "our",
  "your", "their", "them", "we", "you", "they", "he", "she",
  "not", "but", "so", "if", "then", "than", "too", "very", "just",
  "into", "upon", "all",
])

const TEXT_WEIGHT = 1
const SCOPE_WEIGHT = 2
const INTENT_WEIGHT = 3

/** Default similarity threshold above which a record is reported. */
export const SIMILARITY_THRESHOLD = 0.35

/** Default number of similar records surfaced. */
export const SIMILARITY_TOP_K = 5

/**
 * Lexically tokenize text into a normalized, deduplicated token list.
 * Lowercases, splits camelCase and non-word boundaries, drops
 * stopwords, and keeps tokens of length >= 3.
 */
export function tokenize(text: string): string[] {
  const normal = String(text ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
  return Array.from(new Set(normal))
}

export type WeightedTokenInput = {
  text: string
  scopeTokens?: string[]
  intentTokens?: string[]
}

/**
 * Build a weighted token bag: text tokens weigh 1, scope tokens 2,
 * intent tokens 3. When a token appears in multiple sources the
 * highest weight wins.
 */
export function buildWeightedTokens(input: WeightedTokenInput): Map<string, number> {
  const bag = new Map<string, number>()
  const add = (tokens: string[], weight: number) => {
    for (const token of tokens) {
      const prev = bag.get(token) ?? 0
      if (weight > prev) bag.set(token, weight)
    }
  }
  add(tokenize(input.text), TEXT_WEIGHT)
  add(tokenize((input.scopeTokens ?? []).join(" ")), SCOPE_WEIGHT)
  add(tokenize((input.intentTokens ?? []).join(" ")), INTENT_WEIGHT)
  return bag
}

/**
 * Weighted Jaccard similarity between two token bags.
 * Returns a value in [0, 1]: 1 when bags are identical, 0 when disjoint.
 */
export function scoreWeightedJaccard(a: Map<string, number>, b: Map<string, number>): number {
  const keys = new Set([...a.keys(), ...b.keys()])
  let inter = 0
  let union = 0
  for (const key of keys) {
    const wa = a.get(key) ?? 0
    const wb = b.get(key) ?? 0
    inter += Math.min(wa, wb)
    union += Math.max(wa, wb)
  }
  return union === 0 ? 0 : inter / union
}

export type SimilarityCandidate = {
  subject: string
  purpose?: string
  goal?: string
  scopeTokens?: string[]
  intentTokens?: string[]
}

export type ComparableRecord = {
  id: string
  name: string
  purpose?: string
  goal?: string
  scopeTokens?: string[]
  intentTokens?: string[]
}

export type SimilarMatch = {
  id: string
  name: string
  kind: "mission" | "expedition"
  score: number
  overlap: string[]
}

function recordBag(record: ComparableRecord): Map<string, number> {
  return buildWeightedTokens({
    text: `${record.name} ${record.purpose ?? ""} ${record.goal ?? ""}`.trim(),
    scopeTokens: record.scopeTokens,
    intentTokens: record.intentTokens,
  })
}

function rankSimilar(
  candidate: SimilarityCandidate,
  records: ComparableRecord[],
  kind: "mission" | "expedition",
): SimilarMatch[] {
  const candidateBag = buildWeightedTokens({
    text: `${candidate.subject} ${candidate.purpose ?? ""} ${candidate.goal ?? ""}`.trim(),
    scopeTokens: candidate.scopeTokens,
    intentTokens: candidate.intentTokens,
  })
  const matches = records
    .map((record) => {
      const bag = recordBag(record)
      const overlap = Array.from(candidateBag.keys()).filter((t) => bag.has(t))
      return {
        id: record.id,
        name: record.name,
        kind,
        score: scoreWeightedJaccard(candidateBag, bag),
        overlap,
      }
    })
    .filter((m) => m.score >= SIMILARITY_THRESHOLD)
    .sort((x, y) => y.score - x.score)
    .slice(0, SIMILARITY_TOP_K)
  return matches
}

/** Find missions similar to a candidate mission. */
export function findSimilarMissions(
  candidate: SimilarityCandidate,
  missions: ComparableRecord[],
): SimilarMatch[] {
  return rankSimilar(candidate, missions, "mission")
}

/** Find expeditions similar to a candidate expedition. */
export function findSimilarExpeditions(
  candidate: SimilarityCandidate,
  expeditions: ComparableRecord[],
): SimilarMatch[] {
  return rankSimilar(candidate, expeditions, "expedition")
}