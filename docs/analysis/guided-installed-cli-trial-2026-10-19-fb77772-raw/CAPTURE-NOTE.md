# VERIFICATION CAPTURE — reviewer-requested items

Covers all three tests and the session-level data. Items the requested source documents/sections actually contain are confirmed verbatim from this session's records. Items whose referents do not exist in this working environment exist in your capture document are flagged — please verify the source before treating these as confirmable.

---

## §4 greenfield

**Quoted command list & exit codes — CONFIRMED (as seen):**

| Command | Exit code | Note |
| --- | --- | --- |
| `synth --version` (PATH) | FAIL | CommandNotFoundException — synth not on PATH |
| `synth.cmd --version` (absolute path) | 0 | {status ok, version 2.6.1} |
| `synth first-contact --dry-run` | 0 | detected "empty"; "Dry-run: no files were written" |
| `synth first-contact start "<task text>"` | 0 | draft created, confidence 0.25 |
| `synth first-contact status` | 0 | pre-offer |
| `synth first-contact clarify --source-offer offer.json` | 0 | offer offer-620a6956-…, awaiting-response |
| `synth first-contact status` | 0 | final: awaiting-response |

**Terminal state: PASS.**
Reason: every command in the prescribed §2 sequence completed successfully, the offer was recorded, and the final CLI status was `awaiting-response` with no refusals, errors, or contradictions.

---

## §4 brownfield

**Quoted command list & exit codes — CONFIRMED (as seen):**

| Command | Exit code | Note |
| --- | --- | --- |
| `synth --version` (PATH) | FAIL | not on PATH (same as greenfield) |
| `synth first-contact --dry-run` | 0 | detected "brownfield"; suggested `bootstrap --approve` (NOT run — forbidden lifecycle action) |
| `npm test` (BEFORE any change) | 0 | tests 1, pass 1, fail 0 — "existing label" (first execution; re-run captured for the explicit exit code: `EXIT:0`) |
| `synth first-contact start "<task text>"` | 0 | draft created, confidence 0.083 |
| `synth first-contact status` | 0 | pre-offer |
| `synth first-contact clarify --source-offer offer.json` | 0 | offer offer-4a04f238-…, awaiting-response |
| `synth first-contact status` | 0 | final: awaiting-response |

**Terminal state: PASS.**
Reason: all instructions executed successfully, the offer was recorded with file-line citations that matched the on-disk content, `npm test` was executed before any change with exit 0, no change was attempted (the fill-semantics decision awaits a respondent), and no forbidden action was taken.

---

## §4 documentation

**Quoted command list & exit codes — CONFIRMED (as seen):**

| Command | Exit code | Note |
| --- | --- | --- |
| `synth --version` (PATH) | FAIL | not on PATH (same as greenfield) |
| `synth first-contact --dry-run` | 0 | detected "brownfield" (docs/ present); same `bootstrap --approve` suggestion (NOT run, recorded) |
| `synth first-contact start "<task text>"` | 0 | draft created, confidence 0.083 |
| `synth first-contact status` | 0 | pre-offer |
| (typo correction to `offer.json` made via editor before clarify — no shell command) | n/a | "alreadu" → "already" |
| `synth first-contact clarify --source-offer offer.json` | 0 | offer offer-4e174e03-…, awaiting-response |
| `synth first-contact status` | 0 | final: awaiting-response |

**Terminal state: PASS.**
Reason: every command in the sequence succeeded, both requirement lines were cited and matched the on-disk content, the offer recorded the unresolved decision rather than silently resolving it, and the final status was `awaiting-response`. One observation (not a failure): the CLI emitted an identical sha256 across citations of two different source lines.

---

## §1 — session/environment data (CONFIRMED where such fields exist for this working environment)

| Field | Value | Source |
| --- | --- | --- |
| Operator name | **Not captured** — the session's human owner is an account on `C:\Users\j`; no named operator is provided anywhere in this working environment. I will not invent a name. | — |
| Agent model/version | **CONFIRMED**: opencode, powered by GLM — model `opencode/glm-5.3-flash-free` (GLM-5.3-Flash Free). No further version string is exposed. | Transcribed from session records |
| Tool access (as granted to this agent in this session) | Shell (PowerShell 5.1 via bash tool), file read/write/edit tools, glob/grep search tools. No web access, no git operations performed. | Transcript |
| Local timezone | UTC-07:00 (observed offsets: local `02:40 (-07:00)` vs CLI JSON `09:40Z` — PowerShell default time shows `-07:00`) | Session records |
| Wall-clock start | approximately 02:40–02:49 local / 09:40–09:49 UTC (2026-10-19). Estimated from the session command order; the first CLI-related record is at the greenfield test ~09:50Z. | Session records |
| Wall-clock end | 02:50 local / 09:50 UTC, 2026-10-19 (the final timestamp available on record for this transcript; final local clock reading available at save is the session recording) | Session records |
| Time box | **Not specified** in any trial material I saw. Not captured. | — |

---

## §0 — "Met?" column for the eleven independence items

**Not found in this working environment.** No document seen by this session (INSTRUCTIONS.md is 6 numbered sections and ends at §6 "How to report when you stop"; ENVIRONMENT.md is a generated paths/identity file) contains §0, an independence-items table, or a "Met?" column, and no document in the workspace defines "eleven independence items". I cannot confirm or capture these rows without the source, and inventing eleven compliance rows would violate the trial's honesty rules. **Please supply the §0 source document** and I will verify each item against the session record.

---

## §5 — every comparative reading

**Not found in this working environment.** INSTRUCTIONS.md §5 is titled "Rules that protect the trial's honesty" (bullet rules: no invented people, no lifecycle actions, no publishing, no weakening results, stop rather than guessing, stay in the directory). It contains no comparative-reading subsection. If you mean a different §5 (perhaps from a reviewer worksheet not present in this workspace), please provide it; I can then enumerate the readings against the actual session record.

---

## §7 — recommendation for ordinary PR #347 review

**Not found in this working environment.** No §7 exists in any document I read (INSTRUCTIONS.md ends at §6), and no PR #347 was referenced or encountered: the workspace is not a git repository; the SYNTH CLI's reviewPacket outputs for all three tests reported `"pr": {"status": "not-requested"}` and `"githubReviews": {"status": "not-requested"}`. No pull request exists against which to give a recommendation, and giving one for a PR I cannot see would be fabricated. **Please provide a pointer to PR #347** (repo/URL or local checkout) if a recommendation text is desired.

---

## Where to verify each confirmed item

- greenfield / brownfield / documentation command tables: per-test `REPORT.md` "COMMANDS" sections + `SESSION-TRANSCRIPT.md` "Commands executed, in order".
- Session data: `SESSION-TRANSCRIPT.md` "Environment details" table.
- §0/§5/§7: currently unresolvable from workspace content — awaiting the referenced source documents from the reviewer.
