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

- shows the working directory with a file icon on the first line
- appends the active k8s context with a k8s icon using `kubectl config current-context`
- adds a blank spacer line between the directory line and the stats line
- shows only a block-bar visualization plus total context percentage for context-window usage on the stats line
- keeps the model/provider info on the right when space allows

If `kubectl` is unavailable or no current context is configured, the footer shows `☸ none`.

## Notes

- The k8s context refreshes periodically while Pi is running.
- This extension is meant for interactive mode.
