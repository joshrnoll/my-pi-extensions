import { spawnSync } from "node:child_process";

import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";

import { openDisposableMarkdown } from "./editor-session.js";
import {
  extractMarkdownFromAssistantMessage,
  findLatestCompletedAssistantMessage,
  listCompletedAssistantMessages,
} from "./helpers.js";
import { pickAssistantMessage } from "./picker.js";

async function openLatestResponseInNvim(markdown: string, ctx: ExtensionCommandContext) {
  const result = await ctx.ui.custom<
    { kind: "success"; exitCode: number | null; cleanupError?: Error } | { kind: "error"; message: string }
  >((tui, _theme, _kb, done) => {
    void (async () => {
      tui.stop();
      process.stdout.write("\x1b[2J\x1b[H");

      try {
        const editorResult = await openDisposableMarkdown(markdown, {
          spawnEditor: (filePath) =>
            spawnSync("nvim", [filePath], {
              cwd: ctx.cwd,
              env: process.env,
              stdio: "inherit",
            }),
        });

        done({
          kind: "success",
          exitCode: editorResult.exitCode,
          cleanupError: editorResult.cleanupError,
        });
      } catch (error) {
        done({
          kind: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        tui.start();
        tui.requestRender(true);
      }
    })();

    return { render: () => [], invalidate: () => {} };
  });

  if (result.kind === "error") {
    throw new Error(result.message);
  }

  return {
    exitCode: result.exitCode,
    cleanupError: result.cleanupError,
  };
}

async function openSelectedResponse(
  markdown: string,
  ctx: ExtensionCommandContext,
  openInNvim: (markdown: string, ctx: ExtensionCommandContext) => Promise<{ exitCode: number | null; cleanupError?: Error }>,
) {
  if (!markdown.trim()) {
    ctx.ui.notify("Selected assistant response has no text content", "info");
    return;
  }

  const result = await openInNvim(markdown, ctx);
  if (result.cleanupError) {
    ctx.ui.notify(`Temp file cleanup failed: ${result.cleanupError.message}`, "warning");
  }
  if ((result.exitCode ?? 0) !== 0) {
    ctx.ui.notify(`nvim exited with code ${result.exitCode}`, "warning");
  }
}

export function registerResponseNvimCommand(
  pi: Pick<ExtensionAPI, "registerCommand">,
  dependencies: {
    openInNvim?: (
      markdown: string,
      ctx: ExtensionCommandContext,
    ) => Promise<{ exitCode: number | null; cleanupError?: Error }>;
  } = {},
): void {
  const openInNvim = dependencies.openInNvim ?? openLatestResponseInNvim;

  pi.registerCommand("nvim", {
    description: "Open the latest or a selected completed assistant response in Neovim",
    handler: async (args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("The /nvim command requires interactive mode", "error");
        return;
      }

      const mode = args.trim();
      if (mode !== "" && mode !== "pick") {
        ctx.ui.notify("Usage: /nvim [pick]", "error");
        return;
      }

      await ctx.waitForIdle();

      try {
        if (mode === "pick") {
          const responses = listCompletedAssistantMessages(ctx.sessionManager.getBranch());
          if (responses.length === 0) {
            ctx.ui.notify("No completed assistant response found", "info");
            return;
          }

          const selected = await pickAssistantMessage(responses, (title, items) => ctx.ui.select(title, items));
          if (!selected) return;

          await openSelectedResponse(extractMarkdownFromAssistantMessage(selected.message), ctx, openInNvim);
          return;
        }

        const message = findLatestCompletedAssistantMessage(ctx.sessionManager.getBranch());
        if (!message) {
          ctx.ui.notify("No completed assistant response found", "info");
          return;
        }

        const markdown = extractMarkdownFromAssistantMessage(message);
        if (!markdown.trim()) {
          ctx.ui.notify("Latest assistant response has no text content", "info");
          return;
        }

        const result = await openInNvim(markdown, ctx);
        if (result.cleanupError) {
          ctx.ui.notify(`Temp file cleanup failed: ${result.cleanupError.message}`, "warning");
        }
        if ((result.exitCode ?? 0) !== 0) {
          ctx.ui.notify(`nvim exited with code ${result.exitCode}`, "warning");
        }
      } catch (error) {
        const messageText = error instanceof Error ? error.message : String(error);
        ctx.ui.notify(messageText, "error");
      }
    },
  });
}

export default function responseNvimExtension(pi: ExtensionAPI): void {
  registerResponseNvimCommand(pi);
}
