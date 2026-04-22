# pi-taskbar-info

Custom Pi footer that adds:

- current directory
- current Kubernetes context
- a context-window usage bar graph in place of the default percentage display

## Install

```bash
pi install /Users/josh/repos/my-pi-extensions/pi-taskbar-info
```

Or from the worktree while iterating:

```bash
pi install /Users/josh/repos/my-pi-extensions/.worktrees/pi-taskbar-info/pi-taskbar-info
```

## Behavior

This extension replaces Pi's built-in footer with a custom one that:

- keeps the existing token, cache, cost, and model stats
- shows the working directory and git branch on the first line
- appends the active k8s context using `kubectl config current-context`
- shows a block-bar visualization for context usage instead of the numeric percentage

If `kubectl` is unavailable or no current context is configured, the footer shows `k8s:none`.

## Notes

- The k8s context refreshes periodically while Pi is running.
- This extension is meant for interactive mode.
