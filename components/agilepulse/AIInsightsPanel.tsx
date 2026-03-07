'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoteSummary } from '@/lib/agilepulse/types';

type InsightResult = {
  summary: string;
  discussionPoints: string[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
  source: 'bedrock' | 'heuristic';
};

type AIInsightsPanelProps = {
  storyTitle: string;
  storyDescription: string;
  summary: VoteSummary;
  participantCount: number;
  apiBase?: string;
};

const riskConfig = {
  low: {
    label: 'Low Risk',
    className: 'badge-emerald',
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  medium: {
    label: 'Medium Risk',
    className: 'badge-amber',
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
  high: {
    label: 'High Risk',
    className: 'badge-red',
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

export default function AIInsightsPanel({
  storyTitle,
  storyDescription,
  summary,
  participantCount,
  apiBase,
}: AIInsightsPanelProps) {
  const [insight, setInsight] = useState<InsightResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const resolveUrl = (path: string) =>
    apiBase ? `${apiBase.replace(/\/$/, '')}${path.replace(/^\/api/, '')}` : path;

  const fetchInsight = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await fetch(resolveUrl('/api/agilepulse/ai/insights'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: storyTitle,
          description: storyDescription,
          distribution: summary.distribution,
          consensusReached: summary.consensusReached,
          consensusValue: summary.consensusValue,
          participantCount,
        }),
      });
      if (!res.ok) throw new Error('Failed to fetch insights');
      const data = (await res.json()) as InsightResult;
      setInsight(data);
    } catch {
      setError('Could not load AI analysis. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const risk = insight ? riskConfig[insight.riskLevel] : null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden shadow-card">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/60 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/40">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-brand">
            <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-zinc-900 dark:text-white">AI Coach</span>
          {insight?.source === 'bedrock' && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              Bedrock
            </span>
          )}
        </div>
        {!insight && !loading && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={fetchInsight}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Analyze with AI
          </motion.button>
        )}
        {insight && (
          <button
            onClick={() => { setInsight(null); setError(undefined); }}
            className="text-[10px] font-semibold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
          >
            Reset
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {/* Loading */}
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 py-6"
            >
              <div className="relative">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-100 border-t-violet-600 dark:border-zinc-800 dark:border-t-violet-400" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-full bg-violet-100 dark:bg-violet-900/40" />
                </div>
              </div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                AI is analyzing the vote results…
              </p>
            </motion.div>
          )}

          {/* Error */}
          {!loading && error && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 dark:border-red-900/30 dark:bg-red-900/10"
            >
              <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
              <button onClick={fetchInsight} className="text-xs font-semibold text-red-600 underline dark:text-red-400">
                Retry
              </button>
            </motion.div>
          )}

          {/* Idle prompt */}
          {!loading && !error && !insight && (
            <motion.p
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-sm text-zinc-400 dark:text-zinc-500 py-4"
            >
              Click <span className="font-semibold text-violet-600 dark:text-violet-400">Analyze with AI</span> to get an agile coach analysis of these results.
            </motion.p>
          )}

          {/* Results */}
          {!loading && insight && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
              className="space-y-4"
            >
              {/* Risk + summary */}
              <div className="flex items-start gap-3">
                {risk && (
                  <span className={`badge ${risk.className} shrink-0 mt-0.5`}>
                    {risk.icon}
                    {risk.label}
                  </span>
                )}
                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {insight.summary}
                </p>
              </div>

              {/* Discussion points */}
              <div>
                <p className="label mb-2">Discussion Questions</p>
                <div className="space-y-2">
                  {insight.discussionPoints.map((point, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="flex items-start gap-2.5 rounded-lg border border-zinc-100 bg-zinc-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-800/50"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-black text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                        {i + 1}
                      </span>
                      <p className="text-sm leading-snug text-zinc-700 dark:text-zinc-300">{point}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Recommendation */}
              <div className="flex items-start gap-2.5 rounded-lg border border-indigo-100 bg-indigo-50 p-3 dark:border-indigo-900/30 dark:bg-indigo-900/10">
                <svg className="h-4 w-4 shrink-0 mt-0.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Recommendation</p>
                  <p className="mt-0.5 text-sm font-medium leading-snug text-indigo-800 dark:text-indigo-300">
                    {insight.recommendation}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
