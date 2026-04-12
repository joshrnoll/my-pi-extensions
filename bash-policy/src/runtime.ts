import { approvalPrompt, NON_INTERACTIVE_APPROVAL_MESSAGE, USER_DENIED_MESSAGE } from "./messages.js";
import type { BashPolicyState } from "./config.js";
import { loadConfig } from "./config.js";
import { evaluatePolicy } from "./policy.js";

export interface ApprovalUI {
  select(title: string, options: string[]): Promise<string | undefined>;
}

export interface ToolCallContextLike {
  hasUI: boolean;
  ui: ApprovalUI;
}

export interface ToolCallBlockResult {
  block: true;
  reason: string;
}

export async function loadRuntimeState(cwd: string, homeDir?: string): Promise<BashPolicyState> {
  return loadConfig({ cwd, homeDir });
}

export async function handleBashCommand(
  command: string,
  state: BashPolicyState,
  ctx: ToolCallContextLike,
): Promise<ToolCallBlockResult | undefined> {
  const decision = evaluatePolicy(command, state.policy);

  if (decision.action === "deny") {
    return { block: true, reason: decision.reason! };
  }

  if (decision.action === "allow") {
    return undefined;
  }

  if (!ctx.hasUI) {
    return { block: true, reason: NON_INTERACTIVE_APPROVAL_MESSAGE };
  }

  const choice = await ctx.ui.select(approvalPrompt(decision.command), ["Deny", "Allow"]);
  if (choice !== "Allow") {
    return { block: true, reason: USER_DENIED_MESSAGE };
  }

  return undefined;
}
