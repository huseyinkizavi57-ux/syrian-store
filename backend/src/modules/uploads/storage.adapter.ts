import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config/env";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface StorageAdapter {
  saveFile(buffer: Buffer, filename: string, mimeType: string): Promise<string>;
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
  async saveFile(buffer: Buffer, filename: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "syrian-store",
          public_id: path.parse(filename).name,
          resource_type: "image",
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error("فشل الرفع إلى Cloudinary"));
          resolve(result.secure_url);
        }
      );

      uploadStream.end(buffer);
    });
  }
}

export function getStorageAdapter(): StorageAdapter {
  return new CloudStorageAdapter();
}