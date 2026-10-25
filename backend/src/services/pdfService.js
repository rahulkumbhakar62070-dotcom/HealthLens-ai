import { PDFParse, PasswordException, InvalidPDFException, FormatError } from 'pdf-parse';

/**
 * Custom error thrown when a PDF has no extractable digital text stream (e.g. scanned or image-only).
 */
export class ScannedPdfError extends Error {
  constructor(
    message = 'Document contains no extractable digital text. Image-only and scanned PDFs are not supported. HealthLens AI requires text-based PDF reports (OCR is not supported).'
  ) {
    super(message);
    this.name = 'ScannedPdfError';
    this.code = 'SCANNED_PDF_NOT_SUPPORTED';
    this.statusCode = 422;
  }
}

/**
 * Custom error thrown when a PDF is encrypted with a password.
 */
export class PasswordProtectedPdfError extends Error {
  constructor(message = 'PDF is password-protected. Please upload an unencrypted report.') {
    super(message);
    this.name = 'PasswordProtectedPdfError';
    this.code = 'PASSWORD_PROTECTED_PDF';
    this.statusCode = 400;
  }
}

/**
 * Custom error thrown when PDF binary structure is corrupt or unparseable.
 */
export class CorruptPdfError extends Error {
  constructor(message = 'Invalid or corrupted PDF structure. Unable to parse document.') {
    super(message);
    this.name = 'CorruptPdfError';
    this.code = 'CORRUPT_PDF';
    this.statusCode = 400;
  }
}

/**
 * Extracts plain text stream and metadata from a PDF Buffer.
 *
 * @param {Buffer} buffer - Raw PDF binary buffer
 * @returns {Promise<{ rawText: string, totalLength: number }>}
 */
export async function extractTextFromPdf(buffer) {
  if (!buffer || buffer.length === 0) {
    throw new CorruptPdfError('The uploaded PDF file is empty or corrupted.');
  }

  let parser = null;
  try {
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const rawText = result?.text || '';

    // Strip internal pagination markers like "-- 1 of 1 --"
    const contentWithoutMarkers = rawText
      .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '')
      .trim();

    // If there is no extractable digital text, identify as scanned/image-only
    if (contentWithoutMarkers.length === 0) {
      throw new ScannedPdfError();
    }

    return {
      rawText: rawText.trim(),
      totalLength: rawText.trim().length,
    };
  } catch (err) {
    if (
      err instanceof ScannedPdfError ||
      err instanceof PasswordProtectedPdfError ||
      err instanceof CorruptPdfError
    ) {
      throw err;
    }

    // Identify password-protected PDFs from pdf-parse exceptions
    if (
      err instanceof PasswordException ||
      err?.name === 'PasswordException' ||
      /password/i.test(err?.message || '')
    ) {
      throw new PasswordProtectedPdfError();
    }

    // Identify corrupt / malformed PDF structures
    if (
      err instanceof InvalidPDFException ||
      err instanceof FormatError ||
      /invalid pdf|format error|corrupt|damaged|xref/i.test(err?.message || '')
    ) {
      throw new CorruptPdfError(`Invalid or corrupted PDF structure: ${err.message}`);
    }

    throw new Error(`Failed to extract text from PDF: ${err.message}`);
  } finally {
    // Release parser resources
    if (parser && typeof parser.destroy === 'function') {
      try {
        await parser.destroy();
      } catch (destroyErr) {
        // Resource already released
      }
    }
  }
}
