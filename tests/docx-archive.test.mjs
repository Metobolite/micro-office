import assert from "node:assert/strict";
import { test } from "node:test";
import { deflateRawSync } from "node:zlib";
import { validateDocxArchive } from "../app/lib/docx-archive.mjs";

// Tiny synthetic ZIP writer: no real documents, storage, or external services.
function archive(entries) {
  const locals = [];
  const central = [];
  let offset = 0;
  for (const { name, content, declaredSize = content.length } of entries) {
    const filename = Buffer.from(name);
    const compressed = deflateRawSync(content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(declaredSize, 22);
    local.writeUInt16LE(filename.length, 26);
    locals.push(local, filename, compressed);
    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(8, 10);
    header.writeUInt32LE(compressed.length, 20);
    header.writeUInt32LE(declaredSize, 24);
    header.writeUInt16LE(filename.length, 28);
    header.writeUInt32LE(offset, 42);
    central.push(header, filename);
    offset += local.length + filename.length + compressed.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  const bytes = Buffer.concat([...locals, directory, end]);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length);
}
const document = { name: "word/document.xml", content: Buffer.from("<document>Hello</document>") };
const types = { name: "[Content_Types].xml", content: Buffer.from("<Types/>") };

test("accepts a small document and measures its real expanded size", async () => {
  assert.equal(await validateDocxArchive(archive([document, types])), document.content.length + types.content.length);
});
test("rejects a forged low size before a compressed XML bomb reaches the renderer", async () => {
  const bomb = archive([{ ...document, content: Buffer.alloc(5 * 1024 * 1024, 65), declaredSize: 1 }, types]);
  assert.ok(bomb.byteLength < 10_000);
  await assert.rejects(validateDocxArchive(bomb), /too complex/);
});
test("rejects incorrect expanded sizes even below the limit", async () => {
  await assert.rejects(validateDocxArchive(archive([{ ...document, declaredSize: 1 }, types])), /damaged/);
});
test("rejects path aliases, duplicate members, non-DOCX and truncated input", async () => {
  for (const input of [
    archive([{ ...document, name: "../word/document.xml" }, types]),
    archive([document, document, types]),
    archive([types]),
    archive([document, types]).slice(0, -1),
    new ArrayBuffer(0),
  ]) await assert.rejects(validateDocxArchive(input));
});
test("rejects oversized central-directory entry counts", async () => {
  const input = archive([document, types]);
  const view = new DataView(input);
  view.setUint16(input.byteLength - 14, 1001, true);
  view.setUint16(input.byteLength - 12, 1001, true);
  await assert.rejects(validateDocxArchive(input), /too complex/);
});
