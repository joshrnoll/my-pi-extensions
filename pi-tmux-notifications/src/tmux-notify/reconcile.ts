import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { createAttentionController } from "./attention-state";

type AttentionController = ReturnType<typeof createAttentionController>;
type ReconcileContext = Pick<ExtensionContext, "isIdle" | "hasPendingMessages">;
type ReconcileScheduling = {
  defer: (fn: () => void) => void;
};

function waitForIdle(
  controller: AttentionController,
  ctx: ReconcileContext,
  scheduling: ReconcileScheduling,
  attemptsLeft: number,
) {
  scheduling.defer(() => {
    if (ctx.hasPendingMessages()) {
      return;
    }

    if (ctx.isIdle()) {
      controller.onNeedsInput();
      return;
    }

    if (attemptsLeft > 0) {
      waitForIdle(controller, ctx, scheduling, attemptsLeft - 1);
    }
  });
}

export function reconcilePostRun(
  controller: AttentionController,
  ctx: ReconcileContext,
  scheduling: ReconcileScheduling = { defer: queueMicrotask },
) {
  // Reason: Extensions do not receive queue_update directly, so derive the higher-level
  // attention state from ctx.hasPendingMessages() plus a deferred idle check around agent_end.
  if (!ctx.hasPendingMessages()) {
    controller.onSettledDone();
    waitForIdle(controller, ctx, scheduling, 10);
  }
}
