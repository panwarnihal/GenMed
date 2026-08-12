import React from 'react';
import { ShieldCheck, TrendingDown, Users, Globe, Heart, Zap } from 'lucide-react';

const stats = [
  { value: '8,000+', label: 'Generic Medicines', icon: '💊' },
  { value: '7,500+', label: 'Jan Aushadhi Stores', icon: '🏪' },
  { value: '100%',   label: 'Free to Use',         icon: '🎉' },
];

const features = [
  {
    Icon: ShieldCheck,
    color: 'text-emerald-400',
    glow: 'shadow-emerald-900/40',
    gradient: 'from-emerald-500 to-teal-600',
    title: 'Verified Data',
    desc: 'Our database is sourced directly from PMBJP and government pharmaceutical records — always accurate, always updated.',
  },
  {
    Icon: TrendingDown,
    color: 'text-blue-400',
    glow: 'shadow-blue-900/40',
    gradient: 'from-blue-500 to-indigo-600',
    title: 'Maximum Savings',
    desc: 'Find identical salt-composition generics at a fraction of branded prices. Save up to 90% on your medication bills.',
  },
  {
    Icon: Users,
    color: 'text-purple-400',
    glow: 'shadow-purple-900/40',
    gradient: 'from-purple-500 to-violet-600',
    title: 'For Every Indian',
    desc: 'Built for patients, caregivers and doctors across urban and rural India to make healthcare affordable and transparent.',
  },
  {
    Icon: Globe,
    color: 'text-amber-400',
    glow: 'shadow-amber-900/40',
    gradient: 'from-amber-500 to-orange-500',
    title: 'Pan-India Coverage',
    desc: 'Mapping 7,500+ Jan Aushadhi stores nationwide so you always find the nearest outlet stocking your medicine.',
  },
  {
    Icon: Heart,
    color: 'text-rose-400',
    glow: 'shadow-rose-900/40',
    gradient: 'from-rose-500 to-pink-600',
    title: 'Patient-First Mission',
    desc: 'No ads, no sponsored listings, no conflicts of interest. Just honest, transparent pharmaceutical data.',
  },
  {
    Icon: Zap,
    color: 'text-cyan-400',
    glow: 'shadow-cyan-900/40',
    gradient: 'from-cyan-500 to-sky-600',
    title: 'AI-Powered Matching',
    desc: 'Our smart engine understands salt compositions and fuzzy brand names to find the right generic even with typos.',
  },
];

export default function AboutUs() {
  return (
    <section id="about-us" className="relative overflow-hidden">
      {/* Background glow blobs */}
      <div className="pointer-events-none absolute -top-40 left-1/4 w-96 h-96 rounded-full bg-emerald-600/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-teal-600/8 blur-3xl" />

        {/* ── Section header ── */}
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4 tracking-wider uppercase">
            Our Mission
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
            Making Healthcare{' '}
            <span className="gradient-text">Affordable</span> for All
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            GenMed is India's open pharmaceutical transparency platform — helping millions find
            government-approved Jan Aushadhi generic alternatives and reclaim fair medicine pricing.
          </p>
        </div>

        {/* ── Stats bar ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-20">
          {stats.map(({ value, label, icon }) => (
            <div
              key={label}
              className="glass-card rounded-2xl p-6 text-center border border-slate-700/50 bg-slate-900/40 backdrop-blur-md hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-900/20"
            >
              <div className="text-3xl mb-2">{icon}</div>
              <div className="text-3xl font-extrabold gradient-text mb-1">{value}</div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Feature grid ── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ Icon, color, glow, gradient, title, desc }) => (
            <div
              key={title}
              className="glass-card rounded-2xl p-6 border border-slate-700/40 hover:border-slate-600/60 transition-all duration-300 hover:-translate-y-1 group"
            >
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg ${glow} mb-4 group-hover:scale-110 transition-transform duration-300`}
              >
                <Icon className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <h3 className={`text-base font-bold mb-2 ${color}`}>{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* ── PMBJP note ── */}
        <div className="mt-16 border border-emerald-500/20 rounded-2xl p-6 bg-emerald-500/5 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="text-4xl flex-shrink-0">🇮🇳</div>
          <div>
            <p className="text-sm font-semibold text-emerald-300 mb-1">
              Powered by Government Open Data
            </p>
            <p className="text-sm text-slate-400 leading-relaxed">
              GenMed leverages the{' '}
              <strong className="text-slate-300">Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP)</strong>{' '}
              dataset to provide free, transparent access to generic medicine pricing across India.
              We are not affiliated with any pharmaceutical company.
            </p>
          </div>
        </div>
    </section>
  );
}
