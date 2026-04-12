import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { BashPolicyState } from "./config.js";
import { emptyPolicy, loadConfig } from "./config.js";
import { handleBashCommand } from "./runtime.js";

function createInitialState(): BashPolicyState {
  return {
    policy: emptyPolicy(),
    status: "missing",
    notification: {
      message: "No bash policy config found; all bash commands will require approval",
      severity: "warning",
    },
  };
}

export default function bashPolicyExtension(pi: ExtensionAPI) {
  let state = createInitialState();

  pi.on("session_start", async (_event, ctx) => {
    state = await loadConfig({ cwd: ctx.cwd });
    ctx.ui.notify(state.notification.message, state.notification.severity);
  });

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "bash") {
      return undefined;
    }

    const command = typeof event.input.command === "string" ? event.input.command.trim() : "";
    return handleBashCommand(command, state, ctx);
  });
}
