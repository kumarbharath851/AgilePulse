'use client';

import { motion } from 'framer-motion';

type VoteProgressBarProps = {
  votedCount: number;
  totalCount: number;
};

export default function VoteProgressBar({ votedCount, totalCount }: VoteProgressBarProps) {
  const pct = totalCount > 0 ? Math.round((votedCount / totalCount) * 100) : 0;
  const allVoted = votedCount >= totalCount && totalCount > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="label">Vote Progress</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            {votedCount} of {totalCount}
          </span>
          {allVoted && (
            <motion.span
              role="status"
              aria-live="polite"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="badge badge-emerald"
            >
              All in!
            </motion.span>
          )}
        </div>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Vote progress: ${votedCount} of ${totalCount} participants voted`}
        className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
      >
        <motion.div
          className={`h-full rounded-full ${allVoted ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-emerald-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}
