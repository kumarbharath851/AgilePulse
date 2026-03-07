'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type FeedbackModalProps = {
  onClose: () => void;
};

export default function FeedbackModal({ onClose }: FeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [workedWell, setWorkedWell] = useState('');
  const [toImprove, setToImprove] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return;
    setStatus('submitting');
    try {
      const res = await fetch('/api/agilepulse/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, workedWell, toImprove }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  const displayRating = hoverRating || rating;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:items-center sm:justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Modal panel */}
      <motion.div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        initial={{ opacity: 0, scale: 0.93, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 24 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
      >
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-brand px-6 py-5">
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '20px 20px',
            }}
          />
          <div className="relative flex items-center justify-between">
            <div>
              <h2 id="feedback-title" className="text-base font-bold text-white">
                Share Your Feedback
              </h2>
              <p className="mt-0.5 text-xs text-violet-200">
                Help us make AgilePulse better
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close feedback form"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 px-6 py-10 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-8 w-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-bold text-zinc-900">Thank you!</p>
                <p className="mt-1 text-sm text-zinc-500">Your feedback has been sent.</p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 rounded-lg bg-gradient-brand px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                Close
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              className="flex flex-col gap-5 px-6 py-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Star rating */}
              <div>
                <label className="label mb-2 block">Overall Rating</label>
                <div className="flex gap-1.5" role="group" aria-label="Rating out of 5 stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <motion.button
                      key={star}
                      type="button"
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      aria-label={`${star} star${star > 1 ? 's' : ''}`}
                      aria-pressed={rating === star}
                      className="text-3xl leading-none focus:outline-none"
                    >
                      <span
                        className="transition-all duration-100"
                        style={{ filter: star <= displayRating ? 'none' : 'grayscale(1) opacity(0.35)' }}
                      >
                        ⭐
                      </span>
                    </motion.button>
                  ))}
                </div>
                {rating === 0 && (
                  <p className="mt-1 text-xs text-zinc-400">Please select a rating to continue</p>
                )}
              </div>

              {/* What worked well */}
              <div>
                <label htmlFor="worked-well" className="label mb-1.5 block">
                  What worked well?
                </label>
                <textarea
                  id="worked-well"
                  value={workedWell}
                  onChange={(e) => setWorkedWell(e.target.value)}
                  placeholder="E.g. Real-time voting, easy to join sessions…"
                  rows={3}
                  className="input w-full resize-none text-sm"
                />
              </div>

              {/* What to improve */}
              <div>
                <label htmlFor="to-improve" className="label mb-1.5 block">
                  What could be improved?
                </label>
                <textarea
                  id="to-improve"
                  value={toImprove}
                  onChange={(e) => setToImprove(e.target.value)}
                  placeholder="E.g. Dark mode, mobile experience…"
                  rows={3}
                  className="input w-full resize-none text-sm"
                />
              </div>

              {status === 'error' && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                  Something went wrong. Please try again.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-ghost text-sm"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={rating === 0 || status === 'submitting'}
                  whileHover={{ scale: rating > 0 ? 1.02 : 1 }}
                  whileTap={{ scale: rating > 0 ? 0.98 : 1 }}
                  className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === 'submitting' ? 'Sending…' : 'Send Feedback'}
                </motion.button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
