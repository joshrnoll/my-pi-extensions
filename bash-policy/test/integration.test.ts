import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import extension from "../src/index.ts";
import { handleBashCommand } from "../src/runtime.ts";
import { approvalBody, approvalTitle } from "../src/messages.ts";

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
  const home = join(root, "home");
  await mkdir(cwd, { recursive: true });
  await mkdir(home, { recursive: true });
  return { cwd, home };
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
      ui: { confirm: async () => true },
    },
  );

  assert.deepEqual(result, {
    block: true,
    reason: "Command requires approval, unable to proceed in non-interactive mode",
  });
});

test("handleBashCommand uses confirm for approval-required commands", async () => {
  let seenTitle = "";
  let seenMessage = "";

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
        confirm: async (title, message) => {
          seenTitle = title;
          seenMessage = message;
          return false;
        },
      },
    },
  );

  assert.equal(seenTitle, approvalTitle());
  assert.equal(seenMessage, approvalBody("git status"));
  assert.equal(approvalTitle(), "Command requires approval:");
  assert.equal(approvalBody("git status"), "\ngit status\n");
  assert.deepEqual(result, { block: true, reason: "Blocked by user" });
});

test("extension notifies on session start and ignores non-bash tool calls", async () => {
  const { cwd, home } = await makeProject();
  const previousHome = process.env.HOME;
  process.env.HOME = home;

  try {
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
        confirm: async () => true,
      },
    };

    await pi.emit("session_start", { reason: "startup" }, ctx);
    const toolResult = await pi.emit("tool_call", { toolName: "read", input: { path: "x" } }, ctx);

    assert.equal(notifications.length, 1);
    assert.equal(notifications[0]?.severity, "warning");
    assert.equal(toolResult, undefined);
  } finally {
    if (previousHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
  }
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
      confirm: async () => true,
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
