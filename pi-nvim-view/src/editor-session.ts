import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface EditorProcessResult {
  status: number | null;
  error?: NodeJS.ErrnoException;
}

export interface DisposableEditorDeps {
  mkdtemp: (prefix: string) => Promise<string>;
  writeFile: (filePath: string, contents: string, encoding: BufferEncoding) => Promise<void>;
  rm: (filePath: string, options: { recursive: true; force: true }) => Promise<void>;
  spawnEditor: (filePath: string) => EditorProcessResult;
}

export class EditorLaunchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EditorLaunchError";
  }
}

export async function openDisposableMarkdown(
  markdown: string,
  overrides: Partial<DisposableEditorDeps> = {},
): Promise<{ exitCode: number | null; cleanupError?: Error }> {
  const deps: DisposableEditorDeps = {
    mkdtemp,
    writeFile,
    rm,
    spawnEditor: () => ({ status: 0 }),
    ...overrides,
  };

  const tempDir = await deps.mkdtemp(join(tmpdir(), "pi-response-"));
  const filePath = join(tempDir, "latest-response.md");
  let cleanupError: Error | undefined;

  await deps.writeFile(filePath, markdown, "utf8");

  let exitCode: number | null = 0;
  try {
    const result = deps.spawnEditor(filePath);

    if (result.error?.code === "ENOENT") {
      throw new EditorLaunchError("nvim not found on PATH");
    }

    if (result.error) {
      throw result.error;
    }

    exitCode = result.status ?? 0;
  } finally {
    try {
      await deps.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      cleanupError = error instanceof Error ? error : new Error(String(error));
    }
  }

  return { exitCode, cleanupError };
}
