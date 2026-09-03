import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search, Zap, IndianRupee, Loader2, AlertTriangle, CheckCircle2,
  Hash, Star, ChevronRight, FlaskConical,
  ArrowRight, Info, ShieldCheck, BadgeCheck, Pill, Clock, X,
  CalendarDays, Sparkles, TrendingDown, Database, Award,
  ArrowDownRight, ExternalLink, Dna, Hexagon, Activity
} from 'lucide-react';
import { searchGeneric, autocomplete } from '../api';

/* ── Demo presets ── */
const DEMO_CASES = [
  { query: 'Augmentin 625 Duo Tab',  salt: 'Amoxicillin 500mg + Clavulanic Acid 125mg', price: 223.40 },
  { query: 'Brilinta 90mg',          salt: 'Ticagrelor 90mg',                           price: 334.00 },
  { query: 'Lipitor 10mg',           salt: 'Atorvastatin 10mg',                         price: 150.00 },
  { query: 'Crocin Advance 500mg',   salt: 'Paracetamol 500mg',                         price: 38.00  },
];

const STATS = [
  { icon: Database, value: '8,000+', label: 'Jan Aushadhi Generics', color: 'emerald' },
  { icon: TrendingDown, value: '~60%', label: 'Avg. Price Reduction', color: 'purple' },
  { icon: ShieldCheck, value: 'PMBJP', label: 'Govt. Verified Database', color: 'sky' },
];

const HISTORY_KEY = 'genmed_search_history';
const MAX_HISTORY = 5;

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(query) {
  if (!query.trim()) return;
  try {
    const h = [query.trim(), ...getHistory().filter(q => q !== query.trim())].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  } catch { /* ignore */ }
}
function clearHistory() {
  try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
}

/* ═══════════════════════════════════════
   Floating Background Orbs
═══════════════════════════════════════ */
function BackgroundOrbs() {
  return (
    <div className="gf-orbs-container" aria-hidden="true">
      <div className="gf-orb gf-orb--emerald" />
      <div className="gf-orb gf-orb--purple" />
      <div className="gf-orb gf-orb--blue" />
    </div>
  );
}

/* ═══════════════════════════════════════
   Stat Badges
═══════════════════════════════════════ */
function StatBadges() {
  return (
    <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-2">
      {STATS.map((s) => {
        const Icon = s.icon;
        const colorMap = {
          emerald: { bg: 'bg-emerald-500/8', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: 'text-emerald-500' },
          purple:  { bg: 'bg-purple-500/8',  border: 'border-purple-500/20',  text: 'text-purple-400',  icon: 'text-purple-500'  },
          sky:     { bg: 'bg-sky-500/8',     border: 'border-sky-500/20',     text: 'text-sky-400',     icon: 'text-sky-500'     },
        };
        const c = colorMap[s.color];
        return (
          <div
            key={s.label}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl ${c.bg} border ${c.border} backdrop-blur-sm`}
          >
            <Icon className={`w-4 h-4 ${c.icon} flex-shrink-0`} />
            <div className="flex items-baseline gap-1.5">
              <span className={`text-sm font-extrabold ${c.text}`}>{s.value}</span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">{s.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════
   Score Ring
═══════════════════════════════════════ */
function ScoreRing({ score }) {
  const maxScore = 20;
  const pct = Math.min(score / maxScore, 1);
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct);
  const colour = pct >= 0.7 ? '#10b981' : pct >= 0.4 ? '#f59e0b' : '#ef4444';
  const label  = pct >= 0.7 ? 'High'    : pct >= 0.4 ? 'Medium'  : 'Low';

  return (
    <div className="flex flex-col items-center gap-1 relative flex-shrink-0">
      <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(30,41,59,0.6)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={colour}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold" style={{ color: colour }}>{score.toFixed(1)}</span>
        <span className="text-[9px] text-slate-500 font-medium">/ {maxScore}</span>
        <span className="text-[9px] font-semibold mt-0.5" style={{ color: colour }}>{label}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Loading Skeleton
═══════════════════════════════════════ */
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-5 mt-4 max-w-3xl mx-auto">
      <div className="skeleton h-5 w-48 rounded-lg mx-auto" />
      <div className="grid md:grid-cols-2 gap-4">
        {[0, 1].map(i => (
          <div key={i} className="gf-result-card rounded-2xl p-6 space-y-3">
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-8 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-12 w-1/3 mt-2" />
          </div>
        ))}
      </div>
      <div className="skeleton h-32 w-full rounded-2xl" />
    </div>
  );
}

/* ═══════════════════════════════════════
   No Match Card
═══════════════════════════════════════ */
function NoMatchCard({ query }) {
  return (
    <div className="gf-result-card rounded-3xl p-10 text-center space-y-5 animate-[gfSlideUp_0.5s_ease-out] max-w-xl mx-auto"
         style={{ '--gf-card-accent': 'rgba(245,158,11,0.12)' }}>
      <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
        <AlertTriangle className="w-10 h-10 text-amber-400" />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-white mb-2">No Generic Match Found</h3>
        <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
          We couldn't locate a Jan Aushadhi equivalent for{' '}
          <strong className="text-white">{query}</strong>. Try adding the chemical salt composition for a more precise lookup.
        </p>
      </div>
      <div className="flex justify-center">
        <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/50 px-3 py-1.5 rounded-full">
          <Info className="w-3.5 h-3.5" /> Tip: add salt composition for better results
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Result Card — premium comparison
═══════════════════════════════════════ */
function ResultCard({ result, billedPrice, query }) {
  if (!result.match_found) return <NoMatchCard query={query} />;

  const alt        = result.top_alternative;
  const jaPrice    = alt ? alt.jan_aushadhi_price : 0;
  const billed     = parseFloat(billedPrice) || 0;
  const savings    = billed > 0 ? Math.max(billed - jaPrice, 0) : null;
  const savingsPct = billed > 0 && savings !== null ? (savings / billed) * 100 : 0;
  const score      = alt ? (alt.search_score ?? 0) : 0;
  const annualSavings = savings !== null && savings > 0 ? savings * 52 : null;

  return (
    <div className="space-y-5 animate-[gfSlideUp_0.5s_ease-out] max-w-3xl mx-auto">

      {/* Status badges */}
      <div className="flex items-center justify-center flex-wrap gap-2">
        <span className="gf-badge gf-badge--success">
          <CheckCircle2 className="w-3.5 h-3.5" /> Jan Aushadhi Match Found
        </span>
        {result.requires_pharmacist_verification && (
          <span className="gf-badge gf-badge--warning">
            <AlertTriangle className="w-3.5 h-3.5" /> Pharmacist Verification Advised
          </span>
        )}
      </div>

      {/* ── Price Comparison Cards ── */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Branded / Commercial */}
        <div className="gf-result-card gf-result-card--branded rounded-2xl p-6 space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500/60 to-orange-500/30 rounded-l-2xl" />
          <span className="gf-card-label text-red-400 bg-red-500/10">Commercial Brand</span>
          <h3 className="text-lg font-bold text-white leading-snug">{query}</h3>
          <p className="text-[11px] text-slate-500">Branded / Retail Pharmacy</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-sm text-red-400/80">₹</span>
            {billed > 0 ? (
              <span className="text-4xl font-black text-red-300 tracking-tight">{billed.toFixed(2)}</span>
            ) : (
              <span className="text-slate-500 text-sm italic">No price entered</span>
            )}
          </div>
          {billed > 0 && <span className="text-[10px] text-slate-600">Retail / Billed Price</span>}
        </div>

        {/* Jan Aushadhi Generic */}
        <div className="gf-result-card gf-result-card--generic rounded-2xl p-6 space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-teal-500/40 rounded-l-2xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-transparent pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <span className="gf-card-label text-emerald-400 bg-emerald-500/10">Jan Aushadhi ✓</span>
            <BadgeCheck className="w-5 h-5 text-emerald-400/60" />
          </div>
          <div className="relative">
            <h3 className="text-base font-bold text-white leading-snug">{alt?.generic_name}</h3>
            <p className="text-[11px] text-emerald-400/70 mt-0.5">PM Jan Aushadhi Kendra</p>
          </div>
          <div className="relative flex items-baseline gap-1 mt-1">
            <span className="text-sm text-emerald-400/80">₹</span>
            <span className="text-4xl font-black text-emerald-300 tracking-tight">{jaPrice.toFixed(2)}</span>
          </div>
          <span className="relative text-[10px] text-emerald-500/60">Government Approved MRP</span>

          {/* Meta chips */}
          <div className="relative flex flex-wrap gap-1.5 pt-2">
            {alt?.drug_code && (
              <span className="gf-chip">
                <Hash className="w-3 h-3 text-sky-400" />
                <span className="text-sky-300">{alt.drug_code}</span>
              </span>
            )}
            <span className="gf-chip">
              <Star className="w-3 h-3 text-amber-400" />
              <span className="text-amber-300">{score.toFixed(1)}</span>
            </span>
            <span className="gf-chip">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300">Verified</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Savings Banner ── */}
      {billed > 0 && savings !== null && savings > 0 && (
        <div className="gf-savings-card rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/30 via-teal-900/15 to-transparent pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-center gap-6">
            <ScoreRing score={score} />
            <div className="flex-1 space-y-3 w-full">
              <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">Potential Savings</p>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="gf-savings-number">₹{savings.toFixed(2)}</span>
                <span className="text-lg font-medium text-emerald-400/60">saved per purchase</span>
              </div>

              {/* Savings bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(savingsPct, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-600">
                  <span>Jan Aushadhi ₹{jaPrice.toFixed(2)}</span>
                  <span className="text-emerald-500 font-semibold">{savingsPct.toFixed(1)}% cheaper</span>
                  <span>Brand ₹{billed.toFixed(2)}</span>
                </div>
              </div>

              {/* Annual estimate */}
              {annualSavings !== null && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/6 border border-emerald-500/15">
                  <CalendarDays className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <p className="text-xs text-emerald-400">
                    <strong>₹{annualSavings.toFixed(0)}</strong> estimated annual savings
                    <span className="text-emerald-600 ml-1">(weekly chronic use)</span>
                  </p>
                </div>
              )}

              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3 text-emerald-500" />
                Available at any PM Jan Aushadhi Kendra across India
              </p>
            </div>
          </div>
        </div>
      )}

      {savings !== null && savings <= 0 && billed > 0 && (
        <div className="gf-result-card rounded-2xl p-5 flex items-center gap-3 max-w-xl mx-auto">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <p className="text-sm text-slate-400">You're already paying at or below the Jan Aushadhi price. Great value!</p>
        </div>
      )}

      {!billed && (
        <div className="gf-result-card rounded-2xl p-5 flex items-start gap-3 max-w-xl mx-auto"
             style={{ '--gf-card-accent': 'rgba(59,130,246,0.1)' }}>
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-400">
            Enter the billed price to see how much you could save by switching to the Jan Aushadhi generic.
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   How it Works — Empty State
═══════════════════════════════════════ */
const HOW_STEPS = [
  { icon: Search,       title: 'Search',        desc: 'Enter the brand name from your prescription or pharmacy bill.', color: 'purple' },
  { icon: FlaskConical, title: 'Match',         desc: 'Our engine maps the chemical salt to 8,000+ Jan Aushadhi generics.', color: 'emerald' },
  { icon: IndianRupee,  title: 'Compare',       desc: 'See exact pricing: branded vs. government-approved generic MRP.', color: 'sky' },
  { icon: Award,        title: 'Save',          desc: 'Switch at your nearest PM Jan Aushadhi Kendra and pocket the difference.', color: 'amber' },
];

function HowItWorks() {
  const colorMap = {
    purple:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  icon: 'text-purple-400'  },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-400' },
    sky:     { bg: 'bg-sky-500/10',     border: 'border-sky-500/20',     icon: 'text-sky-400'     },
    amber:  { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   icon: 'text-amber-400'   },
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 animate-[gfSlideUp_0.6s_ease-out]">
      <h2 className="text-center text-lg font-bold text-white mb-8 flex items-center justify-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-400" />
        How MediMatch Works
      </h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {HOW_STEPS.map((step, i) => {
          const c = colorMap[step.color];
          const Icon = step.icon;
          return (
            <div key={i} className="gf-how-card group">
              <div className={`w-11 h-11 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`w-5 h-5 ${c.icon}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600 font-bold">{String(i + 1).padStart(2, '0')}</span>
                  <p className="text-sm font-semibold text-slate-200">{step.title}</p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
export default function GenericFinder({ status }) {
  const [query,   setQuery]   = useState('');
  const [salt,    setSalt]    = useState('');
  const [price,   setPrice]   = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const queryRef = useRef(null);

  // Autocomplete
  const [suggestions, setSuggestions]         = useState([]);
  const [showDropdown, setShowDropdown]       = useState(false);
  const [acLoading, setAcLoading]             = useState(false);
  const [selectedSuggIdx, setSelectedSuggIdx] = useState(-1);
  const dropdownRef = useRef(null);

  // Search history
  const [history, setHistory] = useState(getHistory);
  const [showHistory, setShowHistory] = useState(false);

  // Expanded search fields
  const [showExtraFields, setShowExtraFields] = useState(false);

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Autocomplete fetch */
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    setAcLoading(true);
    const timer = setTimeout(async () => {
      const results = await autocomplete(query);
      setSuggestions(results);
      setShowDropdown(results.length > 0);
      setAcLoading(false);
    }, 250);
    return () => { clearTimeout(timer); setAcLoading(false); };
  }, [query]);

  const performSearch = useCallback(async (searchQuery, searchSalt) => {
    const q = searchQuery.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    saveHistory(q);
    setHistory(getHistory());

    try {
      const data = await searchGeneric({ query: q, extracted_salt: searchSalt.trim() });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to reach the backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce 700ms
  useEffect(() => {
    if (!query.trim()) { setResult(null); return; }
    const timer = setTimeout(() => performSearch(query, salt), 700);
    return () => clearTimeout(timer);
  }, [query, salt, performSearch]);

  const handleSearch = (e) => {
    e?.preventDefault();
    if (!query.trim()) { queryRef.current?.focus(); return; }
    setShowDropdown(false);
    performSearch(query, salt);
  };

  const selectSuggestion = (suggestion) => {
    setQuery(suggestion);
    setSuggestions([]);
    setShowDropdown(false);
    setSelectedSuggIdx(-1);
    performSearch(suggestion, salt);
  };

  const loadDemo = (demo) => {
    setQuery(demo.query);
    setSalt(demo.salt);
    setPrice(String(demo.price));
    setResult(null);
    setError(null);
    setShowDropdown(false);
    setSuggestions([]);
    setShowExtraFields(true);
    setTimeout(() => performSearch(demo.query, demo.salt), 0);
  };

  const handleQueryKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && selectedSuggIdx >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[selectedSuggIdx]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setSelectedSuggIdx(-1);
    }
  };

  const isOffline = status === 'offline';

  return (
    <section className="gf-page" id="generic-finder">
      <BackgroundOrbs />

      <div className="relative z-10 max-w-4xl mx-auto px-2">

        {/* ── Hero Header ── */}
        <div className="text-center mb-8 animate-[gfSlideUp_0.4s_ease-out]">
          <div className="inline-flex items-center justify-center mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-400 to-purple-500 rounded-full blur-[20px] opacity-40 animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-slate-900/90 border border-slate-700/50 flex items-center justify-center backdrop-blur-xl shadow-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-purple-500/10" />
              <Hexagon className="absolute w-12 h-12 text-slate-700/50 stroke-[1] group-hover:rotate-90 transition-transform duration-700" />
              <Dna className="relative w-7 h-7 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
            Medi<span className="gf-gradient-text">Match</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto">
            Find affordable Jan Aushadhi generics for any branded medicine — instantly.
          </p>
        </div>

        {/* ── Stat Badges ── */}
        <div className="animate-[gfSlideUp_0.5s_ease-out]">
          <StatBadges />
        </div>

        {/* ── Offline Banner ── */}
        {isOffline && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/25 animate-[fadeIn_0.3s_ease-out] mt-4 max-w-xl mx-auto">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400 leading-relaxed">
              <strong>Backend offline</strong> — Run <code className="bg-red-500/10 px-1 rounded">start-all.ps1</code> to start GenMed servers.
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════
            HERO SEARCH BAR
        ═══════════════════════════════════ */}
        <form onSubmit={handleSearch} className="mt-6 mb-6 animate-[gfSlideUp_0.55s_ease-out]" id="search-form">
          <div className="gf-search-container" ref={dropdownRef}>
            <div className="gf-search-bar">
              <Search className="w-5 h-5 text-slate-500 flex-shrink-0 ml-1" />
              <input
                id="brand-query"
                ref={queryRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedSuggIdx(-1);
                  if (e.target.value.trim().length >= 2) setShowDropdown(true);
                  else { setShowDropdown(false); setShowHistory(false); }
                }}
                onFocus={() => {
                  if (query.trim().length < 2 && history.length > 0) setShowHistory(true);
                  else if (suggestions.length > 0) setShowDropdown(true);
                }}
                onKeyDown={handleQueryKeyDown}
                placeholder="Search any medicine brand name…"
                className="gf-search-input"
                autoComplete="off"
                required
              />
              {acLoading && <Loader2 className="w-4 h-4 text-purple-400 animate-spin flex-shrink-0" />}
              <button
                id="find-generic-btn"
                type="submit"
                disabled={loading || isOffline}
                className="gf-search-btn"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span className="hidden sm:inline">Find Generic</span>
                  </>
                )}
              </button>
            </div>

            {/* Autocomplete dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="gf-dropdown">
                {suggestions.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={() => selectSuggestion(s)}
                    className={`gf-dropdown-item ${i === selectedSuggIdx ? 'gf-dropdown-item--active' : ''}`}
                  >
                    <Pill className="w-3.5 h-3.5 text-emerald-500/60 flex-shrink-0" />
                    <span>{s}</span>
                    <ArrowRight className="w-3 h-3 text-slate-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}

            {/* Search history dropdown */}
            {showHistory && !showDropdown && history.length > 0 && (
              <div className="gf-dropdown">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Recent
                  </span>
                  <button
                    type="button"
                    onMouseDown={() => { clearHistory(); setHistory([]); setShowHistory(false); }}
                    className="text-[10px] text-slate-600 hover:text-red-400 transition-colors"
                  >Clear all</button>
                </div>
                {history.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onMouseDown={() => { setQuery(h); setShowHistory(false); performSearch(h, salt); }}
                    className="gf-dropdown-item"
                  >
                    <Clock className="w-3 h-3 text-slate-600 flex-shrink-0" />
                    {h}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Extra fields toggle */}
          <div className="flex items-center justify-center mt-3 gap-3">
            <button
              type="button"
              onClick={() => setShowExtraFields(!showExtraFields)}
              className="text-[11px] text-slate-500 hover:text-purple-400 transition-colors flex items-center gap-1"
            >
              <FlaskConical className="w-3 h-3" />
              {showExtraFields ? 'Hide' : 'Add'} salt composition & price
              <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${showExtraFields ? 'rotate-90' : ''}`} />
            </button>
          </div>

          {/* Collapsible salt + price fields */}
          {showExtraFields && (
            <div className="grid sm:grid-cols-2 gap-3 mt-3 animate-[gfSlideUp_0.3s_ease-out] max-w-2xl mx-auto">
              <div>
                <label htmlFor="salt-composition" className="gf-field-label">
                  <FlaskConical className="w-3 h-3" /> Chemical Salt
                </label>
                <input
                  id="salt-composition"
                  type="text"
                  value={salt}
                  onChange={(e) => setSalt(e.target.value)}
                  placeholder="e.g. Amoxicillin 500mg"
                  className="gf-field-input"
                />
              </div>
              <div>
                <label htmlFor="billed-price" className="gf-field-label">
                  <IndianRupee className="w-3 h-3" /> Billed Price (₹)
                </label>
                <input
                  id="billed-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="gf-field-input"
                />
              </div>
            </div>
          )}
        </form>

        {/* ── Demo pills ── */}
        <div className="flex flex-wrap justify-center items-center gap-2 mb-8 animate-[gfSlideUp_0.6s_ease-out]">
          <span className="text-[11px] text-slate-600 mr-1">Try:</span>
          {DEMO_CASES.map((d) => (
            <button
              key={d.query}
              id={`demo-${d.query.replace(/\s+/g, '-').toLowerCase()}`}
              onClick={() => loadDemo(d)}
              className="gf-demo-pill"
            >
              <Pill className="w-3 h-3 text-emerald-500/60" />
              {d.query}
            </button>
          ))}
        </div>

        {/* ── Recent history pills ── */}
        {history.length > 0 && (
          <div className="flex flex-wrap justify-center items-center gap-2 -mt-4 mb-6">
            <span className="text-[10px] text-slate-700 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> Recent:
            </span>
            {history.map((h) => (
              <button
                key={h}
                onClick={() => { setQuery(h); performSearch(h, salt); }}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-900/60 border border-slate-800/80 text-slate-600 hover:border-purple-500/30 hover:text-slate-400 transition-all"
              >
                {h}
              </button>
            ))}
            <button
              onClick={() => { clearHistory(); setHistory([]); }}
              className="text-[10px] text-slate-700 hover:text-red-400 transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════
            RESULTS AREA
        ═══════════════════════════════════ */}
        <div className="min-h-[300px]">
          {loading && <LoadingSkeleton />}

          {error && (
            <div className="gf-result-card rounded-2xl p-5 flex items-start gap-3 max-w-xl mx-auto animate-[fadeIn_0.3s_ease-out]"
                 style={{ '--gf-card-accent': 'rgba(239,68,68,0.1)' }}>
              <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4.5 h-4.5 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-300">Connection Error</p>
                <p className="text-sm text-slate-400 mt-1">{error}</p>
              </div>
            </div>
          )}

          {!loading && result && <ResultCard result={result} billedPrice={price} query={query} />}

          {!loading && !result && !error && <HowItWorks />}
        </div>

      </div>
    </section>
  );
}
