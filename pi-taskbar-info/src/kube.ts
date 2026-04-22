import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const KUBECTL_TIMEOUT_MS = 1500;

export async function getCurrentK8sContext(
  pi: Pick<ExtensionAPI, "exec">,
  cwd: string,
): Promise<string> {
  try {
    const result = await pi.exec("kubectl", ["config", "current-context"], {
      cwd,
      timeout: KUBECTL_TIMEOUT_MS,
    });

    if (result.code !== 0) {
      return "none";
    }

    const context = result.stdout.trim();
    return context.length > 0 ? context : "none";
  } catch {
    return "none";
  }
}
