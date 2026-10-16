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
  proposedSelection: string
  response: string
  answeredAt: string
  attribution: "cli-response-unverified"
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

export async function sourceFreshness(cwd: string, offer: SourceOffer): Promise<"current" | "stale" | "unavailable"> {
  let status: "current" | "stale" | "unavailable" = "current"
  for (const option of offer.options) {
    if (option.source.kind === "operator-intent") {
      if (!offer.originIntent || option.source.quote !== offer.originIntent ||
          createHash("sha256").update(offer.originIntent).digest("hex") !== option.source.sha256) status = "stale"
      continue
    }
    try {
      const content = await regularWorkspaceFile(cwd, option.source.path, 64 * 1024)
      if (createHash("sha256").update(content).digest("hex") !== option.source.sha256 ||
          content.split(/\r?\n/)[option.source.line - 1] !== option.source.quote) status = "stale"
    } catch {
      return "unavailable"
    }
  }
  return status
}

export async function createSourceOffer(cwd: string, proposalFile: string, journeyId: string, earlier: SourceOffer[], originalIntent?: string): Promise<SourceOffer> {
  const proposal = JSON.parse(await regularWorkspaceFile(cwd, proposalFile, 16 * 1024)) as Record<string, unknown>
  if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) throw new Error("Offer file must contain an object.")
  const scope = string(proposal.scope, "scope")
  const question = string(proposal.question, "question")
  const prior = earlier.filter((item) => item.journeyId === journeyId)
  const supersedesOfferId = proposal.supersedesOfferId
  if (prior.length && supersedesOfferId !== prior.at(-1)?.id) throw new Error("A revision must supersede the latest offer for this journey.")
  if (!prior.length && supersedesOfferId !== undefined) throw new Error("No earlier offer can be superseded in this journey.")
  if (!Array.isArray(proposal.options) || proposal.options.length < 2 || proposal.options.length > 4) {
    throw new Error("A source offer needs two to four explicit options.")
  }
  const ids = new Set<string>()
  const options: SourceOption[] = []
  for (const raw of proposal.options as Array<Record<string, unknown>>) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Each option must be an object.")
    const id = string(raw.id, "option id")
    if (!/^[a-zA-Z0-9-]+$/.test(id) || ids.has(id)) throw new Error("Option IDs must be unique and alphanumeric/hyphenated.")
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

export function createSourceAnswer(offer: SourceOffer, selection: string, response: string, existing: SourceAnswer[]): SourceAnswer {
  if (existing.some((answer) => answer.offerId === offer.id)) throw new Error("This offer already has an answer; revise the offer instead of overwriting it.")
  if (selection !== "defer" && !offer.options.some((option) => option.id === selection)) throw new Error("Selection must name a displayed option ID or defer.")
  return { id: `answer-${randomUUID()}`, offerId: offer.id, journeyId: offer.journeyId,
    proposedSelection: selection, response: string(response, "supplied response"), answeredAt: new Date().toISOString(),
    attribution: "cli-response-unverified" }
}

export async function workingBrief(cwd: string, journeyId: string | undefined, offers: SourceOffer[], answers: SourceAnswer[]) {
  const offer = offers.filter((item) => item.journeyId === journeyId).at(-1)
  if (!offer) return { status: "no-source-offer" as const }
  const answer = answers.find((item) => item.offerId === offer.id)
  const option = offer.options.find((item) => item.id === answer?.proposedSelection)
  return {
    status: !answer ? "awaiting-response" as const : option ? "provisional-unverified" as const : "deferred-unverified" as const,
    version: offer.version, offerId: offer.id, answerId: answer?.id,
    scope: offer.scope, question: offer.question, proposedSelection: answer?.proposedSelection,
    acceptanceExample: option?.acceptanceExample, source: option?.source,
    sourceFreshness: await sourceFreshness(cwd, offer),
    note: "Agent-authored options and CLI-supplied responses are not authenticated human agreement. This is a scoped working-brief proposal, not an approved plan or check result.",
  }
}
