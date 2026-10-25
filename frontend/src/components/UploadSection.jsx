import React, { useState, useRef, useEffect } from 'react';
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
  Sparkles,
  Search,
  FileCheck,
  RotateCcw,
} from 'lucide-react';
import ExtractedResults from './ExtractedResults.jsx';

export default function UploadSection({ onAnalysisChange }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(0); // 0: upload, 1: text extraction, 2: range eval, 3: AI synthesis
  const [uploadResult, setUploadResult] = useState(null);

  const fileInputRef = useRef(null);
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  const PROCESSING_STEPS = [
    'Validating PDF signature and binary structure...',
    'Extracting laboratory digital text and test parameters...',
    'Performing deterministic reference-range mathematical evaluation...',
    'Synthesizing patient-friendly educational explanations...',
  ];

  // Rotate processing steps while uploading to provide rich user feedback
  useEffect(() => {
    let interval;
    if (isUploading) {
      setUploadStep(0);
      interval = setInterval(() => {
        setUploadStep((prev) => (prev < PROCESSING_STEPS.length - 1 ? prev + 1 : prev));
      }, 900);
    }
    return () => clearInterval(interval);
  }, [isUploading]);

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
    setUploadStep(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onAnalysisChange?.(false);
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
        message: data.message || 'PDF uploaded, parsed, and evaluated successfully',
        file: data.file,
        testCount: data.testCount ?? 0,
        tests: data.tests ?? [],
        evaluationSummary: data.evaluationSummary ?? {},
        aiExplanation: data.aiExplanation ?? null,
        warnings: data.warnings ?? [],
        rawTextLength: data.rawTextLength ?? 0,
      });
      onAnalysisChange?.(true);
    } catch (err) {
      setUploadResult({
        success: false,
        message:
          err.message ||
          'Failed to connect to the backend server. Please verify the server is running.',
      });
      onAnalysisChange?.(false);
    } finally {
      setIsUploading(false);
    }
  };

  const isAnalyzed = Boolean(uploadResult && uploadResult.success);

  return (
    <section className="space-y-6">
      {/* Hidden file input available for selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        disabled={isUploading}
        onChange={handleChange}
        className="hidden"
        id="report-file-input"
      />

      {!isAnalyzed ? (
        /* Upload Box Card (When no report has been successfully analyzed) */
        <div id="upload-card" className="bg-surface rounded-2xl border border-border shadow-soft p-6 sm:p-8">
          <div className="max-w-2xl mx-auto text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-charcoal">
              Analyze Your Lab Report
            </h2>
            <p className="mt-2 text-sm text-charcoal-muted">
              Upload a PDF to review your extracted test results.
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
            className={`relative border-2 border-dashed rounded-xl p-8 sm:p-10 text-center transition-all ${
              isUploading
                ? 'opacity-70 cursor-not-allowed border-primary/40 bg-accent-soft/10'
                : dragActive
                ? 'border-primary bg-accent-soft/30 scale-[0.99] cursor-pointer'
                : 'border-border hover:border-primary/60 bg-background/50 hover:bg-background/80 cursor-pointer'
            }`}
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-accent-soft/80 flex items-center justify-center text-primary shadow-soft-sm">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                ) : (
                  <UploadCloud className="w-6 h-6 text-primary" />
                )}
              </div>

              {isUploading ? (
                <div className="space-y-2 max-w-md mx-auto">
                  <p className="text-sm font-semibold text-primary animate-pulse">
                    {PROCESSING_STEPS[uploadStep]}
                  </p>
                  <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${((uploadStep + 1) / PROCESSING_STEPS.length) * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-charcoal-muted">
                    Step {uploadStep + 1} of {PROCESSING_STEPS.length}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm sm:text-base font-semibold text-charcoal">
                      Drag and drop your report here, or
                    </p>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-surface border border-border hover:border-primary/50 text-charcoal hover:text-primary text-xs font-semibold shadow-soft-sm transition-all cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      <span>Browse PDF</span>
                    </button>
                  </div>

                  <p className="text-xs text-charcoal-muted pt-2 border-t border-border/60 max-w-md mx-auto">
                    PDF files up to 5 MB · Text-based digital reports (scanned files without digital text are not supported)
                  </p>
                </div>
              )}
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
          {selectedFile && !uploadResult && (
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
                      {formatFileSize(selectedFile.size)} • PDF Ready for Analysis
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
                      <span>Analyzing Report...</span>
                    </>
                  ) : (
                    <>
                      <span>Analyze Lab Report</span>
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
                {uploadResult.message?.toLowerCase().includes('scanned') && (
                  <p className="text-xs text-rose-700/90 pt-1">
                    Tip: HealthLens AI requires text-based PDF reports generated digitally by the laboratory. Scanned paper printouts or photos of reports are not supported because OCR is omitted for medical data integrity.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Pipeline Info Footer */}
          <div className="mt-6 pt-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-charcoal-muted">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Secure session processing · Zero persistent storage of personal health data</span>
            </div>
            <div className="text-charcoal-muted flex items-center space-x-1.5">
              <FileCheck className="w-3.5 h-3.5 text-primary" />
              <span>Deterministic reference-range evaluation</span>
            </div>
          </div>
        </div>
      ) : (
        /* Compact Report Summary (Rendered after successful report analysis) */
        <div className="bg-surface rounded-2xl border border-border shadow-soft p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all animate-fadeIn">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-accent-soft flex items-center justify-center text-primary shrink-0 shadow-soft-sm">
              <FileCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2.5 flex-wrap">
                <span className="font-heading font-bold text-sm sm:text-base text-charcoal truncate max-w-xs sm:max-w-md">
                  {uploadResult.file?.name || selectedFile?.name || 'Uploaded Lab Report'}
                </span>
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Analysis Complete</span>
                </span>
              </div>
              <p className="text-xs text-charcoal-muted mt-0.5">
                {(uploadResult.file?.size || selectedFile?.size)
                  ? `${formatFileSize(uploadResult.file?.size || selectedFile?.size)} • `
                  : ''}
                {uploadResult.testCount ?? uploadResult.tests?.length ?? 0} markers evaluated deterministically
              </p>
            </div>
          </div>

          <button
            onClick={clearSelection}
            id="upload-new-report-btn"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-charcoal bg-background hover:bg-accent-soft/50 hover:text-primary border border-border hover:border-primary/40 transition-all self-start sm:self-auto cursor-pointer shadow-soft-sm shrink-0"
            title="Upload a new medical report"
          >
            <RotateCcw className="w-3.5 h-3.5 text-primary" />
            <span>Upload New Report</span>
          </button>
        </div>
      )}

      {/* Extracted Results & AI Dashboard */}
      {isAnalyzed && (
        <ExtractedResults data={uploadResult} onReset={clearSelection} />
      )}
    </section>
  );
}
