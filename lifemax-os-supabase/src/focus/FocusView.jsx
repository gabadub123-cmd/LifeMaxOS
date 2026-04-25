import { useState, useEffect, useCallback, useRef } from 'react';
import { ideas as ideasApi, focus as focusApi } from '../supabase';
import useTimer from './useTimer';
import FocusTimer from './FocusTimer';
import PriorityTasks from './PriorityTasks';
import SessionHistory from './SessionHistory';
import AutoTargets from './AutoTargets';

export default function FocusView({ habits, todayTargets, onUpdateTarget, todaysSchedule }) {
  const [ideas, setIdeas] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const loadedRef = useRef(false);

  // Load today's sessions
  const loadSessions = useCallback(async () => {
    const data = await focusApi.listSessionsToday();
    setSessions(data);
  }, []);

  // Load ideas (for PriorityTasks + AutoTargets)
  const loadIdeas = useCallback(async () => {
    const data = await ideasApi.list();
    setIdeas(data);
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadSessions();
    loadIdeas();
  }, [loadSessions, loadIdeas]);

  // Realtime subscriptions for sessions + ideas
  useEffect(() => {
    const unsubSessions = focusApi.subscribeSessions(() => loadSessions());
    const unsubIdeas = ideasApi.subscribeIdeas(() => loadIdeas());
    return () => {
      unsubSessions();
      unsubIdeas();
    };
  }, [loadSessions, loadIdeas]);

  // Timer hook — refresh sessions whenever a session is saved
  const { state: timerState, start, pause, resume, stop, skipBreak } = useTimer({
    onSessionSaved: () => loadSessions(),
  });

  // When user clicks a task in PriorityTasks, start a session with it
  const handleSelectTask = useCallback(async (task) => {
    if (timerState.phase !== 'idle') return; // already running — don't interrupt
    setActiveTaskId(task.id);
    await start(task.label, task.source);
  }, [timerState.phase, start]);

  // Clear active task ID when timer goes back to idle
  useEffect(() => {
    if (timerState.phase === 'idle') setActiveTaskId(null);
  }, [timerState.phase]);

  const dayOfWeek = new Date().getDay();

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: '20px 24px 32px',
      animation: 'fadeIn 0.3s ease',
    }}>
      {/* Top: AutoTargets strip */}
      <div style={{ marginBottom: 16 }}>
        <AutoTargets
          todayTargets={todayTargets}
          onUpdateTarget={onUpdateTarget}
          ideas={ideas}
          dayOfWeek={dayOfWeek}
        />
      </div>

      {/* Main: timer (left/dominant) + right panel */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <FocusTimer
            timerState={timerState}
            onStart={start}
            onPause={pause}
            onResume={resume}
            onStop={stop}
            onSkipBreak={skipBreak}
          />
        </div>

        <div style={{
          flex: '0 1 340px',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <PriorityTasks
            todayTargets={todayTargets}
            ideas={ideas}
            todaysSchedule={todaysSchedule}
            onSelectTask={handleSelectTask}
            activeTaskId={activeTaskId}
          />
          <SessionHistory sessions={sessions} />
        </div>
      </div>
    </div>
  );
}
