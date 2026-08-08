import React, { useState, useRef } from 'react';
import { Search, Zap, IndianRupee, Loader2, AlertTriangle, CheckCircle2,
         TrendingDown, Hash, Star, ChevronRight, FlaskConical } from 'lucide-react';
import { matchGenericAlternative } from '../api';

/* ── Demo presets ── */
const DEMO_CASES = [
  { query: 'Augmentin 625 Duo Tab', salt: 'Amoxicillin 500mg + Clavulanic Acid 125mg', price: 223.40 },
  { query: 'Brilinta 90mg',         salt: 'Ticagrelor 90mg',                           price: 334.00 },
  { query: 'Lipitor 10mg',          salt: 'Atorvastatin 10mg',                         price: 150.00 },
];

/* ── Confidence ring SVG ── */
function ScoreRing({ score }) {
  const maxScore = 20;
  const pct = Math.min(score / maxScore, 1);
  const circumference = 2 * Math.PI * 52; // r=52
  const offset = circumference * (1 - pct);
  const colour = pct >= 0.7 ? '#10b981' : pct >= 0.4 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle
          cx="60" cy="60" r="52"
          fill="none"
          stroke={colour}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold" style={{ color: colour }}>{score.toFixed(1)}</span>
        <span className="text-[10px] text-slate-500 font-medium">score</span>
      </div>
    </div>
  );
}

/* ── Savings bar ── */
function SavingsBar({ savingsPct }) {
  const clampedPct = Math.min(Math.max(savingsPct, 0), 100);
  const colour = clampedPct >= 60 ? 'from-emerald-500 to-teal-400'
               : clampedPct >= 30 ? 'from-amber-500 to-yellow-400'
               :                    'from-slate-500 to-slate-400';

  return (
    <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-2.5 rounded-full bg-gradient-to-r ${colour} transition-all duration-1000 ease-out`}
        style={{ width: `${clampedPct}%` }}
      />
    </div>
  );
}

/* ── Skeleton card ── */
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="skeleton h-5 w-1/3 rounded-lg" />
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-6 space-y-3">
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-8 w-full" />
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton h-10 w-1/3" />
        </div>
        <div className="glass-card rounded-2xl p-6 space-y-3">
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-8 w-full" />
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton h-10 w-1/3" />
        </div>
      </div>
      <div className="skeleton h-20 w-full rounded-2xl" />
    </div>
  );
}

/* ── Result display card ── */
function ResultCard({ result, billedPrice, query }) {
  if (!result.match_found) {
    return (
      <div className="glass-card rounded-2xl p-8 border-red-500/20 animate-[fadeIn_0.4s_ease-out] text-center space-y-3">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
        <h3 className="text-xl font-semibold text-white">No Jan Aushadhi Match Found</h3>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          We could not find a government generic equivalent for <strong className="text-slate-200">{query}</strong> in the
          Jan Aushadhi database. Please consult a physician or try refining the salt composition.
        </p>
      </div>
    );
  }

  const alt = result.top_alternative;
  const jaPrice = alt.jan_aushadhi_price;
  const billed  = parseFloat(billedPrice) || 0;
  const savings = billed > 0 ? Math.max(billed - jaPrice, 0) : null;
  const savingsPct = billed > 0 && savings !== null ? (savings / billed) * 100 : 0;

  return (
    <div className="space-y-4 animate-[slideUp_0.4s_ease-out]">
      {/* Split comparison cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Commercial brand side */}
        <div className="glass-card rounded-2xl p-6 border border-red-500/10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
              Commercial Brand
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white leading-tight">{query}</h3>
          <div className="flex items-baseline gap-1">
            <IndianRupee className="w-5 h-5 text-red-400 flex-shrink-0" />
            {billed > 0 ? (
              <span className="text-3xl font-bold text-red-300">{billed.toFixed(2)}</span>
            ) : (
              <span className="text-slate-500 text-sm italic">No price entered</span>
            )}
          </div>
          {billed > 0 && <span className="text-xs text-slate-500">Billed / Retail Price</span>}
        </div>

        {/* Jan Aushadhi side */}
        <div className="glass-card rounded-2xl p-6 border border-emerald-500/20 space-y-3 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-transparent pointer-events-none" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Jan Aushadhi Generic ✓
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-base font-semibold text-white leading-snug">{alt.generic_name}</h3>

          <div className="flex items-baseline gap-1">
            <IndianRupee className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="text-3xl font-bold text-emerald-300">{jaPrice.toFixed(2)}</span>
          </div>
          <span className="text-xs text-emerald-700">Government MRP</span>

          <div className="flex flex-wrap gap-3 pt-1">
            <div className="flex items-center gap-1.5 bg-slate-800/60 rounded-lg px-3 py-1.5">
              <Hash className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-xs text-slate-300">Code <strong className="text-sky-300">{alt.drug_code}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/60 rounded-lg px-3 py-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-slate-300">Score <strong className="text-amber-300">{alt.search_score.toFixed(2)}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Savings banner */}
      {savings !== null && savings > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-emerald-500/20 bg-gradient-to-r from-emerald-900/20 to-teal-900/10 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Potential Savings by Switching</p>
                <p className="text-2xl font-bold text-white">
                  <span className="text-emerald-400">Save ₹{savings.toFixed(2)}</span>
                  <span className="text-base font-medium text-slate-400 ml-2">({savingsPct.toFixed(1)}%)</span>
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-semibold px-4 py-2 rounded-full">
              🏥 Jan Aushadhi Switch
            </span>
          </div>
          <SavingsBar savingsPct={savingsPct} />
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <ChevronRight className="w-3 h-3" />
            Available at any Pradhan Mantri Jan Aushadhi Kendra across India
          </p>
        </div>
      )}

      {/* No savings (generic cheaper or equal) */}
      {savings !== null && savings <= 0 && billed > 0 && (
        <div className="glass-card rounded-2xl p-4 border border-slate-700/50 text-slate-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          You are already paying at or below the Jan Aushadhi price. 
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   Main GenericFinder Tab
══════════════════════════════════════════ */
export default function GenericFinder() {
  const [query,      setQuery]      = useState('');
  const [salt,       setSalt]       = useState('');
  const [price,      setPrice]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState(null);
  const queryRef = useRef(null);

  const handleSearch = async (e) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) { queryRef.current?.focus(); return; }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await matchGenericAlternative(q, salt.trim());
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to reach the backend. Make sure GenMed API is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const loadDemo = (demo) => {
    setQuery(demo.query);
    setSalt(demo.salt);
    setPrice(String(demo.price));
    setResult(null);
    setError(null);
  };

  return (
    <section className="space-y-8" id="generic-finder">
      {/* Page heading */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">
          Generic Medicine Finder
        </h1>
        <p className="text-slate-400 text-sm">
          Find affordable Jan Aushadhi government generic alternatives for any branded drug.
        </p>
      </div>

      {/* Demo pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <FlaskConical className="w-3.5 h-3.5" /> Try demo:
        </span>
        {DEMO_CASES.map((d) => (
          <button
            key={d.query}
            id={`demo-${d.query.replace(/\s+/g, '-').toLowerCase()}`}
            onClick={() => loadDemo(d)}
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700
                       text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 transition-all duration-150"
          >
            {d.query}
          </button>
        ))}
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch}
            className="glass-card rounded-2xl p-6 border border-slate-700/50 space-y-5"
            id="search-form">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Brand query */}
          <div className="space-y-1.5">
            <label htmlFor="brand-query" className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Brand Name / Query *
            </label>
            <input
              id="brand-query"
              ref={queryRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Augmentin 625 Duo Tab"
              className="gm-input w-full px-4 py-3 rounded-xl text-sm"
              required
            />
          </div>

          {/* Salt */}
          <div className="space-y-1.5">
            <label htmlFor="salt-composition" className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Chemical Salt / Composition
            </label>
            <input
              id="salt-composition"
              type="text"
              value={salt}
              onChange={(e) => setSalt(e.target.value)}
              placeholder="e.g. Amoxicillin 500mg + Clavulanic Acid 125mg"
              className="gm-input w-full px-4 py-3 rounded-xl text-sm"
            />
          </div>
        </div>

        {/* Price + submit */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="space-y-1.5 flex-1">
            <label htmlFor="billed-price" className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Billed / Retail Price ₹ (optional)
            </label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                id="billed-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="gm-input w-full pl-9 pr-4 py-3 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="self-end">
            <button
              id="find-generic-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-semibold text-white flex items-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Searching…</>
              ) : (
                <><Search className="w-4 h-4" /> Find Generic</>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Result area */}
      {loading && <LoadingSkeleton />}

      {error && (
        <div className="glass-card rounded-2xl p-5 border border-red-500/30 flex items-start gap-3 animate-[fadeIn_0.3s_ease-out]">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-300">Error</p>
            <p className="text-sm text-slate-400 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {!loading && result && <ResultCard result={result} billedPrice={price} query={query} />}
    </section>
  );
}
