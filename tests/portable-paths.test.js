import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { execFileSync, spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { portablePathProblems } from "../scripts/lib/portable-paths.js"
import { taskFileName } from "../dist/task/task-schema.js"
import { loadTaskRegistry } from "../dist/task/task-registry.js"

const ROOT = fileURLToPath(new URL("../", import.meta.url))
const CLI = path.join(ROOT, "dist/cli/entry.js")
function invoke(args, cwd) {
  const r = spawnSync(process.execPath, [CLI, ...args, "--json"], { cwd, encoding: "utf8", timeout: 30000 })
  assert.ifError(r.error)
  assert.equal(r.status, 0, `${args.join(" ")}: ${r.stdout}\n${r.stderr}`)
  return JSON.parse(r.stdout)
}

test("forbidden-name and collision fixtures fail without creating uncheckoutable files", () => {
  for (const name of ['tasks/test:all.json', 'aux.txt', 'CON', 'conin$.txt', 'LPT¹.log', 'a/trailing.', 'a/trailing ', 'a/quo"te', 'a/back\\slash', 'a/line\nfeed', 'a/<bad>', 'a/q?', 'a/star*', 'a/pipe|']) {
    assert.ok(portablePathProblems([name]).length, name)
  }
  assert.ok(portablePathProblems(['src/Task.js', 'src/task.js']).length)
  assert.ok(portablePathProblems(['Data/a.json', 'data/b.json']).length, 'directory components collide too')
  assert.deepEqual(portablePathProblems(['tasks/test%3Aall.task.json', 'tasks/onboarding%3Ainit.task.json']), [])
})

test("filename encoding keeps IDs distinct on case-insensitive filesystems and blocks path escape", () => {
  const ids = ['test:all', 'test-all', 'test%3Aall', 'Test:all', 'test/all', 'test\\all', 'con', 'CON', 'con.txt', 'aux', 'nul', 'com1', 'lpt9', '../outside', '.', '..', 'tail.', 'tail ', 'é', 'É', 'a|b', 'a?b', 'a*b', 'a\u0000b']
  const files = ids.map(taskFileName)
  assert.equal(new Set(files.map((f) => f.toLowerCase())).size, ids.length)
  assert.deepEqual(portablePathProblems(files), [])
  assert.equal(taskFileName('test:all'), 'test%3Aall.task.json')
  assert.equal(taskFileName('build'), 'build.task.json')
  assert.throws(() => taskFileName(''), /empty/)
  assert.throws(() => taskFileName('a'.repeat(256)), /255/)
})

test("tracked paths and shipped framework tasks are Windows-name safe", async () => {
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean)
  assert.deepEqual(portablePathProblems(tracked), [])
  const tasksDir = path.join(ROOT, 'data/tasks')
  const frameworkDir = path.join(ROOT, 'dist/tasks')
  const packaged = fs.readdirSync(frameworkDir)
  assert.deepEqual(portablePathProblems(packaged), [])
  for (const file of fs.readdirSync(tasksDir).filter((f) => f.endsWith('.task.json'))) {
    const raw = fs.readFileSync(path.join(tasksDir, file), 'utf8')
    const task = JSON.parse(raw)
    assert.equal(file, taskFileName(task.id))
    if (task.id.startsWith('onboarding:')) assert.equal(fs.readFileSync(path.join(frameworkDir, file), 'utf8'), raw)
  }
  const registry = await loadTaskRegistry({ dirs: [tasksDir], frameworkDirs: [frameworkDir] })
  assert.ok(registry.tasks.has('test:all'))
  assert.ok(registry.tasks.has('onboarding:init'))
  const plan = invoke(['task', 'run', 'test:portable-paths', '--dry-run'], ROOT)
  assert.equal(plan.status, 'ok')
})

test("CLI generates, discovers, overwrites and runs a namespaced ID using a portable filename", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'synth-portable-task-'))
  try {
    const id = 'example:check'
    const command = 'node -e "process.exit(0)"'
    const generated = invoke(['task', 'generate', id, '--group', 'runtime', '--command', command], root)
    assert.equal(generated.filePath.split(path.sep).join('/'), `data/tasks/${taskFileName(id)}`)
    assert.equal(JSON.parse(fs.readFileSync(path.join(root, generated.filePath))).id, id)
    invoke(['task', 'run', id], root)
    invoke(['task', 'generate', id, '--group', 'runtime', '--command', command, '--force'], root)
    assert.equal(fs.readdirSync(path.join(root, 'data/tasks')).length, 1)
    for (const weird of ['con', 'CON', 'nested/../outside', 'test%3Aall']) invoke(['task', 'generate', weird, '--group', 'runtime', '--command', command], root)
    assert.deepEqual(portablePathProblems(fs.readdirSync(path.join(root, 'data/tasks'))), [])
    assert.ok(!fs.existsSync(path.join(root, 'data/outside.task.json')))
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test("npm migration generator uses the same encoding and preserves existing definitions", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'synth-portable-migrate-'))
  try {
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts: { 'example:check': 'echo ok', 'example-check': 'echo other', 'CON': 'echo device' } }))
    const run = () => JSON.parse(execFileSync(process.execPath, [path.join(ROOT, 'scripts/generate-npm-task-migration.js')], { cwd: root, encoding: 'utf8' }))
    assert.equal(run().generated.length, 3)
    const files = fs.readdirSync(path.join(root, 'data/tasks'))
    assert.deepEqual(portablePathProblems(files), [])
    assert.ok(files.includes(taskFileName('example:check')))
    assert.equal(run().skipped.length, 3)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})
