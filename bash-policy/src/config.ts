import { access, readFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { invalidConfigMessage, loadedConfigMessage, NO_CONFIG_MESSAGE } from "./messages.js";

export interface BashPolicyConfig {
  allow: string[];
  deny: string[];
}

export interface BashPolicyPaths {
  projectConfigPath: string;
  globalConfigPath: string;
}

export interface BashPolicyNotification {
  message: string;
  severity: "info" | "warning" | "error";
}

export interface BashPolicyState {
  policy: BashPolicyConfig;
  sourcePath?: string;
  selectedPath?: string;
  status: "loaded" | "missing" | "invalid";
  notification: BashPolicyNotification;
}

export interface LoadConfigOptions {
  cwd: string;
  homeDir?: string;
}

export function emptyPolicy(): BashPolicyConfig {
  return { allow: [], deny: [] };
}

export function resolveConfigPaths(cwd: string, homeDir = homedir()): BashPolicyPaths {
  return {
    projectConfigPath: resolve(cwd, ".pi/bash-policy.json"),
    globalConfigPath: resolve(homeDir, ".pi/agent/extensions/bash-policy.json"),
  };
}

export function parseConfig(text: string): BashPolicyConfig {
  const parsed: unknown = JSON.parse(text);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Config must be an object");
  }

  const candidate = parsed as Record<string, unknown>;
  const allow = parseRuleArray(candidate.allow, "allow");
  const deny = parseRuleArray(candidate.deny, "deny");

  return { allow, deny };
}

function parseRuleArray(value: unknown, key: "allow" | "deny"): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${key} must be an array of strings`);
  }
  return [...value];
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function loadConfig(options: LoadConfigOptions): Promise<BashPolicyState> {
  const { cwd, homeDir } = options;
  const paths = resolveConfigPaths(cwd, homeDir);
  const projectExists = await pathExists(paths.projectConfigPath);

  if (projectExists) {
    return loadSelectedConfig(paths.projectConfigPath);
  }

  const globalExists = await pathExists(paths.globalConfigPath);
  if (globalExists) {
    return loadSelectedConfig(paths.globalConfigPath);
  }

  return {
    policy: emptyPolicy(),
    status: "missing",
    notification: { message: NO_CONFIG_MESSAGE, severity: "warning" },
  };
}

async function loadSelectedConfig(path: string): Promise<BashPolicyState> {
  try {
    const text = await readFile(path, "utf8");
    const policy = parseConfig(text);

    return {
      policy,
      sourcePath: path,
      selectedPath: path,
      status: "loaded",
      notification: { message: loadedConfigMessage(path), severity: "info" },
    };
  } catch {
    return {
      policy: emptyPolicy(),
      selectedPath: path,
      status: "invalid",
      notification: { message: invalidConfigMessage(path), severity: "error" },
    };
  }
}
