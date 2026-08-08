import React from 'react';
import { Activity, Wifi, WifiOff, Pill } from 'lucide-react';

/**
 * Top navigation bar with GenMed logo and backend connectivity indicator.
 * @param {'online'|'offline'|'checking'} status
 * @param {string} activeTab
 * @param {function} onTabChange
 */
export default function Navbar({ status, activeTab, onTabChange }) {
  const statusConfig = {
    online:   { color: 'text-emerald-400', bg: 'bg-emerald-400', label: 'Backend Online',  Icon: Wifi },
    offline:  { color: 'text-red-400',     bg: 'bg-red-400',     label: 'Backend Offline', Icon: WifiOff },
    checking: { color: 'text-amber-400',   bg: 'bg-amber-400',   label: 'Connecting…',    Icon: Activity },
  };
  const { color, bg, label, Icon } = statusConfig[status] ?? statusConfig.checking;

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top row: logo + status */}
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-900/40">
              <Pill className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight gradient-text">GenMed</span>
              <p className="text-[10px] text-slate-500 font-medium -mt-0.5 hidden sm:block">
                Indian Pharmaceutical Verification Platform
              </p>
            </div>
          </div>

          {/* Connectivity Indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/50`}>
            <span className="relative flex h-2 w-2">
              <span className={`ping absolute inline-flex h-full w-full rounded-full ${bg} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${bg}`} />
            </span>
            <Icon className={`w-3.5 h-3.5 ${color}`} />
            <span className={`text-xs font-medium ${color}`}>{label}</span>
          </div>
        </div>

        {/* Tab navigation */}
        <nav className="flex gap-0 -mb-px">
          {[
            { id: 'finder',  label: '💊 Generic Medicine Finder' },
            { id: 'auditor', label: '🧾 Smart Bill Auditor' },
          ].map(({ id, label }) => (
            <button
              key={id}
              id={`tab-${id}`}
              onClick={() => onTabChange(id)}
              className={`px-5 py-3 text-sm font-medium transition-all duration-200 ${
                activeTab === id ? 'tab-active' : 'tab-inactive'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
