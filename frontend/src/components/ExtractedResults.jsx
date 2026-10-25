import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Info,
  SlidersHorizontal,
  Layers,
} from 'lucide-react';

export default function ExtractedResults({ data, onReset }) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!data) return null;

  const { file, testCount = 0, tests = [], warnings = [], rawTextLength = 0 } = data;

  const filteredTests = tests.filter((t) =>
    t.testName.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-soft p-6 sm:p-8 space-y-6 animate-fadeIn">
      {/* Top Banner: Success & Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-accent-soft flex items-center justify-center text-primary shrink-0">
            <CheckCircle2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-charcoal">
                Extraction Complete
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {testCount} {testCount === 1 ? 'Marker' : 'Markers'} Detected
              </span>
            </div>
            <p className="text-xs sm:text-sm text-charcoal-muted mt-1">
              Extracted directly from digital text in{' '}
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

      {/* Warnings / Notices */}
      {warnings && warnings.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 flex items-start space-x-3 text-xs sm:text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-800">Extraction Notice</p>
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
            The PDF was parsed successfully ({rawTextLength} characters read), but no standard laboratory test rows (e.g., CBC, Lipid, Metabolic) could be recognized. Please verify the document format.
          </p>
        </div>
      )}

      {/* Filter / Search Bar (if tests exist) */}
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
            <div className="text-xs text-charcoal-muted self-end sm:self-center">
              Showing {filteredTests.length} of {testCount} tests
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
                  <th className="py-3 px-4">Printed Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTests.map((test, index) => (
                  <tr
                    key={index}
                    className="hover:bg-background/40 transition-colors"
                  >
                    {/* Test Name */}
                    <td className="py-3 px-4 font-semibold text-charcoal">
                      {test.testName}
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

                    {/* Printed Report Flag */}
                    <td className="py-3 px-4">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Phase 3 Status & Transparency Note */}
      <div className="pt-4 border-t border-border flex items-start space-x-2.5 text-xs text-charcoal-muted">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p>
          <span className="font-semibold text-charcoal">Phase 3 Extraction Fidelity:</span>{' '}
          All data above is extracted directly from the uploaded report. In accordance with clinical safety guidelines, values have not been evaluated as normal or abnormal in this phase, and missing fields are explicitly highlighted without fabrication.
        </p>
      </div>
    </div>
  );
}
