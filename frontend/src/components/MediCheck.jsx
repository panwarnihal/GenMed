import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ClipboardList, Upload, Plus, Trash2, Pencil, Check, X, Loader2,
  Search, AlertTriangle, ShieldAlert, Sparkles, Pill, IndianRupee,
  ArrowRight, Zap, ScanLine, ChevronRight, AlertCircle,
  ShieldCheck, FileText, Activity, TrendingDown, BadgeCheck,
  RotateCcw, CheckCircle2, Ban, Info
} from 'lucide-react';
import { fetchAutocomplete, uploadInvoice, runComprehensiveAudit } from '../api';


/* ═══════════════════════════════════════════════════════════════════════════
   ANIMATED BACKGROUND ORBS
   ═══════════════════════════════════════════════════════════════════════════ */
function BackgroundOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, #a855f7 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="absolute top-20 left-1/4 w-[500px] h-[500px] rounded-full bg-purple-600/[0.04] blur-[120px] animate-[floatOrb_20s_ease-in-out_infinite]" />
      <div className="absolute bottom-40 right-1/4 w-[400px] h-[400px] rounded-full bg-emerald-600/[0.04] blur-[100px] animate-[floatOrb_15s_ease-in-out_infinite_reverse]" />
      <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full bg-sky-600/[0.03] blur-[80px] animate-[floatOrb_25s_ease-in-out_infinite_2s]" />
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════════════════════════════════════════ */
function AnimatedNumber({ value, prefix = '', decimals = 2 }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 1200;
    const step = (end - start) / (duration / 16);
    let current = start;
    const timer = setInterval(() => {
      current += step;
      if (current >= end) { current = end; clearInterval(timer); }
      setDisplayed(current);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{prefix}{displayed.toFixed(decimals)}</>;
}


/* ═══════════════════════════════════════════════════════════════════════════
   HERO SECTION
   ═══════════════════════════════════════════════════════════════════════════ */
function HeroSection() {
  return (
    <div className="text-center mb-10 animate-fade-in">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold mb-5 backdrop-blur-sm">
        <Activity className="w-3.5 h-3.5" />
        Prescription Intelligence Engine
      </div>

      {/* Heading */}
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-3">
        <span className="gradient-text">Medi</span>
        <span className="gradient-text-amber">Check</span>
      </h1>
      <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
        Build your prescription list, fix OCR errors, and run a{' '}
        <span className="text-foreground font-medium">comprehensive audit</span>{' '}
        — generic alternatives, redundancy detection, and safety warnings in one click.
      </p>

      {/* Stat pills */}
      <div className="flex flex-wrap justify-center gap-3 mt-6">
        {[
          { icon: Pill,          value: 'Multi-Drug',   label: 'Batch Analysis',     bg: 'bg-purple-500/8',  border: 'border-purple-500/20',  text: 'text-purple-400',  iconColor: 'text-purple-500' },
          { icon: ShieldAlert,   value: 'Redundancy',   label: 'Detection',          bg: 'bg-amber-500/8',   border: 'border-amber-500/20',   text: 'text-amber-400',   iconColor: 'text-amber-500' },
          { icon: TrendingDown,  value: 'PMBJP',        label: 'Generic Mapping',    bg: 'bg-emerald-500/8', border: 'border-emerald-500/20', text: 'text-emerald-400', iconColor: 'text-emerald-500' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl ${s.bg} border ${s.border} backdrop-blur-sm`}>
              <Icon className={`w-4 h-4 ${s.iconColor} flex-shrink-0`} />
              <div className="flex items-baseline gap-1.5">
                <span className={`text-sm font-extrabold ${s.text}`}>{s.value}</span>
                <span className="text-[11px] text-muted-foreground hidden sm:inline">{s.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   AUTOCOMPLETE INPUT
   ═══════════════════════════════════════════════════════════════════════════ */
function AutocompleteInput({ onAdd }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  const fetchSuggestions = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const results = await fetchAutocomplete(q);
      setSuggestions(results);
      setShowDropdown(results.length > 0);
      setHighlightIdx(-1);
    } catch {
      setSuggestions([]);
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 200);
  };

  const selectSuggestion = (name) => {
    onAdd(name);
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIdx >= 0 && suggestions[highlightIdx]) {
        selectSuggestion(suggestions[highlightIdx]);
      } else if (query.trim()) {
        onAdd(query.trim());
        setQuery('');
        setSuggestions([]);
        setShowDropdown(false);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative flex-1 min-w-0">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Type a medicine name..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground caret-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
          id="medicheck-search-input"
          autoComplete="off"
        />
      </div>
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-[100] top-full mt-1.5 left-0 right-0 bg-popover border border-border rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-fade-in"
        >
          {suggestions.map((name, i) => (
            <button
              key={name}
              onClick={() => selectSuggestion(name)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                i === highlightIdx
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <Pill className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   STAGING TABLE
   ═══════════════════════════════════════════════════════════════════════════ */
function StagingTable({ list, onEdit, onDelete }) {
  const [editingIdx, setEditingIdx] = useState(-1);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef(null);

  const startEdit = (idx) => {
    setEditingIdx(idx);
    setEditValue(list[idx]);
  };

  const confirmEdit = () => {
    if (editValue.trim()) {
      onEdit(editingIdx, editValue.trim());
    }
    setEditingIdx(-1);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingIdx(-1);
    setEditValue('');
  };

  useEffect(() => {
    if (editingIdx >= 0 && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingIdx]);

  if (list.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center border border-border/60">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-4">
          <ClipboardList className="w-8 h-8 text-purple-400" />
        </div>
        <p className="text-muted-foreground text-sm">
          No medicines added yet. Use the upload or search above to build your list.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl border border-border/60 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ClipboardList className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-foreground">Prescription List</span>
          <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {list.length} {list.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30">
              <th className="text-left py-2.5 px-5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold w-12">#</th>
              <th className="text-left py-2.5 px-5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Medicine Name</th>
              <th className="text-right py-2.5 px-5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((med, i) => (
              <tr
                key={`${med}-${i}`}
                className="border-b border-border/20 last:border-b-0 hover:bg-muted/20 transition-colors group"
              >
                <td className="py-3 px-5 text-muted-foreground font-mono text-xs">
                  {String(i + 1).padStart(2, '0')}
                </td>
                <td className="py-3 px-5">
                  {editingIdx === i ? (
                    <div className="flex items-center gap-2">
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        className="flex-1 px-3 py-1.5 bg-background border border-primary/40 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <button
                        onClick={confirmEdit}
                        className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                        title="Confirm edit"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                        title="Cancel edit"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <Pill className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                      <span className="font-medium text-foreground">{med}</span>
                    </div>
                  )}
                </td>
                <td className="py-3 px-5 text-right">
                  {editingIdx !== i && (
                    <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(i)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
                        title="Edit medicine name"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(i)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Remove from list"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   RESULTS DASHBOARD — RED ALERT CARD
   ═══════════════════════════════════════════════════════════════════════════ */
function RedAlertCard({ redundancies, nsqWarnings }) {
  if ((!redundancies || redundancies.length === 0) && (!nsqWarnings || nsqWarnings.length === 0)) {
    return null;
  }

  return (
    <div className="rounded-2xl border-2 border-red-500/30 bg-gradient-to-br from-red-500/[0.06] via-red-900/[0.04] to-transparent p-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25">
          <ShieldAlert className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-red-400">Safety Alerts</h3>
          <p className="text-xs text-red-400/60">Issues requiring your attention</p>
        </div>
      </div>

      {/* Redundancies */}
      {redundancies && redundancies.length > 0 && (
        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400/80">
            <AlertTriangle className="w-3.5 h-3.5" />
            Therapeutic Redundancy
          </div>
          {redundancies.map((r, i) => (
            <div key={i} className="bg-amber-500/[0.07] border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">
                  {r.therapeutic_class}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mb-2.5">
                {r.medicines.map((m) => (
                  <span key={m} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs font-medium text-amber-300">
                    <Pill className="w-3 h-3" />
                    {m}
                  </span>
                ))}
              </div>
              <p className="text-xs text-amber-200/70 leading-relaxed">{r.warning}</p>
            </div>
          ))}
        </div>
      )}

      {/* NSQ / Regulatory Warnings */}
      {nsqWarnings && nsqWarnings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-400/80">
            <Ban className="w-3.5 h-3.5" />
            Regulatory / CDSCO Warnings
          </div>
          {nsqWarnings.map((w, i) => (
            <div key={i} className="bg-red-500/[0.07] border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-red-300">{w.medicine}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    w.status === 'BANNED'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {w.status}
                  </span>
                </div>
                <p className="text-xs text-red-200/70 leading-relaxed">{w.warning_message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   RESULTS DASHBOARD — GREEN SAVINGS CARD
   ═══════════════════════════════════════════════════════════════════════════ */
function GreenSavingsCard({ alternatives }) {
  if (!alternatives || alternatives.length === 0) return null;

  const matched = alternatives.filter((a) => a.match_found);
  const unmatched = alternatives.filter((a) => !a.match_found);

  return (
    <div className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.06] via-emerald-900/[0.04] to-transparent p-6 animate-slide-up"
      style={{ animationDelay: '0.1s' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25">
          <TrendingDown className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-emerald-400">Generic Alternatives</h3>
          <p className="text-xs text-emerald-400/60">
            {matched.length} of {alternatives.length} medicines have PMBJP equivalents
          </p>
        </div>
      </div>

      {/* Matched alternatives */}
      {matched.length > 0 && (
        <div className="space-y-3 mb-4">
          {matched.map((a, i) => (
            <div key={i} className="bg-emerald-500/[0.05] border border-emerald-500/15 rounded-xl p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                {/* Brand → Generic */}
                <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate">{a.input_name}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-emerald-400 truncate">{a.generic_name}</span>
                </div>
                {/* Price badge */}
                <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/20 px-3 py-1.5 rounded-xl flex-shrink-0">
                  <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-300">
                    {a.generic_price?.toFixed(2)}
                  </span>
                </div>
              </div>
              {a.drug_code && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded font-mono">
                    {a.drug_code}
                  </span>
                  <span className="text-[10px] text-emerald-400/50 font-medium">Jan Aushadhi</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Unmatched items */}
      {unmatched.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            <Info className="w-3.5 h-3.5" />
            No Generic Found
          </div>
          {unmatched.map((a, i) => (
            <div key={i} className="flex items-center gap-2.5 bg-muted/20 border border-border/40 rounded-xl px-4 py-3">
              <Pill className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground">{a.input_name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground/60 bg-muted px-2 py-0.5 rounded-full">
                No PMBJP Match
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   ALL-CLEAR CARD (shown when no warnings)
   ═══════════════════════════════════════════════════════════════════════════ */
function AllClearCard() {
  return (
    <div className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.06] via-emerald-900/[0.04] to-transparent p-6 animate-slide-up text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 mb-3">
        <ShieldCheck className="w-6 h-6 text-emerald-400" />
      </div>
      <h3 className="text-lg font-bold text-emerald-400 mb-1">All Clear</h3>
      <p className="text-xs text-emerald-400/60">No therapeutic redundancies or regulatory warnings detected.</p>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   MAIN MEDICHECK COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function MediCheck() {
  // ── State ──
  const [medicineList, setMedicineList] = useState([]);
  const [auditResult, setAuditResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const resultsRef = useRef(null);

  // ── Add a medicine to the list ──
  const addMedicine = useCallback((name) => {
    if (!name || !name.trim()) return;
    setMedicineList((prev) => [...prev, name.trim()]);
    setAuditResult(null);  // Clear stale results
    setError('');
  }, []);

  // ── Edit a medicine at index ──
  const editMedicine = useCallback((idx, newName) => {
    setMedicineList((prev) => {
      const copy = [...prev];
      copy[idx] = newName;
      return copy;
    });
    setAuditResult(null);
  }, []);

  // ── Delete a medicine at index ──
  const deleteMedicine = useCallback((idx) => {
    setMedicineList((prev) => prev.filter((_, i) => i !== idx));
    setAuditResult(null);
  }, []);

  // ── Clear entire list ──
  const clearList = () => {
    setMedicineList([]);
    setAuditResult(null);
    setError('');
  };

  // ── OCR Upload handler ──
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const result = await uploadInvoice(file);
      // Extract brand_name from audited_items and append to list
      if (result?.audited_items?.length) {
        const names = result.audited_items.map((item) => item.brand_name).filter(Boolean);
        if (names.length > 0) {
          setMedicineList((prev) => [...prev, ...names]);
          setAuditResult(null);
        } else {
          setError('OCR completed but no medicine names were extracted.');
        }
      } else {
        setError('No medicines could be extracted from the uploaded image.');
      }
    } catch (err) {
      setError(err.message || 'Failed to process the uploaded prescription.');
    } finally {
      setUploading(false);
      // Reset file input so same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Run Comprehensive Audit ──
  const handleAudit = async () => {
    if (medicineList.length === 0) return;
    setLoading(true);
    setError('');
    setAuditResult(null);
    try {
      const result = await runComprehensiveAudit(medicineList);
      setAuditResult(result);
      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    } catch (err) {
      setError(err.message || 'Audit failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasAlerts = auditResult && (
    (auditResult.redundancies?.length > 0) || (auditResult.nsq_warnings?.length > 0)
  );

  return (
    <div className="relative min-h-[70vh]">
      <BackgroundOrbs />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* ── Hero ── */}
        <HeroSection />

        {/* ── Input Section ── */}
        <div className="glass-card rounded-2xl border border-border/60 p-5 sm:p-6 mb-6 animate-slide-up relative z-20" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <ScanLine className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-foreground">Add Medicines</h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* OCR Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              id="medicheck-upload-input"
              onChange={handleUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-semibold hover:from-purple-500 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-purple-600/20 hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] flex-shrink-0"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing OCR…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Prescription
                </>
              )}
            </button>

            {/* Manual autocomplete */}
            <AutocompleteInput onAdd={addMedicine} />
          </div>
        </div>

        {/* ── Staging Table ── */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <StagingTable
            list={medicineList}
            onEdit={editMedicine}
            onDelete={deleteMedicine}
          />
        </div>

        {/* ── Action Buttons ── */}
        {medicineList.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8 animate-slide-up" style={{ animationDelay: '0.15s' }}>
            {/* Run Audit */}
            <button
              onClick={handleAudit}
              disabled={loading || medicineList.length === 0}
              className="flex-1 inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white text-base font-bold hover:from-emerald-500 hover:via-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-xl shadow-emerald-600/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]"
              id="medicheck-run-audit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing {medicineList.length} medicines…
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Run Comprehensive Audit
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-lg font-semibold">
                    {medicineList.length}
                  </span>
                </>
              )}
            </button>

            {/* Clear list */}
            <button
              onClick={clearList}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-muted/50 border border-border text-muted-foreground text-sm font-medium hover:bg-muted hover:text-foreground disabled:opacity-50 transition-all flex-shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              Clear List
            </button>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4 mb-6 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* ── Results Dashboard ── */}
        {auditResult && (
          <div ref={resultsRef} className="space-y-6 mb-12">
            {/* Summary badge */}
            <div className="flex items-center gap-3 animate-fade-in">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Audit Complete — {auditResult.medicine_count} medicines analyzed
              </div>
            </div>

            {/* Alert card or All-Clear */}
            {hasAlerts ? (
              <RedAlertCard
                redundancies={auditResult.redundancies}
                nsqWarnings={auditResult.nsq_warnings}
              />
            ) : (
              <AllClearCard />
            )}

            {/* Savings card */}
            <GreenSavingsCard alternatives={auditResult.alternatives} />
          </div>
        )}
      </div>
    </div>
  );
}
