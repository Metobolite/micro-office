export function preflightDocx(buffer: ArrayBuffer, signal: AbortSignal): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Preview cancelled.", "AbortError"));
      return;
    }
    const worker = new Worker(new URL("./docx-preflight.worker.ts", import.meta.url));
    const cleanup = () => {
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
      worker.terminate();
    };
    const abort = () => {
      cleanup();
      reject(new DOMException("Preview cancelled.", "AbortError"));
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("This document took too long to check. Please download it instead."));
    }, 10_000);
    worker.onmessage = (event: MessageEvent<{ buffer?: ArrayBuffer; error?: string }>) => {
      cleanup();
      if (event.data.buffer instanceof ArrayBuffer) resolve(event.data.buffer);
      else reject(new Error(event.data.error || "The document could not be checked."));
    };
    worker.onerror = () => {
      cleanup();
      reject(new Error("The document could not be checked. Please download it instead."));
    };
    signal.addEventListener("abort", abort, { once: true });
    worker.postMessage(buffer, [buffer]);
  });
}
