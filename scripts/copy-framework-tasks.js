#!/usr/bin/env node
// Copy by JSON identity, never by a platform-dependent filename prefix.
// npm run build runs tsc first, so this uses the same filename contract as CLI
// generation. Remove obsolete generated names on incremental builds, too.
import fs from "node:fs/promises"
import path from "node:path"
import { taskFileName, assertTask } from "../dist/task/task-schema.js"

const SOURCE_DIR = path.resolve("data", "tasks")
const DEST_DIR = path.resolve("dist", "tasks")
const isFrameworkTask = (id) => id.startsWith("onboarding:")

async function main() {
  const tasks = new Map()
  for (const file of await fs.readdir(SOURCE_DIR)) {
    if (!file.endsWith(".task.json")) continue
    const raw = await fs.readFile(path.join(SOURCE_DIR, file), "utf8")
    const task = assertTask(JSON.parse(raw))
    if (!isFrameworkTask(task.id)) continue
    const name = taskFileName(task.id)
    if (tasks.has(name)) throw new Error(`Duplicate framework task: ${task.id}`)
    tasks.set(name, raw)
  }
  if (tasks.size === 0) throw new Error("No framework onboarding tasks found")
  await fs.mkdir(DEST_DIR, { recursive: true })
  for (const file of await fs.readdir(DEST_DIR)) {
    if (!file.endsWith(".task.json") || tasks.has(file)) continue
    const old = JSON.parse(await fs.readFile(path.join(DEST_DIR, file), "utf8"))
    if (typeof old.id === "string" && isFrameworkTask(old.id)) await fs.unlink(path.join(DEST_DIR, file))
  }
  for (const [file, raw] of tasks) {
    await fs.writeFile(path.join(DEST_DIR, file), raw)
    console.log(`Copied framework task: ${file} → dist/tasks/${file}`)
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
