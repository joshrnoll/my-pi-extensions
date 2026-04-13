# pi tmux notifications

A Pi extension that marks the current tmux window when Pi finishes responding or needs user input.

## Install

Install this extension with:

```bash
pi install /absolute/path/to/pi-tmux-notifications
```

For local development or one-off testing:

```bash
pi -e ./src/index.ts
```

## Behavior

- `done` → yellow for about 3 seconds
- `input` → persistent red until the next `agent_start`
- if `input` becomes relevant during the yellow flash, yellow finishes first and then red takes over

## tmux config

Add this to `~/.tmux.conf`:

```tmux
set -g window-status-format '#{?@pi_attention_state,#{?#{==:#{@pi_attention_state},input},#[fg=red],#{?#{==:#{@pi_attention_state},done},#[fg=yellow],}},}#I:#W#F#[default]'
set -g window-status-current-format '#{?@pi_attention_state,#{?#{==:#{@pi_attention_state},input},#[fg=red],#{?#{==:#{@pi_attention_state},done},#[fg=yellow],}},}#I:#W#F#[default]'
```

A copy of that snippet is available in `examples/tmux.conf.example`.

Reload tmux:

```bash
tmux source-file ~/.tmux.conf
```

## Manual verification

1. Ask Pi to do a short task and verify the window turns yellow for about 3 seconds.
2. Ask a question that leaves Pi waiting for you and verify the window becomes red.
3. Send a new prompt and verify the red highlight clears immediately.

## Development

```bash
npm install
npm run check
npm test
```
