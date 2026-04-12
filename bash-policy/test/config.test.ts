import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, parseConfig, resolveConfigPaths } from "../src/config.ts";

async function makeRoots() {
  const root = await mkdtemp(join(tmpdir(), "bash-policy-config-"));
  const cwd = join(root, "project");
  const homeDir = join(root, "home");
  await mkdir(cwd, { recursive: true });
  await mkdir(homeDir, { recursive: true });
  return { cwd, homeDir };
}

test("resolveConfigPaths returns deterministic project and global paths", () => {
  const paths = resolveConfigPaths("/repo", "/home/tester");
  assert.equal(paths.projectConfigPath, "/repo/.pi/bash-policy.json");
  assert.equal(paths.globalConfigPath, "/home/tester/.pi/agent/extensions/bash-policy.json");
});

test("parseConfig accepts empty and partial configs", () => {
  assert.deepEqual(parseConfig("{}"), { allow: [], deny: [] });
  assert.deepEqual(parseConfig('{"allow": ["git status"]}'), { allow: ["git status"], deny: [] });
  assert.deepEqual(parseConfig('{"deny": ["rm -rf *"]}'), { allow: [], deny: ["rm -rf *"] });
});

test("loadConfig returns missing state when neither config exists", async () => {
  const { cwd, homeDir } = await makeRoots();
  const state = await loadConfig({ cwd, homeDir });

  assert.equal(state.status, "missing");
  assert.deepEqual(state.policy, { allow: [], deny: [] });
  assert.equal(state.notification.severity, "warning");
});

test("loadConfig prefers project config over global config", async () => {
  const { cwd, homeDir } = await makeRoots();
  const paths = resolveConfigPaths(cwd, homeDir);
  await mkdir(join(cwd, ".pi"), { recursive: true });
  await mkdir(join(homeDir, ".pi/agent/extensions"), { recursive: true });
  await writeFile(paths.projectConfigPath, JSON.stringify({ allow: ["git status"] }));
  await writeFile(paths.globalConfigPath, JSON.stringify({ allow: ["kubectl get *"] }));

  const state = await loadConfig({ cwd, homeDir });
  assert.equal(state.status, "loaded");
  assert.equal(state.sourcePath, paths.projectConfigPath);
  assert.deepEqual(state.policy, { allow: ["git status"], deny: [] });
});

test("loadConfig falls back to global config only when project config is absent", async () => {
  const { cwd, homeDir } = await makeRoots();
  const paths = resolveConfigPaths(cwd, homeDir);
  await mkdir(join(homeDir, ".pi/agent/extensions"), { recursive: true });
  await writeFile(paths.globalConfigPath, JSON.stringify({ deny: ["rm -rf *"] }));

  const state = await loadConfig({ cwd, homeDir });
  assert.equal(state.status, "loaded");
  assert.equal(state.sourcePath, paths.globalConfigPath);
  assert.deepEqual(state.policy, { allow: [], deny: ["rm -rf *"] });
});

test("malformed project config does not fall back to global config", async () => {
  const { cwd, homeDir } = await makeRoots();
  const paths = resolveConfigPaths(cwd, homeDir);
  await mkdir(join(cwd, ".pi"), { recursive: true });
  await mkdir(join(homeDir, ".pi/agent/extensions"), { recursive: true });
  await writeFile(paths.projectConfigPath, "{ not-json");
  await writeFile(paths.globalConfigPath, JSON.stringify({ allow: ["git status"] }));

  const state = await loadConfig({ cwd, homeDir });
  assert.equal(state.status, "invalid");
  assert.equal(state.selectedPath, paths.projectConfigPath);
  assert.deepEqual(state.policy, { allow: [], deny: [] });
  assert.equal(state.notification.severity, "error");
});

test("invalid schema falls back to empty policy", async () => {
  const { cwd, homeDir } = await makeRoots();
  const paths = resolveConfigPaths(cwd, homeDir);
  await mkdir(join(cwd, ".pi"), { recursive: true });
  await writeFile(paths.projectConfigPath, JSON.stringify({ allow: [123] }));

  const state = await loadConfig({ cwd, homeDir });
  assert.equal(state.status, "invalid");
  assert.deepEqual(state.policy, { allow: [], deny: [] });
});
