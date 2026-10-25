import React from 'react';

export default function FeatureHighlights() {
  const steps = [
    {
      step: '1',
      title: 'Upload Your Report',
      description:
        'Upload your text-based laboratory PDF report directly from your device. Documents are processed securely in session.',
    },
    {
      step: '2',
      title: 'Review Your Test Results',
      description:
        'Examine extracted test values, measurement units, and automated comparisons against the report\'s printed reference intervals.',
    },
    {
      step: '3',
      title: 'Understand Your Results',
      description:
        'Read concise, educational explanations for each biological marker to help you prepare informed questions for your doctor.',
    },
  ];

  return (
    <section className="mt-12 pt-2">
      <div className="text-center mb-8">
        <h3 className="text-xl sm:text-2xl font-heading font-bold text-charcoal">
          How It Works
        </h3>
        <p className="mt-1.5 text-sm text-charcoal-muted max-w-xl mx-auto">
          A clear, transparent workflow to understand your laboratory report.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((item) => (
          <div
            key={item.step}
            className="bg-surface rounded-xl p-6 border border-border shadow-soft-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-accent-soft/80 flex items-center justify-center text-primary font-heading font-bold text-sm mb-4">
              {item.step}
            </div>
            <h4 className="font-heading font-bold text-base text-charcoal mb-2">
              {item.title}
            </h4>
            <p className="text-xs sm:text-sm text-charcoal-muted leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
