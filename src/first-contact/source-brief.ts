/** Agent-authored, source-pinned offers and provisional slice briefs.
 * Nothing in this module infers a conflict or authenticates a human response. */
import fs from "node:fs/promises"
import { constants } from "node:fs"
import path from "node:path"
import { createHash, randomUUID } from "node:crypto"

export interface FileCitation { kind?: "file"; path: string; line: number; quote: string; sha256: string }
export interface IntentCitation { kind: "operator-intent"; quote: string; sha256: string }
export type SourceCitation = FileCitation | IntentCitation
export interface SourceOption {
  id: string
  label: string
  tradeoff: string
  acceptanceExample: string
  source: SourceCitation
}
export interface SourceOffer {
  id: string
  journeyId: string
  version: number
  scope: string
  question: string
  options: SourceOption[]
  /** The exact operator request used for non-file citations, not an agent paraphrase. */
  originIntent?: string
  supersedesOfferId?: string
  offeredAt: string
  attribution: "agent-authored-offer"
}
export interface SourceAnswer {
  id: string
  offerId: string
  journeyId: string
  /** Agent/caller's proposed mapping, not an authenticated respondent choice. Absent means unresolved. */
  proposedSelection?: string
  response: string
  answeredAt: string
  attribution: "cli-response-unverified"
}
export interface WorkingBriefCommitment {
  scope: string
  question: string
  option: SourceOption
  version: number
  offerId: string
  answerId: string
  supersedesOfferId?: string
  status: "provisional-unverified"
  proposedSelection: string
  response: string
  acceptanceExample: string
  source: SourceCitation
  sourceFreshness: "current" | "stale" | "unavailable"
}

export interface WorkingBriefRevision {
  version: number
  offerId: string
  answerId?: string
  supersedesOfferId?: string
  supersededByOfferId?: string
  superseded: boolean
  scope: string
  question: string
  option: SourceOption | null
  commitment: { scope: string; question: string; option: SourceOption } | null
  status: "awaiting-response" | "provisional-unverified" | "deferred-unverified" | "unresolved-unverified"
  proposedSelection?: string
  response?: string
  acceptanceExample?: string
  source?: SourceCitation
  sourceFreshness: "current" | "stale" | "unavailable"
  offeredAt: string
  answeredAt?: string
}

function string(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 2000) throw new Error(`${label} must be nonempty text up to 2000 characters.`)
  return value // preserve the original wording; no paraphrase
}

async function regularWorkspaceFile(cwd: string, relative: string, maxBytes: number): Promise<string> {
  if (!relative || path.isAbsolute(relative) || relative.includes("\\") || relative.split("/").some((part) => !part || part === "." || part === "..") || relative.includes(":")) {
    throw new Error("Source paths must be workspace-relative files without traversal or symlinks.")
  }
  const root = await fs.realpath(cwd)
  const target = path.resolve(root, relative)
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error("Source path is outside the workspace.")
  let parentPath = root
  for (const part of relative.split("/").slice(0, -1)) {
    parentPath = path.join(parentPath, part)
    const stat = await fs.lstat(parentPath)
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Source parent must be a regular workspace directory, not a symlink.")
  }
  const parent = await fs.realpath(path.dirname(target))
  if (!parent.startsWith(`${root}${path.sep}`) && parent !== root) throw new Error("Source parent leaves the workspace.")
  const entry = await fs.lstat(target)
  if (!entry.isFile() || entry.isSymbolicLink()) throw new Error("Source must be a regular file, not a symlink.")
  const handle = await fs.open(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
  try {
    const stat = await handle.stat()
    if (!stat.isFile() || stat.size > maxBytes) throw new Error("Source must be a regular bounded file.")
    const bytes = await handle.readFile()
    if (bytes.length > maxBytes) throw new Error("Source changed while reading or exceeds the size limit.")
    if (bytes.includes(0)) throw new Error("Binary sources are not accepted for an offer.")
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } finally {
    await handle.close()
  }
}

async function citationFreshness(cwd: string, offer: SourceOffer, citation: SourceCitation): Promise<"current" | "stale" | "unavailable"> {
  if (citation.kind === "operator-intent") {
    if (!offer.originIntent || citation.quote !== offer.originIntent ||
        createHash("sha256").update(offer.originIntent).digest("hex") !== citation.sha256) return "stale"
    return "current"
  }
  try {
    const content = await regularWorkspaceFile(cwd, citation.path, 64 * 1024)
    if (createHash("sha256").update(content).digest("hex") !== citation.sha256 ||
        content.split(/\r?\n/)[citation.line - 1] !== citation.quote) return "stale"
    return "current"
  } catch {
    return "unavailable"
  }
}

export async function sourceFreshness(cwd: string, offer: SourceOffer): Promise<"current" | "stale" | "unavailable"> {
  let status: "current" | "stale" | "unavailable" = "current"
  for (const option of offer.options) {
    const check = await citationFreshness(cwd, offer, option.source)
    if (check === "unavailable") return "unavailable"
    if (check === "stale") status = "stale"
  }
  return status
}

export async function createSourceOffer(cwd: string, proposalFile: string, journeyId: string, earlier: SourceOffer[], originalIntent?: string): Promise<SourceOffer> {
  const proposal = JSON.parse(await regularWorkspaceFile(cwd, proposalFile, 16 * 1024)) as Record<string, unknown>
  if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) throw new Error("Offer file must contain an object.")
  const scope = string(proposal.scope, "scope")
  const question = string(proposal.question, "question")
  const prior = earlier.filter((item) => item.journeyId === journeyId)
  const sameScope = prior.filter((item) => item.scope === scope)
  const supersedesOfferId = proposal.supersedesOfferId
  if (sameScope.length && supersedesOfferId !== sameScope.at(-1)?.id) throw new Error("A revision must supersede the latest offer for the same scope in this journey.")
  if (!sameScope.length && supersedesOfferId !== undefined) {
    throw new Error(prior.length
      ? "A new scope must not set supersedesOfferId; omit supersedesOfferId when introducing a new scope."
      : "No earlier offer can be superseded in this journey.")
  }
  if (!Array.isArray(proposal.options) || proposal.options.length < 2 || proposal.options.length > 4) {
    throw new Error("A source offer needs two to four explicit options.")
  }
  const ids = new Set<string>()
  const options: SourceOption[] = []
  for (const raw of proposal.options as Array<Record<string, unknown>>) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Each option must be an object.")
    const id = string(raw.id, "option id")
    if (!/^[a-zA-Z0-9-]+$/.test(id) || id === "defer" || ids.has(id)) throw new Error("Option IDs must be unique, alphanumeric/hyphenated and not the reserved defer selection.")
    ids.add(id)
    const ref = raw.source as Record<string, unknown> | undefined
    if (!ref || typeof ref !== "object" || Array.isArray(ref)) throw new Error("Each option needs a source citation.")
    let source: SourceCitation
    if (ref.kind === "operator-intent") {
      const quote = string(ref.quote, "operator intent quote")
      if (!originalIntent || quote !== originalIntent || ref.path !== undefined || ref.line !== undefined) {
        throw new Error("An operator-intent citation must reproduce this journey's exact original request without inventing a file.")
      }
      source = { kind: "operator-intent", quote, sha256: createHash("sha256").update(originalIntent).digest("hex") }
    } else {
      if (ref.kind !== undefined && ref.kind !== "file") throw new Error("Unknown source citation kind.")
      const sourcePath = string(ref.path, "source path")
      if (!/^(?:(?:docs|knowledge)\/.+\.(?:md|mdx)|(?:src|tests)\/.+\.(?:js|jsx|ts|tsx|json)|package\.json)$/i.test(sourcePath)) {
        throw new Error("File citations accept Markdown under docs/ or knowledge/, source/tests code, or root package.json.")
      }
      const line = ref.line
      if (!Number.isSafeInteger(line) || (line as number) < 1) throw new Error("Citation line must be a positive integer.")
      const quote = string(ref.quote, "source quote")
      const content = await regularWorkspaceFile(cwd, sourcePath, 64 * 1024)
      if (content.split(/\r?\n/)[line as number - 1] !== quote) throw new Error(`Citation ${sourcePath}:${line} does not match the live source line.`)
      source = { path: sourcePath, line: line as number, quote, sha256: createHash("sha256").update(content).digest("hex") }
    }
    options.push({ id, label: string(raw.label, "label"), tradeoff: string(raw.tradeoff, "tradeoff"),
      acceptanceExample: string(raw.acceptanceExample, "acceptance example"), source })
  }
  return { id: `offer-${randomUUID()}`, journeyId, version: prior.length + 1, scope, question, options,
    ...(options.some(option => option.source.kind === "operator-intent") ? { originIntent: originalIntent } : {}),
    ...(typeof supersedesOfferId === "string" ? { supersedesOfferId } : {}),
    offeredAt: new Date().toISOString(), attribution: "agent-authored-offer" }
}

export function createSourceAnswer(offer: SourceOffer, selection: string | undefined, response: string, existing: SourceAnswer[]): SourceAnswer {
  if (existing.some((answer) => answer.offerId === offer.id)) throw new Error("This offer already has an answer; revise the offer instead of overwriting it.")
  if (selection !== undefined && selection !== "defer" && !offer.options.some((option) => option.id === selection)) {
    throw new Error("Selection must name a displayed option ID or defer; omit it when the supplied response is unresolved.")
  }
  return { id: `answer-${randomUUID()}`, offerId: offer.id, journeyId: offer.journeyId,
    ...(selection !== undefined ? { proposedSelection: selection } : {}),
    response: string(response, "supplied response"), answeredAt: new Date().toISOString(),
    attribution: "cli-response-unverified" }
}

export async function workingBrief(cwd: string, journeyId: string | undefined, offers: SourceOffer[], answers: SourceAnswer[]) {
  const journeyOffers = offers.filter((item) => item.journeyId === journeyId)
  if (!journeyOffers.length) return { status: "no-source-offer" as const, revisions: [] as WorkingBriefRevision[], commitments: [] as WorkingBriefCommitment[] }
  const supersededBy = new Map<string, string>()
  for (const item of journeyOffers) {
    if (item.supersedesOfferId) supersededBy.set(item.supersedesOfferId, item.id)
  }
  const revisions: WorkingBriefRevision[] = []
  for (const item of journeyOffers) {
    const answer = answers.find((entry) => entry.offerId === item.id)
    const option = answer?.proposedSelection === "defer" ? undefined : item.options.find((opt) => opt.id === answer?.proposedSelection)
    const status = !answer ? "awaiting-response" as const : answer.proposedSelection === "defer" ? "deferred-unverified" as const :
      option ? "provisional-unverified" as const : "unresolved-unverified" as const
    const freshness = option ? await citationFreshness(cwd, item, option.source) : await sourceFreshness(cwd, item)
    const supersededByOfferId = supersededBy.get(item.id)
    revisions.push({
      version: item.version,
      offerId: item.id,
      ...(answer?.id ? { answerId: answer.id } : {}),
      ...(item.supersedesOfferId ? { supersedesOfferId: item.supersedesOfferId } : {}),
      ...(supersededByOfferId ? { supersededByOfferId } : {}),
      superseded: Boolean(supersededByOfferId),
      scope: item.scope,
      question: item.question,
      option: option ?? null,
      commitment: option ? { scope: item.scope, question: item.question, option } : null,
      status,
      ...(answer?.proposedSelection !== undefined ? { proposedSelection: answer.proposedSelection } : {}),
      ...(answer?.response !== undefined ? { response: answer.response } : {}),
      ...(option?.acceptanceExample !== undefined ? { acceptanceExample: option.acceptanceExample } : {}),
      ...(option?.source !== undefined ? { source: option.source } : {}),
      sourceFreshness: freshness,
      offeredAt: item.offeredAt,
      ...(answer?.answeredAt !== undefined ? { answeredAt: answer.answeredAt } : {}),
    })
  }
  const commitments: WorkingBriefCommitment[] = revisions
    .filter((rev): rev is WorkingBriefRevision & { option: SourceOption; answerId: string; proposedSelection: string; response: string; acceptanceExample: string; source: SourceCitation; status: "provisional-unverified" } =>
      !rev.superseded && rev.status === "provisional-unverified" && rev.option !== null && typeof rev.answerId === "string")
    .map((rev) => ({
      scope: rev.scope,
      question: rev.question,
      option: rev.option,
      version: rev.version,
      offerId: rev.offerId,
      answerId: rev.answerId,
      ...(rev.supersedesOfferId ? { supersedesOfferId: rev.supersedesOfferId } : {}),
      status: "provisional-unverified" as const,
      proposedSelection: rev.proposedSelection,
      response: rev.response,
      acceptanceExample: rev.acceptanceExample,
      source: rev.source,
      sourceFreshness: rev.sourceFreshness,
    }))
  const latest = revisions.at(-1)!
  return {
    status: latest.status,
    version: latest.version,
    offerId: latest.offerId,
    answerId: latest.answerId,
    scope: latest.scope,
    question: latest.question,
    option: latest.option,
    proposedSelection: latest.proposedSelection,
    acceptanceExample: latest.acceptanceExample,
    source: latest.source,
    sourceFreshness: latest.sourceFreshness,
    commitments,
    revisions,
    note: "Agent-authored options and CLI-supplied responses are not authenticated human agreement. This is a scoped working-brief proposal, not an approved plan or check result.",
  }
}
