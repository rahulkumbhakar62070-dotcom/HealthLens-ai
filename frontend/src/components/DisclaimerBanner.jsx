import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function DisclaimerBanner() {
  return (
    <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-3.5 mb-8 shadow-soft-sm">
      <div className="flex items-start space-x-3">
        <div className="p-1 rounded-lg bg-amber-100/80 text-amber-800 shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4 text-amber-700" />
        </div>
        <div className="text-xs sm:text-sm text-charcoal space-y-0.5">
          <p className="font-semibold text-charcoal">
            Educational Reference Only — Non-Diagnostic
          </p>
          <p className="text-charcoal-muted leading-relaxed">
            HealthLens AI is an educational tool that compares extracted laboratory values against reference intervals printed directly in your document. It does not provide medical diagnoses, treatment plans, or prescriptions. Always consult a licensed healthcare practitioner.
          </p>
        </div>
      </div>
    </div>
  );
}
