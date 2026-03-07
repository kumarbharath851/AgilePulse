'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import PlanningPokerBoard from '@/components/agilepulse/PlanningPokerBoard';
import VoteRevealPanel from '@/components/agilepulse/VoteRevealPanel';
import VoteProgressBar from '@/components/agilepulse/VoteProgressBar';
import VotingTimer from '@/components/agilepulse/VotingTimer';
import AllVotedBanner from '@/components/agilepulse/AllVotedBanner';
import AIInsightsPanel from '@/components/agilepulse/AIInsightsPanel';
import {
  PlanningPokerValue,
  SessionAnalytics,
  SessionView,
  StoryItem,
  TimerState,
} from '@/lib/agilepulse/types';

const DEFAULT_ESTIMATE: PlanningPokerValue = '5';
const AGILEPULSE_API_BASE = process.env.NEXT_PUBLIC_AGILEPULSE_API_BASE_URL?.replace(/\/$/, '');

type GtagFn = (...args: unknown[]) => void;
function trackEvent(name: string, params?: Record<string, string | number | boolean>) {
  try {
    const w = window as typeof window & { gtag?: GtagFn };
    if (typeof w.gtag === 'function') w.gtag('event', name, params ?? {});
  } catch { /* analytics unavailable */ }
}

function resolveApiUrl(path: string): string {
  if (!AGILEPULSE_API_BASE) {
    return path;
  }
  return `${AGILEPULSE_API_BASE}${path.replace(/^\/api/, '')}`;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(resolveApiUrl(url), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? 'Request failed');
  }

  return response.json() as Promise<T>;
}

export default function AgilePulsePage() {
  const [teamName, setTeamName] = useState('Cyber Mavericks');
  const [displayName, setDisplayName] = useState('Scrum Master');
  const [joinSessionId, setJoinSessionId] = useState('');
  const [sessionId, setSessionId] = useState<string>();
  const [userId, setUserId] = useState<string>();
  const [sessionView, setSessionView] = useState<SessionView>();
  const [analytics, setAnalytics] = useState<SessionAnalytics>();
  const [selectedVote, setSelectedVote] = useState<PlanningPokerValue>();
  const [newStoryTitle, setNewStoryTitle] = useState('');
  const [newStoryDescription, setNewStoryDescription] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [error, setError] = useState<string>();
  const [isBusy, setIsBusy] = useState(false);
  const [showAllVotedBanner, setShowAllVotedBanner] = useState(false);
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [timerDuration, setTimerDuration] = useState<90 | 120 | 150 | 180>(120);
  const [copyToast, setCopyToast] = useState(false);

  const isOrganizer = useMemo(
    () => !!userId && !!sessionView && sessionView.session.participants[0]?.userId === userId,
    [userId, sessionView]
  );

  // Auto-fill join ID from ?join= query param on initial load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const joinParam = params.get('join');
      if (joinParam) {
        setJoinSessionId(joinParam);
      }
    }
  }, []);

  const refreshSession = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    const view = await apiFetch<SessionView>(
      `/api/agilepulse/sessions/${sessionId}${userId ? `?userId=${userId}` : ''}`
    );

    setSessionView(view);
    if (view.session.timerState) {
      setTimerState(view.session.timerState);
    } else {
      setTimerState(null);
    }

    try {
      const analyticsResult = await apiFetch<SessionAnalytics>(
        `/api/agilepulse/sessions/${sessionId}/analytics`
      );
      setAnalytics(analyticsResult);
    } catch {
      setAnalytics(undefined);
    }
  }, [sessionId, userId]);

  useEffect(() => {
    refreshSession().catch((requestError: unknown) => {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load session');
    });
  }, [refreshSession]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    if (AGILEPULSE_API_BASE) {
      const refreshTimer = setInterval(() => {
        refreshSession().catch(() => undefined);
      }, 5000);
      return () => clearInterval(refreshTimer);
    }

    let eventsSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      eventsSource = new EventSource(`/api/agilepulse/sessions/${sessionId}/events`);

      const onAnyEvent = () => {
        refreshSession().catch(() => undefined);
      };

      const onTimerStarted = (evt: MessageEvent) => {
        try {
          const data = JSON.parse(evt.data) as { payload: TimerState };
          if (data.payload?.expiresAt) setTimerState(data.payload);
        } catch {
          refreshSession().catch(() => undefined);
        }
      };

      const onAllVoted = () => {
        refreshSession().catch(() => undefined);
        setShowAllVotedBanner(true);
      };

      eventsSource.addEventListener('participant.joined', onAnyEvent);
      eventsSource.addEventListener('story.added', onAnyEvent);
      eventsSource.addEventListener('vote.submitted', onAnyEvent);
      eventsSource.addEventListener('votes.revealed', onAnyEvent);
      eventsSource.addEventListener('round.advanced', onAnyEvent);
      eventsSource.addEventListener('story.finalized', onAnyEvent);
      eventsSource.addEventListener('timer.started', onTimerStarted);
      eventsSource.addEventListener('all.voted', onAllVoted);

      eventsSource.onerror = () => {
        eventsSource?.close();
        eventsSource = null;
        if (!destroyed) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      eventsSource?.close();
    };
  }, [sessionId, refreshSession]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const activeStory = sessionView?.activeStory;
  const inviteUrl = useMemo(
    () =>
      sessionId && typeof window !== 'undefined'
        ? `${window.location.origin}/agilepulse?join=${sessionId}`
        : '',
    [sessionId]
  );

  const withBusy = async (task: () => Promise<void>) => {
    setError(undefined);
    setIsBusy(true);
    try {
      await task();
      await refreshSession();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Action failed');
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateSession = async () => {
    const name = teamName.trim();
    const creator = displayName.trim();
    if (!name) { setError('Team name is required.'); return; }
    if (name.length > 60) { setError('Team name must be 60 characters or fewer.'); return; }
    if (!creator) { setError('Your display name is required.'); return; }
    if (creator.length > 30) { setError('Display name must be 30 characters or fewer.'); return; }
    await withBusy(async () => {
      const created = await apiFetch<{
        sessionId: string;
        participants: Array<{ userId: string; displayName: string }>;
      }>('/api/agilepulse/sessions', {
        method: 'POST',
        body: JSON.stringify({ teamName: name, createdBy: creator }),
      });

      if (!created.participants?.length) {
        throw new Error('Session created but no participants returned from server.');
      }

      setSessionId(created.sessionId);
      setJoinSessionId(created.sessionId);
      setUserId(created.participants[0].userId);
      trackEvent('session_created', { session_id: created.sessionId });
    });
  };

  const handleJoinSession = async () => {
    const code = joinSessionId.trim().toUpperCase();
    const joiner = displayName.trim();
    if (!code) { setError('Please enter a session code.'); return; }
    if (!joiner) { setError('Your display name is required.'); return; }
    if (joiner.length > 30) { setError('Display name must be 30 characters or fewer.'); return; }
    await withBusy(async () => {
      const participant = await apiFetch<{ userId: string }>(
        `/api/agilepulse/sessions/${code}/join`,
        {
          method: 'POST',
          body: JSON.stringify({ displayName: joiner }),
        }
      );

      setSessionId(code);
      setUserId(participant.userId);
      trackEvent('session_joined', { session_id: code });
    });
  };

  const handleAddStory = async () => {
    if (!sessionId || !newStoryTitle.trim()) {
      return;
    }

    await withBusy(async () => {
      await apiFetch(`/api/agilepulse/sessions/${sessionId}/stories`, {
        method: 'POST',
        body: JSON.stringify({
          title: newStoryTitle.trim(),
          description: newStoryDescription.trim(),
        }),
      });
      setNewStoryTitle('');
      setNewStoryDescription('');
    });
  };

  const handleSubmitVote = async () => {
    if (!sessionId || !userId || !activeStory || !selectedVote) {
      return;
    }
    await withBusy(async () => {
      await apiFetch(`/api/agilepulse/sessions/${sessionId}/votes`, {
        method: 'POST',
        body: JSON.stringify({
          storyId: activeStory.storyId,
          userId,
          voteValue: selectedVote,
        }),
      });
      trackEvent('vote_submitted', { vote_value: selectedVote });
    });
  };

  const handleRevealVotes = async () => {
    if (!sessionId || !activeStory) {
      return;
    }
    setShowAllVotedBanner(false);
    await withBusy(async () => {
      await apiFetch(`/api/agilepulse/sessions/${sessionId}/votes/reveal`, {
        method: 'POST',
        body: JSON.stringify({ storyId: activeStory.storyId }),
      });
      setTimerState(null);
      trackEvent('votes_revealed', { session_id: sessionId });
    });
  };

  const handleAdvanceRound = async () => {
    if (!sessionId) {
      return;
    }
    await withBusy(async () => {
      await apiFetch(`/api/agilepulse/sessions/${sessionId}/round`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setSelectedVote(undefined);
      setTimerState(null);
      setShowAllVotedBanner(false);
    });
  };

  const handleFinalize = async (estimate: PlanningPokerValue | undefined) => {
    if (!sessionId || !activeStory) {
      return;
    }
    if (!estimate) {
      setError('Please select an estimate card before finalizing.');
      return;
    }
    await withBusy(async () => {
      await apiFetch(`/api/agilepulse/sessions/${sessionId}/finalize`, {
        method: 'POST',
        body: JSON.stringify({
          storyId: activeStory.storyId,
          finalEstimate: estimate,
        }),
      });
      setSelectedVote(undefined);
      setTimerState(null);
      setShowAllVotedBanner(false);
      trackEvent('story_finalized', {
        final_estimate: estimate,
        consensus: Boolean(sessionView?.summary?.consensusReached),
      });
    });
  };

  const handleStartTimer = async () => {
    if (!sessionId || !userId) {
      return;
    }
    await withBusy(async () => {
      const result = await apiFetch<{ timerState: TimerState }>(
        `/api/agilepulse/sessions/${sessionId}/timer`,
        {
          method: 'POST',
          body: JSON.stringify({ durationSeconds: timerDuration, userId }),
        }
      );
      setTimerState(result.timerState);
    });
  };

  const handleTimerExpired = useCallback(async () => {
    if (!sessionId || !activeStory) {
      return;
    }
    setShowAllVotedBanner(false);
    try {
      await apiFetch(`/api/agilepulse/sessions/${sessionId}/votes/reveal`, {
        method: 'POST',
        body: JSON.stringify({ storyId: activeStory.storyId }),
      });
      setTimerState(null);
      await refreshSession();
    } catch (timerError: unknown) {
      setTimerState(null);
      setError(timerError instanceof Error ? timerError.message : 'Auto-reveal failed');
    }
  }, [sessionId, activeStory, refreshSession]);

  const handleCopyInviteLink = async () => {
    if (!inviteUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2000);
    } catch {
      setError('Clipboard not available. Copy this link: ' + inviteUrl);
    }
  };

  // ─── Pre-session screen ───────────────────────────────────────────────────
  if (!sessionId || !sessionView) {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-white dark:bg-zinc-950">
        {/* Background blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-violet-100/60 blur-3xl dark:bg-violet-900/10" />
          <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-indigo-100/40 blur-3xl dark:bg-indigo-900/10" />
        </div>

        {/* Navbar */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-4 sm:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand shadow-sm">
              <span className="text-sm font-extrabold text-white">AP</span>
            </div>
            <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">AgilePulse</span>
          </Link>
          <button
            onClick={() => setDarkMode((v) => !v)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            {darkMode ? '☀ Light' : '☾ Dark'}
          </button>
        </nav>

        <main className="relative z-10 mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6">
          <div className="mb-8 text-center">
            <p className="label mb-2">Planning Poker</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
              Start or join a session
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              No account needed. Share the link and your team can join instantly.
            </p>
          </div>

          {joinSessionId && !sessionId && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center gap-2.5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-800/50 dark:bg-violet-900/20"
            >
              <svg className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <p className="text-sm font-medium text-violet-800 dark:text-violet-300">
                You&apos;ve been invited to join session <span className="font-mono font-black">{joinSessionId}</span> — enter your name to join.
              </p>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </motion.div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Create */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
              className="card p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-900/30">
                <svg className="h-5 w-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">Create Session</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Start a new sizing session for your team.</p>
              <div className="mt-5 space-y-3">
                <input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="input"
                  placeholder="Team name"
                />
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input"
                  placeholder="Your display name"
                />
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateSession}
                  disabled={isBusy}
                  className="btn btn-primary w-full py-2.5 text-sm font-semibold disabled:opacity-60"
                >
                  {isBusy ? 'Creating…' : 'Create Session'}
                </motion.button>
              </div>
            </motion.div>

            {/* Join */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22, delay: 0.08 }}
              className="card p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
                <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">Join Session</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Enter your session ID or follow the invite link.</p>
              <div className="mt-5 space-y-3">
                <input
                  value={joinSessionId}
                  onChange={(e) => setJoinSessionId(e.target.value.toUpperCase())}
                  className="input font-mono tracking-wider"
                  placeholder="ABC-123"
                  maxLength={7}
                  autoCapitalize="characters"
                />
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input"
                  placeholder="Your display name"
                />
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleJoinSession}
                  disabled={isBusy || !joinSessionId}
                  className="btn btn-secondary w-full py-2.5 text-sm font-semibold disabled:opacity-60"
                >
                  {isBusy ? 'Joining…' : 'Join Session'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  // ─── In-session view ──────────────────────────────────────────────────────
  const votedCount = sessionView.votedUserIds?.length ?? 0;
  const participantCount = sessionView.participantCount ?? sessionView.session.participants.length;
  const hasVoted = !!(userId && sessionView.votedUserIds?.includes(userId));

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">

        {/* Top Navbar */}
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/90">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-brand shadow-sm">
                  <span className="text-xs font-extrabold text-white">AP</span>
                </div>
                <span className="hidden text-sm font-bold tracking-tight text-zinc-900 dark:text-white sm:block">AgilePulse</span>
              </Link>
              <span className="hidden text-zinc-300 dark:text-zinc-700 sm:block">/</span>
              <div className="hidden sm:block">
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">{sessionView.session.teamName}</span>
                <span className="ml-2 rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  {sessionView.session.sessionId}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Round badge */}
              <span className="badge badge-violet hidden sm:inline-flex">
                Round {sessionView.currentRound}
              </span>

              {/* Copy invite */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCopyInviteLink}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs transition hover:border-violet-300 hover:text-violet-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:block">Copy Invite</span>
                </motion.button>
                <AnimatePresence>
                  {copyToast && (
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-zinc-900 px-2.5 py-1 text-[10px] font-semibold text-white shadow dark:bg-zinc-700"
                    >
                      Copied!
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Dark mode */}
              <button
                onClick={() => setDarkMode((v) => !v)}
                className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {darkMode ? '☀' : '☾'}
              </button>
            </div>
          </div>
        </header>

        {/* Main layout */}
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:grid lg:grid-cols-12 lg:gap-5">

          {/* ── Sidebar ── */}
          <aside className="mb-5 space-y-4 lg:col-span-4 lg:mb-0">

            {/* QR / Invite URL */}
            {inviteUrl && (
              <div className="card p-4">
                <p className="label mb-3">Invite Link</p>
                <div className="flex items-start gap-3">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=64x64&data=${encodeURIComponent(inviteUrl)}`}
                    alt="Invite QR"
                    className="h-12 w-12 shrink-0 rounded-lg border border-zinc-100 dark:border-zinc-800"
                  />
                  <p className="break-all text-xs text-zinc-500 dark:text-zinc-400">{inviteUrl}</p>
                </div>
              </div>
            )}

            {/* Participants */}
            <div className="card p-4">
              <p className="label mb-3">Participants</p>
              <div className="flex flex-wrap gap-2">
                {sessionView.session.participants.map((participant) => {
                  const didVote = sessionView.votedUserIds?.includes(participant.userId);
                  return (
                    <motion.div
                      key={participant.userId}
                      whileHover={{ scale: 1.03 }}
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                        didVote
                          ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-800'
                          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}
                    >
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black text-white ${
                        didVote ? 'bg-emerald-500' : 'bg-violet-500'
                      }`}>
                        {participant.displayName.slice(0, 2).toUpperCase()}
                      </span>
                      {participant.displayName}
                      {didVote && <span className="text-emerald-500">✓</span>}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Add story */}
            <div className="card p-4">
              <p className="label mb-3">Add Story</p>
              <div className="space-y-2.5">
                <input
                  value={newStoryTitle}
                  onChange={(e) => setNewStoryTitle(e.target.value)}
                  className="input text-sm"
                  placeholder="Story title"
                  maxLength={200}
                />
                <input
                  value={newStoryDescription}
                  onChange={(e) => setNewStoryDescription(e.target.value)}
                  className="input text-sm"
                  placeholder="Description (optional)"
                  maxLength={500}
                />
                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAddStory}
                    disabled={isBusy || !newStoryTitle.trim()}
                    className="btn btn-primary w-full py-2 text-xs disabled:opacity-60"
                  >
                    Add Story
                  </motion.button>
              </div>
            </div>

            {/* Story queue */}
            <div className="card p-4">
              <p className="label mb-3">Story Queue</p>
              <div className="space-y-2">
                {sessionView.stories.length === 0 && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">No stories yet.</p>
                )}
                {sessionView.stories.map((story: StoryItem, idx) => (
                  <motion.div
                    key={story.storyId}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`rounded-lg border p-2.5 transition ${
                      story.storyId === activeStory?.storyId
                        ? 'border-violet-200 bg-violet-50 dark:border-violet-800/50 dark:bg-violet-900/20'
                        : story.finalEstimate
                        ? 'border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-900/10'
                        : 'border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-zinc-900 dark:text-white">{story.title}</p>
                        <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">{story.description}</p>
                      </div>
                      {story.finalEstimate ? (
                        <span className="shrink-0 rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-black text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          {story.finalEstimate}
                        </span>
                      ) : story.storyId === activeStory?.storyId ? (
                        <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                          Active
                        </span>
                      ) : null}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Session analytics */}
            <div className="card p-4">
              <p className="label mb-3">Session Stats</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Stories', value: analytics?.totalStories ?? 0 },
                  { label: 'Finalized', value: analytics?.finalizedStories ?? 0 },
                  { label: 'Consensus', value: `${Math.round((analytics?.consensusRate ?? 0) * 100)}%` },
                  { label: 'Avg Spread', value: analytics?.avgSpread ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{label}</p>
                    <p className="mt-0.5 text-xl font-black text-zinc-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Main Content ── */}
          <main className="space-y-4 lg:col-span-8">

            {/* All-voted banner */}
            <AnimatePresence>
              {showAllVotedBanner && isOrganizer && (
                <AllVotedBanner
                  onReveal={handleRevealVotes}
                  onDismiss={() => setShowAllVotedBanner(false)}
                />
              )}
            </AnimatePresence>

            {/* Voting area */}
            <div className="card p-5">
              {/* Story header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="label">Active Story</p>
                  {activeStory ? (
                    <>
                      <h2 className="mt-1 text-lg font-bold leading-tight tracking-tight text-zinc-900 dark:text-white">
                        {activeStory.title}
                      </h2>
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                        {activeStory.description}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      All stories finalized for this session.
                    </p>
                  )}
                </div>
                {timerState && (
                  <div className="shrink-0">
                    <VotingTimer
                      expiresAt={timerState.expiresAt}
                      durationSeconds={timerState.durationSeconds}
                      onExpired={handleTimerExpired}
                    />
                  </div>
                )}
              </div>

              {activeStory && (
                <>
                  {/* Vote progress */}
                  {sessionView.session.status === 'voting' && (
                    <div className="mb-4">
                      <VoteProgressBar
                        votedCount={votedCount}
                        totalCount={participantCount}
                      />
                    </div>
                  )}

                  {/* Card board */}
                  <PlanningPokerBoard
                    selected={selectedVote ?? sessionView.myVote}
                    onSelect={setSelectedVote}
                    disabled={Boolean(sessionView.summary)}
                    hasVoted={hasVoted}
                    timerActive={!!timerState}
                  />
                </>
              )}

              {/* Action buttons */}
              <div className="mt-4 flex flex-wrap gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmitVote}
                  disabled={isBusy || !activeStory || !selectedVote}
                  className="btn btn-primary text-sm disabled:opacity-60"
                >
                  {hasVoted ? 'Update Vote' : 'Submit Vote'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleRevealVotes}
                  disabled={isBusy || !activeStory || !!sessionView.summary}
                  className="btn btn-secondary text-sm disabled:opacity-60"
                >
                  Reveal Votes
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAdvanceRound}
                  disabled={isBusy || !sessionView.summary}
                  className="btn btn-secondary text-sm disabled:opacity-60"
                >
                  Re-vote
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleFinalize(sessionView.summary?.consensusValue ?? selectedVote)}
                  disabled={isBusy || !activeStory || !sessionView.summary}
                  className="btn btn-success text-sm disabled:opacity-60"
                >
                  Finalize Estimate
                </motion.button>
              </div>

              {/* PO timer controls */}
              {isOrganizer && activeStory && !sessionView.summary && !timerState && (
                <div className="mt-3 flex items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <span className="label">Timer</span>
                  <select
                    value={timerDuration}
                    onChange={(e) => setTimerDuration(Number(e.target.value) as 90 | 120 | 150 | 180)}
                    className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-semibold text-zinc-700 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    <option value={90}>1.5 min</option>
                    <option value={120}>2 min</option>
                    <option value={150}>2.5 min</option>
                    <option value={180}>3 min</option>
                  </select>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleStartTimer}
                    disabled={isBusy}
                    className="btn btn-warning text-xs disabled:opacity-60"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Start Timer
                  </motion.button>
                </div>
              )}

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </motion.div>
              )}
            </div>

            {/* Vote reveal results */}
            <AnimatePresence>
              {sessionView.summary && (
                <VoteRevealPanel summary={sessionView.summary} />
              )}
            </AnimatePresence>

            {/* AI Insights */}
            <AnimatePresence>
              {sessionView.summary && activeStory && (
                <motion.div
                  key={activeStory.storyId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <AIInsightsPanel
                    storyTitle={activeStory.title}
                    storyDescription={activeStory.description}
                    summary={sessionView.summary}
                    participantCount={participantCount}
                    apiBase={AGILEPULSE_API_BASE}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
