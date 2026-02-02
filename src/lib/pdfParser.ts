/**
 * Minimal PDF structure parser — no external dependencies.
 * Extracts page count and MediaBox (width, height in points) for each page.
 * Supports classic xref tables and PDF 1.5+ xref streams.
 */

const PDF_HEADER = /%PDF-(\d+)\.(\d+)/;
/** Lenient: 10-digit or variable-digit offset, 5-digit or variable gen, n/f */
const XREF_ENTRY = /^(\d+)\s+(\d+)\s+([nf])/;
const POINTS_TO_PX = 96 / 72;
const DEFAULT_MEDIABOX_PT = { widthPt: 612, heightPt: 792 };

export interface PageBox {
  widthPt: number;
  heightPt: number;
  widthPx: number;
  heightPx: number;
}

export interface PDFStructure {
  pageCount: number;
  pageBoxes: PageBox[];
}

function readBytes(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}

function bytesToStr(bytes: Uint8Array, start: number, len: number): string {
  const end = Math.min(start + len, bytes.length);
  let s = '';
  for (let i = start; i < end; i++) s += String.fromCharCode(bytes[i]!);
  return s;
}

function findLastEof(bytes: Uint8Array): number {
  const eof = '%%EOF';
  let last = -1;
  for (let i = 0; i <= bytes.length - eof.length; i++) {
    if (bytesToStr(bytes, i, eof.length) === eof) last = i;
  }
  return last;
}

/** Search up to 2KB before %%EOF for startxref and the following number. */
function findStartXref(bytes: Uint8Array, beforeEof: number): number {
  const marker = 'startxref';
  const searchStart = Math.max(0, beforeEof - 2048);
  for (let i = beforeEof - 1; i >= searchStart; i--) {
    if (i - marker.length < 0) break;
    if (bytesToStr(bytes, i - marker.length, marker.length) === marker) {
      let j = i;
      while (j < beforeEof && (bytes[j] === 0x0d || bytes[j] === 0x0a || bytes[j] === 0x20)) j++;
      let num = '';
      while (j < beforeEof && bytes[j]! >= 0x30 && bytes[j]! <= 0x39) {
        num += String.fromCharCode(bytes[j]!);
        j++;
      }
      const n = parseInt(num, 10);
      if (!isNaN(n) && n >= 0) return n;
      return -1;
    }
  }
  return -1;
}

function parseXrefTable(bytes: Uint8Array, startOffset: number): Map<number, number> {
  const map = new Map<number, number>();
  const chunk = bytesToStr(bytes, startOffset, Math.min(4096, bytes.length - startOffset));
  const lines = chunk.split(/\r?\n/);
  let i = 0;
  if (lines[i]?.trim() === 'xref') i++;
  while (i < lines.length) {
    const parts = lines[i]!.trim().split(/\s+/);
    if (parts.length >= 2) {
      const objStart = parseInt(parts[0], 10);
      const count = parseInt(parts[1], 10);
      if (!isNaN(objStart) && !isNaN(count) && count >= 0) {
        for (let k = 0; k < count && i + 1 + k < lines.length; k++) {
          const line = lines[i + 1 + k]!;
          const m = XREF_ENTRY.exec(line.trim());
          if (m && m[3] === 'n') {
            const offset = parseInt(m[1], 10);
            if (!isNaN(offset)) map.set(objStart + k, offset);
          }
        }
        i += 1 + count;
        continue;
      }
    }
    i++;
  }
  return map;
}

/** Detect if byte at startOffset begins "xref" (classic) or "N M obj" (xref stream). */
function isClassicXref(bytes: Uint8Array, startOffset: number): boolean {
  let i = startOffset;
  while (i < bytes.length && (bytes[i] === 0x20 || bytes[i] === 0x0d || bytes[i] === 0x0a)) i++;
  const s = bytesToStr(bytes, i, 6);
  return s.startsWith('xref') && (s.length === 4 || /\s/.test(s[4] ?? ''));
}

/** Parse /Root and /Info from a trailer or xref stream dict string. Lenient whitespace. */
function parseRootFromDict(dictStr: string): number | null {
  const m = /\/Root\s*(\d+)\s*\d+\s*R/.exec(dictStr);
  return m ? parseInt(m[1], 10) : null;
}

function findTrailerBeforeXref(bytes: Uint8Array, xrefOffset: number): string {
  const start = Math.max(0, xrefOffset - 2048);
  return bytesToStr(bytes, start, xrefOffset - start + 256);
}

function readObjectAt(bytes: Uint8Array, offset: number, maxLen = 16384): string {
  const end = Math.min(offset + maxLen, bytes.length);
  return bytesToStr(bytes, offset, end - offset);
}

function parseDictGetRef(objStr: string, key: string): number | null {
  const re = new RegExp(`/${key}\\s*(\\d+)\\s*\\d+\\s*R`);
  const m = re.exec(objStr);
  return m ? parseInt(m[1], 10) : null;
}

function parseDictGetNumber(objStr: string, key: string): number | null {
  const re = new RegExp(`/${key}\\s*([\\d.-]+)`);
  const m = re.exec(objStr);
  return m ? parseFloat(m[1]) : null;
}

function parseDictGetRefArray(objStr: string, key: string): number[] {
  const re = new RegExp(`/${key}\\s*\\[([^\\]]+)\\]`, 's');
  const m = re.exec(objStr);
  if (!m) return [];
  const refRe = /(\d+)\s*\d+\s*R/g;
  const refs: number[] = [];
  let r;
  while ((r = refRe.exec(m[1])) !== null) refs.push(parseInt(r[1], 10));
  return refs;
}

function parseMediaBox(objStr: string): PageBox | null {
  const m = /\/MediaBox\s*\[\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*\]/.exec(objStr);
  if (!m) return null;
  const x0 = parseFloat(m[1]);
  const y0 = parseFloat(m[2]);
  const x1 = parseFloat(m[3]);
  const y1 = parseFloat(m[4]);
  const widthPt = Math.abs(x1 - x0);
  const heightPt = Math.abs(y1 - y0);
  if (widthPt <= 0 || heightPt <= 0) return null;
  return {
    widthPt,
    heightPt,
    widthPx: Math.round(widthPt * POINTS_TO_PX),
    heightPx: Math.round(heightPt * POINTS_TO_PX),
  };
}

/** PDF FlateDecode: zlib format. Uses DecompressionStream('deflate'). */
async function flateDecode(raw: Uint8Array): Promise<Uint8Array> {
  if (raw.length < 2) return raw;
  const copy = raw.slice();
  const stream = new Blob([copy]).stream();
  const ds = new DecompressionStream('deflate');
  const decompressed = stream.pipeThrough(ds);
  const chunks: Uint8Array[] = [];
  const reader = decompressed.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const totalLen = chunks.reduce((a, c) => a + c.length, 0);
  const buf = new ArrayBuffer(totalLen);
  const out = new Uint8Array(buf);
  let off = 0;
  for (const c of chunks) {
    out.set(new Uint8Array(c), off);
    off += c.length;
  }
  return new Uint8Array(buf);
}

/** Parse xref stream at given offset: build object number -> byte offset map. */
async function parseXrefStream(
  bytes: Uint8Array,
  startOffset: number
): Promise<{ xrefMap: Map<number, number>; dictStr: string } | null> {
  const objStr = readObjectAt(bytes, startOffset);
  const objHeader = /^(\d+)\s+\d+\s+obj\s*/.exec(objStr);
  if (!objHeader) return null;
  const dictEnd = objStr.indexOf('>>');
  if (dictEnd < 0) return null;
  const dictStr = objStr.slice(0, dictEnd + 2);
  const size = parseDictGetNumber(dictStr, 'Size');
  if (size == null || size < 0) return null;
  const wArr: number[] = [];
  const wMatch = /\/W\s*\[\s*([\d\s]+)\]\s*/.exec(dictStr);
  if (wMatch) {
    wArr.push(...wMatch[1].trim().split(/\s+/).map((n) => parseInt(n, 10)));
  }
  if (wArr.length < 3) return null;
  const w0 = wArr[0]!;
  const w1 = wArr[1]!;
  const w2 = wArr[2]!;
  const entryLen = w0 + w1 + w2;
  const indexPairs: [number, number][] = [];
  const indexMatch = /\/Index\s*\[\s*([^\]]+)\]\s*/.exec(dictStr);
  if (indexMatch) {
    const nums = indexMatch[1].trim().split(/\s+/).map((n) => parseInt(n, 10));
    for (let i = 0; i + 1 < nums.length; i += 2) indexPairs.push([nums[i]!, nums[i + 1]!]);
  }
  if (indexPairs.length === 0) indexPairs.push([0, size]);
  const streamMarker = objStr.indexOf('stream');
  if (streamMarker < 0) return null;
  let dataStart = streamMarker + 6;
  if (dataStart < bytes.length - startOffset && bytes[startOffset + dataStart] === 0x0d) dataStart++;
  if (dataStart < bytes.length - startOffset && bytes[startOffset + dataStart] === 0x0a) dataStart++;
  const lengthVal = parseDictGetNumber(dictStr, 'Length');
  const streamLen = lengthVal != null && lengthVal >= 0 ? lengthVal : 0;
  const streamBytes = bytes.slice(startOffset + dataStart, startOffset + dataStart + streamLen);
  let data: Uint8Array = streamBytes;
  if (/\/Filter\s*\/FlateDecode/.test(dictStr)) {
    try {
      data = (await flateDecode(streamBytes)) as Uint8Array;
    } catch {
      return null;
    }
  }
  const xrefMap = new Map<number, number>();
  let pos = 0;
  for (const [firstObj, count] of indexPairs) {
    for (let k = 0; k < count; k++) {
      if (pos + entryLen > data.length) break;
      const type = readIntBE(data, pos, w0);
      pos += w0;
      const v1 = readIntBE(data, pos, w1);
      pos += w1;
      pos += w2;
      if (type === 1) xrefMap.set(firstObj + k, v1);
    }
  }
  return { xrefMap, dictStr };
}

function readIntBE(data: Uint8Array, offset: number, numBytes: number): number {
  let n = 0;
  for (let i = 0; i < numBytes && offset + i < data.length; i++) {
    n = (n << 8) | (data[offset + i]! & 0xff);
  }
  return n >>> 0;
}

/** Fallback: scan file for /Type /Pages and /Count N to get page count; use default MediaBox. */
function fallbackPageCountAndBoxes(bytes: Uint8Array): PDFStructure | null {
  const str = bytesToStr(bytes, 0, Math.min(bytes.length, 512 * 1024));
  const countMatch = /\/Count\s*(\d+)/.exec(str);
  const pageCount = countMatch ? parseInt(countMatch[1], 10) : 0;
  if (pageCount <= 0 || pageCount > 50000) return null;
  const defaultBox: PageBox = {
    ...DEFAULT_MEDIABOX_PT,
    widthPx: Math.round(DEFAULT_MEDIABOX_PT.widthPt * POINTS_TO_PX),
    heightPx: Math.round(DEFAULT_MEDIABOX_PT.heightPt * POINTS_TO_PX),
  };
  const pageBoxes = Array.from({ length: pageCount }, () => ({ ...defaultBox }));
  return { pageCount, pageBoxes };
}

/**
 * Parse PDF buffer to extract page count and MediaBox for each page.
 * Supports classic xref table and PDF 1.5+ xref streams. Falls back to /Count scan if needed.
 */
export async function parsePdfStructure(buffer: ArrayBuffer): Promise<PDFStructure | null> {
  const bytes = readBytes(buffer);
  if (bytes.length < 100) return null;
  const header = bytesToStr(bytes, 0, 20);
  if (!PDF_HEADER.test(header)) return null;

  const eofPos = findLastEof(bytes);
  if (eofPos < 0) return null;

  const xrefOffset = findStartXref(bytes, eofPos);
  if (xrefOffset < 0) return null;

  let xrefMap: Map<number, number>;
  let rootObjNum: number | null = null;

  if (isClassicXref(bytes, xrefOffset)) {
    xrefMap = parseXrefTable(bytes, xrefOffset);
    if (xrefMap.size === 0) return null;
    const trailerStr = findTrailerBeforeXref(bytes, xrefOffset);
    rootObjNum = parseRootFromDict(trailerStr);
  } else {
    let streamResult: { xrefMap: Map<number, number>; dictStr: string } | null = null;
    try {
      streamResult = await parseXrefStream(bytes, xrefOffset);
    } catch {
      // ignore
    }
    if (!streamResult) return null;
    xrefMap = streamResult.xrefMap;
    rootObjNum = parseRootFromDict(streamResult.dictStr);
    if (rootObjNum == null) {
      const trailerStr = findTrailerBeforeXref(bytes, xrefOffset);
      rootObjNum = parseRootFromDict(trailerStr);
    }
  }

  if (rootObjNum == null) return null;
  const rootOffset = xrefMap.get(rootObjNum);
  if (rootOffset == null) return null;

  const rootStr = readObjectAt(bytes, rootOffset);
  const pagesObjNum = parseDictGetRef(rootStr, 'Pages');
  if (pagesObjNum == null) return null;

  const pageBoxes: PageBox[] = [];
  const collectPages = (objNum: number): boolean => {
    const off = xrefMap.get(objNum);
    if (off == null) return false;
    const objStr = readObjectAt(bytes, off);
    const count = parseDictGetNumber(objStr, 'Count');
    const kids = parseDictGetRefArray(objStr, 'Kids');
    if (kids.length > 0) {
      for (const k of kids) if (!collectPages(k)) return false;
      return true;
    }
    if (count !== null && count === 0) return true;
    const box = parseMediaBox(objStr);
    if (box) pageBoxes.push(box);
    return true;
  };

  if (!collectPages(pagesObjNum)) {
    return fallbackPageCountAndBoxes(bytes);
  }
  if (pageBoxes.length === 0) {
    return fallbackPageCountAndBoxes(bytes);
  }

  return {
    pageCount: pageBoxes.length,
    pageBoxes,
  };
}
