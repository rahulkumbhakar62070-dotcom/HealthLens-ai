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

  const renderStatusBadge = (test) => {
    if (test.status === 'NORMAL') {
      return (
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Within Range</span>
        </span>
      );
    }
    if (test.status === 'LOW') {
      return (
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
          <ArrowDownRight className="w-3.5 h-3.5 text-sky-600" />
          <span>Below Range</span>
        </span>
      );
    }
    if (test.status === 'HIGH') {
      return (
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
          <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
          <span>Above Range</span>
        </span>
      );
    }
    return (
      <div className="space-y-0.5">
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
          <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>Not Evaluated</span>
        </span>
        {test.evaluationReason && (
          <p className="text-[10px] text-charcoal-muted leading-tight">
            {test.evaluationReason}
          </p>
        )}
      </div>
    );
  };

  const renderPrintedFlagBadge = (test) => {
    if (!test.printedFlag) {
      return <span className="text-charcoal-muted text-xs">—</span>;
    }
    const isHigh =
      test.printedFlag.toUpperCase().includes('H') ||
      test.printedFlag.toUpperCase().includes('HIGH');
    const isLow =
      test.printedFlag.toUpperCase().includes('L') ||
      test.printedFlag.toUpperCase().includes('LOW');

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
          isHigh
            ? 'bg-rose-50 text-rose-700 border border-rose-200'
            : isLow
            ? 'bg-sky-50 text-sky-700 border border-sky-200'
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}
      >
        {test.printedFlag}
      </span>
    );
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
      {/* Top Banner: Clinical Insights Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-border gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-accent-soft flex items-center justify-center text-primary shrink-0 shadow-soft-sm">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-heading font-bold text-charcoal">
                Laboratory Test Results
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-soft text-primary border border-primary/20">
                {testCount} {testCount === 1 ? 'Marker Extracted' : 'Markers Extracted'}
              </span>
            </div>
            <p className="text-xs text-charcoal-muted mt-0.5">
              Deterministic mathematical comparison against report reference intervals
            </p>
          </div>
        </div>
      </div>

      {/* Summary KPI Filter Badges */}
      {testCount > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-primary/10 border-primary ring-1 ring-primary'
                : 'bg-surface border-border hover:border-primary/40'
            }`}
          >
            <p className="text-[11px] font-semibold text-charcoal-muted uppercase tracking-wide">
              Total Markers
            </p>
            <p className="text-xl sm:text-2xl font-heading font-bold text-charcoal mt-0.5">
              {testCount}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('NORMAL')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'NORMAL'
                ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500'
                : 'bg-surface border-border hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide">
                Within Range
              </p>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-xl sm:text-2xl font-heading font-bold text-emerald-950 mt-0.5">
              {normalCount}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('LOW')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'LOW'
                ? 'bg-sky-50 border-sky-500 ring-1 ring-sky-500'
                : 'bg-surface border-border hover:border-sky-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-sky-800 uppercase tracking-wide">
                Below Range
              </p>
              <ArrowDownRight className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <p className="text-xl sm:text-2xl font-heading font-bold text-sky-950 mt-0.5">
              {lowCount}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('HIGH')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'HIGH'
                ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-500'
                : 'bg-surface border-border hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-rose-800 uppercase tracking-wide">
                Above Range
              </p>
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <p className="text-xl sm:text-2xl font-heading font-bold text-rose-950 mt-0.5">
              {highCount}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('NOT_EVALUATED')}
            className={`p-3 rounded-xl border text-left transition-all col-span-2 sm:col-span-1 cursor-pointer ${
              statusFilter === 'NOT_EVALUATED'
                ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500'
                : 'bg-surface border-border hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-amber-900 uppercase tracking-wide">
                Not Evaluated
              </p>
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <p className="text-xl sm:text-2xl font-heading font-bold text-amber-950 mt-0.5">
              {notEvalCount}
            </p>
          </button>
        </div>
      )}

      {/* Gemini AI Educational Synthesis Card */}
      {aiExplanation && (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-accent-soft/20 via-surface to-surface p-5 sm:p-6 space-y-4 shadow-soft-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-accent-soft flex items-center justify-center text-primary shadow-soft-sm">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-sm sm:text-base text-charcoal">
                  AI Educational Synthesis
                </h3>
                <p className="text-xs text-charcoal-muted">
                  Powered by Google Gemini · Patient-friendly medical overview
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {aiExplanation.status === 'success' && (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Gemini Connected</span>
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
                  <span>Fallback Mode</span>
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

          {/* Educational Safety Callout */}
          <div className="flex items-start space-x-2.5 text-xs text-charcoal-muted bg-background/80 p-3 rounded-lg border border-border">
            <Stethoscope className="w-4 h-4 text-primary shrink-0 mt-0.5" />
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
        <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-950 flex items-start space-x-3 text-xs sm:text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-900">
              Printed Flag Conflict Detected ({discrepancyCount}{' '}
              {discrepancyCount === 1 ? 'discrepancy' : 'discrepancies'})
            </p>
            <p className="text-amber-900/90 leading-relaxed">
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
                placeholder="Search test name (e.g., Glucose, Hemoglobin)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-background border border-border text-xs sm:text-sm text-charcoal placeholder:text-charcoal-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            <div className="flex items-center space-x-3 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setShowAllExplanations(!showAllExplanations)}
                className="text-xs text-primary hover:text-primary-hover font-semibold cursor-pointer transition-colors"
              >
                {showAllExplanations ? 'Collapse Educational Insights' : 'Expand All Educational Insights'}
              </button>
              <span className="text-xs text-charcoal-muted">
                Showing {filteredTests.length} of {testCount} tests
              </span>
            </div>
          </div>

          {/* Desktop Structured Results Table (Screens >= 640px) */}
          <div className="hidden sm:block overflow-x-auto border border-border rounded-xl bg-surface">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-background border-b border-border text-charcoal-muted uppercase text-[11px] tracking-wider font-semibold">
                  <th className="py-3 px-4">Test / Marker Name</th>
                  <th className="py-3 px-4">Observed Value</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4">Reference Range</th>
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
                        <td className="py-3.5 px-4 font-semibold text-charcoal">
                          <div className="flex items-center space-x-2">
                            <span>{test.testName}</span>
                            {testExplanation && (
                              <button
                                type="button"
                                onClick={() => toggleTestExpand(test.testName)}
                                className="text-charcoal-muted hover:text-primary transition-colors cursor-pointer"
                                title="Toggle educational explanation"
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
                        <td className="py-3.5 px-4 font-mono font-bold text-charcoal">
                          {String(test.value)}
                        </td>

                        {/* Unit */}
                        <td className="py-3.5 px-4">
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
                        <td className="py-3.5 px-4">
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

                        {/* Calculated Status Badge */}
                        <td className="py-3.5 px-4">
                          {renderStatusBadge(test)}
                        </td>

                        {/* Printed Report Flag & Discrepancy Alert */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            {renderPrintedFlagBadge(test)}

                            {test.flagDiscrepancy?.hasDiscrepancy && (
                              <div
                                className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300"
                                title={test.flagDiscrepancy.message}
                              >
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                                <span>Flag Conflict</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable AI Explanation Row (Desktop) */}
                      {isExpanded && testExplanation && (
                        <tr className="bg-background/40">
                          <td colSpan="6" className="py-3 px-4 text-xs text-charcoal border-b border-border/70">
                            <div className="p-3 rounded-lg bg-surface border border-border border-l-4 border-l-primary flex items-start space-x-3 shadow-soft-sm">
                              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <p>
                                  <span className="font-semibold text-charcoal">What it measures:</span>{' '}
                                  <span className="text-charcoal-muted leading-relaxed">{testExplanation.whatItMeasures}</span>
                                </p>
                                <p>
                                  <span className="font-semibold text-charcoal">Report context:</span>{' '}
                                  <span className="text-charcoal-muted leading-relaxed">{testExplanation.findingSummary}</span>
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

          {/* Mobile Stacked Results Cards (Screens < 640px) */}
          <div className="block sm:hidden space-y-3">
            {filteredTests.map((test, index) => {
              const testExplanation =
                aiExplanation?.testExplanations?.[test.testName] ||
                aiExplanation?.testExplanations?.[test.testName.trim()];

              const isExpanded =
                expandedTests[test.testName] !== undefined
                  ? expandedTests[test.testName]
                  : showAllExplanations;

              return (
                <div
                  key={`mobile-card-${index}`}
                  className="bg-surface rounded-xl border border-border p-4 shadow-soft-sm space-y-3 transition-all"
                >
                  {/* Card Header: Test Name & Status */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="space-y-1 min-w-0">
                      <h4 className="font-heading font-bold text-sm text-charcoal leading-snug">
                        {test.testName}
                      </h4>
                      {test.boundaryInfo?.isBoundary && (
                        <span className="inline-block text-[10px] font-medium text-charcoal-muted bg-background px-1.5 py-0.5 rounded border border-border">
                          Boundary ({test.boundaryInfo.boundaryType || 'exact'})
                        </span>
                      )}
                    </div>
                    <div className="shrink-0">{renderStatusBadge(test)}</div>
                  </div>

                  {/* Measurements Grid */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-background/60 border border-border/80 text-xs">
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-charcoal-muted tracking-wide">
                        Measured Value
                      </p>
                      <p className="font-mono font-bold text-charcoal mt-0.5 text-xs sm:text-sm">
                        {String(test.value)}{' '}
                        {test.unit ? (
                          <span className="text-charcoal-muted text-[11px] font-normal">{test.unit}</span>
                        ) : (
                          <span className="text-amber-700 text-[10px] font-normal">(No unit)</span>
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase font-semibold text-charcoal-muted tracking-wide">
                        Reference Range
                      </p>
                      <p className="font-mono text-charcoal mt-0.5 text-xs">
                        {test.referenceRange ? (
                          <span>{test.referenceRange}</span>
                        ) : (
                          <span className="text-amber-700 text-[11px]">Not provided</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Printed Flag & Discrepancy Alert */}
                  {(test.printedFlag || test.flagDiscrepancy?.hasDiscrepancy) && (
                    <div className="space-y-1.5 pt-0.5">
                      {test.printedFlag && (
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-charcoal-muted text-[11px]">Printed Flag:</span>
                          {renderPrintedFlagBadge(test)}
                        </div>
                      )}

                      {test.flagDiscrepancy?.hasDiscrepancy && (
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start space-x-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                          <span className="leading-tight font-medium">
                            {test.flagDiscrepancy.message ||
                              'Report printed flag conflicts with calculated status.'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expandable AI Explanation (Mobile) */}
                  {testExplanation && (
                    <div className="pt-2 border-t border-border/60">
                      <button
                        type="button"
                        onClick={() => toggleTestExpand(test.testName)}
                        className="w-full flex items-center justify-between text-xs text-primary font-medium hover:text-primary-hover cursor-pointer py-1"
                      >
                        <span className="flex items-center space-x-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                          <span>{isExpanded ? 'Hide Educational Context' : 'View Educational Context'}</span>
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-primary" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-3 rounded-lg bg-background/70 border-l-3 border-primary text-xs space-y-1.5 text-charcoal animate-fadeIn">
                          <p>
                            <span className="font-semibold text-charcoal">What it measures:</span>{' '}
                            <span className="text-charcoal-muted leading-relaxed">{testExplanation.whatItMeasures}</span>
                          </p>
                          <p>
                            <span className="font-semibold text-charcoal">Report context:</span>{' '}
                            <span className="text-charcoal-muted leading-relaxed">{testExplanation.findingSummary}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Educational Guidance & Safety Policy */}
      <div className="pt-4 border-t border-border flex items-start space-x-2.5 text-xs text-charcoal-muted">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p>
          <span className="font-semibold text-charcoal">Educational Guidance & Safety:</span>{' '}
          HealthLens AI provides mathematical comparisons against reference ranges reported by the laboratory. Educational explanations do not replace medical evaluation. Always discuss lab results with a qualified healthcare professional.
        </p>
      </div>
    </div>
  );
}
