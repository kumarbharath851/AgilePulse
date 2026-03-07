'use client';

import { motion } from 'framer-motion';
import { StoryItem, SessionAnalytics } from '@/lib/agilepulse/types';

type Props = {
  stories: StoryItem[];
  analytics: SessionAnalytics | undefined;
  teamName: string;
  onNewSession: () => void;
};

export default function SessionSummaryPanel({ stories, analytics, teamName, onNewSession }: Props) {
  const finalized = stories.filter((s) => s.finalEstimate);
  const skipped = stories.filter((s) => !s.finalEstimate);

  function exportCsv() {
    const rows = [
      ['Story', 'Description', 'Final Estimate'],
      ...stories.map((s) => [s.title, s.description, s.finalEstimate ?? '—']),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${teamName.replace(/\s+/g, '_')}_estimates.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="card p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <svg className="h-8 w-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          Session Complete
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {teamName} — all done!
        </p>

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-3 divide-x divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800">
          {[
            { label: 'Estimated', value: finalized.length },
            { label: 'Consensus Rate', value: `${Math.round((analytics?.consensusRate ?? 0) * 100)}%` },
            { label: 'Avg Spread', value: analytics?.avgSpread ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="py-3 px-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{label}</p>
              <p className="mt-0.5 text-2xl font-black text-zinc-900 dark:text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Story results table */}
      <div className="card p-4">
        <p className="label mb-3">Final Estimates</p>
        <div className="space-y-2">
          {stories.map((story, idx) => (
            <motion.div
              key={story.storyId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                story.finalEstimate
                  ? 'border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-900/10'
                  : 'border-zinc-100 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-800/30'
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{story.title}</p>
                {story.description && (
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{story.description}</p>
                )}
              </div>
              {story.finalEstimate ? (
                <span className="shrink-0 rounded-lg bg-emerald-100 px-2.5 py-1 text-sm font-black text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  {story.finalEstimate}
                </span>
              ) : (
                <span className="shrink-0 rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                  Skipped
                </span>
              )}
            </motion.div>
          ))}
          {stories.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No stories were added to this session.</p>
          )}
        </div>

        {skipped.length > 0 && (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            {skipped.length} {skipped.length === 1 ? 'story was' : 'stories were'} skipped and not estimated.
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={exportCsv}
          className="btn btn-secondary text-sm flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNewSession}
          className="btn btn-primary text-sm"
        >
          Start New Session
        </motion.button>
      </div>
    </motion.div>
  );
}
