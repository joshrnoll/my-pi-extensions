import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import extension from "../src/index.ts";
import { handleBashCommand } from "../src/runtime.ts";
import { approvalPrompt } from "../src/messages.ts";

function createMockPi() {
  const handlers = new Map<string, Function[]>();
  return {
    on(eventName: string, handler: Function) {
      const list = handlers.get(eventName) ?? [];
      list.push(handler);
      handlers.set(eventName, list);
    },
    async emit(eventName: string, event: unknown, ctx: unknown) {
      const list = handlers.get(eventName) ?? [];
      let result: unknown;
      for (const handler of list) {
        result = await handler(event, ctx);
      }
      return result;
    },
  };
}

async function makeProject() {
  const root = await mkdtemp(join(tmpdir(), "bash-policy-integration-"));
  const cwd = join(root, "project");
  await mkdir(cwd, { recursive: true });
  return { cwd };
}

test("handleBashCommand blocks approval-required commands without UI", async () => {
  const result = await handleBashCommand(
    "git status",
    {
      policy: { allow: [], deny: [] },
      status: "missing",
      notification: { message: "x", severity: "warning" },
    },
    {
      hasUI: false,
      ui: { select: async () => "Allow" },
    },
  );

  assert.deepEqual(result, {
    block: true,
    reason: "Command requires approval, unable to proceed in non-interactive mode",
  });
});

test("handleBashCommand uses the documented approval prompt and blocks non-Allow responses", async () => {
  let seenTitle = "";
  let seenOptions: string[] = [];

  const result = await handleBashCommand(
    "git status",
    {
      policy: { allow: [], deny: [] },
      status: "missing",
      notification: { message: "x", severity: "warning" },
    },
    {
      hasUI: true,
      ui: {
        select: async (title, options) => {
          seenTitle = title;
          seenOptions = options;
          return undefined;
        },
      },
    },
  );

  assert.equal(seenTitle, approvalPrompt("git status"));
  assert.deepEqual(seenOptions, ["Deny", "Allow"]);
  assert.deepEqual(result, { block: true, reason: "Blocked by user" });
});

test("extension notifies on session start and ignores non-bash tool calls", async () => {
  const { cwd } = await makeProject();
  const pi = createMockPi();
  extension(pi as never);

  const notifications: Array<{ message: string; severity?: string }> = [];
  const ctx = {
    cwd,
    hasUI: true,
    ui: {
      notify(message: string, severity?: string) {
        notifications.push({ message, severity });
      },
      select: async () => "Allow",
    },
  };

  await pi.emit("session_start", { reason: "startup" }, ctx);
  const toolResult = await pi.emit("tool_call", { toolName: "read", input: { path: "x" } }, ctx);

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0]?.severity, "warning");
  assert.equal(toolResult, undefined);
});

test("extension enforces deny policy after loading config", async () => {
  const { cwd } = await makeProject();
  const policyDir = join(cwd, ".pi");
  await mkdir(policyDir, { recursive: true });
  await writeFile(join(policyDir, "bash-policy.json"), JSON.stringify({ deny: ["rm -rf *"] }));

  const pi = createMockPi();
  extension(pi as never);

  const notifications: Array<{ message: string; severity?: string }> = [];
  const ctx = {
    cwd,
    hasUI: true,
    ui: {
      notify(message: string, severity?: string) {
        notifications.push({ message, severity });
      },
      select: async () => "Allow",
    },
  };

  await pi.emit("session_start", { reason: "startup" }, ctx);
  const result = await pi.emit("tool_call", { toolName: "bash", input: { command: "rm -rf dist" } }, ctx);

  assert.deepEqual(result, {
    block: true,
    reason: 'Blocked by policy (deny pattern: "rm -rf *")',
  });
  assert.equal(notifications[0]?.severity, "info");
});
