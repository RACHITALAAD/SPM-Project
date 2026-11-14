import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { MAX_UPLOAD_BYTES, UPLOADS_DIR } from '../config/paths.js';
import { HttpError } from '../utils/httpError.js';

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.zip']);

const localStorage = multer.diskStorage({
  destination(_req, _file, callback) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    callback(null, UPLOADS_DIR);
  },
  filename(_req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    const storedName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`;
    callback(null, storedName);
  },
});

function fileFilter(_req, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    callback(new HttpError(400, 'Only PDF, DOCX, and ZIP files are allowed'));
    return;
  }
  callback(null, true);
}

const storage = process.env.FILE_STORAGE === 'cloudinary'
  ? multer.memoryStorage()
  : localStorage;

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});
