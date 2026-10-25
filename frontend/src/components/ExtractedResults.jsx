import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Info,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  HelpCircle,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  BookOpen,
} from 'lucide-react';

export default function ExtractedResults({ data, onReset }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'NORMAL' | 'LOW' | 'HIGH' | 'NOT_EVALUATED'
  const [expandedTests, setExpandedTests] = useState({});
  const [showAllExplanations, setShowAllExplanations] = useState(true);

  if (!data) return null;

  const {
    file,
    testCount = 0,
    tests = [],
    evaluationSummary = {},
    aiExplanation = null,
    warnings = [],
    rawTextLength = 0,
  } = data;

  const filteredTests = tests.filter((t) => {
    const matchesSearch = t.testName.toLowerCase().includes(searchTerm.toLowerCase().trim());
    const matchesStatus =
      statusFilter === 'ALL' ||
      t.status === statusFilter ||
      (statusFilter === 'DISCREPANCY' && t.flagDiscrepancy?.hasDiscrepancy);
    return matchesSearch && matchesStatus;
  });

  const toggleTestExpand = (testName) => {
    setExpandedTests((prev) => ({
      ...prev,
      [testName]: prev[testName] !== undefined ? !prev[testName] : false,
    }));
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const normalCount = evaluationSummary.normalCount ?? tests.filter((t) => t.status === 'NORMAL').length;
  const lowCount = evaluationSummary.lowCount ?? tests.filter((t) => t.status === 'LOW').length;
  const highCount = evaluationSummary.highCount ?? tests.filter((t) => t.status === 'HIGH').length;
  const notEvalCount =
    evaluationSummary.notEvaluatedCount ?? tests.filter((t) => t.status === 'NOT_EVALUATED').length;
  const discrepancyCount =
    evaluationSummary.discrepancyCount ?? tests.filter((t) => t.flagDiscrepancy?.hasDiscrepancy).length;

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-soft p-6 sm:p-8 space-y-6 animate-fadeIn">
      {/* Top Banner: Success & Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-accent-soft flex items-center justify-center text-primary shrink-0 shadow-soft-sm">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-charcoal">
                Medical Report Evaluation & AI Insights
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {testCount} {testCount === 1 ? 'Marker' : 'Markers'} Processed
              </span>
            </div>
            <p className="text-xs sm:text-sm text-charcoal-muted mt-1">
              Extracted from{' '}
              <span className="font-semibold text-charcoal">{file?.name || 'Uploaded PDF'}</span> (
              {formatFileSize(file?.size)})
            </p>
          </div>
        </div>

        <button
          onClick={onReset}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-medium text-charcoal-muted bg-background hover:bg-background/80 hover:text-charcoal border border-border transition-colors self-start sm:self-auto cursor-pointer"
          title="Upload another document"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Upload Another PDF</span>
        </button>
      </div>

      {/* Summary KPI Badges */}
      {testCount > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-primary/5 border-primary ring-1 ring-primary'
                : 'bg-background/60 border-border hover:border-primary/50'
            }`}
          >
            <p className="text-[11px] font-medium text-charcoal-muted uppercase">Total Markers</p>
            <p className="text-xl font-heading font-bold text-charcoal mt-0.5">{testCount}</p>
          </button>

          <button
            onClick={() => setStatusFilter('NORMAL')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'NORMAL'
                ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500'
                : 'bg-emerald-50/40 border-emerald-200/80 hover:border-emerald-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-emerald-800 uppercase">Within Range</p>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-xl font-heading font-bold text-emerald-950 mt-0.5">{normalCount}</p>
          </button>

          <button
            onClick={() => setStatusFilter('LOW')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'LOW'
                ? 'bg-sky-50 border-sky-500 ring-1 ring-sky-500'
                : 'bg-sky-50/40 border-sky-200/80 hover:border-sky-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-sky-800 uppercase">Below Range</p>
              <ArrowDownRight className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <p className="text-xl font-heading font-bold text-sky-950 mt-0.5">{lowCount}</p>
          </button>

          <button
            onClick={() => setStatusFilter('HIGH')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'HIGH'
                ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-500'
                : 'bg-rose-50/40 border-rose-200/80 hover:border-rose-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-rose-800 uppercase">Above Range</p>
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <p className="text-xl font-heading font-bold text-rose-950 mt-0.5">{highCount}</p>
          </button>

          <button
            onClick={() => setStatusFilter('NOT_EVALUATED')}
            className={`p-3 rounded-xl border text-left transition-all col-span-2 sm:col-span-1 cursor-pointer ${
              statusFilter === 'NOT_EVALUATED'
                ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500'
                : 'bg-amber-50/40 border-amber-200/80 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-amber-800 uppercase">Not Evaluated</p>
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <p className="text-xl font-heading font-bold text-amber-950 mt-0.5">{notEvalCount}</p>
          </button>
        </div>
      )}

      {/* Gemini AI Educational Synthesis Card (Phase 5) */}
      {aiExplanation && (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-accent-soft/20 via-background to-background p-5 sm:p-6 space-y-4 shadow-soft-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-border/80">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-sm sm:text-base text-charcoal">
                  AI Educational Synthesis
                </h3>
                <p className="text-[11px] text-charcoal-muted">
                  Powered by Google Gemini 1.5 Flash • Patient-Friendly Medical Overview
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {aiExplanation.status === 'success' && (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Gemini AI Connected</span>
                </span>
              )}

              {aiExplanation.status === 'unconfigured' && (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  <BookOpen className="w-3 h-3 text-amber-600" />
                  <span>Offline Educational Mode</span>
                </span>
              )}

              {aiExplanation.status === 'timeout' && (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  <span>Fallback Mode (Timeout)</span>
                </span>
              )}

              {aiExplanation.status === 'error' && (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  <span>Fallback Mode (Safe Rejection)</span>
                </span>
              )}
            </div>
          </div>

          {/* Overall Narrative Summary */}
          <div className="space-y-2">
            <p className="text-xs sm:text-sm text-charcoal leading-relaxed">
              {aiExplanation.overallSummary}
            </p>
          </div>

          {/* Educational Safety Banner */}
          <div className="flex items-start space-x-2 text-[11px] text-charcoal-muted bg-surface/80 p-3 rounded-lg border border-border">
            <Stethoscope className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <p>
              <span className="font-semibold text-charcoal">Medical Disclaimer:</span>{' '}
              {aiExplanation.disclaimer ||
                'Educational information only. Does not diagnose diseases, recommend medications, or replace consultation with your doctor.'}
            </p>
          </div>
        </div>
      )}

      {/* Flag Discrepancy Banner (if detected) */}
      {discrepancyCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-900 flex items-start space-x-3 text-xs sm:text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-900">
              Printed Flag Conflict Detected ({discrepancyCount}{' '}
              {discrepancyCount === 1 ? 'discrepancy' : 'discrepancies'})
            </p>
            <p className="text-amber-800">
              One or more tests contain an explicit printed report flag (e.g., &quot;H&quot;) that conflicts with the deterministic mathematical comparison against the report&apos;s stated reference interval. Both the printed flag and calculated status are preserved without silent alteration.
            </p>
          </div>
        </div>
      )}

      {/* Warnings / Notices */}
      {warnings && warnings.length > 0 && (
        <div className="p-4 rounded-xl bg-background border border-border text-charcoal-muted flex items-start space-x-3 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-charcoal">Report Notice</p>
            {warnings.map((w, idx) => (
              <p key={idx}>{w}</p>
            ))}
          </div>
        </div>
      )}

      {/* Zero Tests State */}
      {testCount === 0 && (
        <div className="p-8 text-center bg-background rounded-xl border border-dashed border-border space-y-3">
          <Layers className="w-10 h-10 text-charcoal-muted mx-auto" />
          <h3 className="font-heading font-semibold text-charcoal">
            No Recognizable Test Markers Found
          </h3>
          <p className="text-xs sm:text-sm text-charcoal-muted max-w-md mx-auto">
            The PDF was parsed successfully ({rawTextLength} characters read), but no standard laboratory test rows could be recognized. Please upload a structured laboratory test report.
          </p>
        </div>
      )}

      {/* Search Bar & Table Filter */}
      {testCount > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-charcoal-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search test name (e.g. Glucose, Hemoglobin)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-background border border-border text-xs sm:text-sm text-charcoal placeholder:text-charcoal-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            <div className="flex items-center space-x-3 self-end sm:self-center">
              <button
                onClick={() => setShowAllExplanations(!showAllExplanations)}
                className="text-xs text-primary hover:text-primary-hover font-medium cursor-pointer"
              >
                {showAllExplanations ? 'Collapse AI Insights' : 'Expand All AI Insights'}
              </button>
              <div className="text-xs text-charcoal-muted">
                Showing {filteredTests.length} of {testCount} tests
              </div>
            </div>
          </div>

          {/* Structured Results Table */}
          <div className="overflow-x-auto border border-border rounded-xl bg-surface">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-background border-b border-border text-charcoal-muted uppercase text-[11px] tracking-wider font-semibold">
                  <th className="py-3 px-4">Test / Analyte Name</th>
                  <th className="py-3 px-4">Observed Value</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4">Report Reference Range</th>
                  <th className="py-3 px-4">Calculated Status</th>
                  <th className="py-3 px-4">Printed Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTests.map((test, index) => {
                  const testExplanation =
                    aiExplanation?.testExplanations?.[test.testName] ||
                    aiExplanation?.testExplanations?.[test.testName.trim()];

                  const isExpanded =
                    expandedTests[test.testName] !== undefined
                      ? expandedTests[test.testName]
                      : showAllExplanations;

                  return (
                    <React.Fragment key={index}>
                      <tr className="hover:bg-background/40 transition-colors">
                        {/* Test Name */}
                        <td className="py-3 px-4 font-semibold text-charcoal">
                          <div className="flex items-center space-x-1.5">
                            <span>{test.testName}</span>
                            {testExplanation && (
                              <button
                                onClick={() => toggleTestExpand(test.testName)}
                                className="text-charcoal-muted hover:text-primary transition-colors cursor-pointer"
                                title="Toggle AI clinical context"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                          {test.boundaryInfo?.isBoundary && (
                            <span className="inline-block mt-0.5 text-[10px] font-medium text-charcoal-muted bg-background px-1.5 py-0.5 rounded border border-border">
                              Boundary ({test.boundaryInfo.boundaryType || 'exact'})
                            </span>
                          )}
                        </td>

                        {/* Observed Value */}
                        <td className="py-3 px-4 font-mono font-medium text-charcoal">
                          {String(test.value)}
                        </td>

                        {/* Unit */}
                        <td className="py-3 px-4">
                          {test.unit ? (
                            <span className="font-mono text-xs text-charcoal-muted">
                              {test.unit}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              Not specified
                            </span>
                          )}
                        </td>

                        {/* Reference Range */}
                        <td className="py-3 px-4">
                          {test.referenceRange ? (
                            <span className="font-mono text-xs text-charcoal">
                              {test.referenceRange}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              Not provided in report
                            </span>
                          )}
                        </td>

                        {/* Calculated Status Badge (Phase 4) */}
                        <td className="py-3 px-4">
                          {test.status === 'NORMAL' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Within Range</span>
                            </span>
                          )}

                          {test.status === 'LOW' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                              <ArrowDownRight className="w-3 h-3 text-sky-600" />
                              <span>Below Range</span>
                            </span>
                          )}

                          {test.status === 'HIGH' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                              <ArrowUpRight className="w-3 h-3 text-rose-600" />
                              <span>Above Range</span>
                            </span>
                          )}

                          {test.status === 'NOT_EVALUATED' && (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                <HelpCircle className="w-3 h-3 text-amber-600" />
                                <span>Not Evaluated</span>
                              </span>
                              {test.evaluationReason && (
                                <p className="text-[10px] text-charcoal-muted leading-tight">
                                  {test.evaluationReason}
                                </p>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Printed Report Flag & Discrepancy Alert */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {test.printedFlag ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                  test.printedFlag.toUpperCase().includes('H') ||
                                  test.printedFlag.toUpperCase().includes('HIGH')
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : test.printedFlag.toUpperCase().includes('L') ||
                                      test.printedFlag.toUpperCase().includes('LOW')
                                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {test.printedFlag}
                              </span>
                            ) : (
                              <span className="text-charcoal-muted text-xs">—</span>
                            )}

                            {test.flagDiscrepancy?.hasDiscrepancy && (
                              <div
                                className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-900 border border-amber-300"
                                title={test.flagDiscrepancy.message}
                              >
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                                <span>Flag Conflict</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable AI Explanation Row (Phase 5) */}
                      {isExpanded && testExplanation && (
                        <tr className="bg-accent-soft/10">
                          <td colSpan="6" className="py-2.5 px-4 text-xs text-charcoal border-b border-border/60">
                            <div className="flex items-start space-x-2 pl-2 border-l-2 border-primary/50">
                              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <p>
                                  <span className="font-semibold text-charcoal">What it measures:</span>{' '}
                                  <span className="text-charcoal-muted">{testExplanation.whatItMeasures}</span>
                                </p>
                                <p>
                                  <span className="font-semibold text-charcoal">Report context:</span>{' '}
                                  <span className="text-charcoal-muted">{testExplanation.findingSummary}</span>
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Phase 5 Status & Transparency Note */}
      <div className="pt-4 border-t border-border flex items-start space-x-2.5 text-xs text-charcoal-muted">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p>
          <span className="font-semibold text-charcoal">Phase 5 AI Clinical Explanations:</span>{' '}
          Explanations are strictly educational and generated from the actual extracted records and deterministic evaluation results. In accordance with clinical safety principles, out-of-range results are never treated as diagnoses, and no medications, dosages, or treatments are prescribed.
        </p>
      </div>
    </div>
  );
}
