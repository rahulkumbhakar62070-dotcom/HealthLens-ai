import express from 'express';
import fs from 'fs';
import path from 'path';
import { handleReportUpload } from '../middleware/upload.js';

const router = express.Router();

/**
 * Safely inspects the initial bytes (magic bytes / file signature) of a file.
 * Standard PDFs start with `%PDF-` (0x25 0x50 0x44 0x46 0x2D).
 */
const isValidPdfSignature = async (filePath) => {
  let fileHandle = null;
  try {
    fileHandle = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(5);
    const { bytesRead } = await fileHandle.read(buffer, 0, 5, 0);

    if (bytesRead < 4) return false;

    // Check ASCII "%PDF"
    const header = buffer.toString('utf8', 0, 4);
    return header === '%PDF';
  } catch (err) {
    return false;
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
  }
};

/**
 * Sanitizes original filenames to prevent path traversal and unsafe characters.
 */
const sanitizeFilename = (filename) => {
  if (!filename) return 'report.pdf';
  const basename = path.basename(filename);
  // Allow alphanumeric, dots, underscores, dashes, and spaces
  const cleaned = basename.replace(/[^a-zA-Z0-9._ -]/g, '_');
  return cleaned.length > 0 ? cleaned : 'report.pdf';
};

/**
 * POST /api/reports/upload
 * Validates medical report PDF uploads.
 */
router.post('/upload', handleReportUpload, async (req, res) => {
  const file = req.file;

  try {
    // 1. Verify file was provided
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'A valid PDF file is required',
      });
    }

    // 2. Reject empty or abnormally small files
    if (file.size === 0 || file.size < 50) {
      return res.status(400).json({
        success: false,
        message: 'The uploaded PDF file is empty or corrupted.',
      });
    }

    // 3. Inspect genuine file signature / magic bytes (blocks renamed files)
    const hasValidSignature = await isValidPdfSignature(file.path);
    if (!hasValidSignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file format: file content does not match a valid PDF signature.',
      });
    }

    // 4. Sanitize filename
    const sanitizedName = sanitizeFilename(file.originalname);

    // 5. Successful validation response
    return res.status(200).json({
      success: true,
      message: 'PDF uploaded and validated successfully',
      file: {
        name: sanitizedName,
        size: file.size,
        mimeType: 'application/pdf',
      },
    });
  } catch (err) {
    console.error('[HealthLens AI] Error validating uploaded PDF:', err.message);
    return res.status(500).json({
      success: false,
      message: 'An internal error occurred while validating the uploaded file.',
    });
  } finally {
    // 6. Security & Privacy: Immediately clean up temporary uploaded file from disk
    if (file && file.path) {
      try {
        await fs.promises.unlink(file.path);
      } catch (cleanupErr) {
        // File may have already been cleaned up
      }
    }
  }
});

export default router;
