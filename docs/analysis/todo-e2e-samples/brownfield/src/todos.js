import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const emptyStore = () => ({ version: 1, nextId: 1, todos: [] })
const defaultFile = () => process.env.TODO_DATA_FILE || path.resolve('.todo-data.json')

function validTitle(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 200) {
    throw new Error('Title must be 1–200 non-whitespace characters')
  }
  return value.trim()
}

function validId(value) {
  if (!/^[1-9]\d*$/.test(String(value))) throw new Error('ID must be a positive integer')
  const id = Number(value)
  if (!Number.isSafeInteger(id)) throw new Error('ID is too large')
  return id
}

function validateStore(value) {
  const valid = value && value.version === 1 && Number.isSafeInteger(value.nextId) && value.nextId >= 1 &&
    Array.isArray(value.todos) && value.todos.every(t => Number.isSafeInteger(t.id) && t.id >= 1 &&
      typeof t.title === 'string' && t.title.trim() && t.title.length <= 200 && typeof t.done === 'boolean')
  if (!valid) throw new Error('Corrupt TODO store: unexpected data shape; file left unchanged')
  const ids = value.todos.map(t => t.id)
  if (new Set(ids).size !== ids.length || ids.some(id => id >= value.nextId)) {
    throw new Error('Corrupt TODO store: duplicate or out-of-range IDs; file left unchanged')
  }
  return value
}

export function createStore(filePath = defaultFile()) {
  const file = path.resolve(filePath)
  const read = () => {
    let raw
    try { raw = fs.readFileSync(file, 'utf8') }
    catch (error) {
      if (error.code === 'ENOENT') return emptyStore()
      throw error
    }
    let parsed
    try { parsed = JSON.parse(raw) }
    catch { throw new Error('Corrupt TODO store: invalid JSON; file left unchanged') }
    return validateStore(parsed)
  }
  const save = state => {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    const temp = `${file}.tmp-${randomUUID()}`
    try {
      fs.writeFileSync(temp, JSON.stringify(state, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
      fs.renameSync(temp, file)
    } finally {
      try { fs.unlinkSync(temp) } catch (error) { if (error.code !== 'ENOENT') throw error }
    }
  }
  const find = (state, value) => {
    const id = validId(value)
    const todo = state.todos.find(t => t.id === id)
    if (!todo) throw new Error(`TODO ${id} not found`)
    return todo
  }
  return {
    list: () => read().todos.map(t => ({ ...t })),
    add: title => {
      const clean = validTitle(title)
      const state = read()
      const todo = { id: state.nextId++, title: clean, done: false }
      state.todos.push(todo)
      save(state)
      return { ...todo }
    },
    edit: (id, title) => {
      const clean = validTitle(title)
      const state = read()
      const todo = find(state, id)
      todo.title = clean
      save(state)
      return { ...todo }
    },
    complete: id => {
      const state = read()
      const todo = find(state, id)
      todo.done = true
      save(state)
      return { ...todo }
    },
    delete: id => {
      const state = read()
      const todo = find(state, id)
      state.todos = state.todos.filter(t => t.id !== todo.id)
      save(state)
      return { ...todo }
    },
  }
}

// The brownfield project's original public API remains available and now uses the same durable store.
export const addTodo = title => createStore().add(title)
export const listTodos = () => createStore().list()
export const completeTodo = id => createStore().complete(id)
export const editTodo = (id, title) => createStore().edit(id, title)
export const deleteTodo = id => createStore().delete(id)
