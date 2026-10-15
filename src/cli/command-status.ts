// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.


export async function cmdStatus() {
  // EXP-CLI-001: delegate to the single `status` implementation instead of
  // keeping a second copy. ./status-light.ts was a line-by-line duplicate of
  // this function minus its Logger, and the two had already drifted: the copy
  // emitted an INFO line on stderr that the light path did not.
  //
  // Operator decision 2026-10-13: drop that line from both paths. `status` is a
  // pure read (EXP-AI-003 superseded, ADR-055 §2.8) and the line carried no
  // information a caller could act on. Use `synth ai refresh` for explicit
  // regeneration of .synth/ai/.
  //
  // Loaded lazily so the heavy graph does not grow; human/summary/quiet modes
  // are already set by main() before dispatch, and printJson inside runStatus
  // honours them — which is how `status --human` renders prose on both paths.
  const { runStatus } = await import("./status-light.js")
  await runStatus()
}
