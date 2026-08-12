import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Pill, Menu, X } from 'lucide-react';
import GooeyNav from './GooeyNav';

const NAV_ITEMS = [
  { label: 'MediMatch', href: '/' },
  { label: 'BillSense', href: '/auditor' },
  { label: 'About Us',  href: '/about' },
  { label: 'Contact',   href: '/contact' },
];

/**
 * Sticky top nav — GooeyNav for desktop, slide-down for mobile.
 */
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  // Derive which nav item is active based on the current route
  const activeIndex = (() => {
    // exact match for home
    if (pathname === '/') return 0;
    const idx = NAV_ITEMS.findIndex(
      (item, i) => i !== 0 && pathname.startsWith(item.href)
    );
    return idx === -1 ? 0 : idx;
  })();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const mobileNavClass = ({ isActive }) =>
    `w-full text-left px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
      isActive
        ? 'text-emerald-400 bg-emerald-500/10'
        : 'text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/8'
    }`;

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 glass-card border-b border-slate-800/80 ${
        scrolled ? 'shadow-xl shadow-black/30' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* ── Top row ── */}
        <div className="flex items-center justify-between h-16 gap-4">

          {/* Logo → home */}
          <Link to="/" className="flex items-center gap-3 flex-shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-900/40 group-hover:scale-105 transition-transform duration-200">
              <Pill className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight gradient-text">GenMed</span>
              <p className="text-[10px] text-slate-500 font-medium -mt-0.5 hidden sm:block">
                Indian Pharmaceutical Verification Platform
              </p>
            </div>
          </Link>

          {/* Desktop GooeyNav */}
          <div className="hidden md:flex items-center">
            <GooeyNav
              items={NAV_ITEMS}
              initialActiveIndex={activeIndex}
              particleCount={12}
              particleDistances={[80, 8]}
              particleR={90}
              animationTime={500}
              timeVariance={250}
              colors={[1, 2, 3, 1, 2, 3, 1, 4]}
            />
          </div>

          {/* Hamburger (mobile only) */}
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

      {/* ── Mobile slide-down menu ── */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          menuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-slate-800/60 px-4 py-3 flex flex-col gap-1">
          <NavLink to="/" end className={mobileNavClass} onClick={() => setMenuOpen(false)}>MediMatch</NavLink>
          <NavLink to="/auditor" className={mobileNavClass} onClick={() => setMenuOpen(false)}>BillSense</NavLink>
          <NavLink to="/about"   className={mobileNavClass} onClick={() => setMenuOpen(false)}>About Us</NavLink>
          <NavLink to="/contact" className={mobileNavClass} onClick={() => setMenuOpen(false)}>Contact</NavLink>
        </div>
      </div>
    </header>
  );
}
