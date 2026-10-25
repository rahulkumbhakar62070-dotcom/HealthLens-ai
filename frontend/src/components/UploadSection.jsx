import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldAlert,
  Loader2,
  ArrowRight,
  Database,
} from 'lucide-react';
import ExtractedResults from './ExtractedResults.jsx';

export default function UploadSection() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const fileInputRef = useRef(null);
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  const validateAndSetFile = (file) => {
    setValidationError('');
    setUploadResult(null);

    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setValidationError('Only PDF documents are supported. Please upload a medical lab report PDF.');
      setSelectedFile(null);
      return;
    }

    if (file.size === 0) {
      setValidationError('The selected file is empty (0 bytes). Please upload a valid report.');
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setValidationError(
        `File exceeds the 5 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB). Please select a smaller PDF.`
      );
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setValidationError('');
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes) => {
    if (bytes === undefined || bytes === null) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setValidationError('');
    setUploadResult(null);

    const formData = new FormData();
    formData.append('report', selectedFile);

    try {
      const response = await fetch('/api/reports/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || `Server responded with status ${response.status}`);
      }

      setUploadResult({
        success: true,
        message: data.message || 'PDF uploaded and parsed successfully',
        file: data.file,
        testCount: data.testCount ?? 0,
        tests: data.tests ?? [],
        warnings: data.warnings ?? [],
        rawTextLength: data.rawTextLength ?? 0,
      });
    } catch (err) {
      setUploadResult({
        success: false,
        message:
          err.message ||
          'Failed to connect to the backend server. Please verify the server is running.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="space-y-6">
      {/* Upload Box Card */}
      <div className="bg-surface rounded-2xl border border-border shadow-soft p-6 sm:p-8">
        <div className="max-w-2xl mx-auto text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-charcoal">
            Upload Medical Report PDF
          </h2>
          <p className="mt-2 text-sm text-charcoal-muted">
            Upload a digital laboratory report PDF (CBC, Metabolic Panel, Lipid Profile, etc.). HealthLens AI extracts test names, observed values, units, and reference ranges without fabrication.
          </p>
        </div>

        {/* Drag & Drop Box */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => {
            if (!isUploading) fileInputRef.current?.click();
          }}
          className={`relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all ${
            isUploading
              ? 'opacity-60 cursor-not-allowed border-border bg-background/30'
              : dragActive
              ? 'border-primary bg-accent-soft/30 scale-[0.99] cursor-pointer'
              : 'border-border hover:border-primary/60 bg-background/50 hover:bg-background/80 cursor-pointer'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            disabled={isUploading}
            onChange={handleChange}
            className="hidden"
            id="report-file-input"
          />

          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-accent-soft flex items-center justify-center text-primary shadow-soft-sm">
              <UploadCloud className="w-8 h-8 text-primary" />
            </div>

            <div className="space-y-1">
              <p className="text-base font-semibold text-charcoal">
                <span className="text-primary hover:underline">Click to browse</span> or drag and drop your report
              </p>
              <p className="text-xs text-charcoal-muted">
                PDF files only • Maximum size: 5 MB • Digital text-based reports (OCR unsupported)
              </p>
            </div>

            <div className="flex items-center space-x-2 text-xs text-charcoal-muted bg-surface px-3 py-1.5 rounded-full border border-border">
              <ShieldAlert className="w-3.5 h-3.5 text-primary" />
              <span>Zero-retention: files processed ephemerally and unlinked immediately</span>
            </div>
          </div>
        </div>

        {/* Client-Side Validation Error Message */}
        {validationError && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start space-x-2.5 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Selected File Card & Actions */}
        {selectedFile && (
          <div className="mt-6 p-4 rounded-xl bg-background border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 truncate">
                <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-primary shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="truncate">
                  <p className="text-sm font-semibold text-charcoal truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-charcoal-muted">
                    {formatFileSize(selectedFile.size)} • PDF Ready for Extraction
                  </p>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isUploading) clearSelection();
                }}
                disabled={isUploading}
                className="p-1.5 rounded-lg text-charcoal-muted hover:text-charcoal hover:bg-surface border border-transparent hover:border-border transition-colors disabled:opacity-40 cursor-pointer"
                title="Remove selected file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Button */}
            <div className="pt-2 flex items-center justify-end">
              <button
                onClick={handleSubmit}
                disabled={isUploading}
                id="upload-submit-btn"
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all shadow-soft disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-accent-soft" />
                    <span>Extracting Medical Report Data...</span>
                  </>
                ) : (
                  <>
                    <span>Upload & Extract Medical Data</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Backend Error Display */}
        {uploadResult && !uploadResult.success && (
          <div className="mt-6 p-4 rounded-xl border bg-rose-50/80 border-rose-200 text-rose-900 flex items-start space-x-3 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-800">Processing Error</p>
              <p className="text-xs sm:text-sm">{uploadResult.message}</p>
            </div>
          </div>
        )}

        {/* Pipeline Info Footer */}
        <div className="mt-6 pt-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-charcoal-muted">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span>Ephemeral Pipeline: Text extracted in memory, zero files retained on disk.</span>
          </div>
          <div className="font-medium text-primary flex items-center space-x-1.5">
            <Database className="w-3.5 h-3.5" />
            <span>Phase 3 Active: PDF Text Extraction & Data Validation</span>
          </div>
        </div>
      </div>

      {/* Extracted Results Table (rendered when backend returns success) */}
      {uploadResult && uploadResult.success && (
        <ExtractedResults data={uploadResult} onReset={clearSelection} />
      )}
    </section>
  );
}
