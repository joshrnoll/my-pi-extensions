import type { AttentionPhase } from "./attention-state";

export const TMUX_ATTENTION_OPTION = "@pi_attention_state";

export type ExecResult = { code: number; stdout: string; stderr: string };
export type ExecFn = (command: string, args: string[]) => Promise<ExecResult>;

export function isTmuxEnvironment(env: Record<string, string | undefined>): boolean {
  return Boolean(env.TMUX && env.TMUX_PANE);
}

export function buildWindowTarget(env: Record<string, string | undefined>): string | undefined {
  return env.TMUX_PANE;
}

export function buildSetAttentionCommand(target: string, phase: Exclude<AttentionPhase, "none">): string[] {
  return ["set-window-option", "-t", target, TMUX_ATTENTION_OPTION, phase];
}

export function buildClearAttentionCommand(target: string): string[] {
  return ["set-window-option", "-u", "-t", target, TMUX_ATTENTION_OPTION];
}

export function createTmuxAttentionWriter(options: {
  env: Record<string, string | undefined>;
  exec: ExecFn;
}) {
  const target = buildWindowTarget(options.env);
  const enabled = isTmuxEnvironment(options.env) && Boolean(target);

  return {
    async apply(phase: AttentionPhase) {
      if (!enabled || !target) return;

      const args = phase === "none" ? buildClearAttentionCommand(target) : buildSetAttentionCommand(target, phase);
      try {
        await options.exec("tmux", args);
      } catch {
        // Reason: tmux integration is best-effort and should never break pi itself.
      }
    },
  };
}
