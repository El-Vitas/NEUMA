import { BLOCK_DOCUMENT_ID_KEY_SEPARATOR, BLOCK_DOCUMENT_ID_PATH_SEPARATOR } from './block-document.constants.js';

const FNV_PRIME = 0x100000001b3n;
const FIRST_OFFSET_BASIS = 0xcbf29ce484222325n;
const SECOND_OFFSET_BASIS = 0x84222325cbf29ce4n;
const HASH_BITS = 64;
const HEX_RADIX = 16;
const HASH_HEX_LENGTH = 16;
const UUID_VERSION = '8';
const UUID_VARIANTS = '89ab';
const VARIANT_COUNT = 4;

const encoder = new TextEncoder();

const hashFnv1a = (text: string, offsetBasis: bigint): bigint => {
  let hash = offsetBasis;
  for (const byte of encoder.encode(text)) {
    hash = BigInt.asUintN(HASH_BITS, (hash ^ BigInt(byte)) * FNV_PRIME);
  }
  return hash;
};

const toHex = (hash: bigint): string => hash.toString(HEX_RADIX).padStart(HASH_HEX_LENGTH, '0');

/**
 * An id for a node that has none, built from the page and the node's place in the document, so converting the same
 * page twice gives the same ids. Two FNV-1a passes make 128 bits, written like a version 8 UUID.
 */
export const deriveBlockId = (pageId: string, path: readonly number[]): string => {
  const key = `${pageId}${BLOCK_DOCUMENT_ID_KEY_SEPARATOR}${path.join(BLOCK_DOCUMENT_ID_PATH_SEPARATOR)}`;
  const hex = toHex(hashFnv1a(key, FIRST_OFFSET_BASIS)) + toHex(hashFnv1a(key, SECOND_OFFSET_BASIS));
  const variant = UUID_VARIANTS.charAt(Number.parseInt(hex.charAt(16), HEX_RADIX) % VARIANT_COUNT);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `${UUID_VERSION}${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
};
