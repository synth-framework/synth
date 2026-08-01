#!/usr/bin/env node
// ============================================================
// FRAMEWORK TASKS COPY SCRIPT
// ============================================================
// Copies framework-owned task definitions into dist/tasks/ so the
// compiled CLI can discover them from the installation directory.
// Run automatically after tsc as part of npm run build.
// ============================================================

import fs from "fs/promises"
import path from "path"

const SOURCE_DIR = path.resolve(process.cwd(), "data", "tasks")
const DEST_DIR = path.resolve(process.cwd(), "dist", "tasks")

const FRAMEWORK_TASK_PREFIXES = ["onboarding:"]

async function copyFile(src, dest) {
  const content = await fs.readFile(src, "utf-8")
  await fs.mkdir(path.dirname(dest), { recursive: true })
  await fs.writeFile(dest, content, "utf-8")
}

async function main() {
  let entries
  try {
    entries = await fs.readdir(SOURCE_DIR)
  } catch {
    console.log("No source tasks directory; skipping framework task copy.")
    return
  }

  const frameworkTasks = entries.filter((entry) =>
    FRAMEWORK_TASK_PREFIXES.some((prefix) => entry.startsWith(prefix) && entry.endsWith(".task.json"))
  )

  if (frameworkTasks.length === 0) {
    console.log("No framework tasks to copy.")
    return
  }

  for (const task of frameworkTasks) {
    const src = path.join(SOURCE_DIR, task)
    const dest = path.join(DEST_DIR, task)
    await copyFile(src, dest)
    console.log(`Copied framework task: ${task} → dist/tasks/${task}`)
  }
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
