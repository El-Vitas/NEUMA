import { BLOCK_SYNC_BASE64_CHUNK_SIZE } from '../constants/block-sync.constants';

export const encodeBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let start = 0; start < bytes.length; start += BLOCK_SYNC_BASE64_CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(start, start + BLOCK_SYNC_BASE64_CHUNK_SIZE));
  }
  return btoa(binary);
};

export const decodeBase64 = (encoded: string): Uint8Array =>
  Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
