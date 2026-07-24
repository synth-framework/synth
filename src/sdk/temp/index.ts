// ============================================================
// SDK: Temporary Filesystem
// ============================================================
// Canonical temporary directory and file creation. Replaces ad-hoc
// `os.tmpdir()` / `fs.mkdtemp` constructions.
// ============================================================

import os from "node:os"
import path from "node:path"
import { mkdtemp } from "node:fs/promises"

export async function directory(prefix = "synth-"): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), prefix))
}

export async function file(prefix = "synth-"): Promise<string> {
  const dir = await directory(prefix)
  return path.join(dir, "file")
}
