# pi-nvim-view guidance

This directory is the installable extension root. Keep it self-contained so it can be installed with:

```bash
pi install /path/to/extension
```

## Structure

- keep the entrypoint in `src/index.ts`
- keep helper modules in `src/`
- keep tests in `test/`
- keep the package metadata, lockfile, and TypeScript config at the extension root

## Behavior

This extension provides the `/nvim` slash command for opening the latest completed assistant response in Neovim.

## Maintenance rules

- do not reference files outside this directory
- update the README when install or usage changes
- keep tests runnable from this directory with `npm test`
- keep `package-lock.json` committed when dependencies change
