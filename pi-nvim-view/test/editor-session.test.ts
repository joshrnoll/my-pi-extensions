import assert from "node:assert/strict";
import test from "node:test";

import {
  EditorLaunchError,
  openDisposableMarkdown,
  type DisposableEditorDeps,
} from "../src/editor-session.js";

function createDeps(overrides: Partial<DisposableEditorDeps> = {}): DisposableEditorDeps {
  return {
    mkdtemp: overrides.mkdtemp ?? (async () => "/tmp/pi-response-abc123"),
    writeFile: overrides.writeFile ?? (async () => undefined),
    rm: overrides.rm ?? (async () => undefined),
    spawnEditor: overrides.spawnEditor ?? (() => ({ status: 0 })),
  };
}

test("openDisposableMarkdown writes markdown, launches the editor, and removes the temp directory", async () => {
  const calls: string[] = [];
  const deps = createDeps({
    writeFile: async (path, contents) => {
      calls.push(`write:${String(path)}:${String(contents)}`);
    },
    spawnEditor: (path) => {
      calls.push(`spawn:${path}`);
      return { status: 0 };
    },
    rm: async (path) => {
      calls.push(`rm:${String(path)}`);
    },
  });

  const result = await openDisposableMarkdown("# Latest response", deps);

  assert.equal(result.exitCode, 0);
  assert.equal(result.cleanupError, undefined);
  assert.deepEqual(calls, [
    "write:/tmp/pi-response-abc123/latest-response.md:# Latest response",
    "spawn:/tmp/pi-response-abc123/latest-response.md",
    "rm:/tmp/pi-response-abc123",
  ]);
});

test("openDisposableMarkdown turns ENOENT into a clear EditorLaunchError and still cleans up", async () => {
  const calls: string[] = [];
  const deps = createDeps({
    spawnEditor: () => {
      const error = Object.assign(new Error("spawn nvim ENOENT"), { code: "ENOENT" });
      return { status: null, error };
    },
    rm: async (path) => {
      calls.push(`rm:${String(path)}`);
    },
  });

  await assert.rejects(() => openDisposableMarkdown("# Latest response", deps), EditorLaunchError);
  assert.deepEqual(calls, ["rm:/tmp/pi-response-abc123"]);
});

test("openDisposableMarkdown returns a cleanup error without discarding a successful editor exit", async () => {
  const deps = createDeps({
    rm: async () => {
      throw new Error("cleanup failed");
    },
  });

  const result = await openDisposableMarkdown("# Latest response", deps);

  assert.equal(result.exitCode, 0);
  assert.equal(result.cleanupError?.message, "cleanup failed");
});
