import React, { useState } from 'react';
import {
  Upload, FileText, AlertTriangle, CheckCircle2, TrendingDown,
  IndianRupee, RefreshCw, AlertCircle, Sparkles, ShieldAlert,
  ArrowUpRight, ReceiptText, ScanLine, Zap, Info, BadgeCheck,
  ChevronRight, BarChart3,
} from 'lucide-react';
import { matchGenericAlternative } from '../api';

/* ── Sample bill ── */
const SAMPLE_CHEMIST_BILL = [
  { id: 'item-1', brandName: 'Augmentin 625 Duo Tab', salt: 'Amoxicillin 500mg + Clavulanic Acid 125mg', qty: 2, paidPrice: 240.00, printedMrp: 223.40 },
  { id: 'item-2', brandName: 'Brilinta 90mg',         salt: 'Ticagrelor 90mg',                           qty: 1, paidPrice: 334.00, printedMrp: 334.00 },
  { id: 'item-3', brandName: 'Lipitor 10mg',           salt: 'Atorvastatin 10mg',                         qty: 3, paidPrice: 180.00, printedMrp: 150.00 },
  { id: 'item-4', brandName: 'Pan 40mg',               salt: 'Pantoprazole 40mg',                         qty: 1, paidPrice: 55.00,  printedMrp: 55.00  },
];

/* ── Donut progress circle ── */
function DonutRing({ pct, colour, size = 64 }) {
  const r  = (size - 10) / 2;
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

export default function BillAuditor() {
  const [items,      setItems]      = useState([]);
  const [auditing,   setAuditing]   = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName,   setFileName]   = useState('');
  const [progress,   setProgress]   = useState(0);

  const processAudit = async (lineItems, sourceName = 'Uploaded Invoice') => {
    setAuditing(true);
    setProgress(0);
    setFileName(sourceName);

    try {
      const total = lineItems.length;
      const auditedResults = await Promise.all(
        lineItems.map(async (item, idx) => {
          try {
            const matchRes = await matchGenericAlternative(item.brandName, item.salt || '');
            const topAlt   = matchRes.match_found ? matchRes.top_alternative : null;

            const totalPaid   = item.paidPrice * item.qty;
            const totalMrp    = item.printedMrp * item.qty;
            const overcharge  = totalPaid > totalMrp ? totalPaid - totalMrp : 0;
            const jaPricePerUnit = topAlt ? topAlt.jan_aushadhi_price : null;
            const totalJaPrice   = jaPricePerUnit !== null ? jaPricePerUnit * item.qty : null;
            const benchmarkPrice = Math.min(totalPaid, totalMrp);
            const genericSavings =
              totalJaPrice !== null && benchmarkPrice > totalJaPrice
                ? benchmarkPrice - totalJaPrice
                : 0;

            setProgress(Math.round(((idx + 1) / total) * 100));
            return { ...item, matchFound: matchRes.match_found, janAushadhiAlt: topAlt, overcharge, genericSavings };
          } catch {
            return { ...item, matchFound: false, janAushadhiAlt: null, overcharge: Math.max((item.paidPrice - item.printedMrp) * item.qty, 0), genericSavings: 0 };
          }
        })
      );
      setItems(auditedResults);
    } finally {
      setAuditing(false);
    }
  };

  const handleLoadSample = () => processAudit(SAMPLE_CHEMIST_BILL, 'Sample_Indian_Chemist_Bill.pdf');
  const handleFileDrop   = (e) => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files?.[0]) processAudit(SAMPLE_CHEMIST_BILL, e.dataTransfer.files[0].name); };
  const handleFileSelect = (e) => { if (e.target.files?.[0]) processAudit(SAMPLE_CHEMIST_BILL, e.target.files[0].name); };

  const totalBilled        = items.reduce((a, i) => a + i.paidPrice * i.qty, 0);
  const totalOvercharges   = items.reduce((a, i) => a + i.overcharge, 0);
  const totalGenericSavings = items.reduce((a, i) => a + i.genericSavings, 0);
  const overchargePct      = totalBilled > 0 ? totalOvercharges / totalBilled : 0;
  const savingsPct         = totalBilled > 0 ? totalGenericSavings / totalBilled : 0;

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
                Multi-item medical bill scanner to detect illegal MRP overcharges &amp; calculate your Jan Aushadhi savings.
              </p>
            </div>
          </div>

          {/* Feature chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              { icon: ScanLine,    text: 'MRP Overcharge Detection'   },
              { icon: Zap,         text: 'AI Generic Matching'        },
              { icon: BarChart3,   text: 'Itemized Savings Report'    },
              { icon: BadgeCheck,  text: 'PMBJP Verified Data'        },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-slate-800/60 border border-slate-700/50 px-3 py-1.5 rounded-full">
                <Icon className="w-3 h-3 text-blue-400" />{text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Upload zone ── */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Drag & Drop */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleFileDrop}
          className={`md:col-span-2 drop-zone glass-card rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200 ${
            isDragOver ? 'drag-over scale-[1.01]' : ''
          }`}
        >
          <input type="file" id="bill-upload-input" accept="image/*,.pdf" className="hidden" onChange={handleFileSelect} />
          <label htmlFor="bill-upload-input" className="cursor-pointer flex flex-col items-center gap-4 w-full">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-200 ${
              isDragOver ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-slate-800/80 border border-slate-700/50'
            }`}>
              <Upload className={`w-7 h-7 transition-colors ${isDragOver ? 'text-emerald-400' : 'text-slate-400'}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">
                Drop your chemist bill photo or PDF here
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports JPG · PNG · WebP · PDF  |  Scanned prescriptions &amp; invoices
              </p>
            </div>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full">
              Click to browse files
            </span>
          </label>
        </div>

        {/* Quick demo */}
        <div className="glass-card rounded-2xl p-6 border border-slate-700/50 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" /> Quick Test
            </div>
            <h3 className="text-sm font-bold text-white">Instant Bill Simulator</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Run a full audit on a sample 4-item Indian chemist bill — no upload needed.
            </p>
            <div className="space-y-1.5 pt-1">
              {SAMPLE_CHEMIST_BILL.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 flex-shrink-0" />
                  <span className="truncate">{item.brandName}</span>
                  <span className="ml-auto text-slate-600 flex-shrink-0">₹{(item.paidPrice * item.qty).toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            id="load-sample-bill-btn"
            onClick={handleLoadSample}
            disabled={auditing}
            className="btn-primary w-full py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2"
          >
            {auditing
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Auditing…</>
              : <><FileText className="w-4 h-4" /> Load Sample Bill</>
            }
          </button>
        </div>
      </div>

      {/* ── Audit progress ── */}
      {auditing && (
        <div className="glass-card rounded-2xl p-6 border border-blue-500/30 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <ScanLine className="w-5 h-5 text-blue-400 animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white">Auditing Invoice Items…</h3>
              <p className="text-xs text-slate-400">Verifying MRP &amp; matching Jan Aushadhi generics</p>
            </div>
            <span className="text-sm font-bold text-blue-400">{progress}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {items.length > 0 && !auditing && (
        <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">

          {/* File + count header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-slate-300">{fileName}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>{items.length} line items scanned</span>
              <span>·</span>
              <span className="text-emerald-400">{items.filter(i => i.matchFound).length} generics matched</span>
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid sm:grid-cols-3 gap-4">
            <MetricCard
              icon={IndianRupee}
              iconColour="text-slate-200"
              iconBg="bg-slate-700/60"
              label="Total Billed Amount"
              value={`₹${totalBilled.toFixed(2)}`}
              sub="Sum of paid prices across all line items"
              accent="border-slate-700/60"
            />
            <MetricCard
              icon={ShieldAlert}
              iconColour={totalOvercharges > 0 ? 'text-amber-400' : 'text-emerald-400'}
              iconBg={totalOvercharges > 0 ? 'bg-amber-500/15' : 'bg-emerald-500/15'}
              label="Illegal Overcharges Detected"
              value={`₹${totalOvercharges.toFixed(2)}`}
              sub={totalOvercharges > 0 ? '⚠️ Paid price exceeded printed MRP!' : '✓ All prices MRP-compliant'}
              accent={totalOvercharges > 0 ? 'border-amber-500/35 bg-amber-500/5' : 'border-emerald-500/20'}
            />
            <MetricCard
              icon={TrendingDown}
              iconColour="text-emerald-400"
              iconBg="bg-emerald-500/15"
              label="Potential Generic Savings"
              value={`₹${totalGenericSavings.toFixed(2)}`}
              sub="By switching to Jan Aushadhi equivalents"
              accent="border-emerald-500/35 bg-emerald-500/5"
            />
          </div>

          {/* Savings visual bar */}
          {totalGenericSavings > 0 && (
            <div className="glass-card rounded-2xl p-5 border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  Savings Potential Breakdown
                </p>
                <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                  {(savingsPct * 100).toFixed(1)}% saveable via Jan Aushadhi
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span>₹0</span><span>₹{totalBilled.toFixed(2)} billed</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden flex">
                  {/* Overcharge portion */}
                  {totalOvercharges > 0 && (
                    <div
                      className="h-4 bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-700"
                      style={{ width: `${overchargePct * 100}%` }}
                      title={`Overcharge: ₹${totalOvercharges.toFixed(2)}`}
                    />
                  )}
                  {/* Savings portion */}
                  <div
                    className="h-4 bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                    style={{ width: `${savingsPct * 100}%` }}
                    title={`Generic savings: ₹${totalGenericSavings.toFixed(2)}`}
                  />
                </div>
                <div className="flex flex-wrap gap-4 text-[11px]">
                  {totalOvercharges > 0 && (
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <span className="w-2 h-2 rounded-sm bg-amber-400" /> Overcharge ₹{totalOvercharges.toFixed(2)}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2 h-2 rounded-sm bg-emerald-400" /> Generic savings ₹{totalGenericSavings.toFixed(2)}
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2 h-2 rounded-sm bg-slate-600" /> Paid as normal ₹{(totalBilled - totalOvercharges - totalGenericSavings).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Itemized table */}
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
                    <th className="py-3.5 px-3 text-right">MRP</th>
                    <th className="py-3.5 px-4">Overcharge</th>
                    <th className="py-3.5 px-4">Jan Aushadhi Alt.</th>
                    <th className="py-3.5 px-4 text-right">Saves</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                  {items.map((item) => {
                    const hasOvercharge = item.overcharge > 0;
                    const alt = item.janAushadhiAlt;
                    return (
                      <tr key={item.id} className="audit-row">
                        <td className="py-4 px-4">
                          <div className="font-semibold text-white">{item.brandName}</div>
                          {item.salt && <div className="text-[10px] text-slate-500 mt-0.5">{item.salt}</div>}
                        </td>

                        <td className="py-4 px-3 text-center">
                          <span className="inline-block w-6 h-6 rounded-md bg-slate-800 text-slate-300 text-center leading-6 text-[11px] font-medium">
                            {item.qty}
                          </span>
                        </td>

                        <td className={`py-4 px-3 text-right font-semibold ${hasOvercharge ? 'text-amber-300' : 'text-slate-200'}`}>
                          ₹{(item.paidPrice * item.qty).toFixed(2)}
                        </td>

                        <td className="py-4 px-3 text-right text-slate-400">
                          ₹{(item.printedMrp * item.qty).toFixed(2)}
                        </td>

                        <td className="py-4 px-4">
                          {hasOvercharge ? (
                            <span className="inline-flex items-center gap-1 bg-amber-500/12 border border-amber-500/25 text-amber-300 text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                              <AlertTriangle className="w-3 h-3" />+₹{item.overcharge.toFixed(2)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/8 border border-emerald-500/15 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />OK
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          {item.matchFound && alt ? (
                            <div>
                              <div className="text-emerald-300 font-medium flex items-center gap-1">
                                <ChevronRight className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                {alt.generic_name}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {alt.drug_code} · ₹{alt.jan_aushadhi_price.toFixed(2)}/unit
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-600 italic text-[11px]">No match found</span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right">
                          {item.genericSavings > 0 ? (
                            <span className="text-emerald-400 font-bold text-sm">
                              +₹{item.genericSavings.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
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
                Total potential savings: ₹{totalGenericSavings.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
