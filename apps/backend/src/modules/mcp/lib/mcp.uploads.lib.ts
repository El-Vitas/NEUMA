import { Result } from '@neuma/shared';
import { MAX_FILE_SIZE } from '../../../common/domain/file.constants';
import {
  MCP_UPLOAD_LINE_BREAKS,
  MCP_UPLOAD_NOT_BASE64_MESSAGE,
  MCP_UPLOAD_TOO_LARGE_MESSAGE,
} from '../constants/mcp.constants';

/**
 * Reads the bytes an agent sent as base64. Decoding never fails by itself, so the bytes are encoded again and must
 * give back what came in: anything that is not padded base64 is refused instead of being stored half-read.
 */
export const decodeMcpUpload = (encoded: string): Result<Buffer, string> => {
  const text = encoded.replaceAll(MCP_UPLOAD_LINE_BREAKS, '');
  const bytes = Buffer.from(text, 'base64');
  if (bytes.length === 0 || bytes.toString('base64') !== text) return Result.fail(MCP_UPLOAD_NOT_BASE64_MESSAGE);
  if (bytes.length > MAX_FILE_SIZE) return Result.fail(MCP_UPLOAD_TOO_LARGE_MESSAGE);
  return Result.ok(bytes);
};
