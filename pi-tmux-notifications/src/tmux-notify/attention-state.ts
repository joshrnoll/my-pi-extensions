export type AttentionPhase = "none" | "done" | "input";

type Cancelable = { cancel(): void };

type AttentionControllerOptions = {
  flashMs: number;
  schedule: (ms: number, fn: () => void) => Cancelable;
  apply: (phase: AttentionPhase) => void;
};

export function createAttentionController(options: AttentionControllerOptions) {
  let phase: AttentionPhase = "none";
  let pendingInputAfterFlash = false;
  let flashTimer: Cancelable | undefined;

  const setPhase = (next: AttentionPhase) => {
    if (phase === next) return;
    phase = next;
    options.apply(next);
  };

  const clearTimer = () => {
    flashTimer?.cancel();
    flashTimer = undefined;
  };

  return {
    onSettledDone() {
      clearTimer();
      pendingInputAfterFlash = false;
      setPhase("done");
      flashTimer = options.schedule(options.flashMs, () => {
        flashTimer = undefined;
        if (pendingInputAfterFlash) {
          pendingInputAfterFlash = false;
          setPhase("input");
          return;
        }
        setPhase("none");
      });
    },
    onNeedsInput() {
      if (phase === "done") {
        pendingInputAfterFlash = true;
        return;
      }
      setPhase("input");
    },
    onAgentStart() {
      pendingInputAfterFlash = false;
      clearTimer();
      setPhase("none");
    },
    getPhase() {
      return phase;
    },
  };
}
