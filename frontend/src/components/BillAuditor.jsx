import React, { useState, useRef, useCallback } from 'react';
import {
  Upload, FileText, AlertTriangle, CheckCircle2, TrendingDown,
  IndianRupee, RefreshCw, AlertCircle, Sparkles, ShieldAlert,
  ArrowUpRight, ReceiptText, ScanLine, Zap, Info, BadgeCheck,
  ChevronRight, BarChart3, X, ImageIcon, ShieldX, Siren,
  HeartPulse, Scale, FileWarning, Ban,
} from 'lucide-react';
import { uploadInvoiceImage } from '../api';

/* ── Donut progress circle ── */
function DonutRing({ pct, colour, size = 64 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(Math.max(pct, 0), 1));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={colour} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      />
    </svg>
  );
}

/* ── Metric card ── */
function MetricCard({ icon: Icon, iconColour, iconBg, label, value, sub, accent }) {
  return (
    <div className={`glass-card rounded-2xl p-5 border space-y-3 ${accent}`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${iconColour}`} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">GenMed</span>
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <div className={`text-2xl font-extrabold mt-0.5 ${iconColour}`}>{value}</div>
      </div>
      <p className="text-[11px] text-slate-500 leading-snug">{sub}</p>
    </div>
  );
}

/* ── Pulsing AI Processing Loader ── */
function ScannerLoader() {
  return (
    <div className="glass-card rounded-2xl p-8 border border-blue-500/30 space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
            <ScanLine className="w-7 h-7 text-white animate-pulse" strokeWidth={2} />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full animate-ping" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white">Vision AI Processing</h3>
          <p className="text-sm text-slate-400 mt-0.5">
            Extracting medicines via Gemini Vision OCR…
          </p>
        </div>
      </div>

      {/* Animated pipeline steps */}
      <div className="space-y-3">
        {[
          { icon: ImageIcon,   label: 'Image uploaded & validated',       delay: '0s' },
          { icon: ScanLine,    label: 'Running Gemini 1.5 Flash Vision OCR', delay: '0.8s' },
          { icon: Zap,         label: 'Extracting medicines via NER pipeline', delay: '1.6s' },
          { icon: Scale,       label: 'Auditing prices & matching generics', delay: '2.4s' },
          { icon: HeartPulse,  label: 'Checking Drug-Drug Interactions',   delay: '3.2s' },
          { icon: ShieldAlert, label: 'Running CDSCO regulatory scan',     delay: '4.0s' },
        ].map(({ icon: StepIcon, label, delay }) => (
          <div
            key={label}
            className="flex items-center gap-3 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]"
            style={{ animationDelay: delay }}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-center flex-shrink-0">
              <StepIcon className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-xs text-slate-400">{label}</span>
            <div className="ml-auto">
              <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            </div>
          </div>
        ))}
      </div>

      {/* Loading bar */}
      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500 animate-[shimmerBar_2s_ease-in-out_infinite]"
          style={{ width: '60%' }}
        />
      </div>
      <p className="text-center text-[11px] text-slate-600">
        This typically takes 8–15 seconds depending on bill complexity
      </p>
    </div>
  );
}


export default function BillAuditor() {
  const [report, setReport]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName]   = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef(null);

  /* ── Core upload handler ── */
  const handleUpload = useCallback(async (file) => {
    if (!file) return;

    // Validate file type
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/bmp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setError(`Unsupported file type "${file.type}". Please upload a JPG, PNG, or WebP image.`);
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

  /* ── Drag/Drop handlers ── */
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
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleReset = () => {
    setReport(null);
    setError('');
    setFileName('');
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── Derived data from report ── */
  const hasBannedDrugs = report?.audited_items?.some(
    (item) => item.regulatory_summary?.is_banned
  ) ?? false;

  const ddiAlerts = report?.ddi_summary?.alerts ?? [];
  const hasDDI = ddiAlerts.length > 0;

  const regulatoryWarnings = (report?.audited_items ?? [])
    .filter((item) => item.regulatory_summary?.warning_message)
    .map((item) => ({
      brand_name: item.brand_name,
      ...item.regulatory_summary,
    }));

  const totalBilled      = report?.total_paid ?? 0;
  const totalOvercharges = report?.total_overcharge ?? 0;
  const totalSavings     = report?.total_potential_savings ?? 0;
  const overchargePct    = totalBilled > 0 ? totalOvercharges / totalBilled : 0;
  const savingsPct       = totalBilled > 0 ? totalSavings / totalBilled : 0;

  return (
    <section className="space-y-8" id="bill-auditor">

      {/* ── Hero heading ── */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/25 via-indigo-900/10 to-transparent pointer-events-none" />
        <div className="relative glass-card rounded-2xl border border-blue-500/20 p-7 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
              <ReceiptText className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">Smart Bill Auditor</h1>
              <p className="text-slate-400 text-sm">
                Upload your pharmacy bill image — our Vision AI extracts every line item, audits MRP overcharges &amp; maps Jan Aushadhi savings instantly.
              </p>
            </div>
          </div>

          {/* Feature chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              { icon: ScanLine,    text: 'Gemini Vision OCR' },
              { icon: Zap,         text: 'AI Generic Matching' },
              { icon: HeartPulse,  text: 'DDI Safety Check' },
              { icon: ShieldAlert, text: 'CDSCO Regulatory Scan' },
              { icon: BarChart3,   text: 'Itemized Savings Report' },
              { icon: BadgeCheck,  text: 'PMBJP Verified Data' },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-slate-800/60 border border-slate-700/50 px-3 py-1.5 rounded-full">
                <Icon className="w-3 h-3 text-blue-400" />{text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Upload zone (shown when no report or loading) ── */}
      {!report && !loading && (
        <div className="grid md:grid-cols-3 gap-4">
          {/* Drag & Drop */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`md:col-span-2 drop-zone glass-card rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-5 cursor-pointer transition-all duration-200 ${
              isDragOver ? 'drag-over scale-[1.01]' : ''
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              id="bill-upload-input"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/bmp,image/gif"
              className="hidden"
              onChange={handleFileSelect}
            />
            <label htmlFor="bill-upload-input" className="cursor-pointer flex flex-col items-center gap-5 w-full">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-colors duration-200 ${
                isDragOver ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-slate-800/80 border border-slate-700/50'
              }`}>
                <Upload className={`w-9 h-9 transition-colors ${isDragOver ? 'text-emerald-400' : 'text-slate-400'}`} />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-200">
                  Drop your chemist bill photo here
                </p>
                <p className="text-xs text-slate-500 mt-1.5">
                  Supports JPG · PNG · WebP · BMP &nbsp;|&nbsp; Max 10 MB &nbsp;|&nbsp; Scanned prescriptions &amp; invoices
                </p>
              </div>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-5 py-2 rounded-full hover:bg-emerald-500/15 transition-colors">
                Click to browse files
              </span>
            </label>
          </div>

          {/* How it works panel */}
          <div className="glass-card rounded-2xl p-6 border border-slate-700/50 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> How It Works
              </div>
              <h3 className="text-sm font-bold text-white">AI-Powered Bill Audit</h3>
              <div className="space-y-3 pt-1">
                {[
                  { step: '1', text: 'Upload your pharmacy bill photo' },
                  { step: '2', text: 'Gemini Vision extracts every medicine' },
                  { step: '3', text: 'Engine audits MRP + maps generics' },
                  { step: '4', text: 'Get full savings & safety report' },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5">
                      {step}
                    </span>
                    <span className="text-xs text-slate-400 leading-relaxed">{text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30">
              <p className="text-[10px] text-slate-500 leading-relaxed">
                <Info className="w-3 h-3 inline mr-1 text-slate-600" />
                Your image is processed by Google Gemini Vision AI and is never stored on our servers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Error banner ── */}
      {error && (
        <div className="glass-card rounded-2xl p-5 border border-red-500/40 bg-red-500/5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-sm font-bold text-red-300">Processing Failed</h3>
            <p className="text-xs text-red-400/80 leading-relaxed">{error}</p>
          </div>
          <button onClick={() => setError('')} className="text-red-400/50 hover:text-red-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Loading state ── */}
      {loading && <ScannerLoader />}

      {/* ── Results ── */}
      {report && !loading && (
        <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">

          {/* File + count header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Uploaded invoice"
                  className="w-10 h-10 rounded-lg object-cover border border-slate-700/50"
                />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-slate-300">{fileName}</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Invoice #{report.invoice_id}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{report.audited_items?.length ?? 0} line items scanned</span>
              </div>
              <button
                id="scan-new-bill-btn"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full hover:bg-blue-500/15 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Scan New Bill
              </button>
            </div>
          </div>

          {/* ── Safety & Regulatory Alerts Banner ── */}
          {(hasBannedDrugs || hasDDI || regulatoryWarnings.length > 0) && (
            <div className="space-y-3">
              {/* Banned Drugs Alert */}
              {hasBannedDrugs && (
                <div className="glass-card rounded-2xl p-5 border-2 border-red-500/50 bg-red-500/8 animate-[slideUp_0.3s_ease-out]">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <Ban className="w-6 h-6 text-red-400" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-red-300">⚠ CDSCO BANNED SUBSTANCE DETECTED</h3>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">
                          Critical
                        </span>
                      </div>
                      <p className="text-xs text-red-400/80 leading-relaxed">
                        One or more medicines in this invoice contain ingredients banned by the Central Drugs Standard Control Organisation (CDSCO). 
                        <strong className="text-red-300"> DO NOT CONSUME</strong> without consulting a licensed physician.
                      </p>
                      <div className="space-y-1.5 pt-1">
                        {regulatoryWarnings
                          .filter((w) => w.is_banned)
                          .map((w, i) => (
                            <div key={i} className="flex items-center gap-2 text-[11px] text-red-300 bg-red-500/10 px-3 py-1.5 rounded-lg">
                              <ShieldX className="w-3.5 h-3.5 flex-shrink-0" />
                              <span><strong>{w.brand_name}</strong> — {w.warning_message}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DDI Alerts */}
              {hasDDI && (
                <div className="glass-card rounded-2xl p-5 border-2 border-amber-500/40 bg-amber-500/5 animate-[slideUp_0.3s_ease-out]">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                      <HeartPulse className="w-6 h-6 text-amber-400" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-amber-300">
                          Drug-Drug Interaction{ddiAlerts.length > 1 ? 's' : ''} Detected
                        </h3>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">
                          {report.ddi_summary?.has_critical_interactions ? 'High Severity' : 'Warning'}
                        </span>
                      </div>
                      <p className="text-xs text-amber-400/70 leading-relaxed">
                        The medicines in this invoice may interact with each other. Consult your physician before taking them together.
                      </p>
                      <div className="space-y-2 pt-1">
                        {ddiAlerts.map((alert, i) => (
                          <div
                            key={i}
                            className={`rounded-xl p-3 border space-y-1 ${
                              alert.severity === 'HIGH'
                                ? 'border-red-500/30 bg-red-500/5'
                                : alert.severity === 'MODERATE'
                                ? 'border-amber-500/25 bg-amber-500/5'
                                : 'border-slate-700/50 bg-slate-800/30'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                alert.severity === 'HIGH'
                                  ? 'text-red-400 bg-red-500/15'
                                  : alert.severity === 'MODERATE'
                                  ? 'text-amber-400 bg-amber-500/15'
                                  : 'text-slate-400 bg-slate-700/50'
                              }`}>
                                {alert.severity}
                              </span>
                              <span className="text-xs font-semibold text-white">
                                {alert.drug_a} <span className="text-slate-500">↔</span> {alert.drug_b}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed pl-0.5">
                              {alert.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Schedule H1 / other regulatory warnings (non-banned) */}
              {regulatoryWarnings.filter((w) => !w.is_banned).length > 0 && (
                <div className="glass-card rounded-2xl p-5 border border-yellow-500/30 bg-yellow-500/5 animate-[slideUp_0.3s_ease-out]">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center flex-shrink-0">
                      <FileWarning className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <h3 className="text-sm font-bold text-yellow-300">Regulatory Notices</h3>
                      <div className="space-y-1.5">
                        {regulatoryWarnings
                          .filter((w) => !w.is_banned)
                          .map((w, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] text-yellow-400/80">
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

          {/* ── Financial Summary Metric cards ── */}
          <div className="grid sm:grid-cols-3 gap-4">
            <MetricCard
              icon={IndianRupee}
              iconColour="text-slate-200"
              iconBg="bg-slate-700/60"
              label="Total Paid"
              value={`₹${totalBilled.toFixed(2)}`}
              sub="Sum of all amounts charged on this invoice"
              accent="border-slate-700/60"
            />
            <MetricCard
              icon={ShieldAlert}
              iconColour={totalOvercharges > 0 ? 'text-amber-400' : 'text-emerald-400'}
              iconBg={totalOvercharges > 0 ? 'bg-amber-500/15' : 'bg-emerald-500/15'}
              label="Total Overcharge"
              value={`₹${totalOvercharges.toFixed(2)}`}
              sub={totalOvercharges > 0 ? '⚠️ Paid price exceeded printed MRP!' : '✓ All prices are MRP-compliant'}
              accent={totalOvercharges > 0 ? 'border-amber-500/35 bg-amber-500/5' : 'border-emerald-500/20'}
            />
            <MetricCard
              icon={TrendingDown}
              iconColour="text-emerald-400"
              iconBg="bg-emerald-500/15"
              label="Total Potential Savings"
              value={`₹${totalSavings.toFixed(2)}`}
              sub="By switching to Jan Aushadhi generic equivalents"
              accent="border-emerald-500/35 bg-emerald-500/5"
            />
          </div>

          {/* ── Savings visual bar ── */}
          {(totalSavings > 0 || totalOvercharges > 0) && (
            <div className="glass-card rounded-2xl p-5 border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  Savings Potential Breakdown
                </p>
                {totalSavings > 0 && (
                  <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                    {(savingsPct * 100).toFixed(1)}% saveable via Jan Aushadhi
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span>₹0</span><span>₹{totalBilled.toFixed(2)} billed</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden flex">
                  {totalOvercharges > 0 && (
                    <div
                      className="h-4 bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-700"
                      style={{ width: `${overchargePct * 100}%` }}
                      title={`Overcharge: ₹${totalOvercharges.toFixed(2)}`}
                    />
                  )}
                  {totalSavings > 0 && (
                    <div
                      className="h-4 bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                      style={{ width: `${savingsPct * 100}%` }}
                      title={`Generic savings: ₹${totalSavings.toFixed(2)}`}
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-[11px]">
                  {totalOvercharges > 0 && (
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <span className="w-2 h-2 rounded-sm bg-amber-400" /> Overcharge ₹{totalOvercharges.toFixed(2)}
                    </span>
                  )}
                  {totalSavings > 0 && (
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-2 h-2 rounded-sm bg-emerald-400" /> Generic savings ₹{totalSavings.toFixed(2)}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2 h-2 rounded-sm bg-slate-600" /> Paid as normal ₹{(totalBilled - totalOvercharges - totalSavings).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Itemized Audit Table ── */}
          <div className="glass-card rounded-2xl border border-slate-700/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-300">Itemized Audit Report</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Medicine</th>
                    <th className="py-3.5 px-3 text-center">Qty</th>
                    <th className="py-3.5 px-3 text-right">Paid</th>
                    <th className="py-3.5 px-3 text-right">Printed MRP</th>
                    <th className="py-3.5 px-4">Overcharge</th>
                    <th className="py-3.5 px-4">Jan Aushadhi Alt.</th>
                    <th className="py-3.5 px-4 text-right">Saves</th>
                    <th className="py-3.5 px-4 text-center">Safety</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                  {(report.audited_items ?? []).map((item, idx) => {
                    const audit = item.audit_summary;
                    const reg   = item.regulatory_summary;
                    const hasOvercharge = audit?.is_overcharged;

                    return (
                      <tr key={idx} className="audit-row">
                        <td className="py-4 px-4">
                          <div className="font-semibold text-white">{item.brand_name}</div>
                        </td>

                        <td className="py-4 px-3 text-center">
                          <span className="inline-block w-6 h-6 rounded-md bg-slate-800 text-slate-300 text-center leading-6 text-[11px] font-medium">
                            {item.quantity_units}
                          </span>
                        </td>

                        <td className={`py-4 px-3 text-right font-semibold ${hasOvercharge ? 'text-amber-300' : 'text-slate-200'}`}>
                          ₹{item.paid_price?.toFixed(2)}
                        </td>

                        <td className="py-4 px-3 text-right text-slate-400">
                          ₹{item.printed_mrp?.toFixed(2)}
                        </td>

                        <td className="py-4 px-4">
                          {hasOvercharge ? (
                            <span className="inline-flex items-center gap-1 bg-amber-500/12 border border-amber-500/25 text-amber-300 text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                              <AlertTriangle className="w-3 h-3" />+₹{audit.overcharge_amount?.toFixed(2)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/8 border border-emerald-500/15 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />OK
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          {audit?.jan_aushadhi_alternative ? (
                            <div>
                              <div className="text-emerald-300 font-medium flex items-center gap-1">
                                <ChevronRight className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                {audit.jan_aushadhi_alternative}
                              </div>
                              {audit.jan_aushadhi_price != null && (
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  ₹{audit.jan_aushadhi_price.toFixed(2)}/unit
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600 italic text-[11px]">No match found</span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right">
                          {audit?.potential_savings > 0 ? (
                            <span className="text-emerald-400 font-bold text-sm">
                              +₹{audit.potential_savings.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-center">
                          {reg?.is_banned ? (
                            <span className="inline-flex items-center gap-1 bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-semibold px-2 py-1 rounded-full" title={reg.warning_message}>
                              <Ban className="w-3 h-3" />BANNED
                            </span>
                          ) : reg?.status === 'SCHEDULE_H1' ? (
                            <span className="inline-flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 text-[10px] px-2 py-1 rounded-full" title={reg.warning_message}>
                              <Siren className="w-3 h-3" />H1
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/8 border border-emerald-500/15 text-emerald-400 text-[10px] px-2 py-1 rounded-full">
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
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                MRP data sourced from PMBJP government database
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ArrowUpRight className="w-3.5 h-3.5" />
                Total potential savings: ₹{totalSavings.toFixed(2)}
              </span>
            </div>
          </div>

          {/* ── DDI Summary (collapsed into table when shown in banner) ── */}
          {report.ddi_summary && report.ddi_summary.interaction_count > 0 && (
            <div className="glass-card rounded-2xl p-5 border border-slate-700/50 space-y-3">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-300">DDI Analysis Summary</h3>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {Object.entries(report.ddi_summary.severity_breakdown || {}).map(([severity, count]) => (
                  <div key={severity} className={`rounded-xl py-3 px-4 border ${
                    severity === 'HIGH'
                      ? 'border-red-500/25 bg-red-500/5'
                      : severity === 'MODERATE'
                      ? 'border-amber-500/20 bg-amber-500/5'
                      : 'border-slate-700/50 bg-slate-800/30'
                  }`}>
                    <div className={`text-2xl font-extrabold ${
                      severity === 'HIGH' ? 'text-red-400' : severity === 'MODERATE' ? 'text-amber-400' : 'text-slate-400'
                    }`}>
                      {count}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">{severity}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Medical Disclaimer ── */}
          <div className="glass-card rounded-2xl p-5 border border-slate-700/40 bg-slate-900/30 space-y-2">
            <div className="flex items-center gap-2 text-slate-400">
              <Scale className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Statutory Medical Disclaimer</h3>
            </div>
            <div className="text-[11px] text-slate-500 leading-relaxed space-y-2">
              <p>
                <strong className="text-slate-400">GenMed is an informational tool only.</strong> The audit results, generic alternative suggestions, 
                and safety alerts provided are computed algorithmically and are <strong className="text-slate-400">not a substitute for professional medical advice</strong>, 
                diagnosis, or treatment.
              </p>
              <p>
                Generic alternatives listed are sourced from the <strong className="text-slate-400">Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP)</strong> database 
                and are matched using deterministic chemical composition hashing. While every effort is made to ensure accuracy, 
                pharmacological equivalence does not guarantee therapeutic interchangeability in all clinical scenarios.
              </p>
              <p>
                Drug-Drug Interaction (DDI) alerts are based on a curated in-memory rule matrix and <strong className="text-slate-400">do not represent an exhaustive clinical database</strong>. 
                Regulatory status checks reference CDSCO (Central Drugs Standard Control Organisation) data which may not reflect the most recent amendments.
              </p>
              <p>
                <strong className="text-red-400/80">Always consult a qualified physician or pharmacist</strong> before making any changes to your medication. 
                Do not discontinue, substitute, or alter dosage of any prescribed medicine based solely on this report.
              </p>
              <p className="text-[10px] text-slate-600 pt-1 border-t border-slate-800/60">
                GenMed Platform · Not affiliated with any pharmaceutical company · Open-source &amp; free to use · 
                Data last synced from government databases
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
