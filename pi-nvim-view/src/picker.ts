import type { CompletedAssistantResponse } from "./helpers.js";

const DEFAULT_PREVIEW_LENGTH = 32;

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 16).replace("T", " ");
}

export function normalizePreview(text: string, maxLength = DEFAULT_PREVIEW_LENGTH): string {
  const flattened = text.replace(/\s+/g, " ").trim();
  if (flattened.length <= maxLength) return flattened;
  return `${flattened.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildResponsePickerLabel(response: CompletedAssistantResponse): string {
  const textBlocks = response.message.content
    .filter((block): block is { type: "text"; text: string } => block.type === "text")
    .map((block) => block.text);

  const preview = textBlocks.length > 0 ? normalizePreview(textBlocks.join(" ")) : "[no text content]";

  return `#${response.turnNumber} · ${formatTimestamp(response.message.timestamp)} · ${preview}`;
}

export async function pickAssistantMessage(
  responses: CompletedAssistantResponse[],
  select: (title: string, items: string[]) => Promise<string | undefined>,
): Promise<CompletedAssistantResponse | undefined> {
  const labels = responses.map(buildResponsePickerLabel);
  const selected = await select("Open response in Neovim", labels);
  if (!selected) return undefined;

  const index = labels.indexOf(selected);
  return index === -1 ? undefined : responses[index];
}
