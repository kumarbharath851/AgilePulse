'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { PLANNING_POKER_VALUES, PlanningPokerValue } from '@/lib/agilepulse/types';

type PlanningPokerBoardProps = {
  selected?: PlanningPokerValue;
  onSelect: (value: PlanningPokerValue) => void;
  disabled?: boolean;
  hasVoted?: boolean;
  timerActive?: boolean;
};

export default function PlanningPokerBoard({
  selected,
  onSelect,
  disabled,
  hasVoted = true,
  timerActive = false,
}: PlanningPokerBoardProps) {
  const needsVote = !hasVoted && timerActive;

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {needsVote && (
          <motion.div
            role="alert"
            aria-live="polite"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-400"
          >
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Timer is running — please place your vote!
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        role="group"
        aria-label="Select your estimate"
        className={`grid grid-cols-5 gap-2 rounded-xl p-1 sm:grid-cols-10 ${
          needsVote ? 'ring-2 ring-amber-400 ring-offset-2 dark:ring-offset-zinc-900' : ''
        }`}
        animate={
          needsVote
            ? { boxShadow: ['0 0 0 0px rgba(251,191,36,0)', '0 0 0 6px rgba(251,191,36,0.35)', '0 0 0 0px rgba(251,191,36,0)'] }
            : { boxShadow: '0 0 0 0px rgba(0,0,0,0)' }
        }
        transition={{ duration: 1.6, repeat: needsVote ? Infinity : 0, ease: 'easeInOut' }}
      >
        {PLANNING_POKER_VALUES.map((value) => {
          const isSelected = selected === value;
          const cardLabel = value === 'coffee' ? 'Coffee break' : value === '?' ? 'Uncertain' : `${value} points`;

          return (
            <motion.button
              key={value}
              whileHover={{ scale: disabled ? 1 : 1.08, y: disabled ? 0 : -4 }}
              whileTap={{ scale: disabled ? 1 : 0.93 }}
              onClick={() => onSelect(value)}
              disabled={disabled}
              aria-label={`Vote ${cardLabel}${isSelected ? ' (selected)' : ''}`}
              aria-pressed={isSelected}
              className={`relative rounded-xl border-2 px-2 py-4 text-base font-black transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 ${
                isSelected
                  ? 'border-violet-500 bg-violet-600 text-white shadow-glow'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:border-violet-300 hover:shadow-card dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-violet-700'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              {value === 'coffee' ? '☕' : value}
              {isSelected && (
                <motion.span
                  layoutId="card-selection"
                  className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500"
                  initial={false}
                >
                  <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
