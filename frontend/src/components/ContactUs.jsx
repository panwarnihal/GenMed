import React, { useState, useEffect } from 'react';
import {
  Star, Send, MessageSquare, Mail, GitBranch, Globe,
  CheckCircle2, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';

/* ── Star rating widget ── */
function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1" role="group" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className="focus:outline-none transition-transform duration-100 hover:scale-110"
        >
          <Star
            className={`w-8 h-8 transition-colors duration-150 ${
              n <= (hovered || value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-slate-600'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

/* ── Individual review card ── */
function ReviewCard({ review }) {
  const initials = review.name
    ? review.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';
  const colours = [
    'from-emerald-500 to-teal-600',
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-violet-600',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-600',
  ];
  const colour = colours[review.name.charCodeAt(0) % colours.length];

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-700/40 space-y-3 hover:border-slate-600/60 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${colour} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
          >
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{review.name || 'Anonymous'}</p>
            <p className="text-[11px] text-slate-500">{review.date}</p>
          </div>
        </div>
        <div className="flex gap-0.5 flex-shrink-0">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={`w-4 h-4 ${n <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`}
            />
          ))}
        </div>
      </div>
      {review.category && (
        <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          {review.category}
        </span>
      )}
      <p className="text-sm text-slate-400 leading-relaxed">{review.message}</p>
    </div>
  );
}

/* ── Toast notification ── */
function Toast({ show, onHide }) {
  useEffect(() => {
    if (show) {
      const t = setTimeout(onHide, 3500);
      return () => clearTimeout(t);
    }
  }, [show, onHide]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-900/90 border border-emerald-500/40 text-emerald-200 px-5 py-3.5 rounded-2xl shadow-2xl shadow-black/40 backdrop-blur-md transition-all duration-400 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold">Review submitted!</p>
        <p className="text-xs text-emerald-400/80">Thank you for your feedback 🙏</p>
      </div>
    </div>
  );
}

const CATEGORIES = ['General Feedback', 'Bug Report', 'Feature Request', 'Medicine Data', 'Praise'];

const SEED_REVIEWS = [
  {
    id: 'seed-1',
    name: 'Dr. Priya Sharma',
    rating: 5,
    category: 'Praise',
    message:
      'Absolutely brilliant tool! I recommend this to all my patients who are on long-term medications. The savings are incredible — up to 85% in some cases.',
    date: 'Aug 2026',
  },
  {
    id: 'seed-2',
    name: 'Rahul Verma',
    rating: 4,
    category: 'General Feedback',
    message:
      'Very useful platform. Found the Jan Aushadhi equivalent for my mother\'s BP medicines in seconds. Would love an offline mode or a mobile app.',
    date: 'Jul 2026',
  },
  {
    id: 'seed-3',
    name: 'Ananya Iyer',
    rating: 5,
    category: 'Praise',
    message:
      'The Bill Auditor caught an overcharge of ₹120 at our local pharmacy! This tool is doing something really important for India.',
    date: 'Jul 2026',
  },
];

/* ══════════════════════════════════
   Main ContactUs Section
══════════════════════════════════ */
export default function ContactUs() {
  const [form, setForm] = useState({ name: '', email: '', category: 'General Feedback', rating: 0, message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(false);
  const [reviews, setReviews] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('gm_reviews') || '[]');
      return [...SEED_REVIEWS, ...saved];
    } catch {
      return SEED_REVIEWS;
    }
  });
  const [showAll, setShowAll] = useState(false);

  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.rating) return;

    setSubmitting(true);
    // Simulate a brief network delay
    await new Promise((r) => setTimeout(r, 900));

    const newReview = {
      id: `user-${Date.now()}`,
      name: form.name.trim() || 'Anonymous',
      email: form.email,
      rating: form.rating,
      category: form.category,
      message: form.message.trim(),
      date: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
    };

    const updatedReviews = [newReview, ...reviews];
    setReviews(updatedReviews);

    // Persist only user reviews (not seeds) to localStorage
    const userReviews = updatedReviews.filter((r) => r.id.startsWith('user-'));
    localStorage.setItem('gm_reviews', JSON.stringify(userReviews));

    setForm({ name: '', email: '', category: 'General Feedback', rating: 0, message: '' });
    setSubmitting(false);
    setToast(true);
  };

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  const visibleReviews = showAll ? reviews : reviews.slice(0, 3);

  return (
    <section id="contact-us" className="relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute top-1/4 -right-32 w-96 h-96 rounded-full bg-blue-600/8 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-purple-600/8 blur-3xl" />

        {/* ── Section header ── */}
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-4 tracking-wider uppercase">
            Reviews &amp; Contact
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold mb-4">
            We&apos;d Love to Hear{' '}
            <span className="gradient-text-blue">From You</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed">
            Leave a review, report a bug or just say hi. Every piece of feedback helps us make
            GenMed better for millions of Indians.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 items-start">

          {/* ── Left: Review form ── */}
          <div className="lg:col-span-3">
            <form
              id="review-form"
              onSubmit={handleSubmit}
              className="glass-card rounded-2xl p-7 border border-slate-700/50 space-y-6"
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-900/30">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">Leave a Review</h3>
              </div>

              {/* Name + Email */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="reviewer-name" className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    Your Name
                  </label>
                  <input
                    id="reviewer-name"
                    type="text"
                    value={form.name}
                    onChange={handleChange('name')}
                    placeholder="Dr. Priya Sharma"
                    className="gm-input w-full px-4 py-3 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="reviewer-email" className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    Email (optional)
                  </label>
                  <input
                    id="reviewer-email"
                    type="email"
                    value={form.email}
                    onChange={handleChange('email')}
                    placeholder="you@example.com"
                    className="gm-input w-full px-4 py-3 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label htmlFor="review-category" className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Category
                </label>
                <select
                  id="review-category"
                  value={form.category}
                  onChange={handleChange('category')}
                  className="gm-input w-full px-4 py-3 rounded-xl text-sm appearance-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Star rating */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">
                  Your Rating <span className="text-red-400">*</span>
                </label>
                <StarRating value={form.rating} onChange={(v) => setForm((f) => ({ ...f, rating: v }))} />
                {form.rating > 0 && (
                  <p className="text-xs text-slate-500">
                    {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][form.rating]}
                  </p>
                )}
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label htmlFor="review-message" className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="review-message"
                  rows={4}
                  required
                  value={form.message}
                  onChange={handleChange('message')}
                  placeholder="Tell us what you think, what we got right or what we can improve…"
                  className="gm-input w-full px-4 py-3 rounded-xl text-sm resize-none"
                />
              </div>

              <button
                id="submit-review-btn"
                type="submit"
                disabled={submitting || !form.rating}
                className="btn-primary w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                ) : (
                  <><Send className="w-4 h-4" /> Submit Review</>
                )}
              </button>
            </form>

            {/* Contact links */}
            <div className="mt-6 glass-card rounded-2xl p-5 border border-slate-700/40 flex flex-wrap gap-4 items-center">
              <p className="text-sm text-slate-400 flex-1 min-w-fit">Other ways to reach us:</p>
              <a
                href="mailto:genmed@example.com"
                className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-emerald-400 transition-colors"
              >
                <Mail className="w-4 h-4" /> genmed@example.com
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-emerald-400 transition-colors"
              >
                <GitBranch className="w-4 h-4" /> GitHub
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-emerald-400 transition-colors"
              >
                <Globe className="w-4 h-4" /> Twitter / X
              </a>
            </div>
          </div>

          {/* ── Right: Reviews feed ── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Rating summary */}
            <div className="glass-card rounded-2xl p-5 border border-slate-700/40 flex items-center gap-5">
              <div className="text-center">
                <p className="text-5xl font-extrabold gradient-text-amber">{avgRating}</p>
                <div className="flex gap-0.5 mt-1 justify-center">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`w-4 h-4 ${n <= Math.round(Number(avgRating)) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviews.filter((r) => r.rating === star).length;
                  const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 w-4">{star}</span>
                      <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full bg-amber-400 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 w-4">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Review cards */}
            <div className="space-y-3">
              {visibleReviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>

            {reviews.length > 3 && (
              <button
                id="toggle-reviews-btn"
                onClick={() => setShowAll((v) => !v)}
                className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                {showAll ? (
                  <><ChevronUp className="w-4 h-4" /> Show less</>
                ) : (
                  <><ChevronDown className="w-4 h-4" /> Show all {reviews.length} reviews</>
                )}
              </button>
            )}
          </div>
        </div>
      <Toast show={toast} onHide={() => setToast(false)} />
    </section>
  );
}
