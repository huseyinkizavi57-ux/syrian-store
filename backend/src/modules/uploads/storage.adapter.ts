import fs from "fs";
import path from "path";
import { env } from "../../config/env";

// Storage abstraction the spec asked for: "اجعل التخزين قابلاً للتبديل بين
// Local Storage وCloud Storage لاحقاً". Callers only ever use `saveFile()`
// and get back a public URL — swapping STORAGE_DRIVER=cloud later means
// implementing CloudStorageAdapter below (e.g. S3/Cloudinary) without
// touching any route/controller code.
export interface StorageAdapter {
  saveFile(buffer: Buffer, filename: string, mimeType: string): Promise<string>; // returns public URL
}

class LocalStorageAdapter implements StorageAdapter {
  async saveFile(buffer: Buffer, filename: string): Promise<string> {
    const dir = path.resolve(process.cwd(), env.uploads.dir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  }
}

class CloudStorageAdapter implements StorageAdapter {
  async saveFile(): Promise<string> {
    // Intentionally unimplemented: no cloud provider/credentials were
    // specified. Implement this (S3, Cloudinary, etc.) when one is chosen —
    // no other code needs to change once this class works, since
    // getStorageAdapter() is the only place callers get an adapter from.
    throw new Error("Cloud storage not configured — implement CloudStorageAdapter with real provider credentials");
  }
}

export function getStorageAdapter(): StorageAdapter {
  return env.uploads.driver === "cloud" ? new CloudStorageAdapter() : new LocalStorageAdapter();
}
