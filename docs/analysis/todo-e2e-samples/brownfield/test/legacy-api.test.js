import { test } from "node:test"
import { strict as assert } from "node:assert"
import os from "node:os"
import path from "node:path"
import fs from "node:fs"
import { addTodo, listTodos, completeTodo } from "../src/todos.js"
test("legacy add/list/complete API is preserved with durable storage", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "brownfield-todo-"))
  const previous = process.env.TODO_DATA_FILE
  process.env.TODO_DATA_FILE = path.join(dir, "state.json")
  try {
    const todo = addTodo("buy milk")
    assert.equal(listTodos().length, 1)
    assert.equal(completeTodo(todo.id).done, true)
    assert.equal(listTodos()[0].done, true)
  } finally {
    if (previous === undefined) delete process.env.TODO_DATA_FILE
    else process.env.TODO_DATA_FILE = previous
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
