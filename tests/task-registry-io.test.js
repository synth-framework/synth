import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { loadTaskRegistry } from "../dist/task/task-registry.js"

const task = (id, description) => ({ id, description, command: 'echo ok', group: 'runtime', dependsOn: [], tags: [], estimatedDurationMs: 1, capabilities: [] })
async function fixture(body) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'registry-io-'))
  try { await body(root) } finally { await fs.rm(root, { recursive: true, force: true }) }
}

test('task reads preserve directory/file override order and do not cache definitions', () => fixture(async (root) => {
  const framework = path.join(root, 'framework'), project = path.join(root, 'project')
  await fs.mkdir(framework); await fs.mkdir(project)
  await fs.writeFile(path.join(framework, 'a.task.json'), JSON.stringify(task('example:check', 'framework')))
  await fs.writeFile(path.join(project, 'a.task.json'), JSON.stringify(task('example:check', 'project first')))
  const last = path.join(project, 'z.task.json')
  await fs.writeFile(last, JSON.stringify(task('example:check', 'project last')))
  const load = () => loadTaskRegistry({ frameworkDirs: [framework], dirs: [project] })
  assert.equal((await load()).tasks.get('example:check').description, 'project last')
  await fs.writeFile(last, JSON.stringify(task('example:check', 'updated')))
  assert.equal((await load()).tasks.get('example:check').description, 'updated')
}))

test('an earlier JSON failure wins over a later I/O failure', () => fixture(async (root) => {
  await fs.writeFile(path.join(root, 'a.task.json'), '{invalid')
  await fs.mkdir(path.join(root, 'z.task.json'))
  await assert.rejects(loadTaskRegistry({ frameworkDirs: [], dirs: [root] }), /Invalid JSON.*a\.task\.json/)
}))

test('unreadable task entries and unknown dependencies still reject', () => fixture(async (root) => {
  const file = path.join(root, 'a.task.json')
  await fs.mkdir(file)
  await assert.rejects(loadTaskRegistry({ frameworkDirs: [], dirs: [root] }))
  await fs.rmdir(file)
  await fs.writeFile(file, JSON.stringify({ ...task('a', 'dependency failure'), dependsOn: ['missing'] }))
  await assert.rejects(loadTaskRegistry({ frameworkDirs: [], dirs: [root] }), /unknown task "missing"/)
}))
