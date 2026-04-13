import { describe, expect, it } from "vitest";
import { createAttentionController, type AttentionPhase } from "../src/tmux-notify/attention-state";
import { reconcilePostRun } from "../src/tmux-notify/reconcile";

describe("reconcilePostRun", () => {
  it("promotes done to input when idle becomes true shortly after agent_end", async () => {
    const writes: AttentionPhase[] = [];
    let timer: (() => void) | undefined;
    let idle = false;
    const deferred: Array<() => void> = [];

    const controller = createAttentionController({
      flashMs: 3000,
      schedule: (_ms, fn) => {
        timer = fn;
        return { cancel() {} };
      },
      apply: (phase) => writes.push(phase),
    });

    reconcilePostRun(
      controller,
      {
        hasPendingMessages: () => false,
        isIdle: () => idle,
      },
      {
        defer: (fn) => {
          deferred.push(fn);
        },
      },
    );

    expect(writes).toEqual(["done"]);
    expect(deferred.length).toBeGreaterThan(0);

    deferred.shift()?.();
    idle = true;
    while (deferred.length > 0) {
      deferred.shift()?.();
    }

    timer?.();

    expect(writes).toEqual(["done", "input"]);
  });
});
