import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search, Zap, IndianRupee, Loader2, AlertTriangle, CheckCircle2,
  TrendingDown, Hash, Star, ChevronRight, FlaskConical, Sparkles,
  ArrowRight, Info, ShieldCheck, BadgeCheck, Pill,
} from 'lucide-react';
import { searchGeneric, matchGenericAlternative } from '../api';

/* ── Demo presets ── */
const DEMO_CASES = [
  { query: 'Augmentin 625 Duo Tab',  salt: 'Amoxicillin 500mg + Clavulanic Acid 125mg', price: 223.40 },
  { query: 'Brilinta 90mg',          salt: 'Ticagrelor 90mg',                           price: 334.00 },
  { query: 'Lipitor 10mg',           salt: 'Atorvastatin 10mg',                         price: 150.00 },
  { query: 'Crocin Advance 500mg',   salt: 'Paracetamol 500mg',                         price: 38.00  },
];

/* ── How it works steps ── */
const HOW_IT_WORKS = [
  { icon: '🔍', title: 'Enter Brand Name',   desc: 'Type the commercial brand name exactly as written on your prescription or bill.' },
  { icon: '⚗️',  title: 'Add Salt (Optional)', desc: 'For better accuracy, add the chemical composition from the medicine strip.' },
  { icon: '💊', title: 'Instant Match',      desc: 'Our AI engine searches 8,000+ Jan Aushadhi generics by salt composition.' },
  { icon: '💰', title: 'See Savings',        desc: 'Compare government MRP vs. what you paid and see exactly how much you save.' },
];

/* ── Confidence ring SVG ── */
function ScoreRing({ score }) {
  const maxScore = 20;
  const pct = Math.min(score / maxScore, 1);
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct);
  const colour = pct >= 0.7 ? '#10b981' : pct >= 0.4 ? '#f59e0b' : '#ef4444';
  const label  = pct >= 0.7 ? 'High'    : pct >= 0.4 ? 'Medium'  : 'Low';

  return (
    <div className="flex flex-col items-center gap-1 relative">
      <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r}
          fill="none"
          stroke={colour}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color: colour }}>{score.toFixed(1)}</span>
        <span className="text-[10px] text-slate-500 font-medium">/ {maxScore}</span>
        <span className="text-[10px] font-semibold mt-0.5" style={{ color: colour }}>{label} match</span>
      </div>
    </div>
  );
}

/* ── Savings bar ── */
function SavingsBar({ savingsPct }) {
  const clampedPct = Math.min(Math.max(savingsPct, 0), 100);
  const colour =
    clampedPct >= 60 ? 'from-emerald-500 to-teal-400'
    : clampedPct >= 30 ? 'from-amber-500 to-yellow-400'
    :                    'from-slate-500 to-slate-400';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-500">Jan Aushadhi Price</span>
        <span className="text-emerald-400 font-semibold">{clampedPct.toFixed(1)}% cheaper</span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full bg-gradient-to-r ${colour} transition-all duration-1000 ease-out`}
          style={{ width: `${clampedPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-slate-600">
        <span>₹0</span>
        <span>Commercial Brand Price</span>
      </div>
    </div>
  );
}

/* ── Skeleton card ── */
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4 mt-2">
      <div className="skeleton h-4 w-1/4 rounded-lg" />
      <div className="grid md:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="glass-card rounded-2xl p-6 space-y-3 border border-slate-700/30">
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-7 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-10 w-1/3 mt-2" />
          </div>
        ))}
      </div>
      <div className="skeleton h-28 w-full rounded-2xl" />
    </div>
  );
}

/* ── No-match card ── */
function NoMatchCard({ query }) {
  return (
    <div className="glass-card rounded-2xl p-10 border border-amber-500/20 animate-[fadeIn_0.4s_ease-out] text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
        <AlertTriangle className="w-8 h-8 text-amber-400" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-white mb-2">No Jan Aushadhi Match Found</h3>
        <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
          We couldn't locate a government generic equivalent for{' '}
          <strong className="text-slate-200">{query}</strong> in the Jan Aushadhi database.
          Try adding the salt composition for a better match, or consult your physician.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Info className="w-3.5 h-3.5" /> Tip: add chemical composition for better accuracy</span>
      </div>
    </div>
  );
}

/* ── Main result card ── */
function ResultCard({ result, billedPrice, query }) {
  if (!result.match_found) return <NoMatchCard query={query} />;

  const alternatives = result.alternatives || (result.top_alternative ? [result.top_alternative] : []);
  const alt       = result.top_alternative;
  const jaPrice   = alt ? alt.jan_aushadhi_price : 0;
  const billed    = parseFloat(billedPrice) || 0;
  const savings   = billed > 0 ? Math.max(billed - jaPrice, 0) : null;
  const savingsPct = billed > 0 && savings !== null ? (savings / billed) * 100 : 0;
  const score      = alt ? (alt.search_score ?? 0) : 0;

  return (
    <div className="space-y-5 animate-[slideUp_0.4s_ease-out]">
      {/* Match badge */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" /> Jan Aushadhi Match Found
          </span>
          {result.requires_pharmacist_verification && (
            <span className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold px-3 py-1 rounded-full">
              <AlertTriangle className="w-3.5 h-3.5" /> Pharmacist Verification Advised
            </span>
          )}
        </div>
        {alt && alt.drug_code && <span className="text-xs text-slate-500">Drug Code: {alt.drug_code}</span>}
      </div>

      {/* Split comparison */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Commercial brand */}
        <div className="glass-card rounded-2xl p-6 border border-red-500/15 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50 rounded-l-2xl" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
              Commercial Brand
            </span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white leading-snug">{query}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Branded / Retail Pharmacy</p>
          </div>
          <div className="flex items-baseline gap-1">
            <IndianRupee className="w-5 h-5 text-red-400 flex-shrink-0" />
            {billed > 0 ? (
              <span className="text-4xl font-extrabold text-red-300">{billed.toFixed(2)}</span>
            ) : (
              <span className="text-slate-500 text-sm italic">No price entered</span>
            )}
          </div>
          {billed > 0 && <span className="text-xs text-slate-500">Retail / Billed Price</span>}
        </div>

        {/* Jan Aushadhi */}
        <div className="glass-card rounded-2xl p-6 border border-emerald-500/25 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/60 rounded-l-2xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/15 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Jan Aushadhi Generic ✓
            </span>
            <BadgeCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-snug">{alt?.generic_name}</h3>
            <p className="text-xs text-emerald-400 mt-0.5">Pradhan Mantri Jan Aushadhi Kendra</p>
          </div>
          <div className="flex items-baseline gap-1">
            <IndianRupee className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="text-4xl font-extrabold text-emerald-300">{jaPrice.toFixed(2)}</span>
          </div>
          <span className="text-xs text-emerald-400/80">Government Approved MRP</span>

          {/* Meta chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {alt?.drug_code && (
              <div className="flex items-center gap-1.5 bg-slate-800/60 rounded-lg px-2.5 py-1.5">
                <Hash className="w-3 h-3 text-sky-400" />
                <span className="text-[11px] text-slate-300">Code <strong className="text-sky-300">{alt.drug_code}</strong></span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-slate-800/60 rounded-lg px-2.5 py-1.5">
              <Star className="w-3 h-3 text-amber-400" />
              <span className="text-[11px] text-slate-300">Score <strong className="text-amber-300">{score.toFixed(2)}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/60 rounded-lg px-2.5 py-1.5">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] text-emerald-300">Govt. Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Array list of generic alternatives if multiple */}
      {alternatives.length > 1 && (
        <div className="glass-card rounded-2xl p-5 border border-slate-700/50 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">All Available Generic Alternatives</h4>
          <div className="divide-y divide-slate-800">
            {alternatives.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-emerald-300">{item.generic_name}</p>
                  <p className="text-[11px] text-slate-500">Drug Code: {item.drug_code || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">₹{item.jan_aushadhi_price?.toFixed(2)}</p>
                  <span className="text-[10px] text-emerald-400">PMBI Price</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Match score ring + savings banner */}
      {billed > 0 && savings !== null && savings > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-emerald-500/25 bg-gradient-to-r from-emerald-900/15 to-teal-900/8 space-y-5">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Score ring */}
            <ScoreRing score={score} />

            <div className="flex-1 space-y-4 w-full">
              <div>
                <p className="text-xs text-slate-500 mb-1">Potential Savings by Switching</p>
                <p className="text-3xl font-extrabold text-white">
                  <span className="gradient-text">Save ₹{savings.toFixed(2)}</span>
                  <span className="text-lg font-medium text-slate-400 ml-3">({savingsPct.toFixed(1)}%)</span>
                </p>
              </div>
              <SavingsBar savingsPct={savingsPct} />
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
                Available at any Pradhan Mantri Jan Aushadhi Kendra across India
              </p>
            </div>
          </div>
        </div>
      )}

      {savings !== null && savings <= 0 && billed > 0 && (
        <div className="glass-card rounded-2xl p-4 border border-slate-700/50 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <p className="text-sm text-slate-400">You are already paying at or below the Jan Aushadhi government price. Great value!</p>
        </div>
      )}

      {/* No price entered — still show JA price */}
      {!billed && (
        <div className="glass-card rounded-2xl p-5 border border-blue-500/20 bg-blue-500/5 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-400">
            Enter the price you were billed above to see exactly how much you could save by switching to the Jan Aushadhi generic.
          </p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════
   Main GenericFinder Tab
══════════════════════════════════ */
export default function GenericFinder() {
  const [query,   setQuery]   = useState('');
  const [salt,    setSalt]    = useState('');
  const [price,   setPrice]   = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const queryRef = useRef(null);

  const performSearch = useCallback(async (searchQuery, searchSalt) => {
    const q = searchQuery.trim();
    if (!q) return;

    setLoading(true);
    setError(null);

    try {
      const data = await searchGeneric({ query: q, extracted_salt: searchSalt.trim() });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to reach the backend. Make sure GenMed API is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce API calls when input changes
  useEffect(() => {
    if (!query.trim()) {
      setResult(null);
      return;
    }
    const timer = setTimeout(() => {
      performSearch(query, salt);
    }, 400);

    return () => clearTimeout(timer);
  }, [query, salt, performSearch]);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) { queryRef.current?.focus(); return; }
    performSearch(query, salt);
  };

  const loadDemo = (demo) => {
    setQuery(demo.query);
    setSalt(demo.salt);
    setPrice(String(demo.price));
    setResult(null);
    setError(null);
  };

  return (
    <section className="grid lg:grid-cols-12 gap-6 items-start" id="generic-finder">
      
      {/* ── LEFT COLUMN (Search & Context) ── */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Title Box */}
        <div className="relative glass-card rounded-2xl border border-emerald-500/20 p-5 overflow-hidden bg-slate-900/50 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/30 via-teal-900/10 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-900/40 flex-shrink-0">
              <Pill className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Generic Medicine Finder</h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                Find affordable Jan Aushadhi generics — instantly.
              </p>
            </div>
          </div>
        </div>

        {/* Search form */}
        <form
          onSubmit={handleSearch}
          className="glass-card rounded-2xl p-5 border border-slate-700/50 space-y-4"
          id="search-form"
        >
          {/* Brand query */}
          <div className="space-y-1.5">
            <label htmlFor="brand-query" className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" /> Brand Name / Query <span className="text-red-400">*</span>
            </label>
            <input
              id="brand-query"
              ref={queryRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Augmentin 625 Duo Tab"
              className="gm-input w-full px-4 py-2.5 rounded-xl text-sm"
              required
            />
          </div>

          {/* Salt */}
          <div className="space-y-1.5">
            <label htmlFor="salt-composition" className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5" /> Chemical Salt (Optional)
            </label>
            <input
              id="salt-composition"
              type="text"
              value={salt}
              onChange={(e) => setSalt(e.target.value)}
              placeholder="e.g. Amoxicillin 500mg"
              className="gm-input w-full px-4 py-2.5 rounded-xl text-sm"
            />
          </div>

          {/* Price */}
          <div className="space-y-1.5 flex-1">
            <label htmlFor="billed-price" className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5" /> Billed Price (Optional)
            </label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                id="billed-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="gm-input w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
              />
            </div>
          </div>

          <button
            id="find-generic-btn"
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Searching…</>
            ) : (
              <><Zap className="w-4 h-4" /> Find Generic <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        {/* Demo pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <FlaskConical className="w-3 h-3 text-slate-600" /> Demo:
          </span>
          {DEMO_CASES.map((d) => (
            <button
              key={d.query}
              id={`demo-${d.query.replace(/\s+/g, '-').toLowerCase()}`}
              onClick={() => loadDemo(d)}
              className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 hover:bg-emerald-500/8 transition-all duration-150"
            >
              {d.query}
            </button>
          ))}
        </div>
      </div>

      {/* ── RIGHT COLUMN (Results / How it works) ── */}
      <div className="lg:col-span-7">
        
        {loading && <LoadingSkeleton />}

        {error && (
          <div className="glass-card rounded-2xl p-5 border border-red-500/30 flex items-start gap-3 animate-[fadeIn_0.3s_ease-out]">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-300">Connection Error</p>
              <p className="text-sm text-slate-400 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {!loading && result && (
          <ResultCard result={result} billedPrice={price} query={query} />
        )}

        {/* Initial state: How it works (shown when no result, no loading, no error) */}
        {!loading && !result && !error && (
          <div className="glass-card rounded-2xl border border-slate-700/50 p-6 bg-slate-900/40 backdrop-blur-md h-full">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              How it works
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center flex-shrink-0 text-xl shadow-inner">
                    {step.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{step.title}</p>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
