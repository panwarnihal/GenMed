import React, { useState, useEffect } from 'react';
import { Activity, Wifi, WifiOff, Pill, Menu, X } from 'lucide-react';

/**
 * Top navigation bar with GenMed logo, backend connectivity indicator,
 * tool tabs and About / Contact navigation links.
 *
 * @param {'online'|'offline'|'checking'} status
 * @param {string} activeTab
 * @param {function} onTabChange
 */
export default function Navbar({ status, activeTab, onTabChange }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const statusConfig = {
    online:   { color: 'text-emerald-400', bg: 'bg-emerald-400', label: 'Backend Online',  Icon: Wifi },
    offline:  { color: 'text-red-400',     bg: 'bg-red-400',     label: 'Backend Offline', Icon: WifiOff },
    checking: { color: 'text-amber-400',   bg: 'bg-amber-400',   label: 'Connecting…',    Icon: Activity },
  };
  const { color, bg, label, Icon } = statusConfig[status] ?? statusConfig.checking;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'glass-card border-b border-slate-800/80 shadow-xl shadow-black/30'
          : 'glass-card border-b border-slate-800/80'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* ── Top row ── */}
        <div className="flex items-center justify-between h-16 gap-4">

          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
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

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              id="nav-about"
              onClick={() => scrollTo('about-us')}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-emerald-400 transition-colors duration-200 rounded-lg hover:bg-emerald-500/8"
            >
              About Us
            </button>
            <button
              id="nav-contact"
              onClick={() => scrollTo('contact-us')}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-emerald-400 transition-colors duration-200 rounded-lg hover:bg-emerald-500/8"
            >
              Contact
            </button>
            <button
              id="nav-review"
              onClick={() => scrollTo('contact-us')}
              className="ml-2 px-4 py-2 text-sm font-semibold text-white rounded-lg nav-review-btn"
            >
              Leave a Review ✨
            </button>
          </nav>

          {/* Status + hamburger */}
          <div className="flex items-center gap-3">
            {/* Connectivity Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/50">
              <span className="relative flex h-2 w-2">
                <span className={`ping absolute inline-flex h-full w-full rounded-full ${bg} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${bg}`} />
              </span>
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className={`text-xs font-medium ${color} hidden sm:inline`}>{label}</span>
            </div>

            {/* Hamburger (mobile) */}
            <button
              id="nav-hamburger"
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ── Tool Tabs ── */}
        <nav className="flex gap-0 -mb-px">
          {[
            { id: 'finder',  label: '💊 Generic Medicine Finder' },
            { id: 'auditor', label: '🧾 Smart Bill Auditor' },
          ].map(({ id, label: tabLabel }) => (
            <button
              key={id}
              id={`tab-${id}`}
              onClick={() => onTabChange(id)}
              className={`px-5 py-3 text-sm font-medium transition-all duration-200 ${
                activeTab === id ? 'tab-active' : 'tab-inactive'
              }`}
            >
              {tabLabel}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Mobile slide-down menu ── */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          menuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-slate-800/60 px-4 py-3 flex flex-col gap-1">
          <button
            onClick={() => scrollTo('about-us')}
            className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/8 rounded-lg transition-colors"
          >
            About Us
          </button>
          <button
            onClick={() => scrollTo('contact-us')}
            className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/8 rounded-lg transition-colors"
          >
            Contact
          </button>
          <button
            onClick={() => scrollTo('contact-us')}
            className="w-full text-left px-4 py-2.5 text-sm font-semibold text-emerald-400 rounded-lg transition-colors"
          >
            Leave a Review ✨
          </button>
        </div>
      </div>
    </header>
  );
}
