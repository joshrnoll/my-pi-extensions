import { truncateToWidth } from "@mariozechner/pi-tui";

const DIRECTORY_ICON = "📁";
const K8S_ICON = "☸";

export function sanitizeStatusText(text: string): string {
  return text
    .replace(/[\r\n\t]/g, " ")
    .replace(/ +/g, " ")
    .trim();
}

export function formatTokens(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  if (count < 1000000) return `${Math.round(count / 1000)}k`;
  if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
  return `${Math.round(count / 1000000)}M`;
}

export function replaceHomeDir(path: string, homeDir: string | undefined): string {
  if (!homeDir || !path.startsWith(homeDir)) return path;
  return `~${path.slice(homeDir.length)}`;
}

export function formatUsageBar(percent: number | null, width = 12): string {
  if (percent === null || Number.isNaN(percent)) {
    return `▕${"?".repeat(width)}▏`;
  }

  const clampedPercent = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clampedPercent / 100) * width);
  return `▕${"█".repeat(filled)}${"░".repeat(width - filled)}▏`;
}

export function formatContextPercent(percent: number | null): string {
  if (percent === null || Number.isNaN(percent)) {
    return "?%";
  }

  return `${Math.round(Math.max(0, Math.min(100, percent)))}%`;
}

export function buildLocationLine(
  cwd: string,
  k8sContext: string,
  width: number,
  options: {
    homeDir?: string;
    gitBranch?: string | null;
    sessionName?: string | null;
  } = {},
): string {
  let pwd = replaceHomeDir(cwd, options.homeDir);

  if (options.gitBranch) {
    pwd = `${pwd} (${options.gitBranch})`;
  }

  const parts = [`${DIRECTORY_ICON} ${pwd}`];

  if (options.sessionName) {
    parts.push(options.sessionName);
  }

  parts.push(`${K8S_ICON} ${k8sContext}`);

  return truncateToWidth(parts.join(" | "), width, "...");
}
