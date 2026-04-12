# Bash Policy Extension

A Pi extension that enforces allow/deny policy checks for agent `bash` tool calls.

## Behavior

The extension evaluates the trimmed full bash command string before execution.

- deny match → block immediately
- allow match → run without prompting
- no match → ask the user for approval
- no config → ask for approval for every bash command
- malformed config → notify once on session start or reload, then ask for approval for every bash command
- non-interactive mode → block approval-required commands with `Command requires approval, unable to proceed in non-interactive mode`

Deny rules always override allow rules.

## Configuration lookup order

The extension loads config on session start and reload using this order:

1. Project config: `.pi/bash-policy.json`
2. Global fallback: `~/.pi/agent/extensions/bash-policy.json` only if the project config does not exist

If both exist, the project config fully replaces the global config.
If the project config exists but is malformed, the extension does **not** fall back to the global config.
After editing config, run `/reload`.

## Config format

```json
{
  "allow": ["kubectl get *"],
  "deny": ["rm -rf *"]
}
```

Both keys are optional and default to empty arrays.

## Matching semantics

- case-sensitive
- glob-based via `minimatch`
- matched against the trimmed full command string
- substring semantics, so patterns can match inside compound commands like `echo hi && kubectl get pods`

## Notifications

On session start or reload, the extension sends one of these notifications:

- `Bash policy config loaded from <path>` (`info`)
- `No bash policy config found; all bash commands will require approval` (`warning`)
- `Invalid bash policy config at <path>; all bash commands will require approval` (`error`)

## Approval flow

For unmatched commands in interactive mode, the extension prompts with:

```text
Pi wants to run this command:

<command>

Allow [] Deny [*]
```

The dialog uses `ctx.ui.select()` and treats anything other than `Allow` as denial.

## Install

Quick test:

```bash
pi -e ./bash-policy/src/index.ts
```

Auto-discovery locations:

- project-local: `.pi/extensions/`
- global: `~/.pi/agent/extensions/`

Example project-local install:

```bash
mkdir -p .pi/extensions/bash-policy
cp -R bash-policy/* .pi/extensions/bash-policy/
cd .pi/extensions/bash-policy
npm install
```

## Examples

### No config

With no config present, every agent `bash` command requires approval.

### Allow rule

```json
{
  "allow": ["kubectl get *"]
}
```

- `kubectl get pods` runs without prompting
- `echo hi && kubectl get pods` also runs without prompting

### Deny rule

```json
{
  "deny": ["rm -rf *"]
}
```

- `rm -rf dist` is blocked with `Blocked by policy (deny pattern: "rm -rf *")`

### Overlapping allow + deny

```json
{
  "allow": ["kubectl *"],
  "deny": ["kubectl delete *"]
}
```

- `kubectl delete pod foo` is denied because deny wins

### Malformed config

If `.pi/bash-policy.json` is invalid JSON or has the wrong shape, the extension shows:

```text
Invalid bash policy config at <path>; all bash commands will require approval
```

Then it falls back to approval-required behavior for all bash commands.

## Limitations

- v1 governs only agent `bash` tool calls, not user `!` or `!!` commands
- matching is string-based and not shell-aware
- quoting, spacing, and shell composition can affect matches
- substring matching is intentionally permissive and may match inside larger compound commands

## Development

```bash
cd bash-policy
npm install
npm test
```

See `examples/config.example.json` for a sample config.
