export interface IStorageProvider {
  save(buffer: Buffer, filename: string, mimeType: string): Promise<string>;
  delete(key: string): Promise<void>;
}
