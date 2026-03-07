import Link from 'next/link';

const features = [
  {
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Real-time collaboration',
    description: 'Your entire team votes simultaneously. See who has voted and who is still thinking — live.',
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Smart consensus detection',
    description: 'Automatic outlier flagging, median calculation, and discussion prompts when estimates diverge.',
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Voting timer',
    description: 'Set a 1.5–3 minute countdown to keep sessions moving. Auto-reveals when time expires.',
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'AI-powered agile coach',
    description: 'After every reveal, Claude on Amazon Bedrock analyzes vote divergence, flags estimation risk, and suggests focused discussion questions.',
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    ),
    title: 'Instant invite links',
    description: 'Share a single URL. Team members join with one click — no accounts required.',
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
    title: 'Dark mode',
    description: 'Easy on the eyes during late-night planning sessions. Toggle anytime.',
  },
];

const stats = [
  { value: '∞', label: 'Concurrent sessions' },
  { value: '10', label: 'Card values (Fibonacci + ☕)' },
  { value: '100%', label: 'Free & open source' },
  { value: '< 1s', label: 'Real-time latency' },
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white dark:bg-zinc-950">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 -right-48 h-[700px] w-[700px] rounded-full bg-violet-100/70 blur-3xl dark:bg-violet-900/10" />
        <div className="absolute -bottom-48 -left-48 h-[600px] w-[600px] rounded-full bg-indigo-100/50 blur-3xl dark:bg-indigo-900/10" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-12">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand shadow-sm">
            <span className="text-sm font-extrabold text-white">AP</span>
          </div>
          <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">AgilePulse</span>
        </div>
        <Link href="/agilepulse" className="btn-primary hidden sm:inline-flex px-5 py-2">
          Get started
        </Link>
      </nav>

      {/* Hero */}
      <main className="relative z-10 mx-auto max-w-5xl px-6 pt-14 pb-20 sm:px-12 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-xs font-semibold text-violet-700 dark:border-violet-800/50 dark:bg-violet-900/20 dark:text-violet-300">
          <span className="flex h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse-slow" />
          Real-time collaboration · No sign-up required
        </div>

        {/* Headline */}
        <h1 className="mt-8 text-5xl font-bold tracking-tight text-zinc-900 sm:text-6xl lg:text-7xl dark:text-white">
          Sprint planning,{' '}
          <span className="relative inline-block">
            <span className="bg-gradient-to-r from-violet-600 via-indigo-500 to-blue-600 bg-clip-text text-transparent">
              actually fun
            </span>
            <svg
              className="absolute -bottom-2 left-0 w-full overflow-visible"
              viewBox="0 0 300 10"
              fill="none"
              preserveAspectRatio="none"
            >
              <path d="M2 7 C80 1, 200 1, 298 7" stroke="url(#ug)" strokeWidth="2.5" strokeLinecap="round"/>
              <defs>
                <linearGradient id="ug" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7c3aed"/>
                  <stop offset="100%" stopColor="#2563eb"/>
                </linearGradient>
              </defs>
            </svg>
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
          Real-time planning poker for agile teams. Estimate stories together, detect consensus automatically, and ship with confidence.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/agilepulse" className="btn btn-primary px-7 py-3 text-base font-semibold">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            Start planning free
          </Link>
          <a href="#how-it-works" className="btn btn-secondary px-7 py-3 text-base font-medium">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            See how it works
          </a>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(({ value, label }) => (
            <div key={label} className="rounded-xl border border-zinc-100 bg-white/80 p-4 text-center shadow-xs backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80">
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
            </div>
          ))}
        </div>

        {/* App preview */}
        <div className="relative mt-16 rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 rounded-md bg-zinc-100 px-3 py-1 text-xs text-zinc-400 dark:bg-zinc-700 dark:text-zinc-500">
              app.agilepulse.io · <span className="text-emerald-600 dark:text-emerald-400">● Live</span>
            </div>
          </div>
          {/* Content preview */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="h-5 w-44 skeleton rounded" />
                <div className="mt-1.5 h-3 w-28 skeleton rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-28 skeleton rounded-lg" />
                <div className="h-8 w-20 skeleton rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-5">
              <div className="space-y-3">
                <div className="h-3 w-20 skeleton rounded" />
                {[0,1,2].map(i => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-7 w-7 shrink-0 skeleton rounded-full" />
                    <div className="h-3 flex-1 skeleton rounded" />
                    {i < 2 && <div className="h-4 w-4 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/40" />}
                  </div>
                ))}
                <div className="mt-4 h-3 w-20 skeleton rounded" />
                {[0,1,2,3].map(i => (
                  <div key={i} className={`rounded-lg border p-2.5 ${i===0 ? 'border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-900/20' : i===1 ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-900/10' : 'border-zinc-100 dark:border-zinc-800'}`}>
                    <div className="h-3 w-full skeleton rounded mb-1.5" />
                    <div className="h-2 w-3/4 skeleton rounded" />
                  </div>
                ))}
              </div>
              <div className="col-span-2 space-y-4">
                <div className="rounded-xl border border-zinc-100 p-4 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-3 w-24 skeleton rounded" />
                    <div className="h-3 w-16 skeleton rounded" />
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {['0','1','2','3','5','8','13','21','?','☕'].map((v, i) => (
                    <div key={v} className={`rounded-xl border-2 py-3.5 text-center text-sm font-bold transition ${i===4 ? 'border-violet-500 bg-violet-600 text-white shadow-glow' : 'border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'}`}>
                      {v}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="h-9 w-28 rounded-lg bg-violet-600" />
                  <div className="h-9 w-28 rounded-lg bg-zinc-800 dark:bg-zinc-700" />
                  <div className="h-9 w-24 rounded-lg border-2 border-zinc-200 dark:border-zinc-700" />
                  <div className="h-9 w-32 rounded-lg bg-emerald-500" />
                </div>
              </div>
            </div>
          </div>
          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-zinc-950 pointer-events-none" />
        </div>

        {/* Features */}
        <div className="mt-24">
          <p className="label">Everything you need</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            Built for how modern teams work
          </h2>
          <p className="mt-3 text-base text-zinc-500 dark:text-zinc-400">
            No bloat. No accounts. No setup. Just faster, better planning.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-left">
            {features.map(({ icon, title, description }) => (
              <div
                key={title}
                className="group rounded-xl border border-zinc-100 bg-white p-5 shadow-xs transition-all duration-200 hover:border-violet-200 hover:shadow-card-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-violet-800/50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 transition-colors group-hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400">
                  {icon}
                </div>
                <h3 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div id="how-it-works" className="mt-24 scroll-mt-8">
          <p className="label">Step by step</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            How it works
          </h2>
          <p className="mt-3 text-base text-zinc-500 dark:text-zinc-400">
            From zero to estimated in under a minute.
          </p>

          <div className="relative mt-12">
            {/* Connector line */}
            <div className="absolute left-6 top-0 hidden h-full w-px bg-gradient-to-b from-violet-200 via-indigo-200 to-transparent lg:block dark:from-violet-800/40 dark:via-indigo-800/30" />

            <div className="space-y-6 lg:space-y-8">
              {[
                {
                  step: '01',
                  title: 'Create or join a session',
                  description: 'The Product Owner creates a session in one click and shares the invite link. Teammates join instantly — no login, no setup.',
                  color: 'bg-violet-600',
                  icon: (
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  ),
                },
                {
                  step: '02',
                  title: 'Add stories to the queue',
                  description: 'Add user stories with a title and description. The queue shows all stories with their current status — pending, active, or finalized.',
                  color: 'bg-indigo-600',
                  icon: (
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  ),
                },
                {
                  step: '03',
                  title: 'Vote privately, reveal together',
                  description: 'Each participant picks a card in private. The PO starts an optional countdown timer. When all votes are in (or time expires), votes are revealed simultaneously.',
                  color: 'bg-blue-600',
                  icon: (
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ),
                },
                {
                  step: '04',
                  title: 'Get AI-powered insights',
                  description: 'Click "Analyze with AI" and Claude on Amazon Bedrock reads the vote distribution, identifies divergence causes, and suggests 2–3 focused discussion questions.',
                  color: 'bg-gradient-brand',
                  icon: (
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  ),
                },
                {
                  step: '05',
                  title: 'Finalize the estimate',
                  description: 'Reach consensus, then click "Finalize Estimate". The value locks in the story queue. Move to the next story — the session analytics track your team velocity in real time.',
                  color: 'bg-emerald-600',
                  icon: (
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ),
                },
              ].map(({ step, title, description, color, icon }) => (
                <div key={step} className="relative flex items-start gap-5 text-left lg:gap-7">
                  <div className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color} shadow-sm`}>
                    {icon}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{step}</span>
                      <h3 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">{title}</h3>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="relative mt-24 overflow-hidden rounded-2xl bg-gradient-brand p-10 text-center shadow-lg">
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}
          />
          <h2 className="relative text-2xl font-bold text-white sm:text-3xl">
            Ready to level up your planning sessions?
          </h2>
          <p className="relative mt-2 text-violet-200">
            Start a session in 10 seconds. No sign-up required.
          </p>
          <Link
            href="/agilepulse"
            className="relative mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            Launch AgilePulse
          </Link>
        </div>

        {/* Built by */}
        <div className="mt-16 flex justify-center">
          <div className="flex items-center gap-4 rounded-2xl border border-zinc-100 bg-white px-6 py-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            {/* Avatar */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-brand shadow-sm">
              <span className="text-sm font-extrabold tracking-tight text-white">BN</span>
            </div>
            {/* Info */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Built by
              </p>
              <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-white">
                Bharath Kumar Noora
              </p>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Full Stack Developer
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 flex flex-wrap items-center justify-center gap-1.5 text-xs text-zinc-400">
          <span>AgilePulse</span>
          <span>·</span>
          <span>Built for agile teams</span>
          <span>·</span>
          <span>Deployed on AWS CloudFront + Lambda</span>
        </footer>
      </main>
    </div>
  );
}
