'use client';

import { motion } from 'framer-motion';

type AllVotedBannerProps = {
  onReveal: () => void;
  onDismiss: () => void;
};

export default function AllVotedBanner({ onReveal, onDismiss }: AllVotedBannerProps) {
  return (
    <motion.div
      role="alert"
      aria-live="polite"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="relative overflow-hidden rounded-xl bg-gradient-brand p-4 shadow-lg"
    >
      {/* subtle dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}
      />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-white">All votes are in!</p>
            <p className="text-xs text-violet-200">Story size is ready to reveal.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onReveal}
            aria-label="Reveal all votes and show consensus"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50 active:scale-[0.98]"
          >
            Reveal Now
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onDismiss}
            aria-label="Dismiss this notification"
            className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            Dismiss
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
