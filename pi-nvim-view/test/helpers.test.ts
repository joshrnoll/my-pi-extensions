import assert from "node:assert/strict";
import test from "node:test";

import {
  extractMarkdownFromAssistantMessage,
  findLatestCompletedAssistantMessage,
  listCompletedAssistantMessages,
} from "../src/helpers.js";

function assistantEntry(overrides: Partial<any> = {}): any {
  return {
    type: "message",
    id: overrides.id ?? "assistant-1",
    parentId: overrides.parentId ?? null,
    timestamp: overrides.entryTimestamp ?? "2026-04-06T12:00:00.000Z",
    message: {
      role: "assistant",
      api: "responses",
      provider: "openai",
      model: "gpt-5",
      usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, total: 2 },
      stopReason: overrides.stopReason ?? "stop",
      timestamp: overrides.timestamp ?? Date.parse("2026-04-06T12:00:00.000Z"),
      content:
        overrides.content ?? [
          { type: "text", text: "First paragraph" },
          { type: "thinking", text: "hidden" },
          { type: "text", text: "```ts\nconsole.log('hi');\n```" },
        ],
    },
  };
}

test("findLatestCompletedAssistantMessage returns the newest completed assistant message", () => {
  const branch = [
    assistantEntry({ id: "assistant-old", entryTimestamp: "2026-04-06T12:00:00.000Z" }),
    assistantEntry({ id: "assistant-tool", stopReason: "toolUse", entryTimestamp: "2026-04-06T12:01:00.000Z" }),
    assistantEntry({ id: "assistant-new", entryTimestamp: "2026-04-06T12:02:00.000Z" }),
  ];

  const result = findLatestCompletedAssistantMessage(branch);

  assert.ok(result);
  assert.equal(result.model, "gpt-5");
  assert.equal(result.stopReason, "stop");
  assert.equal(result.content[0]?.type, "text");
  assert.equal((result.content[0] as { type: "text"; text: string }).text, "First paragraph");
});

test("findLatestCompletedAssistantMessage returns undefined when no completed response exists", () => {
  const branch = [assistantEntry({ stopReason: "toolUse" }), assistantEntry({ stopReason: "error" })];

  const result = findLatestCompletedAssistantMessage(branch);

  assert.equal(result, undefined);
});

test("listCompletedAssistantMessages returns completed responses newest first with turn numbers", () => {
  const branch = [
    assistantEntry({ id: "assistant-1", timestamp: Date.parse("2026-04-06T12:00:00.000Z") }),
    assistantEntry({ id: "assistant-2", stopReason: "toolUse", timestamp: Date.parse("2026-04-06T12:01:00.000Z") }),
    assistantEntry({ id: "assistant-3", timestamp: Date.parse("2026-04-06T12:02:00.000Z") }),
  ];

  const result = listCompletedAssistantMessages(branch);

  assert.equal(result.length, 2);
  assert.equal(result[0]?.turnNumber, 2);
  assert.equal(result[0]?.message.timestamp, Date.parse("2026-04-06T12:02:00.000Z"));
  assert.equal(result[1]?.turnNumber, 1);
  assert.equal(result[1]?.message.timestamp, Date.parse("2026-04-06T12:00:00.000Z"));
});

test("extractMarkdownFromAssistantMessage preserves text blocks and ignores non-text blocks", () => {
  const message = assistantEntry().message;

  const markdown = extractMarkdownFromAssistantMessage(message);

  assert.equal(markdown, "First paragraph\n```ts\nconsole.log('hi');\n```");
});

test("extractMarkdownFromAssistantMessage returns an empty string when no text blocks exist", () => {
  const message = assistantEntry({
    content: [{ type: "thinking", text: "hidden" }],
  }).message;

  const markdown = extractMarkdownFromAssistantMessage(message);

  assert.equal(markdown, "");
});
