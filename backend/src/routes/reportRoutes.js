import express from 'express';
import fs from 'fs';
import path from 'path';
import { handleReportUpload } from '../middleware/upload.js';
import {
  extractTextFromPdf,
  ScannedPdfError,
  PasswordProtectedPdfError,
  CorruptPdfError,
} from '../services/pdfService.js';
import { parseMedicalReportText } from '../services/parserService.js';
import { evaluateMedicalTest, EVAL_STATUS } from '../services/evaluatorService.js';

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
 * Core handler for PDF upload, text extraction, medical data parsing, and reference-range evaluation.
 */
const processReportHandler = async (req, res) => {
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

    // 3. Inspect genuine file signature / magic bytes (blocks renamed non-PDF files)
    const hasValidSignature = await isValidPdfSignature(file.path);
    if (!hasValidSignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file format: file content does not match a valid PDF signature.',
      });
    }

    // 4. Read temporary file buffer for text extraction
    const fileBuffer = await fs.promises.readFile(file.path);

    // 5. Extract actual digital text stream from PDF
    const { rawText } = await extractTextFromPdf(fileBuffer);

    // 6. Parse structured medical test items from extracted text
    const parsedData = parseMedicalReportText(rawText);

    // 7. Deterministically evaluate each extracted test against its report reference range
    const evaluatedTests = parsedData.tests.map((test) => evaluateMedicalTest(test));

    // Calculate evaluation summary metrics
    const evaluationSummary = {
      total: evaluatedTests.length,
      normalCount: evaluatedTests.filter((t) => t.status === EVAL_STATUS.NORMAL).length,
      lowCount: evaluatedTests.filter((t) => t.status === EVAL_STATUS.LOW).length,
      highCount: evaluatedTests.filter((t) => t.status === EVAL_STATUS.HIGH).length,
      notEvaluatedCount: evaluatedTests.filter((t) => t.status === EVAL_STATUS.NOT_EVALUATED).length,
      discrepancyCount: evaluatedTests.filter((t) => t.flagDiscrepancy?.hasDiscrepancy).length,
    };

    // 8. Sanitize filename
    const sanitizedName = sanitizeFilename(file.originalname);

    // 9. Build informative response message
    let message = 'PDF uploaded and validated successfully';
    if (evaluatedTests.length > 0) {
      message = `Report processed successfully: ${evaluatedTests.length} medical test${
        evaluatedTests.length === 1 ? '' : 's'
      } extracted and evaluated`;
    } else {
      message =
        'PDF uploaded and digital text extracted, but no recognizable clinical test results were found.';
    }

    return res.status(200).json({
      success: true,
      message,
      file: {
        name: sanitizedName,
        size: file.size,
        mimeType: 'application/pdf',
      },
      rawTextLength: parsedData.rawTextLength,
      testCount: evaluatedTests.length,
      tests: evaluatedTests,
      evaluationSummary,
      warnings: parsedData.warnings,
    });
  } catch (err) {
    if (err instanceof ScannedPdfError) {
      return res.status(422).json({
        success: false,
        code: err.code,
        message: err.message,
      });
    }

    if (err instanceof PasswordProtectedPdfError) {
      return res.status(400).json({
        success: false,
        code: err.code,
        message: err.message,
      });
    }

    if (err instanceof CorruptPdfError) {
      return res.status(400).json({
        success: false,
        code: err.code,
        message: err.message,
      });
    }

    console.error('[HealthLens AI] Error processing uploaded PDF:', err.message);
    return res.status(500).json({
      success: false,
      message: 'An internal error occurred while processing the uploaded file.',
    });
  } finally {
    // 10. Ephemeral storage: immediately clean up temporary file from disk on success OR error
    if (file && file.path) {
      try {
        await fs.promises.unlink(file.path);
      } catch (cleanupErr) {
        // File may have already been cleaned up
      }
    }
  }
};

/**
 * POST /api/reports/upload
 * Primary upload, extraction, and evaluation endpoint.
 */
router.post('/upload', handleReportUpload, processReportHandler);

/**
 * POST /api/reports/extract
 * Dedicated semantic alias endpoint for report extraction and evaluation.
 */
router.post('/extract', handleReportUpload, processReportHandler);

export default router;
