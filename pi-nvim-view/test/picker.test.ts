import assert from "node:assert/strict";
import test from "node:test";

import {
  buildResponsePickerLabel,
  normalizePreview,
  pickAssistantMessage,
} from "../src/picker.js";
import type { CompletedAssistantResponse } from "../src/helpers.js";

function response(
  text: string,
  turnNumber = 1,
  timestamp = Date.parse("2026-04-06T12:34:56.000Z"),
): CompletedAssistantResponse {
  return {
    turnNumber,
    message: {
      role: "assistant",
      api: "responses",
      provider: "openai",
      model: "gpt-5",
      usage: {
        input: 1,
        output: 1,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 2,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
      stopReason: "stop",
      timestamp,
      content: [{ type: "text", text }],
    },
  } as CompletedAssistantResponse;
}

test("normalizePreview flattens whitespace and truncates long content", () => {
  const preview = normalizePreview("First line\nSecond line\tThird line", 24);

  assert.equal(preview, "First line Second line…");
});

test("buildResponsePickerLabel includes turn number, timestamp, and preview", () => {
  const label = buildResponsePickerLabel(response("Implement the picker next"));

  assert.equal(label, "#1 · 2026-04-06 12:34 · Implement the picker next");
});

test("buildResponsePickerLabel warns when no text content exists", () => {
  const label = buildResponsePickerLabel({
    turnNumber: 2,
    message: {
      ...response("unused").message,
      timestamp: Date.parse("2026-04-06T12:35:56.000Z"),
      content: [{ type: "thinking", thinking: "hidden" }],
    },
  } as CompletedAssistantResponse);

  assert.equal(label, "#2 · 2026-04-06 12:35 · [no text content]");
});

test("pickAssistantMessage returns the selected response", async () => {
  const responses = [response("Newest", 2), response("Older", 1)];

  const selected = await pickAssistantMessage(responses, async (_title, items) => items[1]);

  assert.equal(selected?.turnNumber, 1);
  assert.equal(selected?.message.content[0]?.type, "text");
});

test("pickAssistantMessage returns undefined when the picker is cancelled", async () => {
  const responses = [response("Newest", 1)];

  const selected = await pickAssistantMessage(responses, async () => undefined);

  assert.equal(selected, undefined);
});
