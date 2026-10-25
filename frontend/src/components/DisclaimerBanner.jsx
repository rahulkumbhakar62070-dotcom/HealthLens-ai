import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

export default function DisclaimerBanner() {
  return (
    <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 my-6 shadow-soft-sm">
      <div className="flex items-start space-x-3">
        <div className="p-1 rounded-lg bg-accent-warningLight text-accent-warning shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="text-xs sm:text-sm text-charcoal space-y-1">
          <p className="font-semibold text-charcoal">
            Educational Information Only — Non-Diagnostic
          </p>
          <p className="text-charcoal-muted leading-relaxed">
            HealthLens AI is an educational analysis utility designed strictly for reading lab reports and comparing extracted values against the reference ranges provided directly inside your uploaded document. It does not provide medical diagnoses, treatment options, or prescriptions. Always consult a licensed healthcare practitioner for medical guidance.
          </p>
        </div>
      </div>
    </div>
  );
}
