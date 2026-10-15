import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createStore } from '../src/todos.js'

function withFile(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-e2e-'))
  try { return fn(path.join(dir, 'state.json')) }
  finally { fs.rmSync(dir, { recursive: true, force: true }) }
}

function cli(file, ...args) {
  const p = spawnSync(process.execPath, [new URL('../src/cli.js', import.meta.url).pathname, ...args], {
    encoding: 'utf8', env: { ...process.env, TODO_DATA_FILE: file },
  })
  return { code: p.status, out: p.stdout.trim(), err: p.stderr.trim() }
}

test('offline CRUD persists across independent CLI processes; IDs are never reused', () => withFile(file => {
  let result = cli(file, 'add', 'Buy milk')
  assert.equal(result.code, 0)
  assert.deepEqual(JSON.parse(result.out), { id: 1, title: 'Buy milk', done: false })
  result = cli(file, 'list')
  assert.equal(result.code, 0)
  assert.equal(JSON.parse(result.out)[0].title, 'Buy milk')
  assert.equal(JSON.parse(cli(file, 'edit', '1', 'Buy oats').out).title, 'Buy oats')
  assert.equal(JSON.parse(cli(file, 'done', '1').out).done, true)
  assert.deepEqual(JSON.parse(cli(file, 'list').out), [{ id: 1, title: 'Buy oats', done: true }])
  assert.equal(JSON.parse(cli(file, 'delete', '1').out).id, 1)
  assert.deepEqual(JSON.parse(cli(file, 'list').out), [])
  assert.equal(JSON.parse(cli(file, 'add', 'Second task').out).id, 2)
}))

test('bad input and unknown ID fail without changing data', () => withFile(file => {
  const store = createStore(file)
  store.add('Existing')
  const before = fs.readFileSync(file, 'utf8')
  for (const args of [['add', '  '], ['add', 'x'.repeat(201)], ['edit', '1', ''], ['done', '0'], ['delete', '99'], ['edit', 'oops', 'title']]) {
    const result = cli(file, ...args)
    assert.equal(result.code, 1, args.join(' '))
    assert.ok(result.err.length > 0)
    assert.equal(fs.readFileSync(file, 'utf8'), before)
  }
}))

test('corrupt store remains untouched and fails visibly', () => withFile(file => {
  fs.writeFileSync(file, '{broken json')
  const result = cli(file, 'add', 'Do not overwrite')
  assert.equal(result.code, 1)
  assert.match(result.err, /Corrupt TODO store/)
  assert.equal(fs.readFileSync(file, 'utf8'), '{broken json')
}))

test('library API includes the original add/list/complete shapes', () => withFile(file => {
  const store = createStore(file)
  assert.deepEqual(store.list(), [])
  const a = store.add('First')
  assert.equal(a.id, 1)
  assert.equal(store.complete(a.id).done, true)
  assert.equal(store.list()[0].done, true)
}))
