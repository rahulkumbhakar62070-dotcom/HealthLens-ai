import React from 'react';
import Navbar from './components/Navbar.jsx';
import DisclaimerBanner from './components/DisclaimerBanner.jsx';
import UploadSection from './components/UploadSection.jsx';
import FeatureHighlights from './components/FeatureHighlights.jsx';
import { Sparkles, ArrowRight, FileCheck, Stethoscope } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-accent-soft selection:text-primary">
      {/* Top Header */}
      <Navbar />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Disclaimer Banner */}
        <DisclaimerBanner />

        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto my-10 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-accent-soft/80 border border-primary/20 text-primary text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Hackathon Build • Reliable Medical Report MVP</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-extrabold text-charcoal tracking-tight leading-tight">
            Understand your lab results with <span className="text-primary underline decoration-accent-soft decoration-4 underline-offset-4">clarity & precision</span>.
          </h1>

          <p className="text-base sm:text-lg text-charcoal-muted leading-relaxed">
            HealthLens AI extracts laboratory test markers, observed values, and units from your PDF, validates them deterministically against the report's reference ranges, and delivers easy-to-understand educational explanations.
          </p>
        </section>

        {/* Upload Component */}
        <UploadSection />

        {/* Core Pillars */}
        <FeatureHighlights />
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-surface border-t border-border py-8 text-xs text-charcoal-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-heading font-bold text-charcoal">HealthLens AI</span>
            <span>•</span>
            <span>Educational Medical Report Analyzer</span>
          </div>

          <div className="flex items-center space-x-6 text-center sm:text-right">
            <span>Solo Hackathon Project</span>
            <span>•</span>
            <span className="text-primary font-medium">Phase 4: Deterministic Reference-Range Evaluation Complete</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
