import { describe, expect, it } from "vitest";
import {
  buildClearAttentionCommand,
  buildSetAttentionCommand,
  buildWindowTarget,
  createTmuxAttentionWriter,
  isTmuxEnvironment,
} from "../src/tmux-notify/tmux";

describe("tmux helpers", () => {
  it("detects tmux from TMUX and TMUX_PANE", () => {
    expect(isTmuxEnvironment({ TMUX: "/tmp/tmux-123/default,1,0", TMUX_PANE: "%7" })).toBe(true);
    expect(isTmuxEnvironment({})).toBe(false);
  });

  it("uses the current pane as the command target", () => {
    expect(buildWindowTarget({ TMUX_PANE: "%7" })).toBe("%7");
  });

  it("builds a window option command for the semantic attention state", () => {
    expect(buildSetAttentionCommand("%7", "input")).toEqual([
      "set-window-option",
      "-t",
      "%7",
      "@pi_attention_state",
      "input",
    ]);
  });

  it("builds a clear command that unsets the window option", () => {
    expect(buildClearAttentionCommand("%7")).toEqual([
      "set-window-option",
      "-u",
      "-t",
      "%7",
      "@pi_attention_state",
    ]);
  });

  it("no-ops when pi is not running inside tmux", async () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    const writer = createTmuxAttentionWriter({
      env: {},
      exec: async (command, args) => {
        calls.push({ command, args });
        return { code: 0, stdout: "", stderr: "" };
      },
    });

    await writer.apply("input");
    await writer.apply("none");

    expect(calls).toEqual([]);
  });

  it("sets and clears the attention option when running in tmux", async () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    const writer = createTmuxAttentionWriter({
      env: { TMUX: "/tmp/tmux-123/default,1,0", TMUX_PANE: "%7" },
      exec: async (command, args) => {
        calls.push({ command, args });
        return { code: 0, stdout: "", stderr: "" };
      },
    });

    await writer.apply("done");
    await writer.apply("none");

    expect(calls).toEqual([
      {
        command: "tmux",
        args: ["set-window-option", "-t", "%7", "@pi_attention_state", "done"],
      },
      {
        command: "tmux",
        args: ["set-window-option", "-u", "-t", "%7", "@pi_attention_state"],
      },
    ]);
  });
});
