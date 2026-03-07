'use client';

import { useEffect, useRef, useState } from 'react';

type VotingTimerProps = {
  expiresAt: string;
  durationSeconds: number;
  onExpired: () => void;
};

export default function VotingTimer({ expiresAt, durationSeconds, onExpired }: VotingTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const ms = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(ms / 1000));
  });
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      const secs = Math.max(0, Math.floor(ms / 1000));
      setSecondsLeft(secs);
      if (secs === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpired();
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [expiresAt, onExpired]);

  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const progress = durationSeconds > 0 ? secondsLeft / durationSeconds : 0;
  const dashOffset = circumference * (1 - progress);
  const isUrgent = secondsLeft <= 15;

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const label = `${minutes}:${String(secs).padStart(2, '0')}`;

  return (
    <div
      className="flex flex-col items-center gap-0.5"
      role="timer"
      aria-label={`${isUrgent ? 'Hurry! ' : ''}${label} remaining`}
      aria-live={isUrgent ? 'assertive' : 'off'}
    >
      <svg width={52} height={52} viewBox="0 0 52 52" aria-hidden="true">
        {/* Track */}
        <circle
          cx={26}
          cy={26}
          r={radius}
          fill="none"
          stroke={isUrgent ? 'rgba(239,68,68,0.15)' : 'rgba(124,58,237,0.1)'}
          strokeWidth={4}
        />
        {/* Progress ring */}
        <circle
          cx={26}
          cy={26}
          r={radius}
          fill="none"
          stroke={isUrgent ? '#ef4444' : '#7c3aed'}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 26 26)"
          style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s ease' }}
        />
        {/* Label */}
        <text
          x={26}
          y={30}
          textAnchor="middle"
          fontSize={isUrgent ? 9 : 10}
          fontWeight="800"
          fontFamily="Inter, system-ui, sans-serif"
          fill={isUrgent ? '#ef4444' : '#7c3aed'}
        >
          {label}
        </text>
      </svg>
      <span className={`text-[10px] font-semibold ${isUrgent ? 'text-red-500' : 'text-zinc-400 dark:text-zinc-500'}`}>
        {isUrgent ? 'Hurry!' : 'Time left'}
      </span>
    </div>
  );
}
