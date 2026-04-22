import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

import { createTaskbarFooter } from "./footer.js";
import { getCurrentK8sContext } from "./kube.js";

export default function taskbarInfoExtension(pi: ExtensionAPI): void {
  pi.on("session_start", async (_event, ctx) => {
    if (!ctx.hasUI) return;

    ctx.ui.setFooter((tui, theme, footerData) =>
      createTaskbarFooter(tui, theme, footerData, ctx, {
        getK8sContext: (cwd) => getCurrentK8sContext(pi, cwd),
      }),
    );
  });
}
