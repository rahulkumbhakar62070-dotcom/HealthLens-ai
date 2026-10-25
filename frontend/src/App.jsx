import React, { useState } from 'react';
import Navbar from './components/Navbar.jsx';
import DisclaimerBanner from './components/DisclaimerBanner.jsx';
import UploadSection from './components/UploadSection.jsx';
import FeatureHighlights from './components/FeatureHighlights.jsx';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [hasActiveAnalysis, setHasActiveAnalysis] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-accent-soft selection:text-primary">
      {/* Top Header */}
      <Navbar />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Landing Hero (Visible only before analysis completes) */}
        {!hasActiveAnalysis && (
          <section className="text-center max-w-3xl mx-auto my-8 space-y-4 animate-fadeIn">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-accent-soft/80 border border-primary/20 text-primary text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Automated Reference-Range Verification</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-extrabold text-charcoal tracking-tight leading-tight">
              Understand your lab results with <span className="text-primary underline decoration-accent-soft decoration-4 underline-offset-4">clarity & precision</span>.
            </h1>

            <p className="text-base sm:text-lg text-charcoal-muted leading-relaxed">
              HealthLens AI extracts laboratory test parameters, observed values, and units from your report, evaluates them deterministically against stated reference intervals, and provides patient-friendly educational explanations.
            </p>
          </section>
        )}

        {/* Global Educational Disclaimer (Landing State) */}
        {!hasActiveAnalysis && <DisclaimerBanner />}

        {/* Upload & Dashboard Section */}
        <UploadSection onAnalysisChange={setHasActiveAnalysis} />

        {/* Core Pillars / How It Works (Landing State Only) */}
        {!hasActiveAnalysis && <FeatureHighlights />}
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-surface border-t border-border py-8 text-xs text-charcoal-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-heading font-bold text-charcoal">HealthLens AI</span>
            <span>•</span>
            <span>Clinical Lab Report Analyzer</span>
          </div>

          <div className="flex items-center space-x-6 text-center sm:text-right">
            <span>Privacy-First Architecture</span>
            <span>•</span>
            <span className="text-primary font-medium">Ephemeral In-Memory Processing</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
