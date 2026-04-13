# Repository guidance

This repository contains self-contained Pi extensions. Treat each top-level extension directory as the installable unit.

## Baseline structure to follow

Recommended layout:

```text
extension-name/
  package.json
  package-lock.json
  README.md
  tsconfig.json
  examples/
    config.example.json
  src/
    index.ts
    ...
  test/
    *.test.ts
```

## Installability requirement

Every extension in this repo must be installable with:

```bash
pi install /path/to/extension
```

That means:

- the extension root must be the directory passed to `pi install`
- `package.json` must be valid at the extension root
- the Pi entrypoint should be declared in `package.json` under `pi.extensions`
- the extension should not depend on files outside its own directory
- no manual copying or repo-specific setup should be required before installation

## Code organization

Keep extensions small and split by concern.

- put the entrypoint in `src/index.ts`
- isolate config parsing, matching, runtime behavior, and message text into separate modules when needed
- keep user-facing examples in `examples/`
- keep tests in `test/` and cover both unit behavior and integration behavior where relevant

## Documentation

Each extension should document:

- what it does
- how it is configured
- how to install it with `pi install /path/to/extension`
- any limitations or gotchas

Update the README whenever setup or behavior changes.

Also create a `CLAUDE.md` symlink at the repo root and inside each extension directory so extension-specific guidance is easy to discover from both levels.

## Dependency and test expectations

- Commit the extension’s `package-lock.json` when it has npm dependencies
- Keep tests runnable from the extension directory
- Prefer commands that work without special repo-wide setup

## When adding a new extension

- create a single, installable extension root
- include a clear `src/index.ts` entrypoint
- split config parsing, matching, runtime behavior, and message text into focused modules when needed
- add examples for any config users are expected to edit
- add tests that verify the important behaviors
- create an `AGENTS.md` inside the new extension so future work in that extension has local guidance
