import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import GenericFinder from './components/GenericFinder';
import AboutUs from './components/AboutUs';
import ContactUs from './components/ContactUs';
import { checkHealth } from './api';

// Lazy-load the heavy BillAuditor (65 KB) — only fetched when user navigates to /auditor
const BillAuditor = lazy(() => import('./components/BillAuditor'));

/* Scroll to top whenever the route changes */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

/* Minimal fallback shown while BillAuditor chunk loads */
function AuditorFallback() {
  return (
    <div className="flex items-center justify-center min-h-[40vh] gap-3 text-slate-500">
      <div className="w-6 h-6 rounded-full border-2 border-purple-500/40 border-t-purple-400 animate-spin" />
      <span className="text-sm">Loading BillSense…</span>
    </div>
  );
}

/* Page shell: Navbar + content + footer */
function Layout({ status, children }) {
  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0c] to-black">
      <Navbar status={status} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-10 relative z-10">
        {children}
      </main>
      <footer className="border-t border-slate-800/80 bg-slate-900/40 py-8 relative z-10 mt-auto">
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
            <code className="text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
              {import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}
            </code>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      try {
        await checkHealth();
        if (isMounted) setStatus('online');
      } catch {
        if (isMounted) setStatus('offline');
      }
    };
    check();
    const id = setInterval(check, 15000);
    return () => { isMounted = false; clearInterval(id); };
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={
          <Layout status={status}><GenericFinder status={status} /></Layout>
        } />
        <Route path="/auditor" element={
          <Layout status={status}>
            <Suspense fallback={<AuditorFallback />}>
              <BillAuditor />
            </Suspense>
          </Layout>
        } />
        <Route path="/about" element={
          <Layout status={status}><AboutUs /></Layout>
        } />
        <Route path="/contact" element={
          <Layout status={status}><ContactUs /></Layout>
        } />
      </Routes>
    </BrowserRouter>
  );
}