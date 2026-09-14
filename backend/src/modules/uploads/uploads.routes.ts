import { Router } from "express";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import { requireAdmin } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { env } from "../../config/env";
import { getStorageAdapter } from "./storage.adapter";

const router = Router();

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.uploads.maxSizeMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("نوع الملف غير مسموح — يُقبل فقط JPEG/PNG/WEBP"));
    }
    cb(null, true);
  },
});

// Only admins upload product images (per spec, image upload is part of
// product management). File size + MIME type validated above (multer) and
// the extension is derived from the validated MIME type, never trusted from
// the original filename, to avoid extension-spoofing tricks.
router.post(
  "/image",
  requireAdmin,
  requirePermission("products:write"),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest("لم يتم إرفاق ملف");
    const ext = req.file.mimetype === "image/png" ? "png" : req.file.mimetype === "image/webp" ? "webp" : "jpg";
    const filename = `${crypto.randomUUID()}.${ext}`;
    const storage = getStorageAdapter();
    const url = await storage.saveFile(req.file.buffer, filename, req.file.mimetype);
    res.status(201).json({ data: { url } });
  })
);

export default router;
