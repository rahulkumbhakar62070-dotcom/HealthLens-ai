import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, ShieldAlert } from 'lucide-react';

export default function UploadSection() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationError, setValidationError] = useState('');
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  const validateAndSetFile = (file) => {
    setValidationError('');
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setValidationError('Only PDF documents are supported. Please upload a medical lab report PDF.');
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setValidationError(`File exceeds maximum size of 5 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <section className="bg-surface rounded-2xl border border-border shadow-soft p-6 sm:p-8">
      <div className="max-w-2xl mx-auto text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-heading font-bold text-charcoal">
          Upload Medical Report PDF
        </h2>
        <p className="mt-2 text-sm text-charcoal-muted">
          Upload a digital, text-based laboratory PDF (CBC, Metabolic Panel, Lipid Profile, etc.). HealthLens AI parses tests and verifies them against the reference ranges supplied in your file.
        </p>
      </div>

      {/* Drag & Drop Box */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
          dragActive
            ? 'border-primary bg-accent-soft/30 scale-[0.99]'
            : 'border-border hover:border-primary/60 bg-background/50 hover:bg-background/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleChange}
          className="hidden"
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
              PDF files only • Maximum size: 5 MB • Digital text-based reports
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs text-charcoal-muted bg-surface px-3 py-1.5 rounded-full border border-border">
            <ShieldAlert className="w-3.5 h-3.5 text-primary" />
            <span>Files are processed in memory and never stored permanently</span>
          </div>
        </div>
      </div>

      {/* Validation Error Message */}
      {validationError && (
        <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start space-x-2.5 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Selected File Card */}
      {selectedFile && (
        <div className="mt-6 p-4 rounded-xl bg-background border border-border flex items-center justify-between">
          <div className="flex items-center space-x-3 truncate">
            <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-primary shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="truncate">
              <p className="text-sm font-semibold text-charcoal truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-charcoal-muted">
                {formatFileSize(selectedFile.size)} • PDF Ready for Analysis
              </p>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              clearSelection();
            }}
            className="p-1.5 rounded-lg text-charcoal-muted hover:text-charcoal hover:bg-surface border border-transparent hover:border-border transition-colors"
            title="Remove selected file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pipeline Note / Phase 1 Boundary */}
      <div className="mt-6 pt-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-charcoal-muted">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <span>Strict Rule: Zero fabricated medical data or artificial numbers.</span>
        </div>
        <div className="font-medium text-primary">
          Phase 1 Architecture Active • Extraction Engine arriving in Phase 2
        </div>
      </div>
    </section>
  );
}
