import type { AssistantMessage, TextContent } from "@mariozechner/pi-ai";
import type { SessionEntry, SessionMessageEntry } from "@mariozechner/pi-coding-agent";

export interface CompletedAssistantResponse {
  turnNumber: number;
  message: AssistantMessage;
}

function isAssistantMessageEntry(
  entry: SessionEntry,
): entry is SessionMessageEntry & { message: AssistantMessage } {
  return entry.type === "message" && entry.message.role === "assistant" && Array.isArray(entry.message.content);
}

export function findLatestCompletedAssistantMessage(branch: SessionEntry[]): AssistantMessage | undefined {
  for (let index = branch.length - 1; index >= 0; index -= 1) {
    const entry = branch[index];
    if (!isAssistantMessageEntry(entry)) continue;
    if (entry.message.stopReason === "stop") return entry.message;
  }

  return undefined;
}

export function listCompletedAssistantMessages(branch: SessionEntry[]): CompletedAssistantResponse[] {
  const completed: CompletedAssistantResponse[] = [];
  let turnNumber = 0;

  for (const entry of branch) {
    if (!isAssistantMessageEntry(entry)) continue;
    if (entry.message.stopReason !== "stop") continue;

    turnNumber += 1;
    completed.push({ turnNumber, message: entry.message });
  }

  return completed.reverse();
}

export function extractMarkdownFromAssistantMessage(message: AssistantMessage): string {
  return message.content
    .filter((block): block is TextContent => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}
