export const NO_CONFIG_MESSAGE =
  "No bash policy config found; all bash commands will require approval";
export const NON_INTERACTIVE_APPROVAL_MESSAGE =
  "Command requires approval, unable to proceed in non-interactive mode";
export const USER_DENIED_MESSAGE = "Blocked by user";

export function loadedConfigMessage(path: string): string {
  return `Bash policy config loaded from ${path}`;
}

export function invalidConfigMessage(path: string): string {
  return `Invalid bash policy config at ${path}; all bash commands will require approval`;
}

export function denyMessage(pattern: string): string {
  return `Blocked by policy (deny pattern: "${pattern}")`;
}

export function approvalTitle(): string {
  return "Command requires approval:";
}

export function approvalBody(command: string): string {
  return `\n${command}\n`;
}

