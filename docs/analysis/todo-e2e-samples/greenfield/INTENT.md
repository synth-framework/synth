# Controlled E2E decision record — NOT a real product approval

The prompt “Build a TODO app” is ambiguous. For this disposable test only, the simulated operator selected:

- One user, offline, Node.js >=20 command-line interface. No web UI, account, remote service, or cloud deployment.
- Local JSON file persistence; location from `TODO_DATA_FILE` or a documented default in the working directory. No cache.
- `add <title>`, `list`, `edit <id> <title>`, `done <id>`, `delete <id>`; tasks have stable positive integer IDs, title, completion state. Deleting an ID never reuses it.
- Empty/overlong titles and malformed IDs are rejected without changing stored data. A missing store starts empty; a corrupt store fails visibly and must not be overwritten. Saves use a temporary file followed by rename. Validate at least a create/list/edit/done/delete cycle and persistence across separate processes.
- Documentation-only source conflict: for this experiment, the simulated stakeholder chooses **on-device only for v1**; cross-device sync is deferred and must NOT be described as already implemented. This is not the repository owner's decision.
- Brownfield source is an in-memory module: preserve its `addTodo`, `listTodos`, `completeTodo` exports while adding durable behavior. Prefer evolution over replacing the project.

Acceptance is the behavior above with passing tests, correct CLI exit codes, and a second process seeing prior edits. No claim about multi-user security, backups, hosted availability, comprehensive accessibility, or production certification is implied. A real SYNTH workflow must elicit or authorize the choices above from the human rather than silently reusing this synthetic record.
