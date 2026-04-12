import { denyMessage } from "./messages.js";
import type { BashPolicyConfig } from "./config.js";
import { findFirstMatchingPattern, normalizeCommand } from "./matchers.js";

export interface PolicyDecision {
  action: "deny" | "allow" | "ask";
  command: string;
  pattern?: string;
  reason?: string;
}

export function evaluatePolicy(command: string, policy: BashPolicyConfig): PolicyDecision {
  const normalizedCommand = normalizeCommand(command);
  const denyPattern = findFirstMatchingPattern(normalizedCommand, policy.deny);

  if (denyPattern) {
    return {
      action: "deny",
      command: normalizedCommand,
      pattern: denyPattern,
      reason: denyMessage(denyPattern),
    };
  }

  const allowPattern = findFirstMatchingPattern(normalizedCommand, policy.allow);
  if (allowPattern) {
    return {
      action: "allow",
      command: normalizedCommand,
      pattern: allowPattern,
    };
  }

  return {
    action: "ask",
    command: normalizedCommand,
  };
}
