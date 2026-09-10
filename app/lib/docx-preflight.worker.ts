import { validateDocxArchive } from "./docx-archive.mjs";

self.onmessage = async (event: MessageEvent<ArrayBuffer>) => {
  try {
    if (!(event.data instanceof ArrayBuffer)) throw new Error("Invalid document.");
    await validateDocxArchive(event.data);
    self.postMessage({ buffer: event.data }, { transfer: [event.data] });
  } catch {
    self.postMessage({ error: "This document is too complex or damaged to preview. Please download it instead." });
  }
};
