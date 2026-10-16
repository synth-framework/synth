import type { AgentChoice, ChoiceReview } from "../extract/types.js"

const START = "<!-- synth:agent-choices:start -->"
const END = "<!-- synth:agent-choices:end -->"

// Display only the selected choice fields, not source excerpts, the original
// request, or the unverified raw human-response text.
function text(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/[\\`*_\[\]]/g, "\\$&").replace(/\r?\n|\r/g, " ").trim()
}

export function choiceDescription(choices: AgentChoice[], reviews: ChoiceReview[], head?: string): string {
  const latest = new Map(reviews.map((review) => [review.choiceId, review]))
  const lines = [
    START,
    "## Open agent choices (review aid)",
    "Agent-authored proposals, not human approval. Assess consequential choices in the ordinary PR review before merge.",
    head ? `PR head when prepared: \`${head}\`. Later commits may need renewed review.` : "PR head not verified (preview only).",
  ]
  for (const choice of choices) {
    const review = latest.get(choice.id)
    lines.push("", `### \`${choice.id}\``, `- Agent chose: ${text(choice.choice)}`,
      `- Scope: ${text(choice.scope)}`, `- Why: ${text(choice.reason)}`)
    if (choice.alternatives?.length) lines.push(`- Alternatives: ${choice.alternatives.map(text).join("; ")}`)
    if (!review) lines.push("- Impact: unassessed; assessment needed.")
    else if (review.impact === "trivial") lines.push(`- Impact: trivial (caller-assessed; not a human choice). Why: ${text(review.reason)}`)
    else {
      lines.push(`- Impact: material. Why: ${text(review.reason)}`)
      lines.push(review.disposition === "awaiting-human"
        ? "- Decision: **awaiting a reviewer**."
        : `- CLI-supplied ${review.disposition} response: **unverified**; awaiting a reviewer.`)
      lines.push(`- To respond, include \`SYNTH choice ${choice.id}: keep\`, \`SYNTH choice ${choice.id}: change\`, or \`SYNTH choice ${choice.id}: defer\` in your own PR review, with a reason.`)
    }
  }
  lines.push("", "A generic PR approval is not a decision on any listed choice. PR description text is editable and cannot prove what a reviewer saw.", END)
  return lines.join("\n")
}

/** Replace only our managed section; reject damaged/duplicated markers. */
export function mergeChoiceDescription(body: string, section: string): string {
  const starts = body.split(START).length - 1
  const ends = body.split(END).length - 1
  if (starts !== ends || starts > 1) throw new Error("PR description has incomplete or duplicate agent-choice markers; no update made.")
  if (!starts) return body ? `${body}${body.endsWith("\n") ? "\n" : "\n\n"}${section}` : section
  const start = body.indexOf(START)
  const end = body.indexOf(END)
  if (end < start) throw new Error("PR description has out-of-order agent-choice markers; no update made.")
  return body.slice(0, start) + section + body.slice(end + END.length)
}
