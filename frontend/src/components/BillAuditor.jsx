import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, FileText, AlertTriangle, CheckCircle2, TrendingDown,
  IndianRupee, RefreshCw, AlertCircle, Sparkles, ShieldAlert,
  ArrowUpRight, ReceiptText, ScanLine, Zap, Info, BadgeCheck,
  ChevronRight, BarChart3, X, ImageIcon, ShieldX, Siren,
  HeartPulse, Scale, FileWarning, Ban, Eye, ArrowRight,
  Clock, ShieldCheck, Cpu, FlaskConical,
} from 'lucide-react';
import { uploadInvoiceImage, auditManualInvoice } from '../api';



/* ═══════════════════════════════════════════════════════════════════════════
   ANIMATED BACKGROUND GRID — subtle dot grid with floating glow orbs
   ═══════════════════════════════════════════════════════════════════════════ */
function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, #a855f7 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Floating glow orbs */}
      <div className="absolute top-20 left-1/4 w-[500px] h-[500px] rounded-full bg-purple-600/[0.04] blur-[120px] animate-[floatOrb_20s_ease-in-out_infinite]" />
      <div className="absolute bottom-40 right-1/4 w-[400px] h-[400px] rounded-full bg-blue-600/[0.05] blur-[100px] animate-[floatOrb_15s_ease-in-out_infinite_reverse]" />
      <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full bg-emerald-600/[0.03] blur-[80px] animate-[floatOrb_25s_ease-in-out_infinite_2s]" />
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   ANIMATED COUNTER — counts up from 0 to target
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
   DONUT RING — animated SVG circle
   ═══════════════════════════════════════════════════════════════════════════ */
function DonutRing({ pct, colour, bgColour = '#1e293b', size = 80, strokeWidth = 8 }) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(Math.max(pct, 0), 1));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bgColour} strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={colour} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        className="transition-all duration-[1.5s] ease-[cubic-bezier(0.34,1.56,0.64,1)]"
      />
    </svg>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   PREMIUM METRIC CARD — with donut ring + animated counter
   ═══════════════════════════════════════════════════════════════════════════ */
function PremiumMetricCard({ icon: Icon, label, value, sub, colour, glowColour, donutPct, ringColour, delay = '0s' }) {
  return (
    <div
      className="relative group rounded-2xl p-[1px] opacity-0 animate-[slideUp_0.6s_ease-out_forwards]"
      style={{ animationDelay: delay }}
    >
      {/* Gradient border */}
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${glowColour} opacity-60 group-hover:opacity-100 transition-opacity duration-500 blur-[1px]`} />

      {/* Inner card */}
      <div className="relative glass-card rounded-2xl p-6 h-full space-y-4 overflow-hidden">
        {/* Ambient glow */}
        <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full ${glowColour.replace('from-', 'bg-').split(' ')[0]}/10 blur-[60px] group-hover:scale-150 transition-transform duration-700`} />

        <div className="relative flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${glowColour} flex items-center justify-center shadow-lg`}>
                <Icon className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{label}</span>
            </div>
            <div className={`text-3xl font-black tracking-tight ${colour}`}>
              <AnimatedNumber value={value} prefix="₹" />
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">{sub}</p>
          </div>

          {/* Donut */}
          {donutPct !== undefined && (
            <div className="relative flex-shrink-0">
              <DonutRing pct={donutPct} colour={ringColour} size={72} strokeWidth={6} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xs font-bold ${colour}`}>
                  {(donutPct * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   PROCESSING LOADER — cinematic AI pipeline animation
   ═══════════════════════════════════════════════════════════════════════════ */
function ScannerLoader({ fileName }) {
  const [activeStep, setActiveStep] = useState(0);
  const steps = [
    { icon: ImageIcon,   label: 'Image validated & uploaded',             colour: 'text-emerald-400' },
    { icon: Eye,         label: 'Running Gemini 1.5 Flash Vision OCR',    colour: 'text-blue-400' },
    { icon: ScanLine,    label: 'Extracting medicines via NER pipeline',  colour: 'text-indigo-400' },
    { icon: FlaskConical,label: 'Matching Jan Aushadhi generics',         colour: 'text-purple-400' },
    { icon: HeartPulse,  label: 'Analyzing Drug-Drug Interactions',       colour: 'text-pink-400' },
    { icon: ShieldCheck, label: 'Running CDSCO regulatory scan',          colour: 'text-amber-400' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((s) => (s < steps.length - 1 ? s + 1 : s));
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-blue-500/50 via-indigo-500/30 to-purple-500/50 animate-[fadeIn_0.3s_ease-out]">
      <div className="glass-card rounded-2xl p-8 space-y-8 overflow-hidden relative">
        {/* Scanning line animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent animate-[scanLine_2.5s_ease-in-out_infinite]" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-900/50">
              <Cpu className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white tracking-tight">Vision AI Processing</h3>
            <p className="text-sm text-slate-400 mt-1">
              Analyzing <span className="text-blue-300 font-medium">{fileName}</span>
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-blue-300 font-medium">~10-15s</span>
          </div>
        </div>

        {/* Pipeline steps */}
        <div className="space-y-2">
          {steps.map(({ icon: StepIcon, label, colour }, idx) => {
            const isActive = idx === activeStep;
            const isDone = idx < activeStep;
            const isPending = idx > activeStep;
            return (
              <div
                key={label}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-500 ${
                  isActive
                    ? 'bg-slate-800/80 border border-blue-500/30 shadow-lg shadow-blue-900/20'
                    : isDone
                    ? 'bg-emerald-500/5 border border-emerald-500/10'
                    : 'bg-transparent border border-transparent opacity-40'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                  isDone
                    ? 'bg-emerald-500/20'
                    : isActive
                    ? 'bg-blue-500/20 animate-pulse'
                    : 'bg-slate-800/50'
                }`}>
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <StepIcon className={`w-5 h-5 ${isActive ? colour : 'text-slate-600'}`} />
                  )}
                </div>
                <span className={`text-sm font-medium transition-colors duration-300 ${
                  isDone ? 'text-emerald-300' : isActive ? 'text-white' : 'text-slate-600'
                }`}>
                  {label}
                </span>
                <div className="ml-auto">
                  {isDone && <span className="text-[10px] font-semibold text-emerald-400">Done</span>}
                  {isActive && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500 transition-all duration-1000 ease-out"
              style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-600">
            <span>Processing pipeline</span>
            <span>{Math.round(((activeStep + 1) / steps.length) * 100)}% complete</span>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function BillAuditor() {
  const [report, setReport]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [isDragOver, setIsDragOver]  = useState(false);
  const [fileName, setFileName]     = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [manualItems, setManualItems] = useState([
    { brand_name: '', paid_price: '', printed_mrp: '', quantity_units: '1' }
  ]);
  const fileInputRef = useRef(null);

  const addManualItemField = () => {
    setManualItems(prev => [...prev, { brand_name: '', paid_price: '', printed_mrp: '', quantity_units: '1' }]);
  };

  const removeManualItem = (index) => {
    setManualItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateManualItem = (index, field, value) => {
    setManualItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const validItems = manualItems
      .filter(i => (i.brand_name || '').trim() !== '')
      .map(i => ({
        brand_name: i.brand_name.trim(),
        paid_price: parseFloat(i.paid_price) || 0,
        printed_mrp: i.printed_mrp ? parseFloat(i.printed_mrp) : undefined,
        quantity_units: parseInt(i.quantity_units, 10) || 1,
      }));

    if (validItems.length === 0) {
      setError('Please enter at least one medicine name and amount paid.');
      return;
    }

    setLoading(true);
    setError('');
    setReport(null);
    setFileName(validItems.length === 1 ? validItems[0].brand_name : `${validItems.length} Manual Items`);
    setPreviewUrl('');

    try {
      const data = await auditManualInvoice(validItems);
      setReport(data);
    } catch (err) {
      setError(err.message || 'An error occurred while performing manual audit.');
    } finally {
      setLoading(false);
    }
  };


  /* ── Core upload handler ── */
  const handleUpload = useCallback(async (file) => {
    if (!file) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/bmp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setError(`Unsupported file type "${file.type}". Please upload a JPG, PNG, or WebP image of your pharmacy bill.`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image exceeds the 10 MB size limit. Please upload a smaller file.');
      return;
    }

    setLoading(true);
    setError('');
    setReport(null);
    setFileName(file.name);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const data = await uploadInvoiceImage(file);
      setReport(data);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred while processing your invoice.');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Event handlers ── */
  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  };
  const handleReset = () => {
    setReport(null);
    setError('');
    setFileName('');
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── Derived data ── */
  const hasBannedDrugs = report?.audited_items?.some(i => i.regulatory_summary?.is_banned) ?? false;
  const ddiAlerts = report?.ddi_summary?.alerts ?? [];
  const hasDDI = ddiAlerts.length > 0;
  const regulatoryWarnings = (report?.audited_items ?? [])
    .filter(i => i.regulatory_summary?.warning_message)
    .map(i => ({ brand_name: i.brand_name, ...i.regulatory_summary }));
  const totalBilled      = report?.total_paid ?? 0;
  const totalOvercharges = report?.total_overcharge ?? 0;
  const totalSavings     = report?.total_potential_savings ?? 0;
  const overchargePct    = totalBilled > 0 ? totalOvercharges / totalBilled : 0;
  const savingsPct       = totalBilled > 0 ? totalSavings / totalBilled : 0;


  return (
    <section className="relative space-y-10" id="bill-auditor">

      <AnimatedBackground />

      {/* ════════════════════════════════════════════════════════════════════
          HERO SECTION
          ════════════════════════════════════════════════════════════════════ */}
      <div className="relative text-center space-y-6 pt-4 pb-2">
        {/* Pill badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Powered by Google Gemini Vision AI
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight">
          <span className="text-white">Scan Your Bill.</span>
          <br />
          <span className="gradient-text">Save Thousands.</span>
        </h1>

        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Upload a photo of your pharmacy invoice. Our Vision AI extracts every medicine,
          audits for illegal MRP overcharges, and maps affordable{' '}
          <span className="text-emerald-400 font-medium">Jan Aushadhi</span> generic alternatives — instantly.
        </p>
      </div>


      {/* ════════════════════════════════════════════════════════════════════
          UPLOAD ZONE (pre-scan state)
          ════════════════════════════════════════════════════════════════════ */}
      {!report && !loading && (
        <div className="space-y-8 animate-[fadeIn_0.4s_ease-out]">
          {/* Two-box horizontal split layout with OR divider */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch relative">

            {/* LEFT BOX: Upload Receipt */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative group rounded-2xl transition-all duration-300 flex flex-col ${
                isDragOver ? 'scale-[1.01]' : ''
              }`}
            >
              {/* Animated border */}
              <div className={`absolute inset-0 rounded-2xl p-[1px] transition-opacity duration-300 ${
                isDragOver
                  ? 'bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 opacity-100'
                  : 'bg-gradient-to-br from-purple-500/40 via-indigo-500/20 to-blue-500/40 opacity-60 group-hover:opacity-100'
              }`}>
                <div className="w-full h-full rounded-2xl bg-[#09090b]" />
              </div>

              <div className="relative glass-card rounded-2xl border-0 p-6 sm:p-8 flex-1 flex flex-col justify-between">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="bill-upload-input"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/bmp,image/gif"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <label htmlFor="bill-upload-input" className="cursor-pointer flex-1 flex flex-col items-center justify-center gap-5 text-center p-4 rounded-xl hover:bg-slate-800/20 transition-colors">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold text-[11px] uppercase tracking-wider mb-1">
                    <Upload className="w-3.5 h-3.5" /> Option 01: Image Scan
                  </div>

                  <div className="relative">
                    <div className={`absolute inset-0 rounded-3xl blur-2xl transition-colors duration-300 ${
                      isDragOver ? 'bg-emerald-500/30' : 'bg-purple-500/20'
                    }`} />
                    <div className={`relative w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-300 ${
                      isDragOver
                        ? 'bg-emerald-500/15 border-2 border-emerald-400/50 shadow-2xl shadow-emerald-500/20'
                        : 'bg-slate-800/80 border-2 border-slate-700/50 group-hover:border-purple-500/40 group-hover:bg-purple-500/5'
                    }`}>
                      <Upload className={`w-9 h-9 transition-all duration-300 ${
                        isDragOver ? 'text-emerald-400 scale-110' : 'text-slate-400 group-hover:text-purple-400'
                      }`} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xl font-bold text-white">
                      {isDragOver ? 'Release to upload!' : 'Drop Pharmacy Bill Image'}
                    </p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Upload invoice photo or receipt. Gemini Vision AI auto-extracts every medicine, price &amp; batch.
                    </p>
                  </div>

                  <div className="pt-2">
                    <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold shadow-xl shadow-purple-900/30 group-hover:shadow-purple-900/50 group-hover:scale-[1.02] transition-all duration-200">
                      <Upload className="w-4 h-4" />
                      Browse Files
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 mt-1">
                    Supports JPG, PNG, WebP, BMP (Max 10 MB)
                  </p>
                </label>
              </div>
            </div>

            {/* OR DIVIDER */}
            <div className="lg:absolute lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-20 flex items-center justify-center my-2 lg:my-0 pointer-events-none">
              <div className="w-11 h-11 rounded-full bg-slate-950 border-2 border-purple-500/40 shadow-2xl shadow-purple-950 flex items-center justify-center">
                <span className="text-xs font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400">
                  OR
                </span>
              </div>
            </div>

            {/* RIGHT BOX: Manual Medicine Entry */}
            <div className="relative group rounded-2xl flex flex-col">
              {/* Border glow */}
              <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-br from-emerald-500/40 via-teal-500/20 to-cyan-500/40 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-full h-full rounded-2xl bg-[#09090b]" />
              </div>

              <div className="relative glass-card rounded-2xl border-0 p-6 sm:p-8 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[11px] uppercase tracking-wider">
                      <FileText className="w-3.5 h-3.5" /> Option 02: Manual Entry
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      Instant Audit
                    </span>
                  </div>

                  <div className="space-y-1 mb-5">
                    <h3 className="text-xl font-bold text-white">Enter Medicine &amp; Paid Price</h3>
                    <p className="text-xs text-slate-400">
                      Type the medicine name and amount paid to check MRP compliance &amp; Jan Aushadhi generic savings.
                    </p>
                  </div>

                  <form onSubmit={handleManualSubmit} id="manual-audit-form" className="space-y-4">
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {manualItems.map((item, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 relative">
                          {manualItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeManualItem(idx)}
                              className="absolute top-2 right-2 text-slate-500 hover:text-red-400 transition-colors p-1"
                              title="Remove medicine"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                              Medicine Name <span className="text-emerald-400">*</span>
                            </label>
                            <div className="relative">
                              <FlaskConical className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                required
                                placeholder="e.g. Augmentin 625 Duo / Calpol 500"
                                value={item.brand_name}
                                onChange={(e) => updateManualItem(idx, 'brand_name', e.target.value)}
                                className="w-full bg-slate-800/90 border border-slate-700/70 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                                Paid Price (₹) <span className="text-emerald-400">*</span>
                              </label>
                              <div className="relative">
                                <IndianRupee className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  required
                                  placeholder="e.g. 223"
                                  value={item.paid_price}
                                  onChange={(e) => updateManualItem(idx, 'paid_price', e.target.value)}
                                  className="w-full bg-slate-800/90 border border-slate-700/70 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                                Printed MRP (₹)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Optional"
                                value={item.printed_mrp}
                                onChange={(e) => updateManualItem(idx, 'printed_mrp', e.target.value)}
                                className="w-full bg-slate-800/90 border border-slate-700/70 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                              />
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                              <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                                Qty (Units)
                              </label>
                              <input
                                type="number"
                                min="1"
                                placeholder="1"
                                value={item.quantity_units}
                                onChange={(e) => updateManualItem(idx, 'quantity_units', e.target.value)}
                                className="w-full bg-slate-800/90 border border-slate-700/70 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </form>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-800/80 mt-4">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={addManualItemField}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                    >
                      + Add Another Medicine
                    </button>
                    <span className="text-[10px] text-slate-500">
                      {manualItems.length} item{manualItems.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <button
                    type="submit"
                    form="manual-audit-form"
                    className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                    Audit Medicine &amp; Calculate Savings
                  </button>
                </div>
              </div>
            </div>

          </div>


          {/* How it works steps */}
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                step: '01', icon: Upload, colour: 'from-blue-500 to-cyan-500',
                title: 'Upload Invoice', desc: 'Take a photo of your chemist bill or medical store receipt',
              },
              {
                step: '02', icon: Cpu, colour: 'from-purple-500 to-pink-500',
                title: 'AI Analyzes', desc: 'Gemini Vision OCR extracts every medicine, price, and batch number',
              },
              {
                step: '03', icon: BarChart3, colour: 'from-emerald-500 to-teal-500',
                title: 'Get Your Report', desc: 'Instant audit with overcharges, generic alternatives & safety alerts',
              },
            ].map(({ step, icon: StepIcon, colour, title, desc }, idx) => (
              <div
                key={step}
                className="relative group glass-card rounded-2xl p-6 border border-slate-700/40 hover:border-slate-600/60 transition-all duration-300 hover:-translate-y-1 opacity-0 animate-[slideUp_0.5s_ease-out_forwards]"
                style={{ animationDelay: `${0.1 + idx * 0.15}s` }}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colour} flex items-center justify-center shadow-lg`}>
                      <StepIcon className="w-5 h-5 text-white" strokeWidth={2} />
                    </div>
                    <span className="text-3xl font-black text-slate-800/80">{step}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{title}</h3>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
                {idx < 2 && (
                  <div className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight className="w-5 h-5 text-slate-700" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {[
              { icon: Cpu,         text: 'Gemini Vision AI' },
              { icon: BadgeCheck,  text: 'PMBJP Verified' },
              { icon: ShieldCheck, text: 'CDSCO Compliant' },
              { icon: HeartPulse,  text: 'DDI Safety Engine' },
              { icon: Scale,       text: 'MRP Audit Engine' },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-500 bg-slate-800/40 border border-slate-700/30 px-4 py-2 rounded-full hover:border-purple-500/30 hover:text-slate-400 transition-colors duration-200">
                <Icon className="w-3.5 h-3.5 text-purple-400/60" />{text}
              </span>
            ))}
          </div>
        </div>
      )}


      {/* ════════════════════════════════════════════════════════════════════
          ERROR BANNER
          ════════════════════════════════════════════════════════════════════ */}
      {error && (
        <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-red-500/50 to-orange-500/50 animate-[slideUp_0.3s_ease-out]">
          <div className="glass-card rounded-2xl p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-sm font-bold text-red-300">Processing Failed</h3>
              <p className="text-xs text-red-400/80 leading-relaxed">{error}</p>
              <button
                onClick={handleReset}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-red-300 bg-red-500/10 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Try Again
              </button>
            </div>
            <button onClick={() => setError('')} className="text-red-400/40 hover:text-red-300 transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}


      {/* ════════════════════════════════════════════════════════════════════
          LOADING STATE
          ════════════════════════════════════════════════════════════════════ */}
      {loading && <ScannerLoader fileName={fileName} />}


      {/* ════════════════════════════════════════════════════════════════════
          RESULTS
          ════════════════════════════════════════════════════════════════════ */}
      {report && !loading && (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">

          {/* ── Report header ── */}
          <div className="flex items-center justify-between flex-wrap gap-4 glass-card rounded-2xl p-5 border border-slate-700/50">
            <div className="flex items-center gap-4">
              {previewUrl && (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Uploaded invoice"
                    className="w-14 h-14 rounded-xl object-cover border-2 border-slate-700/50 shadow-lg"
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">{fileName}</h2>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                    Audited
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Invoice #{report.invoice_id} &nbsp;·&nbsp; {report.audited_items?.length ?? 0} medicines scanned
                </p>
              </div>
            </div>
            <button
              id="scan-new-bill-btn"
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold shadow-lg shadow-purple-900/30 hover:shadow-purple-900/50 hover:scale-[1.02] transition-all duration-200"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Scan Another Bill
            </button>
          </div>


          {/* ── SAFETY & REGULATORY ALERTS ── */}
          {(hasBannedDrugs || hasDDI || regulatoryWarnings.length > 0) && (
            <div className="space-y-4">

              {/* Banned Drugs Alert */}
              {hasBannedDrugs && (
                <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-red-500 via-rose-500 to-red-500 animate-[slideUp_0.3s_ease-out]">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-500 via-rose-500 to-red-500 animate-pulse opacity-30 blur-md" />
                  <div className="relative glass-card rounded-2xl p-6 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center flex-shrink-0 border border-red-500/30">
                        <Ban className="w-7 h-7 text-red-400" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-lg font-black text-red-300">BANNED SUBSTANCE DETECTED</h3>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-white bg-red-500 px-2.5 py-1 rounded-full animate-pulse">
                            CRITICAL ALERT
                          </span>
                        </div>
                        <p className="text-sm text-red-400/80 leading-relaxed">
                          One or more medicines contain ingredients <strong className="text-red-300">banned by CDSCO</strong> (Central Drugs Standard Control Organisation).
                          <strong className="text-red-200"> DO NOT CONSUME</strong> — consult a licensed physician immediately.
                        </p>
                        <div className="space-y-2 pt-2">
                          {regulatoryWarnings.filter(w => w.is_banned).map((w, i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                              <ShieldX className="w-5 h-5 text-red-400 flex-shrink-0" />
                              <div>
                                <span className="text-sm font-bold text-red-200">{w.brand_name}</span>
                                <p className="text-[11px] text-red-400/70 mt-0.5">{w.warning_message}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DDI Alerts */}
              {hasDDI && (
                <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-amber-500/60 via-orange-500/40 to-amber-500/60 animate-[slideUp_0.3s_ease-out]">
                  <div className="glass-card rounded-2xl p-6 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center flex-shrink-0 border border-amber-500/20">
                        <HeartPulse className="w-7 h-7 text-amber-400" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-lg font-bold text-amber-300">
                            Drug-Drug Interaction{ddiAlerts.length > 1 ? 's' : ''} Detected
                          </h3>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                            report.ddi_summary?.has_critical_interactions
                              ? 'text-white bg-red-500'
                              : 'text-amber-300 bg-amber-500/20'
                          }`}>
                            {report.ddi_summary?.has_critical_interactions ? 'HIGH SEVERITY' : 'WARNING'}
                          </span>
                        </div>
                        <p className="text-sm text-amber-400/70 leading-relaxed">
                          These medicines may interact with each other. Consult your physician before taking them together.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {ddiAlerts.map((alert, i) => (
                        <div
                          key={i}
                          className={`rounded-xl p-4 border space-y-2 ${
                            alert.severity === 'HIGH'
                              ? 'border-red-500/30 bg-red-500/5'
                              : alert.severity === 'MODERATE'
                              ? 'border-amber-500/25 bg-amber-500/5'
                              : 'border-slate-700/50 bg-slate-800/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                              alert.severity === 'HIGH'
                                ? 'text-red-300 bg-red-500/20 border border-red-500/30'
                                : alert.severity === 'MODERATE'
                                ? 'text-amber-300 bg-amber-500/15 border border-amber-500/25'
                                : 'text-slate-400 bg-slate-700/50'
                            }`}>
                              {alert.severity}
                            </span>
                            <span className="text-sm font-bold text-white">
                              {alert.drug_a}
                              <span className="text-slate-500 mx-2">↔</span>
                              {alert.drug_b}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed pl-0.5">
                            {alert.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Schedule H1 / other regulatory warnings */}
              {regulatoryWarnings.filter(w => !w.is_banned).length > 0 && (
                <div className="glass-card rounded-2xl p-5 border border-yellow-500/25 animate-[slideUp_0.3s_ease-out]">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-yellow-500/15 flex items-center justify-center flex-shrink-0">
                      <FileWarning className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <h3 className="text-sm font-bold text-yellow-300">Regulatory Notices</h3>
                      <div className="space-y-2">
                        {regulatoryWarnings.filter(w => !w.is_banned).map((w, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-yellow-400/80">
                            <Siren className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-yellow-500" />
                            <span><strong className="text-yellow-300">{w.brand_name}</strong> — {w.warning_message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* ── FINANCIAL SUMMARY ── */}
          <div className="grid sm:grid-cols-3 gap-5">
            <PremiumMetricCard
              icon={IndianRupee}
              label="Total Paid"
              value={totalBilled}
              sub="Sum of all amounts charged on this invoice"
              colour="text-slate-100"
              glowColour="from-slate-500/30 to-slate-600/20"
              ringColour="#94a3b8"
              donutPct={1}
              delay="0s"
            />
            <PremiumMetricCard
              icon={ShieldAlert}
              label="Total Overcharge"
              value={totalOvercharges}
              sub={totalOvercharges > 0 ? '⚠️ Paid price exceeded printed MRP!' : '✓ All prices MRP-compliant'}
              colour={totalOvercharges > 0 ? 'text-amber-400' : 'text-emerald-400'}
              glowColour={totalOvercharges > 0 ? 'from-amber-500/40 to-orange-500/20' : 'from-emerald-500/30 to-teal-500/20'}
              ringColour={totalOvercharges > 0 ? '#f59e0b' : '#10b981'}
              donutPct={overchargePct}
              delay="0.15s"
            />
            <PremiumMetricCard
              icon={TrendingDown}
              label="Potential Savings"
              value={totalSavings}
              sub="By switching to Jan Aushadhi generics"
              colour="text-emerald-400"
              glowColour="from-emerald-500/40 to-teal-500/20"
              ringColour="#10b981"
              donutPct={savingsPct}
              delay="0.3s"
            />
          </div>


          {/* ── SAVINGS BREAKDOWN BAR ── */}
          {(totalSavings > 0 || totalOvercharges > 0) && (
            <div className="glass-card rounded-2xl p-6 border border-emerald-500/20 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-400" />
                  Savings Breakdown
                </h3>
                {totalSavings > 0 && (
                  <span className="text-sm text-emerald-300 font-bold bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full">
                    {(savingsPct * 100).toFixed(1)}% saveable
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>₹0</span>
                  <span>₹{totalBilled.toFixed(2)} total billed</span>
                </div>
                <div className="w-full bg-slate-800/80 rounded-full h-5 overflow-hidden flex shadow-inner">
                  {totalOvercharges > 0 && (
                    <div
                      className="h-5 bg-gradient-to-r from-amber-500 to-orange-400 rounded-l-full transition-all duration-1000 relative group"
                      style={{ width: `${Math.max(overchargePct * 100, 2)}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap transition-opacity">
                        ₹{totalOvercharges.toFixed(2)}
                      </div>
                    </div>
                  )}
                  {totalSavings > 0 && (
                    <div
                      className="h-5 bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000 relative group"
                      style={{ width: `${Math.max(savingsPct * 100, 2)}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap transition-opacity">
                        ₹{totalSavings.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-5 text-xs">
                  {totalOvercharges > 0 && (
                    <span className="flex items-center gap-2 text-amber-400">
                      <span className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-400" />
                      Overcharge ₹{totalOvercharges.toFixed(2)}
                    </span>
                  )}
                  {totalSavings > 0 && (
                    <span className="flex items-center gap-2 text-emerald-400">
                      <span className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" />
                      Generic savings ₹{totalSavings.toFixed(2)}
                    </span>
                  )}
                  <span className="flex items-center gap-2 text-slate-500">
                    <span className="w-3 h-3 rounded-full bg-slate-700" />
                    Fair price ₹{Math.max(totalBilled - totalOvercharges - totalSavings, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}


          {/* ── ITEMIZED AUDIT TABLE ── */}
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-b from-slate-600/30 to-transparent">
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                    <ReceiptText className="w-4.5 h-4.5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Itemized Audit Report</h3>
                    <p className="text-[11px] text-slate-500">{report.audited_items?.length ?? 0} medicines · Invoice #{report.invoice_id}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-4 px-5">Medicine</th>
                      <th className="py-4 px-3 text-center">Qty</th>
                      <th className="py-4 px-4 text-right">Paid</th>
                      <th className="py-4 px-4 text-right">MRP</th>
                      <th className="py-4 px-4 text-center">Overcharge</th>
                      <th className="py-4 px-4">Jan Aushadhi Alt.</th>
                      <th className="py-4 px-4 text-right">Saves</th>
                      <th className="py-4 px-4 text-center">Safety</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                    {(report.audited_items ?? []).map((item, idx) => {
                      const audit = item.audit_summary;
                      const reg = item.regulatory_summary;
                      const hasOvercharge = audit?.is_overcharged;
                      return (
                        <tr key={idx} className="audit-row group/row">
                          <td className="py-5 px-5">
                            <span className="font-semibold text-white group-hover/row:text-purple-300 transition-colors duration-200">
                              {item.brand_name}
                            </span>
                          </td>
                          <td className="py-5 px-3 text-center">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800/80 text-slate-300 text-xs font-bold border border-slate-700/50">
                              {item.quantity_units}
                            </span>
                          </td>
                          <td className={`py-5 px-4 text-right font-bold ${hasOvercharge ? 'text-amber-300' : 'text-slate-200'}`}>
                            ₹{item.paid_price?.toFixed(2)}
                          </td>
                          <td className="py-5 px-4 text-right text-slate-500">
                            ₹{item.printed_mrp?.toFixed(2)}
                          </td>
                          <td className="py-5 px-4 text-center">
                            {hasOvercharge ? (
                              <span className="inline-flex items-center gap-1 bg-amber-500/12 border border-amber-500/25 text-amber-300 text-[10px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
                                <AlertTriangle className="w-3 h-3" />+₹{audit.overcharge_amount?.toFixed(2)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-emerald-500/8 border border-emerald-500/15 text-emerald-400 text-[10px] font-medium px-3 py-1.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />Fair
                              </span>
                            )}
                          </td>
                          <td className="py-5 px-4">
                            {audit?.jan_aushadhi_alternative ? (
                              <div className="space-y-1">
                                <div className="text-emerald-300 font-semibold flex items-center gap-1.5 text-xs">
                                  <ChevronRight className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                  {audit.jan_aushadhi_alternative}
                                </div>
                                {audit.jan_aushadhi_price != null && (
                                  <span className="text-[10px] text-emerald-500/70 ml-5">
                                    ₹{audit.jan_aushadhi_price.toFixed(2)}/unit
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-600 italic text-xs">No match</span>
                            )}
                          </td>
                          <td className="py-5 px-4 text-right">
                            {audit?.potential_savings > 0 ? (
                              <span className="text-emerald-400 font-black text-base">
                                +₹{audit.potential_savings.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-700">—</span>
                            )}
                          </td>
                          <td className="py-5 px-4 text-center">
                            {reg?.is_banned ? (
                              <span className="inline-flex items-center gap-1 bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-bold px-2.5 py-1.5 rounded-full" title={reg.warning_message}>
                                <Ban className="w-3 h-3" />BANNED
                              </span>
                            ) : reg?.status === 'SCHEDULE_H1' ? (
                              <span className="inline-flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 text-[10px] font-medium px-2.5 py-1.5 rounded-full" title={reg.warning_message}>
                                <Siren className="w-3 h-3" />H1
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-emerald-500/8 border border-emerald-500/15 text-emerald-400 text-[10px] px-2.5 py-1.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />OK
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table footer */}
              <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  <Info className="w-3.5 h-3.5" />
                  Generic alternatives sourced from PMBJP government database
                </span>
                <span className="flex items-center gap-2 text-sm text-emerald-400 font-bold">
                  <ArrowUpRight className="w-4 h-4" />
                  Total savings: ₹{totalSavings.toFixed(2)}
                </span>
              </div>
            </div>
          </div>


          {/* ── DDI SUMMARY GRID ── */}
          {report.ddi_summary && report.ddi_summary.interaction_count > 0 && (
            <div className="glass-card rounded-2xl p-6 border border-slate-700/50 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
                  <HeartPulse className="w-4.5 h-4.5 text-amber-400" />
                </div>
                <h3 className="text-base font-bold text-white">DDI Analysis Summary</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(report.ddi_summary.severity_breakdown || {}).map(([severity, count]) => (
                  <div key={severity} className={`rounded-xl py-4 px-5 border text-center ${
                    severity === 'HIGH'   ? 'border-red-500/25 bg-red-500/5' :
                    severity === 'MODERATE' ? 'border-amber-500/20 bg-amber-500/5' :
                    'border-slate-700/50 bg-slate-800/30'
                  }`}>
                    <div className={`text-3xl font-black ${
                      severity === 'HIGH' ? 'text-red-400' : severity === 'MODERATE' ? 'text-amber-400' : 'text-slate-400'
                    }`}>
                      {count}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{severity}</div>
                  </div>
                ))}
              </div>
            </div>
          )}


          {/* ── MEDICAL DISCLAIMER ── */}
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-b from-slate-700/30 to-transparent">
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <Scale className="w-4.5 h-4.5 text-slate-500" />
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                  Statutory Medical Disclaimer
                </h3>
              </div>
              <div className="text-xs text-slate-500 leading-relaxed space-y-3 pl-0.5">
                <p>
                  <strong className="text-slate-400">GenMed is an informational tool only.</strong> The audit results, generic alternative suggestions,
                  and safety alerts provided are computed algorithmically and are <strong className="text-slate-400">not a substitute for professional medical advice</strong>,
                  diagnosis, or treatment.
                </p>
                <p>
                  Generic alternatives are sourced from the <strong className="text-slate-400">Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP)</strong> database
                  and matched using deterministic chemical composition hashing. Pharmacological equivalence does not guarantee therapeutic interchangeability.
                </p>
                <p>
                  DDI alerts are based on a curated rule matrix and <strong className="text-slate-400">do not represent an exhaustive clinical database</strong>.
                  CDSCO regulatory data may not reflect the most recent amendments.
                </p>
                <p className="text-red-400/70">
                  <strong>Always consult a qualified physician or pharmacist</strong> before making any changes to your medication.
                  Do not discontinue, substitute, or alter dosage based solely on this report.
                </p>
                <div className="pt-2 border-t border-slate-800/60 text-[10px] text-slate-600 flex flex-wrap gap-3">
                  <span>GenMed Platform</span>
                  <span>·</span>
                  <span>Not affiliated with any pharmaceutical company</span>
                  <span>·</span>
                  <span>Open-source &amp; free to use</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </section>
  );
}
