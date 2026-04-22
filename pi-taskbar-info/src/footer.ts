import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth, type Component, type TUI } from "@mariozechner/pi-tui";

interface FooterTheme {
  fg(color: string, text: string): string;
}

interface FooterDataProvider {
  getGitBranch(): string | null;
  getExtensionStatuses(): ReadonlyMap<string, string>;
  getAvailableProviderCount(): number;
  onBranchChange(listener: () => void): () => void;
}

import { buildLocationLine, formatContextPercent, formatUsageBar, sanitizeStatusText } from "./format.js";

const REFRESH_MS = 5000;

type FooterDependencies = {
  getK8sContext: (cwd: string) => Promise<string>;
};

function getCurrentThinkingLevel(ctx: ExtensionContext): string {
  let thinkingLevel = "off";

  for (const entry of ctx.sessionManager.getBranch()) {
    if (entry.type === "thinking_level_change") {
      thinkingLevel = entry.thinkingLevel;
    }
  }

  return thinkingLevel;
}

export function createTaskbarFooter(
  tui: TUI,
  theme: FooterTheme,
  footerData: FooterDataProvider,
  ctx: ExtensionContext,
  dependencies: FooterDependencies,
): Component & { dispose(): void } {
  let k8sContext = "loading...";
  let disposed = false;
  let refreshInFlight: Promise<void> | undefined;

  const refresh = async () => {
    if (disposed || refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
      const nextContext = await dependencies.getK8sContext(ctx.cwd);

      if (!disposed && nextContext !== k8sContext) {
        k8sContext = nextContext;
        tui.requestRender();
      }
    })().finally(() => {
      refreshInFlight = undefined;
    });

    return refreshInFlight;
  };

  void refresh();
  const branchUnsub = footerData.onBranchChange(() => tui.requestRender());
  const interval = setInterval(() => {
    void refresh();
  }, REFRESH_MS);

  return {
    dispose() {
      disposed = true;
      clearInterval(interval);
      branchUnsub();
    },
    invalidate() {},
    render(width: number): string[] {
      const contextUsage = ctx.getContextUsage();
      const contextPercentValue = contextUsage?.percent ?? null;
      const usageBar = formatUsageBar(contextPercentValue);
      const contextDisplay = `${usageBar} ${formatContextPercent(contextPercentValue)}`;

      let coloredContextDisplay = contextDisplay;
      if (contextPercentValue !== null && contextPercentValue > 90) {
        coloredContextDisplay = theme.fg("error", contextDisplay);
      } else if (contextPercentValue !== null && contextPercentValue > 70) {
        coloredContextDisplay = theme.fg("warning", contextDisplay);
      }

      let statsLeft = coloredContextDisplay;
      let statsLeftWidth = visibleWidth(statsLeft);
      if (statsLeftWidth > width) {
        statsLeft = truncateToWidth(statsLeft, width, "...");
        statsLeftWidth = visibleWidth(statsLeft);
      }

      const modelName = ctx.model?.id || "no-model";
      const rightSideBase = ctx.model?.reasoning ? `${modelName} • ${getCurrentThinkingLevel(ctx)}` : modelName;
      let rightSide = rightSideBase;
      if (footerData.getAvailableProviderCount() > 1 && ctx.model) {
        const providerSide = `(${ctx.model.provider}) ${rightSideBase}`;
        if (statsLeftWidth + 2 + visibleWidth(providerSide) <= width) {
          rightSide = providerSide;
        }
      }

      const rightSideWidth = visibleWidth(rightSide);
      const statsLine =
        statsLeftWidth + 2 + rightSideWidth <= width
          ? `${statsLeft}${" ".repeat(width - statsLeftWidth - rightSideWidth)}${rightSide}`
          : statsLeft;

      const locationLine = buildLocationLine(ctx.cwd, k8sContext, width, {
        homeDir: process.env.HOME || process.env.USERPROFILE,
        gitBranch: footerData.getGitBranch(),
        sessionName: ctx.sessionManager.getSessionName(),
      });

      const dimStatsLeft = theme.fg("dim", statsLeft);
      const statsRemainder = statsLine.slice(statsLeft.length);
      const dimStatsRemainder = theme.fg("dim", statsRemainder);

      const lines = [theme.fg("dim", locationLine), "", dimStatsLeft + dimStatsRemainder];
      const extensionStatuses = footerData.getExtensionStatuses();
      if (extensionStatuses.size > 0) {
        const statusEntries = Array.from(extensionStatuses.entries()) as Array<[string, string]>;
        const statusLine = statusEntries
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, text]) => sanitizeStatusText(text))
          .join(" ");
        lines.push(truncateToWidth(statusLine, width, theme.fg("dim", "...")));
      }

      return lines;
    },
  };
}
