# ADR-037 — Shell-Safe Command Construction

**Status:** Accepted  
**Date:** 2026-07-19  
**Deciders:** SYNTH CLI / Agent Tooling Maintainers  
**Authority:** EXP-PROGRAM-026 — AI Agent Interoperability  

---

## Context

When generating shell commands programmatically, unescaped Markdown content can be interpreted by POSIX shells as command substitutions or variable expansions. A concrete incident occurred while constructing a `gh pr create` command: backticks around package names and paths (e.g. `@synth-framework/agent-sdk`, `.synth/ai/`) were evaluated by `bash` as command substitutions, corrupting the command and producing unexpected output.

This affects any SYNTH component that emits shell commands, including:

- CLI delegation to external tools (`gh`, `git`, `npm`, `docker`, `kubectl`)
- Agent-generated commands in skills and playbooks
- Documentation examples
- CI/CD generated scripts

## Decision

All shell commands produced by SYNTH MUST be safe under POSIX shells (`bash`, `zsh`, `sh`). This is achieved through construction rules, not post-hoc escaping.

## Rules

### 1. Never inline Markdown into shell string arguments

For single-line values, use literal strings or explicitly escaped values. For multiline values, especially Markdown, use a file or a quoted heredoc.

**Allowed:**

```bash
gh pr create --title "feat(ai): complete EXP-PROGRAM-026" --body-file pr-body.md
```

```bash
cat > /tmp/pr-body.md <<'EOF'
## Summary

Install: `@synth-framework/agent-sdk`

Directory: `.synth/ai/`
EOF
gh pr create --body-file /tmp/pr-body.md
```

**Forbidden:**

```bash
gh pr create --body "## Summary

Install: `@synth-framework/agent-sdk`"
```

### 2. Never rely on shell interpolation for structured data

Do not build command strings by concatenating user input, paths, or generated text. Use arrays, file arguments, or explicitly validated and quoted values.

**Allowed:**

```bash
args=("--title" "$title" "--body-file" "$body_file")
gh pr create "${args[@]}"
```

**Forbidden:**

```bash
gh pr create --title "$title" --body "$body"
```

when `$body` may contain backticks, `$`, or newlines.

### 3. Prohibit dangerous characters in generated shell input

Unless explicitly escaped for a known-safe context, generated shell input MUST NOT contain:

- Backticks: `` ` ``
- Command substitution: `$()`
- Variable expansion: `${}`, `$VAR`
- Unquoted glob characters: `*`, `?`, `[`
- Unquoted metacharacters: `;`, `&`, `|`, `>`, `<`, `(`, `)`, `{`, `}`, `\`, `"`, `'`

### 4. Prefer file-based input for any non-trivial content

If a command argument exceeds a single token or contains any character outside `[A-Za-z0-9_./:@-]`, write it to a temporary file and pass the file path.

### 5. Validate generated commands before execution

When SYNTH emits a shell command, it SHOULD be parseable by a POSIX shell parser without producing unintended expansions. Tests MUST verify that generated commands execute correctly under `bash`, `zsh`, and `sh`.

## Consequences

### Positive

- Eliminates accidental command injection from generated Markdown or user content.
- Makes agent-generated commands predictable and auditable.
- Allows documentation examples to be copy-pasted safely.

### Negative

- Requires more code paths to use temporary files or arrays.
- Slightly more verbose command construction.

## Compliance

A SYNTH command generator is compliant when:

1. Every emitted command can be executed by `bash`, `zsh`, and `sh` without modification.
2. No Markdown, JSON, or user-provided content is inlined into shell string arguments.
3. Dangerous characters are either escaped or moved to file input.
4. Tests exist that verify the above for every command generator.
