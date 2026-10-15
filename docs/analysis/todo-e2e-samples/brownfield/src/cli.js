#!/usr/bin/env node
import { addTodo, listTodos, editTodo, completeTodo, deleteTodo } from './todos.js'

const [verb, ...args] = process.argv.slice(2)
const usage = 'Usage: todo add <title> | list | edit <id> <title> | done <id> | delete <id>'

try {
  let output
  switch (verb) {
    case 'add':
      if (args.length !== 1) throw new Error(usage)
      output = addTodo(args[0]); break
    case 'list':
      if (args.length) throw new Error(usage)
      output = listTodos(); break
    case 'edit':
      if (args.length !== 2) throw new Error(usage)
      output = editTodo(args[0], args[1]); break
    case 'done':
      if (args.length !== 1) throw new Error(usage)
      output = completeTodo(args[0]); break
    case 'delete':
      if (args.length !== 1) throw new Error(usage)
      output = deleteTodo(args[0]); break
    default: throw new Error(usage)
  }
  console.log(JSON.stringify(output))
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
