'use client';

import { motion } from 'framer-motion';
import { VoteSummary } from '@/lib/agilepulse/types';

type VoteRevealPanelProps = {
  summary: VoteSummary;
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.85, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 22 } },
};

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 24 } },
};

export default function VoteRevealPanel({ summary }: VoteRevealPanelProps) {
  const entries = Object.entries(summary.distribution).filter(([, count]) => count > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="space-y-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-card dark:border-zinc-800 dark:bg-zinc-900"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
          Vote Results
        </h3>
        <motion.span
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22, delay: 0.1 }}
          className={summary.consensusReached ? 'badge badge-emerald' : 'badge badge-amber'}
        >
          {summary.consensusReached ? 'Consensus Reached' : 'Re-vote Recommended'}
        </motion.span>
      </div>

      {/* Consensus value */}
      {summary.consensusValue && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 18, delay: 0.15 }}
          className="relative overflow-hidden rounded-xl bg-gradient-brand p-5 text-center"
        >
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}
          />
          <p className="relative text-xs font-semibold uppercase tracking-widest text-violet-200">
            Consensus Estimate
          </p>
          <p className="relative mt-1 text-5xl font-black text-white leading-none">
            {summary.consensusValue}
          </p>
        </motion.div>
      )}

      {/* Distribution grid */}
      <div>
        <p className="label mb-3">Vote Distribution</p>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-3 gap-2 sm:grid-cols-5"
        >
          {entries.map(([value, count]) => (
            <motion.div
              key={value}
              variants={itemVariants}
              className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-center dark:border-zinc-800 dark:bg-zinc-800/50"
            >
              <p className="text-xl font-black text-zinc-900 dark:text-white">{value}</p>
              <p className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {count} {count === 1 ? 'vote' : 'votes'}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Individual breakdown */}
      {summary.breakdown.length > 0 && (
        <div>
          <p className="label mb-2">Individual Votes</p>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="overflow-hidden rounded-lg border border-zinc-100 dark:border-zinc-800"
          >
            {summary.breakdown.map(({ userId, displayName, voteValue, isOutlier }, idx) => (
              <motion.div
                key={userId}
                variants={rowVariants}
                className={`flex items-center justify-between px-3 py-2.5 text-sm ${
                  idx !== summary.breakdown.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''
                } ${isOutlier ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-white dark:bg-zinc-900'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-black text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {displayName.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{displayName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <motion.span
                    initial={{ scale: 0.6 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="badge badge-violet"
                  >
                    {voteValue}
                  </motion.span>
                  {isOutlier && (
                    <motion.span
                      initial={{ scale: 0.6 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="badge badge-amber"
                    >
                      Outlier
                    </motion.span>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Discussion prompt */}
      {summary.discussionPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50 p-3 dark:border-blue-900/30 dark:bg-blue-900/10"
        >
          <svg className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm font-medium leading-tight text-blue-800 dark:text-blue-300">
            {summary.discussionPrompt}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
