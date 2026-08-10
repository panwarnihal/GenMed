import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import GenericFinder from './components/GenericFinder';
import BillAuditor from './components/BillAuditor';
import AboutUs from './components/AboutUs';
import ContactUs from './components/ContactUs';
import { checkHealth } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('finder');
  const [status, setStatus] = useState('checking'); // 'online' | 'offline' | 'checking'

  // Poll backend health status
  useEffect(() => {
    let isMounted = true;
    const verifyStatus = async () => {
      try {
        await checkHealth();
        if (isMounted) setStatus('online');
      } catch {
        if (isMounted) setStatus('offline');
      }
    };

    verifyStatus();
    const interval = setInterval(verifyStatus, 15000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* ── Sticky Navbar ── */}
      <Navbar status={status} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ── Main Tool Tabs ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'finder'  && <GenericFinder />}
        {activeTab === 'auditor' && <BillAuditor />}
      </main>

      {/* ── Section divider ── */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />
      </div>

      {/* ── About Us ── */}
      <AboutUs />

      {/* ── Section divider ── */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />
      </div>

      {/* ── Contact Us & Reviews ── */}
      <ContactUs />

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="space-y-1 text-center sm:text-left">
            <p>
              <strong className="text-slate-400">GenMed Platform</strong> — Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP) Mapping &amp; Price Transparency
            </p>
            <p className="text-[11px] text-slate-600">
              Not affiliated with any pharmaceutical company. Open-source &amp; free to use.
            </p>
          </div>
          <p className="text-[11px] text-slate-600 flex-shrink-0">
            API at{' '}
            <code className="text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">http://127.0.0.1:8000</code>
          </p>
        </div>
      </footer>
    </div>
  );
}