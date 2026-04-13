# pi-tmux-notifications guidance

This directory is the installable extension root. Keep it self-contained so it can be installed with:

```bash
pi install /path/to/extension
```

## Structure

- keep the entrypoint in `src/index.ts`
- keep tmux-specific helpers in `src/tmux-notify/`
- keep tests in `test/`
- keep the package metadata, lockfile, and TypeScript config at the extension root
- keep user-facing tmux configuration examples in `examples/`

## Behavior

This extension marks the active tmux window when pi finishes responding or needs user input.

## Maintenance rules

- do not reference files outside this directory
- update the README when install or usage changes
- keep tests runnable from this directory with `npm test`
- keep `package-lock.json` committed when dependencies change
