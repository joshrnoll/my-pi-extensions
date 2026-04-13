import { describe, expect, it } from "vitest";
import {
  createAttentionController,
  type AttentionPhase,
} from "../src/tmux-notify/attention-state";

describe("createAttentionController", () => {
  it("starts a done flash and clears it after the timeout when no input is pending", () => {
    const writes: AttentionPhase[] = [];
    const controller = createAttentionController({
      flashMs: 3000,
      schedule: (_ms, fn) => {
        fn();
        return { cancel() {} };
      },
      apply: (phase) => writes.push(phase),
    });

    controller.onSettledDone();

    expect(writes).toEqual(["done", "none"]);
  });

  it("finishes yellow before switching to persistent input", () => {
    let timer: (() => void) | undefined;
    const writes: AttentionPhase[] = [];
    const controller = createAttentionController({
      flashMs: 3000,
      schedule: (_ms, fn) => {
        timer = fn;
        return { cancel() {} };
      },
      apply: (phase) => writes.push(phase),
    });

    controller.onSettledDone();
    controller.onNeedsInput();
    expect(writes).toEqual(["done"]);

    timer?.();
    expect(writes).toEqual(["done", "input"]);
  });

  it("clears persistent input on agent start", () => {
    const writes: AttentionPhase[] = [];
    const controller = createAttentionController({
      flashMs: 3000,
      schedule: () => ({ cancel() {} }),
      apply: (phase) => writes.push(phase),
    });

    controller.onNeedsInput();
    controller.onAgentStart();

    expect(writes).toEqual(["input", "none"]);
  });

  it("restarts the done flash when a new settled completion arrives", () => {
    const cancelled: boolean[] = [];
    const writes: AttentionPhase[] = [];
    const timers: Array<() => void> = [];
    const controller = createAttentionController({
      flashMs: 3000,
      schedule: (_ms, fn) => {
        const index = cancelled.length;
        cancelled.push(false);
        timers.push(fn);
        return {
          cancel() {
            cancelled[index] = true;
          },
        };
      },
      apply: (phase) => writes.push(phase),
    });

    controller.onSettledDone();
    controller.onSettledDone();

    expect(cancelled).toEqual([true, false]);
    expect(writes).toEqual(["done"]);
    expect(timers).toHaveLength(2);
  });
});
