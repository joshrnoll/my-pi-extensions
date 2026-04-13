import assert from "node:assert/strict";
import test from "node:test";

import { registerResponseNvimCommand } from "../src/index.js";

function createAssistantEntry(text: string, timestamp = Date.parse("2026-04-06T12:00:00.000Z")): any {
  return {
    type: "message",
    id: `assistant-${timestamp}`,
    parentId: null,
    timestamp: new Date(timestamp).toISOString(),
    message: {
      role: "assistant",
      api: "responses",
      provider: "openai",
      model: "gpt-5",
      usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, total: 2 },
      stopReason: "stop",
      timestamp,
      content: [{ type: "text", text }],
    },
  };
}

test("registerResponseNvimCommand registers the /nvim command", () => {
  let commandName = "";

  registerResponseNvimCommand({
    registerCommand(name: string) {
      commandName = name;
    },
  } as any);

  assert.equal(commandName, "nvim");
});

test("/nvim requires interactive mode", async () => {
  let handler: ((args: string, ctx: any) => Promise<void>) | undefined;
  const notifications: Array<{ message: string; level?: string }> = [];

  registerResponseNvimCommand(
    {
      registerCommand(_name: string, command: any) {
        handler = command.handler;
      },
    } as any,
    {
      openInNvim: async () => {
        throw new Error("should not be called");
      },
    },
  );

  await handler!("", {
    hasUI: false,
    waitForIdle: async () => undefined,
    sessionManager: { getBranch: () => [] },
    ui: {
      notify(message: string, level?: string) {
        notifications.push({ message, level });
      },
      select: async () => undefined,
    },
  });

  assert.deepEqual(notifications, [{ message: "The /nvim command requires interactive mode", level: "error" }]);
});

test("/nvim waits for idle and notifies when no completed assistant response exists", async () => {
  let handler: ((args: string, ctx: any) => Promise<void>) | undefined;
  const notifications: Array<{ message: string; level?: string }> = [];
  let waited = false;

  registerResponseNvimCommand(
    {
      registerCommand(_name: string, command: any) {
        handler = command.handler;
      },
    } as any,
    {
      openInNvim: async () => {
        throw new Error("should not be called");
      },
    },
  );

  await handler!("", {
    hasUI: true,
    waitForIdle: async () => {
      waited = true;
    },
    sessionManager: {
      getBranch: () => [],
    },
    ui: {
      notify(message: string, level?: string) {
        notifications.push({ message, level });
      },
      select: async () => undefined,
    },
  });

  assert.equal(waited, true);
  assert.deepEqual(notifications, [{ message: "No completed assistant response found", level: "info" }]);
});

test("/nvim pick opens the selected older response", async () => {
  let handler: ((args: string, ctx: any) => Promise<void>) | undefined;
  let openedMarkdown = "";
  let pickerItemCount = 0;

  registerResponseNvimCommand(
    {
      registerCommand(_name: string, command: any) {
        handler = command.handler;
      },
    } as any,
    {
      openInNvim: async (markdown: string) => {
        openedMarkdown = markdown;
        return { exitCode: 0 };
      },
    },
  );

  await handler!("pick", {
    hasUI: true,
    waitForIdle: async () => undefined,
    sessionManager: {
      getBranch: () => [
        createAssistantEntry("Older response", Date.parse("2026-04-06T12:00:00.000Z")),
        createAssistantEntry("Newest response", Date.parse("2026-04-06T12:02:00.000Z")),
      ],
    },
    ui: {
      notify() {},
      select: async (_title: string, items: string[]) => {
        pickerItemCount = items.length;
        return items[1];
      },
    },
  });

  assert.equal(pickerItemCount, 2);
  assert.equal(openedMarkdown, "Older response");
});

test("/nvim pick does nothing when the picker is cancelled", async () => {
  let handler: ((args: string, ctx: any) => Promise<void>) | undefined;
  let opened = false;
  const notifications: Array<{ message: string; level?: string }> = [];

  registerResponseNvimCommand(
    {
      registerCommand(_name: string, command: any) {
        handler = command.handler;
      },
    } as any,
    {
      openInNvim: async () => {
        opened = true;
        return { exitCode: 0 };
      },
    },
  );

  await handler!("pick", {
    hasUI: true,
    waitForIdle: async () => undefined,
    sessionManager: {
      getBranch: () => [createAssistantEntry("Latest response")],
    },
    ui: {
      notify(message: string, level?: string) {
        notifications.push({ message, level });
      },
      select: async () => undefined,
    },
  });

  assert.equal(opened, false);
  assert.deepEqual(notifications, []);
});

test("/nvim pick warns and does not open when the selected response has no text content", async () => {
  let handler: ((args: string, ctx: any) => Promise<void>) | undefined;
  let opened = false;
  const notifications: Array<{ message: string; level?: string }> = [];
  const entry = createAssistantEntry("unused");
  entry.message.content = [{ type: "thinking", text: "hidden" }];

  registerResponseNvimCommand(
    {
      registerCommand(_name: string, command: any) {
        handler = command.handler;
      },
    } as any,
    {
      openInNvim: async () => {
        opened = true;
        return { exitCode: 0 };
      },
    },
  );

  await handler!("pick", {
    hasUI: true,
    waitForIdle: async () => undefined,
    sessionManager: {
      getBranch: () => [entry],
    },
    ui: {
      notify(message: string, level?: string) {
        notifications.push({ message, level });
      },
      select: async (_title: string, items: string[]) => items[0],
    },
  });

  assert.equal(opened, false);
  assert.deepEqual(notifications, [{ message: "Selected assistant response has no text content", level: "info" }]);
});

test("/nvim rejects unsupported arguments with usage", async () => {
  let handler: ((args: string, ctx: any) => Promise<void>) | undefined;
  const notifications: Array<{ message: string; level?: string }> = [];

  registerResponseNvimCommand(
    {
      registerCommand(_name: string, command: any) {
        handler = command.handler;
      },
    } as any,
    {
      openInNvim: async () => {
        throw new Error("should not be called");
      },
    },
  );

  await handler!("older", {
    hasUI: true,
    waitForIdle: async () => undefined,
    sessionManager: {
      getBranch: () => [createAssistantEntry("Latest response")],
    },
    ui: {
      notify(message: string, level?: string) {
        notifications.push({ message, level });
      },
      select: async () => undefined,
    },
  });

  assert.deepEqual(notifications, [{ message: "Usage: /nvim [pick]", level: "error" }]);
});
