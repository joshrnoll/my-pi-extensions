import { Minimatch } from "minimatch";

export function normalizeCommand(command: string): string {
  return command.trim();
}

export function matchesCommandSubstring(command: string, pattern: string): boolean {
  const normalizedCommand = normalizeCommand(command);
  if (!normalizedCommand || !pattern) return false;

  const matcher = new Minimatch(pattern, {
    nocase: false,
    windowsPathsNoEscape: true,
  });

  if (matcher.match(normalizedCommand)) {
    return true;
  }

  for (let start = 0; start < normalizedCommand.length; start += 1) {
    for (let end = start + 1; end <= normalizedCommand.length; end += 1) {
      if (matcher.match(normalizedCommand.slice(start, end))) {
        return true;
      }
    }
  }

  return false;
}

export function findFirstMatchingPattern(command: string, patterns: string[]): string | undefined {
  for (const pattern of patterns) {
    if (matchesCommandSubstring(command, pattern)) {
      return pattern;
    }
  }

  return undefined;
}
