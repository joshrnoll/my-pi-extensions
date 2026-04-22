import { describe, expect, it } from "vitest";

import { buildLocationLine, formatTokens, formatUsageBar, replaceHomeDir, sanitizeStatusText } from "../src/format.js";

describe("formatUsageBar", () => {
  it("renders a filled bar from a percent", () => {
    expect(formatUsageBar(50, 10)).toBe("▕█████░░░░░▏");
  });

  it("renders unknown usage", () => {
    expect(formatUsageBar(null, 5)).toBe("▕?????▏");
  });
});

describe("formatTokens", () => {
  it("formats small and large token counts", () => {
    expect(formatTokens(999)).toBe("999");
    expect(formatTokens(1200)).toBe("1.2k");
    expect(formatTokens(125000)).toBe("125k");
  });
});

describe("path helpers", () => {
  it("replaces the home directory", () => {
    expect(replaceHomeDir("/Users/josh/repos", "/Users/josh")).toBe("~/repos");
  });

  it("builds a single-line location string", () => {
    expect(
      buildLocationLine("/Users/josh/repos/my-pi-extensions", "dev-cluster", 120, {
        homeDir: "/Users/josh",
        gitBranch: "main",
        sessionName: "demo",
      }),
    ).toContain("~/repos/my-pi-extensions (main) • demo • k8s:dev-cluster");
  });
});

describe("sanitizeStatusText", () => {
  it("collapses whitespace and control characters", () => {
    expect(sanitizeStatusText("foo\n\tbar\r baz")).toBe("foo bar baz");
  });
});
