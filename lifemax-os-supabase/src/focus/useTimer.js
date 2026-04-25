// FOCUS — Timer hook
// Manages work/break Pomodoro cycles.
// Persists state to localStorage for crash recovery.
// Reconciles elapsed time on tab visibility restore.

import { useState, useEffect, useRef, useCallback } from 'react';
import { focus as focusApi } from '../supabase';
import { WORK_DURATION, BREAK_DURATION } from './constants';

const STORAGE_KEY = 'lm_focus_timer';

export const DEFAULT_TIMER_STATE = {
  phase: 'idle',       // 'idle' | 'work' | 'break'
  running: false,
  remaining: WORK_DURATION,
  sessionStart: null,  // ISO string
  sessionId: null,     // Supabase focus_sessions.id
  taskLabel: '',
  source: 'manual',
  savedAt: null,       // epoch ms — for crash recovery
};

function saveToStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch { /* quota exceeded — non-fatal */ }
}

function loadFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch { return null; }
}

function playBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.8);
    setTimeout(() => ctx.close(), 2000);
  } catch (e) {
    console.warn('Audio beep unavailable:', e);
  }
}

export default function useTimer({ onSessionSaved } = {}) {
  const [state, setState] = useState(() => {
    const saved = loadFromStorage();
    if (!saved) return DEFAULT_TIMER_STATE;
    if (saved.running && saved.savedAt) {
      // Reconcile elapsed time from when the state was last saved
      const elapsed = Math.floor((Date.now() - saved.savedAt) / 1000);
      const adjusted = Math.max(0, saved.remaining - elapsed);
      // If completed while away, reset gracefully (we can't retroactively save a clean end)
      if (adjusted === 0) return { ...DEFAULT_TIMER_STATE };
      return { ...saved, remaining: adjusted };
    }
    return { ...DEFAULT_TIMER_STATE, ...saved };
  });

  // Always-current ref — safe to read inside async callbacks
  const stateRef = useRef(state);
  stateRef.current = state;

  // Flag to prevent double-firing completion within the same tick
  const [completionSignal, setCompletionSignal] = useState(0);

  // ── Tick ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!state.running) return;

    const interval = setInterval(() => {
      setState(prev => {
        if (!prev.running) return prev;
        const newRemaining = prev.remaining - 1;
        if (newRemaining <= 0) {
          // Signal completion outside the setState callback
          setCompletionSignal(s => s + 1);
          const done = { ...prev, remaining: 0, running: false };
          saveToStorage(done);
          return done;
        }
        const updated = { ...prev, remaining: newRemaining };
        saveToStorage(updated);
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.running]);

  // ── Completion handler ────────────────────────────────────────
  useEffect(() => {
    if (completionSignal === 0) return;
    handleComplete();
  }, [completionSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleComplete = useCallback(async () => {
    const current = stateRef.current;
    playBeep();

    if (current.phase === 'work' && current.sessionId) {
      const saved = await focusApi.updateSession(current.sessionId, {
        ended_at: new Date().toISOString(),
        duration_sec: WORK_DURATION,
        interrupted: false,
      });
      if (saved && onSessionSaved) onSessionSaved(saved);
    }

    if (current.phase === 'work') {
      // Transition to break
      const breakState = {
        ...DEFAULT_TIMER_STATE,
        phase: 'break',
        running: true,
        remaining: BREAK_DURATION,
        sessionStart: new Date().toISOString(),
        taskLabel: current.taskLabel,
        source: current.source,
      };
      setState(breakState);
      saveToStorage(breakState);
    } else {
      // Break done — back to idle
      const idleState = { ...DEFAULT_TIMER_STATE };
      setState(idleState);
      saveToStorage(idleState);
      if (onSessionSaved) onSessionSaved(null); // trigger session list refresh
    }
  }, [onSessionSaved]);

  // ── Page Visibility — reconcile time on tab restore ───────────
  useEffect(() => {
    const onVisible = () => {
      if (document.hidden) return;
      setState(prev => {
        if (!prev.running) return prev;
        const saved = loadFromStorage();
        if (!saved?.savedAt) return prev;
        const elapsed = Math.floor((Date.now() - saved.savedAt) / 1000);
        if (elapsed <= 0) return prev;
        const newRemaining = Math.max(0, prev.remaining - elapsed);
        if (newRemaining === 0) {
          setCompletionSignal(s => s + 1);
          return { ...prev, remaining: 0, running: false };
        }
        const updated = { ...prev, remaining: newRemaining };
        saveToStorage(updated);
        return updated;
      });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // ── Actions ───────────────────────────────────────────────────

  const start = useCallback(async (taskLabel = '', source = 'manual') => {
    const session = await focusApi.createSession({
      started_at: new Date().toISOString(),
      type: 'work',
      task_label: taskLabel || null,
      source,
    });
    const newState = {
      phase: 'work',
      running: true,
      remaining: WORK_DURATION,
      sessionStart: new Date().toISOString(),
      sessionId: session?.id || null,
      taskLabel,
      source,
      savedAt: Date.now(),
    };
    setState(newState);
    saveToStorage(newState);
  }, []);

  const pause = useCallback(() => {
    setState(prev => {
      const updated = { ...prev, running: false };
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const resume = useCallback(() => {
    setState(prev => {
      const updated = { ...prev, running: true, savedAt: Date.now() };
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const stop = useCallback(async () => {
    const current = stateRef.current;
    if (current.sessionId && current.phase === 'work' && current.remaining < WORK_DURATION) {
      const elapsed = WORK_DURATION - current.remaining;
      const saved = await focusApi.updateSession(current.sessionId, {
        ended_at: new Date().toISOString(),
        duration_sec: elapsed,
        interrupted: true,
      });
      if (saved && onSessionSaved) onSessionSaved(saved);
    }
    const idleState = { ...DEFAULT_TIMER_STATE };
    setState(idleState);
    saveToStorage(idleState);
  }, [onSessionSaved]);

  const skipBreak = useCallback(() => {
    const idleState = { ...DEFAULT_TIMER_STATE };
    setState(idleState);
    saveToStorage(idleState);
  }, []);

  return { state, start, pause, resume, stop, skipBreak };
}
