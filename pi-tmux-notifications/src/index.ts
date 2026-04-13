import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createAttentionController } from "./tmux-notify/attention-state";
import { reconcilePostRun } from "./tmux-notify/reconcile";
import { createTmuxAttentionWriter } from "./tmux-notify/tmux";

const FLASH_MS = 3000;

function schedule(ms: number, fn: () => void) {
  const handle = setTimeout(fn, ms);
  return {
    cancel: () => clearTimeout(handle),
  };
}

export default function (pi: ExtensionAPI) {
  const writer = createTmuxAttentionWriter({
    env: process.env,
    exec: async (command, args) => {
      const result = await pi.exec(command, args);
      return {
        code: result.code ?? 0,
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
      };
    },
  });

  const controller = createAttentionController({
    flashMs: FLASH_MS,
    schedule,
    apply: (phase) => {
      void writer.apply(phase);
    },
  });

  pi.on("agent_start", async () => {
    controller.onAgentStart();
  });

  pi.on("agent_end", async (_event, ctx) => {
    reconcilePostRun(controller, ctx, {
      defer: (fn) => {
        setTimeout(fn, 0);
      },
    });
  });

  pi.on("session_shutdown", async () => {
    controller.onAgentStart();
    await writer.apply("none");
  });
}
