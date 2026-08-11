import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import GenericFinder from './components/GenericFinder';
import BillAuditor from './components/BillAuditor';
import AboutUs from './components/AboutUs';
import ContactUs from './components/ContactUs';
import Galaxy from './components/Galaxy';
import { checkHealth } from './api';

/* Scroll to top whenever the route changes */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

/* Page shell: Navbar + content + footer */
function Layout({ status, children }) {
  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white relative">
      <div className="fixed inset-0 z-[-1] pointer-events-auto">
        <Galaxy 
          mouseRepulsion={true}
          mouseInteraction={true}
          density={1.5}
          glowIntensity={0.5}
          saturation={0.8}
          hueShift={280}
        />
      </div>
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
              http://127.0.0.1:8000
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
          <Layout status={status}><GenericFinder /></Layout>
        } />
        <Route path="/auditor" element={
          <Layout status={status}><BillAuditor /></Layout>
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