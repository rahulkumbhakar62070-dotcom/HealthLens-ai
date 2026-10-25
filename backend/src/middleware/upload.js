import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure temporary uploads directory exists
const UPLOAD_DIR = path.resolve(__dirname, '../../tmp/uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export { UPLOAD_DIR };

// Configure temporary disk storage with safe obfuscated filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `upload-${uniqueSuffix}.tmp`);
  },
});

// Enforce initial MIME and extension checks
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (ext !== '.pdf' || mime !== 'application/pdf') {
    return cb(
      new Error('Only valid PDF documents (.pdf) are accepted. Please provide a PDF medical report.')
    );
  }

  cb(null, true);
};

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter,
});

// Express middleware wrapper that catches Multer errors and formats standard JSON responses
export const handleReportUpload = (req, res, next) => {
  upload.single('report')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File exceeds the maximum allowed size of 5 MB.`,
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: `Unexpected upload field. Form field name must be 'report'.`,
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
        });
      }

      // Custom fileFilter rejection
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid file uploaded. Only PDF files are accepted.',
      });
    }

    next();
  });
};
