export interface IStorageProvider {
  save(buffer: Buffer, filename: string, mimeType: string): Promise<string>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}
