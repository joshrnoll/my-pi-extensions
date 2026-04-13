import { afterEach, describe, expect, it } from "vitest";
import tmuxNotifyExtension from "../src/index.js";

describe("tmux notify extension shutdown", () => {
  const originalTmux = process.env.TMUX;
  const originalTmuxPane = process.env.TMUX_PANE;

  afterEach(() => {
    process.env.TMUX = originalTmux;
    process.env.TMUX_PANE = originalTmuxPane;
  });

  it("clears the tmux attention state on session shutdown", async () => {
    process.env.TMUX = "/tmp/tmux-123/default,1,0";
    process.env.TMUX_PANE = "%7";

    const handlers = new Map<string, Function>();
    const calls: Array<{ command: string; args: string[] }> = [];

    tmuxNotifyExtension({
      on(event: string, handler: Function) {
        handlers.set(event, handler);
      },
      exec: async (command: string, args: string[]) => {
        calls.push({ command, args });
        return { code: 0, stdout: "", stderr: "" };
      },
    } as any);

    const shutdown = handlers.get("session_shutdown");
    expect(shutdown).toBeTypeOf("function");

    await shutdown?.({}, {});

    expect(calls).toEqual([
      {
        command: "tmux",
        args: ["set-window-option", "-u", "-t", "%7", "@pi_attention_state"],
      },
    ]);
  });
});
