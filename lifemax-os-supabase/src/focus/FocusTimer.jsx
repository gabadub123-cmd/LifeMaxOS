import { useState } from 'react';
import { WORK_DURATION, BREAK_DURATION, PHASES } from './constants';

const RING_R = 82;
const CIRCUMFERENCE = 2 * Math.PI * RING_R; // ≈ 515.2

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function FocusTimer({ timerState, onStart, onPause, onResume, onStop, onSkipBreak }) {
  const [taskInput, setTaskInput] = useState('');
  const [starting, setStarting] = useState(false);

  const { phase, running, remaining, taskLabel } = timerState;
  const total = phase === 'break' ? BREAK_DURATION : WORK_DURATION;
  const fraction = remaining / total;
  const offset = CIRCUMFERENCE * (1 - fraction);
  const phaseColor = PHASES[phase]?.color || '#555';
  const timeStr = formatTime(remaining);

  const handleStart = async () => {
    if (starting) return;
    setStarting(true);
    await onStart(taskInput.trim(), 'manual');
    setTaskInput('');
    setStarting(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && phase === 'idle') handleStart();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 24,
      padding: '32px 24px',
      background: 'rgba(255,255,255,0.015)',
      border: '1px solid rgba(255,255,255,0.04)',
      borderRadius: 12,
    }}>
      {/* Ring */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg
          viewBox="0 0 200 200"
          style={{ width: 'min(55vw, 240px)', height: 'min(55vw, 240px)', display: 'block' }}
        >
          {/* Glow filter */}
          <defs>
            <filter id="ring-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Background ring */}
          <circle
            cx="100" cy="100" r={RING_R}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="8"
          />

          {/* Progress ring */}
          {phase !== 'idle' && (
            <circle
              cx="100" cy="100" r={RING_R}
              fill="none"
              stroke={phaseColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              transform="rotate(-90 100 100)"
              filter="url(#ring-glow)"
              style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.5s ease' }}
            />
          )}

          {/* Center time */}
          <text
            x="100" y="93"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={phase === 'idle' ? '#444' : '#fff'}
            fontFamily="'JetBrains Mono', monospace"
            fontSize="30"
            fontWeight="700"
            letterSpacing="-1"
          >
            {timeStr}
          </text>

          {/* Phase label */}
          <text
            x="100" y="122"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={phaseColor}
            fontFamily="'JetBrains Mono', monospace"
            fontSize="8"
            fontWeight="600"
            letterSpacing="3"
          >
            {PHASES[phase]?.label || 'READY'}
          </text>

          {/* Subtle pulse dot when running */}
          {running && (
            <circle cx="100" cy="144" r="2.5" fill={phaseColor} opacity="0.7">
              <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2s" repeatCount="indefinite" />
            </circle>
          )}
        </svg>
      </div>

      {/* Task label during active session */}
      {phase !== 'idle' && taskLabel && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.72rem',
          color: '#888',
          letterSpacing: '1px',
          textAlign: 'center',
          maxWidth: 240,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {taskLabel}
        </div>
      )}

      {/* Task input — only shown when idle */}
      {phase === 'idle' && (
        <input
          type="text"
          value={taskInput}
          onChange={e => setTaskInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What are you working on? (optional)"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 6,
            color: '#fff',
            fontFamily: "'Outfit', sans-serif",
            fontSize: '0.82rem',
            padding: '10px 14px',
            width: '100%',
            maxWidth: 280,
            outline: 'none',
            textAlign: 'center',
            transition: 'border 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(255,61,0,0.35)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
        />
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {phase === 'idle' && (
          <button
            onClick={handleStart}
            disabled={starting}
            style={{
              background: starting ? 'rgba(255,61,0,0.4)' : '#FF3D00',
              border: 'none',
              color: '#000',
              fontFamily: "'Outfit', sans-serif",
              fontSize: '0.85rem',
              fontWeight: 800,
              padding: '12px 32px',
              borderRadius: 8,
              cursor: starting ? 'default' : 'pointer',
              letterSpacing: '1px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => { if (!starting) e.target.style.background = '#FF5722'; }}
            onMouseLeave={e => { if (!starting) e.target.style.background = '#FF3D00'; }}
          >
            {starting ? 'STARTING...' : '▶ START FOCUS'}
          </button>
        )}

        {phase === 'work' && running && (
          <>
            <button
              onClick={onPause}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#ccc',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '0.82rem',
                fontWeight: 700,
                padding: '10px 24px',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.06)'}
            >
              ⏸ PAUSE
            </button>
            <button
              onClick={onStop}
              style={{
                background: 'rgba(255,82,82,0.1)',
                border: '1px solid rgba(255,82,82,0.2)',
                color: '#FF5252',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '0.82rem',
                fontWeight: 700,
                padding: '10px 24px',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.target.style.background = 'rgba(255,82,82,0.2)'}
              onMouseLeave={e => e.target.style.background = 'rgba(255,82,82,0.1)'}
            >
              ✕ STOP
            </button>
          </>
        )}

        {phase === 'work' && !running && (
          <>
            <button
              onClick={onResume}
              style={{
                background: '#FF3D00',
                border: 'none',
                color: '#000',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '0.82rem',
                fontWeight: 800,
                padding: '10px 24px',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.target.style.background = '#FF5722'}
              onMouseLeave={e => e.target.style.background = '#FF3D00'}
            >
              ▶ RESUME
            </button>
            <button
              onClick={onStop}
              style={{
                background: 'rgba(255,82,82,0.1)',
                border: '1px solid rgba(255,82,82,0.2)',
                color: '#FF5252',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '0.82rem',
                fontWeight: 700,
                padding: '10px 24px',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.target.style.background = 'rgba(255,82,82,0.2)'}
              onMouseLeave={e => e.target.style.background = 'rgba(255,82,82,0.1)'}
            >
              ✕ STOP
            </button>
          </>
        )}

        {phase === 'break' && (
          <>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.72rem',
              color: '#76FF03',
              letterSpacing: '1.5px',
            }}>
              BREAK — rest, move, breathe
            </div>
            <button
              onClick={onSkipBreak}
              style={{
                background: 'rgba(118,255,3,0.08)',
                border: '1px solid rgba(118,255,3,0.2)',
                color: '#76FF03',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '8px 16px',
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.target.style.background = 'rgba(118,255,3,0.15)'}
              onMouseLeave={e => e.target.style.background = 'rgba(118,255,3,0.08)'}
            >
              Skip
            </button>
          </>
        )}
      </div>

      {/* Session stats hint */}
      {phase === 'work' && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.58rem',
          color: '#333',
          letterSpacing: '1px',
          textAlign: 'center',
        }}>
          {Math.ceil(remaining / 60)} min remaining · break follows
        </div>
      )}
    </div>
  );
}
