import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import GenericFinder from './components/GenericFinder';
import BillAuditor from './components/BillAuditor';
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
      } catch (err) {
        if (isMounted) setStatus('offline');
      }
    };

    verifyStatus();
    const interval = setInterval(verifyStatus, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navbar with Connectivity Indicator */}
      <Navbar 
        status={status} 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'finder' && <GenericFinder />}
        {activeTab === 'auditor' && <BillAuditor />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 py-6 text-center text-xs text-slate-500 space-y-2">
        <p>
          <strong className="text-slate-400">GenMed Platform</strong> — Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP) Mapping & Price Transparency
        </p>
        <p className="text-[11px] text-slate-600">
          Connected to FastAPI Engine at <code className="text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">http://127.0.0.1:8000</code>
        </p>
      </footer>
    </div>
  );
}