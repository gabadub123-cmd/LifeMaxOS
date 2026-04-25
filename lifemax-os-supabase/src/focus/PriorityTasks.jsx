import { useMemo } from 'react';
import { SOURCE_COLORS, SOURCE_LABELS } from './constants';
import { calcScore } from '../ideas/scoring';
import { STALE_DAYS } from '../ideas/constants';

// Compute days since a date string
function daysSince(dateStr) {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

// Build a flat list of prioritised tasks from multiple sources
function buildTasks(todayTargets, ideas, todaysSchedule) {
  const tasks = [];

  // Source 1: TODAY targets (non-empty ones)
  (todayTargets || []).forEach((t, i) => {
    if (t?.trim()) {
      tasks.push({ id: `target-${i}`, label: t.trim(), source: 'today-targets', meta: null });
    }
  });

  // Source 2: Active ideas in MVP or Researching stage, sorted by score
  const activeIdeas = ideas
    .filter(i => i.stage === 'mvp' || i.stage === 'researching')
    .sort((a, b) => calcScore(b) - calcScore(a))
    .slice(0, 4);
  activeIdeas.forEach(idea => {
    tasks.push({
      id: `idea-${idea.id}`,
      label: idea.title,
      source: 'ideas',
      meta: `${idea.stage.toUpperCase()} · score ${calcScore(idea)}`,
    });
  });

  // Source 3: Current or upcoming BUILD schedule blocks (next 2 hours)
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const buildBlocks = (todaysSchedule || [])
    .filter(s => {
      if (!s.tag) return false;
      const buildTags = ['BUILD', 'SELL', 'WORK'];
      if (!buildTags.includes(s.tag)) return false;
      const start = s.start.split(':').reduce((h, m, i) => i === 0 ? parseInt(h) * 60 : h + parseInt(m), 0);
      const end = s.end.split(':').reduce((h, m, i) => i === 0 ? parseInt(h) * 60 : h + parseInt(m), 0);
      return end > nowMin && start <= nowMin + 120; // active or within next 2h
    })
    .slice(0, 2);
  buildBlocks.forEach(block => {
    tasks.push({
      id: `schedule-${block.start}`,
      label: block.title,
      source: 'schedule',
      meta: `${block.start} — ${block.end}`,
    });
  });

  // Source 4: Stale ideas overdue for review (not killed, >14 days)
  const stale = ideas
    .filter(i => i.stage !== 'killed' && daysSince(i.last_reviewed_at || i.updated_at) >= STALE_DAYS)
    .sort((a, b) => {
      const da = daysSince(a.last_reviewed_at || a.updated_at);
      const db = daysSince(b.last_reviewed_at || b.updated_at);
      return db - da;
    })
    .slice(0, 2);
  stale.forEach(idea => {
    tasks.push({
      id: `stale-${idea.id}`,
      label: `Review: ${idea.title}`,
      source: 'stale',
      meta: `${daysSince(idea.last_reviewed_at || idea.updated_at)}d stale`,
    });
  });

  return tasks;
}

export default function PriorityTasks({ todayTargets, ideas, todaysSchedule, onSelectTask, activeTaskId }) {
  const tasks = useMemo(
    () => buildTasks(todayTargets, ideas, todaysSchedule),
    [todayTargets, ideas, todaysSchedule]
  );

  if (tasks.length === 0) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.015)',
        border: '1px solid rgba(255,255,255,0.04)',
        borderRadius: 10,
        padding: '20px 16px',
      }}>
        <div style={sectionHeader}>PRIORITY TASKS</div>
        <div style={{ color: '#444', fontSize: '0.78rem', fontFamily: "'JetBrains Mono', monospace", padding: '12px 0' }}>
          Add today's targets or active ideas to see tasks here.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.015)',
      border: '1px solid rgba(255,255,255,0.04)',
      borderRadius: 10,
      padding: '16px',
    }}>
      <div style={sectionHeader}>PRIORITY TASKS</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {tasks.map(task => {
          const color = SOURCE_COLORS[task.source] || '#888';
          const isActive = activeTaskId === task.id;
          return (
            <div
              key={task.id}
              onClick={() => onSelectTask && onSelectTask(task)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 6,
                cursor: onSelectTask ? 'pointer' : 'default',
                background: isActive ? `${color}18` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isActive ? color + '40' : 'rgba(255,255,255,0.04)'}`,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              }}
            >
              {/* Source dot */}
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
                marginTop: 5,
                boxShadow: isActive ? `0 0 6px ${color}` : 'none',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.82rem',
                  color: isActive ? '#fff' : '#ccc',
                  fontWeight: isActive ? 600 : 400,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {task.label}
                </div>
                {task.meta && (
                  <div style={{
                    fontSize: '0.58rem',
                    color: '#555',
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: '0.5px',
                    marginTop: 2,
                  }}>
                    {task.meta}
                  </div>
                )}
              </div>
              {/* Source chip */}
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.5rem',
                fontWeight: 700,
                letterSpacing: '1px',
                color: color,
                background: color + '15',
                padding: '2px 6px',
                borderRadius: 3,
                flexShrink: 0,
                alignSelf: 'center',
              }}>
                {SOURCE_LABELS[task.source] || task.source}
              </div>
            </div>
          );
        })}
      </div>
      {onSelectTask && (
        <div style={{
          marginTop: 10,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.55rem',
          color: '#333',
          letterSpacing: '0.5px',
        }}>
          Click a task to start a focused session on it
        </div>
      )}
    </div>
  );
}

const sectionHeader = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '0.68rem',
  fontWeight: 600,
  letterSpacing: '2.5px',
  color: '#888',
  textTransform: 'uppercase',
  marginBottom: 12,
};
