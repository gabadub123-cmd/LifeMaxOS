import { useState } from 'react';
import { WORK_DURATION, BREAK_DURATION, PHASES } from './constants';
import { focus as focusApi } from '../supabase';

const logInput = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 6,
  color: '#fff',
  fontFamily: "'Outfit', sans-serif",
  fontSize: '0.82rem',
  padding: '9px 12px',
  outline: 'none',
  boxSizing: 'border-box',
};

const RING_R = 82;
const CIRCUMFERENCE = 2 * Math.PI * RING_R; // ≈ 515.2

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function FocusTimer({ timerState, onStart, onPause, onResume, onStop, onSkipBreak, onSessionSaved }) {
  const [taskInput, setTaskInput] = useState('');
  const [starting, setStarting] = useState(false);

  // Manual log state
  const [showLog, setShowLog] = useState(false);
  const [logForm, setLogForm] = useState({ task: '', duration: '', time: '' });
  const [logging, setLogging] = useState(false);
  const [logDone, setLogDone] = useState(false);

  const handleLogSubmit = async () => {
    if (!logForm.duration || Number(logForm.duration) <= 0) return;
    setLogging(true);
    // Build started_at from time input if provided, else now - duration
    let started_at = null;
    if (logForm.time) {
      const [h, m] = logForm.time.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      started_at = d.toISOString();
    }
    await focusApi.logManualSession({
      task_label: logForm.task.trim() || null,
      duration_min: Number(logForm.duration),
      started_at,
      source: 'manual',
    });
    setLogging(false);
    setLogDone(true);
    setLogForm({ task: '', duration: '', time: '' });
    if (onSessionSaved) onSessionSaved();
    setTimeout(() => { setLogDone(false); setShowLog(false); }, 1800);
  };

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

      {/* Manual log — only when idle */}
      {phase === 'idle' && (
        <div style={{ width: '100%', maxWidth: 340 }}>
          {!showLog ? (
            <button
              onClick={() => setShowLog(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#444',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.62rem',
                letterSpacing: '1px',
                cursor: 'pointer',
                padding: '4px 0',
                textDecoration: 'underline',
                textDecorationColor: '#333',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.target.style.color = '#888'}
              onMouseLeave={e => e.target.style.color = '#444'}
            >
              ↳ log a past session
            </button>
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 8,
              padding: '14px 16px',
              animation: 'fadeIn 0.2s ease',
            }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.62rem',
                color: '#666',
                letterSpacing: '1.5px',
                marginBottom: 10,
              }}>
                LOG PAST SESSION
              </div>

              {logDone ? (
                <div style={{
                  textAlign: 'center',
                  color: '#76FF03',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.78rem',
                  padding: '8px 0',
                }}>
                  ✓ logged
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      type="text"
                      value={logForm.task}
                      onChange={e => setLogForm(f => ({ ...f, task: e.target.value }))}
                      placeholder="What did you work on?"
                      autoFocus
                      style={logInput}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <input
                          type="number"
                          min={1}
                          max={480}
                          value={logForm.duration}
                          onChange={e => setLogForm(f => ({ ...f, duration: e.target.value }))}
                          placeholder="Duration (min)"
                          onKeyDown={e => e.key === 'Enter' && handleLogSubmit()}
                          style={{ ...logInput, textAlign: 'center' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <input
                          type="time"
                          value={logForm.time}
                          onChange={e => setLogForm(f => ({ ...f, time: e.target.value }))}
                          title="Start time (optional — defaults to now minus duration)"
                          style={logInput}
                        />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      onClick={() => { setShowLog(false); setLogForm({ task: '', duration: '', time: '' }); }}
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.04)',
                        border: 'none',
                        color: '#666',
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: '0.78rem',
                        padding: '8px',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLogSubmit}
                      disabled={logging || !logForm.duration}
                      style={{
                        flex: 2,
                        background: logging || !logForm.duration ? 'rgba(118,255,3,0.2)' : '#76FF03',
                        border: 'none',
                        color: '#000',
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '8px',
                        borderRadius: 6,
                        cursor: logging || !logForm.duration ? 'default' : 'pointer',
                      }}
                    >
                      {logging ? 'Saving...' : '+ Log Session'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

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
