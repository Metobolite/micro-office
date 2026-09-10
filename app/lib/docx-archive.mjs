// Check real inflated bytes in a worker before docx-preview/JSZip touches the
// document. ZIP headers alone are attacker-controlled and are not a size limit.
export const DOCX_MAX_EXPANDED_BYTES = 64 * 1024 * 1024;
const MAX_ENTRY_BYTES = 16 * 1024 * 1024;
const MAX_XML_BYTES = 4 * 1024 * 1024;
const MAX_ENTRIES = 1000;

/** @param {ArrayBuffer} buffer */
export async function validateDocxArchive(buffer) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const invalid = () => new Error("This document has an unsupported or damaged archive.");
  const tooLarge = () => new Error("This document is too complex to preview. Please download it instead.");
  if (bytes.length < 22 || bytes.length > 20 * 1024 * 1024) throw invalid();

  let end = bytes.length - 22;
  const minimum = Math.max(0, end - 65535);
  while (end >= minimum && !(view.getUint32(end, true) === 0x06054b50 && end + 22 + view.getUint16(end + 20, true) === bytes.length)) end--;
  if (end < minimum) throw invalid();
  const count = view.getUint16(end + 10, true);
  const directorySize = view.getUint32(end + 12, true);
  const directoryOffset = view.getUint32(end + 16, true);
  if (view.getUint16(end + 4, true) !== 0 || view.getUint16(end + 6, true) !== 0 ||
      view.getUint16(end + 8, true) !== count || directoryOffset + directorySize !== end) throw invalid();
  if (!count || count > MAX_ENTRIES) throw tooLarge();

  let cursor = directoryOffset;
  let expandedTotal = 0;
  let hasDocument = false;
  const names = new Set();
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50) throw invalid();
    const flags = view.getUint16(cursor + 8, true);
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const expandedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const next = cursor + 46 + nameLength + extraLength + commentLength;
    if (next > end || (flags & 1) || ![0, 8].includes(method) || view.getUint16(cursor + 34, true) !== 0) throw invalid();
    const nameBytes = bytes.subarray(cursor + 46, cursor + 46 + nameLength);
    const name = new TextDecoder("utf-8", { fatal: true }).decode(nameBytes);
    if (!name || names.has(name) || name.includes("\\") || name.startsWith("/") || name.split("/").some((part) => part === ".." || part === ".")) throw invalid();
    names.add(name);
    hasDocument ||= name === "word/document.xml";
    const entryLimit = /\.(?:xml|rels)$/i.test(name) ? MAX_XML_BYTES : MAX_ENTRY_BYTES;
    if (expandedSize > entryLimit || expandedTotal + expandedSize > DOCX_MAX_EXPANDED_BYTES) throw tooLarge();

    if (localOffset + 30 > directoryOffset || view.getUint32(localOffset, true) !== 0x04034b50 ||
        view.getUint16(localOffset + 6, true) !== flags || view.getUint16(localOffset + 8, true) !== method ||
        view.getUint16(localOffset + 26, true) !== nameLength) throw invalid();
    const start = localOffset + 30 + nameLength + view.getUint16(localOffset + 28, true);
    if (start + compressedSize > directoryOffset ||
        !nameBytes.every((byte, position) => byte === bytes[localOffset + 30 + position])) throw invalid();

    let inflated = 0;
    if (method === 0) {
      inflated = compressedSize;
    } else {
      const reader = new Blob([bytes.subarray(start, start + compressedSize)]).stream()
        .pipeThrough(new DecompressionStream("deflate-raw")).getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          inflated += value.byteLength;
          if (inflated > entryLimit || expandedTotal + inflated > DOCX_MAX_EXPANDED_BYTES) throw tooLarge();
        }
      } finally {
        await reader.cancel();
      }
    }
    if (inflated > entryLimit || expandedTotal + inflated > DOCX_MAX_EXPANDED_BYTES) throw tooLarge();
    if (inflated !== expandedSize) throw invalid();
    expandedTotal += inflated;
    cursor = next;
  }
  if (cursor !== end || !hasDocument || !names.has("[Content_Types].xml")) throw invalid();
  return expandedTotal;
}
