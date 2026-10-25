import React, { useState } from 'react';
import Navbar from './components/Navbar.jsx';
import DisclaimerBanner from './components/DisclaimerBanner.jsx';
import UploadSection from './components/UploadSection.jsx';
import FeatureHighlights from './components/FeatureHighlights.jsx';
import LoginPage from './components/LoginPage.jsx';
import RegisterPage from './components/RegisterPage.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { Upload } from 'lucide-react';

function AppContent() {
  const [hasActiveAnalysis, setHasActiveAnalysis] = useState(false);
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'login' | 'register'

  const handleHeroCta = () => {
    const uploadCard = document.getElementById('upload-card');
    if (uploadCard) {
      uploadCard.scrollIntoView({ behavior: 'smooth' });
    }
    const fileInput = document.getElementById('report-file-input');
    if (fileInput) {
      fileInput.click();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-accent-soft selection:text-primary">
      {/* Top Header */}
      <Navbar onNavigate={setCurrentView} currentView={currentView} />

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Login Page View */}
        {currentView === 'login' && (
          <LoginPage onNavigate={setCurrentView} />
        )}

        {/* Register Page View */}
        {currentView === 'register' && (
          <RegisterPage onNavigate={setCurrentView} />
        )}

        {/* Home Report Analyzer View */}
        {currentView === 'home' && (
          <>
            {/* Landing Hero (Visible only before analysis completes) */}
            {!hasActiveAnalysis && (
              <section className="text-center max-w-3xl mx-auto pt-2 pb-4 space-y-5 animate-fadeIn">
                {/* Eyebrow */}
                <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-accent-soft/80 border border-primary/20 text-primary text-xs font-semibold tracking-wider uppercase">
                  YOUR LAB REPORT, MADE CLEARER
                </div>

                {/* Main Heading */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-extrabold text-charcoal tracking-tight leading-[1.15]">
                  Understand Your Lab Results With Confidence.
                </h1>

                {/* Supporting Text */}
                <p className="text-base sm:text-lg text-charcoal-muted leading-relaxed max-w-2xl mx-auto">
                  Turn your laboratory report into clear, easy-to-understand information. Explore your test values, compare them with the report&apos;s reference ranges, and learn what each marker means.
                </p>

                {/* Primary Action & Supporting Note */}
                <div className="pt-2 flex flex-col items-center justify-center space-y-2.5">
                  <button
                    type="button"
                    onClick={handleHeroCta}
                    className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all shadow-soft hover:shadow-soft-lg cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Your Lab Report</span>
                  </button>
                  <p className="text-xs text-charcoal-muted">
                    PDF reports only · Educational information, not a medical diagnosis
                  </p>
                </div>
              </section>
            )}

            {/* Global Educational Disclaimer (Landing State) */}
            {!hasActiveAnalysis && <DisclaimerBanner />}

            {/* Upload & Dashboard Section */}
            <UploadSection onAnalysisChange={setHasActiveAnalysis} />

            {/* Core Pillars / How It Works (Landing State Only) */}
            {!hasActiveAnalysis && <FeatureHighlights />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-surface border-t border-border py-8 text-xs text-charcoal-muted">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-heading font-bold text-charcoal">HealthLens AI</span>
            <span>•</span>
            <span>Educational Medical Report Analyzer</span>
          </div>

          <p className="text-center sm:text-right max-w-xl text-xs text-charcoal-muted leading-relaxed">
            HealthLens AI helps you understand laboratory report information for educational purposes. It does not provide a medical diagnosis or replace advice from a qualified healthcare professional.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
