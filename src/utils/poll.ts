import type { UploadSession } from "../types.js";

export async function waitForUploadSession(
  getSession: () => Promise<UploadSession>,
  options: {
    intervalMs?: number;
    timeoutMs?: number;
    signal?: AbortSignal;
  } = {},
): Promise<UploadSession> {
  const intervalMs = options.intervalMs ?? 500;
  const timeoutMs = options.timeoutMs ?? 120_000;
  const started = Date.now();

  while (true) {
    if (options.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const session = await getSession();

    if (session.status === "COMPLETED") {
      return session;
    }

    if (session.status === "FAILED" || session.status === "CANCELLED") {
      throw new Error(
        `Upload session ${session.id} ended with status ${session.status}.`,
      );
    }

    if (Date.now() - started >= timeoutMs) {
      throw new Error(
        `Timed out waiting for upload session ${session.id} to complete.`,
      );
    }

    await sleep(intervalMs, options.signal);
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
