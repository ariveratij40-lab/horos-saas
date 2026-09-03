import { createReadStream } from "node:fs";
import { mkdir, open, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const root = resolve(process.env.HOROS_PRIVATE_STORAGE_ROOT || join(tmpdir(), "horos-private-evidence"));
const keyPattern = /^[0-9a-f]{8}-[0-9a-f-]{27}\.bin$/i;

function privatePath(key: string) {
  if (!keyPattern.test(key)) throw new Error("Invalid private evidence key");
  const target = resolve(root, key);
  if (!target.startsWith(`${root}/`)) throw new Error("Invalid private evidence path");
  return target;
}

export type PrivateObjectMetadata = { byteSize: number; modifiedAt: Date };
export interface PrivateEvidenceStorage {
  createKey(): string;
  putExclusive(key: string, bytes: Buffer): Promise<PrivateObjectMetadata>;
  read(key: string): Promise<Buffer>;
  stream(key: string): NodeJS.ReadableStream;
  exists(key: string): Promise<boolean>;
  metadata(key: string): Promise<PrivateObjectMetadata>;
}

export const localEvidenceStorage: PrivateEvidenceStorage = {
  createKey: () => `${randomUUID()}.bin`,
  async putExclusive(key, bytes) {
    await mkdir(root, { recursive: true, mode: 0o700 });
    const handle = await open(privatePath(key), "wx", 0o600);
    try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
    return this.metadata(key);
  },
  read: key => readFile(privatePath(key)),
  stream: key => createReadStream(privatePath(key)),
  async exists(key) { try { await stat(privatePath(key)); return true; } catch { return false; } },
  async metadata(key) { const value = await stat(privatePath(key)); return { byteSize: value.size, modifiedAt: value.mtime }; },
};

export const evidenceStorageProvider = "LOCAL_PRIVATE";
