import {
  ZIP_CENTRAL_HEADER_SIGNATURE,
  ZIP_CRC_POLYNOMIAL,
  ZIP_CRC_SEED,
  ZIP_CRC_TABLE_SIZE,
  ZIP_DEFLATE_METHOD,
  ZIP_END_OF_DIRECTORY_SIGNATURE,
  ZIP_FIXED_DOS_DATE,
  ZIP_FIXED_DOS_TIME,
  ZIP_LOCAL_HEADER_SIGNATURE,
  ZIP_UTF8_FLAG,
  ZIP_VERSION_NEEDED,
} from '../constants/zip.constants';
import type { PreparedZipEntry, ZipEntry } from '../types/zip.types';

/** Precomputed CRC-32 lookup table. */
const crcTable = Array.from({ length: ZIP_CRC_TABLE_SIZE }, (_, byte) => {
  let value = byte;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) === 1 ? ZIP_CRC_POLYNOMIAL ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

const crc32 = (bytes: Uint8Array): number => {
  let value = ZIP_CRC_SEED;
  for (const byte of bytes) value = (crcTable[(value ^ byte) & 0xff] ?? 0) ^ (value >>> 8);
  return (value ^ ZIP_CRC_SEED) >>> 0;
};

const deflate = async (bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> => {
  const compressed = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(compressed).arrayBuffer());
};

const asBytes = (contents: string | Uint8Array): Uint8Array<ArrayBuffer> => {
  if (typeof contents === 'string') return new TextEncoder().encode(contents);
  const copied = new Uint8Array(new ArrayBuffer(contents.byteLength));
  copied.set(contents);
  return copied;
};

const prepare = async (entry: ZipEntry): Promise<PreparedZipEntry> => {
  const contents = asBytes(entry.contents);
  return {
    checksum: crc32(contents),
    compressed: await deflate(contents),
    name: new TextEncoder().encode(entry.path),
    originalLength: contents.byteLength,
  };
};

const writeLocalHeader = (entry: PreparedZipEntry): Uint8Array => {
  const header = new DataView(new ArrayBuffer(30));
  header.setUint32(0, ZIP_LOCAL_HEADER_SIGNATURE, true);
  header.setUint16(4, ZIP_VERSION_NEEDED, true);
  header.setUint16(6, ZIP_UTF8_FLAG, true);
  header.setUint16(8, ZIP_DEFLATE_METHOD, true);
  header.setUint16(10, ZIP_FIXED_DOS_TIME, true);
  header.setUint16(12, ZIP_FIXED_DOS_DATE, true);
  header.setUint32(14, entry.checksum, true);
  header.setUint32(18, entry.compressed.byteLength, true);
  header.setUint32(22, entry.originalLength, true);
  header.setUint16(26, entry.name.byteLength, true);
  header.setUint16(28, 0, true);
  return new Uint8Array(header.buffer);
};

const writeDirectoryEntry = (entry: PreparedZipEntry, offset: number): Uint8Array => {
  const header = new DataView(new ArrayBuffer(46));
  header.setUint32(0, ZIP_CENTRAL_HEADER_SIGNATURE, true);
  header.setUint16(4, ZIP_VERSION_NEEDED, true);
  header.setUint16(6, ZIP_VERSION_NEEDED, true);
  header.setUint16(8, ZIP_UTF8_FLAG, true);
  header.setUint16(10, ZIP_DEFLATE_METHOD, true);
  header.setUint16(12, ZIP_FIXED_DOS_TIME, true);
  header.setUint16(14, ZIP_FIXED_DOS_DATE, true);
  header.setUint32(16, entry.checksum, true);
  header.setUint32(20, entry.compressed.byteLength, true);
  header.setUint32(24, entry.originalLength, true);
  header.setUint16(28, entry.name.byteLength, true);
  header.setUint32(42, offset, true);
  return new Uint8Array(header.buffer);
};

const writeEndOfDirectory = (count: number, directoryLength: number, directoryOffset: number): Uint8Array => {
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, ZIP_END_OF_DIRECTORY_SIGNATURE, true);
  end.setUint16(8, count, true);
  end.setUint16(10, count, true);
  end.setUint32(12, directoryLength, true);
  end.setUint32(16, directoryOffset, true);
  return new Uint8Array(end.buffer);
};

const join = (parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> => {
  const whole = new Uint8Array(new ArrayBuffer(parts.reduce((total, part) => total + part.byteLength, 0)));
  let at = 0;
  for (const part of parts) {
    whole.set(part, at);
    at += part.byteLength;
  }
  return whole;
};

/** Hand-written because deflate-only zip is small and settled; fixed dates make identical exports byte-identical. */
export const buildZipArchive = async (entries: readonly ZipEntry[]): Promise<Uint8Array<ArrayBuffer>> => {
  const prepared = await Promise.all(entries.map(prepare));
  const body: Uint8Array[] = [];
  const directory: Uint8Array[] = [];
  let offset = 0;

  for (const entry of prepared) {
    const header = writeLocalHeader(entry);
    directory.push(writeDirectoryEntry(entry, offset), entry.name);
    body.push(header, entry.name, entry.compressed);
    offset += header.byteLength + entry.name.byteLength + entry.compressed.byteLength;
  }

  const directoryBytes = join(directory);
  return join([...body, directoryBytes, writeEndOfDirectory(prepared.length, directoryBytes.byteLength, offset)]);
};
