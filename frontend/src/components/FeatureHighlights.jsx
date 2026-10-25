import React from 'react';
import { CheckCheck, Cpu, Eye, FileSpreadsheet } from 'lucide-react';

export default function FeatureHighlights() {
  const features = [
    {
      icon: FileSpreadsheet,
      title: 'Deterministic Range Evaluation',
      description:
        'Observed test values are strictly compared against the numerical reference ranges stated directly inside your uploaded report. No external guesses or arbitrary baselines.',
    },
    {
      icon: CheckCheck,
      title: 'Honest Status Flagging',
      description:
        'Findings are explicitly categorized as Within Range, Below Range, or Above Range. If a range is non-numeric or missing, it is labeled Not Evaluated with full transparency.',
    },
    {
      icon: Cpu,
      title: 'Educational Gemini Summaries',
      description:
        'Validated tests receive simple, plain-language explanations powered by the Gemini API, explaining what the biological marker measures without diagnosing or prescribing.',
    },
  ];

  return (
    <section className="mt-12">
      <div className="text-center mb-8">
        <h3 className="text-xl sm:text-2xl font-heading font-bold text-charcoal">
          How HealthLens AI Ensures Integrity
        </h3>
        <p className="mt-1.5 text-sm text-charcoal-muted max-w-xl mx-auto">
          Built for high accuracy and patient safety during our hackathon build.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <div
              key={idx}
              className="bg-surface rounded-xl p-6 border border-border shadow-soft-sm hover:shadow-soft transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-accent-soft/70 flex items-center justify-center text-primary mb-4">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-heading font-bold text-base text-charcoal mb-2">
                {feature.title}
              </h4>
              <p className="text-xs sm:text-sm text-charcoal-muted leading-relaxed">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
