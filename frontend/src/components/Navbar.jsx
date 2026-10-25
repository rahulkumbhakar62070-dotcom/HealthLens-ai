import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, User as UserIcon, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar({ onNavigate, currentView }) {
  const { user, logout } = useAuth();

  const [backendStatus, setBackendStatus] = useState({
    state: 'checking', // 'online' | 'offline' | 'checking'
    data: null,
  });

  const checkHealth = async () => {
    setBackendStatus((prev) => ({ ...prev, state: 'checking' }));
    try {
      const response = await fetch('/api/health');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setBackendStatus({ state: 'online', data });
    } catch (err) {
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            onClick={() => onNavigate?.('home')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-soft-sm group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-accent-soft" />
            </div>
            <div>
              <span className="font-heading font-extrabold text-lg sm:text-xl tracking-tight text-charcoal">
                HealthLens <span className="text-primary font-bold">AI</span>
              </span>
              <p className="text-[11px] text-charcoal-muted hidden sm:block font-medium">
                Educational Lab Report Analyzer
              </p>
            </div>
          </div>

          {/* Right Header Area */}
          <div className="flex items-center space-x-3">
            {/* Backend Connectivity Indicator */}
            <button
              type="button"
              onClick={checkHealth}
              title="API connection active. Click to refresh status."
              className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border border-border/80 bg-background/60 hover:bg-background transition-colors cursor-pointer"
            >
              {backendStatus.state === 'online' && (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-charcoal font-medium">System Online</span>
                </>
              )}

              {backendStatus.state === 'checking' && (
                <>
                  <RefreshCw className="w-3 h-3 text-primary animate-spin" />
                  <span className="text-charcoal-muted">Checking...</span>
                </>
              )}

              {backendStatus.state === 'offline' && (
                <>
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                  <span className="text-rose-700 font-medium">System Offline</span>
                  <RefreshCw className="w-3 h-3 text-rose-500 ml-0.5" />
                </>
              )}
            </button>

            {/* User Session / Auth Controls */}
            {user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-border">
                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-accent-soft/50 border border-primary/20 text-xs font-semibold text-charcoal">
                  <UserIcon className="w-3.5 h-3.5 text-primary" />
                  <span className="max-w-[120px] truncate">{user.fullName}</span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  id="navbar-logout-btn"
                  title="Sign out of HealthLens"
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-medium text-charcoal-muted hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 pl-2 border-l border-border">
                <button
                  type="button"
                  onClick={() => onNavigate?.('login')}
                  id="navbar-login-btn"
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    currentView === 'login'
                      ? 'text-primary bg-accent-soft/40'
                      : 'text-charcoal hover:text-primary hover:bg-background'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.('register')}
                  id="navbar-register-btn"
                  className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-all shadow-soft cursor-pointer"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
