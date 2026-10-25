import React, { useEffect, useState } from 'react';
import { Activity, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function Navbar() {
  const [backendStatus, setBackendStatus] = useState({
    state: 'checking', // 'online' | 'offline' | 'checking'
    data: null,
  });

  const checkHealth = async () => {
    setBackendStatus((prev) => ({ ...prev, state: 'checking' }));
    try {
      // Test proxy / direct backend connection
      const response = await fetch('/api/health');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setBackendStatus({ state: 'online', data });
    } catch (err) {
      // Fallback direct port check if proxy isn't used
      try {
        const fallbackRes = await fetch('http://localhost:5000/api/health');
        if (!fallbackRes.ok) throw new Error(`HTTP ${fallbackRes.status}`);
        const fallbackData = await fallbackRes.json();
        setBackendStatus({ state: 'online', data: fallbackData });
      } catch (fallbackErr) {
        setBackendStatus({ state: 'offline', data: null });
      }
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-soft">
              <Activity className="w-5 h-5 text-accent-soft" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-heading font-extrabold text-xl tracking-tight text-charcoal">
                  HealthLens<span className="text-primary font-bold">.AI</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-soft text-primary">
                  MVP
                </span>
              </div>
              <p className="text-xs text-charcoal-muted hidden sm:block">
                Medical Report Range Analyzer
              </p>
            </div>
          </div>

          {/* Center Info / Scope */}
          <div className="hidden md:flex items-center space-x-6 text-sm text-charcoal-muted">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Educational Only</span>
            </div>
            <div className="text-border">•</div>
            <span>Deterministic Math</span>
            <div className="text-border">•</div>
            <span>No Fabricated Data</span>
          </div>

          {/* Backend Health Status Badge */}
          <div className="flex items-center space-x-3">
            <button
              onClick={checkHealth}
              title="Click to re-check backend connection"
              className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer bg-white"
            >
              {backendStatus.state === 'online' && (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-charcoal font-semibold">Backend Live</span>
                  <span className="text-[10px] text-charcoal-muted">({backendStatus.data?.version || 'v1.0'})</span>
                </>
              )}

              {backendStatus.state === 'checking' && (
                <>
                  <RefreshCw className="w-3 h-3 text-primary animate-spin" />
                  <span className="text-charcoal-muted">Connecting...</span>
                </>
              )}

              {backendStatus.state === 'offline' && (
                <>
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                  <span className="text-rose-600 font-semibold">Backend Offline</span>
                  <RefreshCw className="w-3 h-3 text-charcoal-muted ml-1" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
