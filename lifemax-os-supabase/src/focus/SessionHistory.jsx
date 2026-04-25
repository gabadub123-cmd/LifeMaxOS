import { useMemo, useState } from 'react';
import { SOURCE_COLORS } from './constants';
import { WORK_DURATION, BREAK_DURATION } from './constants';
import { focus as focusApi } from '../supabase';

function formatDuration(sec) {
  if (!sec || sec <= 0) return '—';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function formatTime(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function SessionHistory({ sessions, onRefresh }) {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (id) => {
    setDeleting(id);
    await focusApi.deleteSession(id);
    if (onRefresh) onRefresh();
    setDeleting(null);
  };

  const workSessions = useMemo(
    () => (sessions || []).filter(s => s.type === 'work'),
    [sessions]
  );

  const totalWorkSec = useMemo(
    () => workSessions
      .filter(s => s.duration_sec > 0)
      .reduce((sum, s) => sum + (s.duration_sec || 0), 0),
    [workSessions]
  );

  const totalBreaks = useMemo(
    () => (sessions || []).filter(s => s.type === 'break').length,
    [sessions]
  );

  if (sessions.length === 0) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.015)',
        border: '1px solid rgba(255,255,255,0.04)',
        borderRadius: 10,
        padding: '16px',
      }}>
        <div style={sectionHeader}>TODAY'S SESSIONS</div>
        <div style={{
          color: '#333',
          fontSize: '0.75rem',
          fontFamily: "'JetBrains Mono', monospace",
          textAlign: 'center',
          padding: '16px 0',
        }}>
          No sessions yet. Start your first focus block.
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div style={sectionHeader}>TODAY'S SESSIONS</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.72rem',
          color: '#FF3D00',
          fontWeight: 700,
        }}>
          {formatDuration(totalWorkSec)} focused
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={statBox}>
          <div style={{ ...statNum, color: '#FF3D00' }}>{workSessions.length}</div>
          <div style={statLabel}>BLOCKS</div>
        </div>
        <div style={statBox}>
          <div style={{ ...statNum, color: '#76FF03' }}>{totalBreaks}</div>
          <div style={statLabel}>BREAKS</div>
        </div>
        <div style={statBox}>
          <div style={{ ...statNum, color: '#FFD600' }}>{formatDuration(totalWorkSec)}</div>
          <div style={statLabel}>TOTAL</div>
        </div>
      </div>

      {/* Timeline bar */}
      <TimelineBar sessions={sessions} />

      {/* Session list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 12 }}>
        {workSessions.map(s => {
          const color = SOURCE_COLORS[s.source] || '#FF3D00';
          const isDel = deleting === s.id;
          return (
            <div
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 10px',
                borderRadius: 5,
                background: isDel ? 'rgba(255,82,82,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isDel ? 'rgba(255,82,82,0.2)' : 'rgba(255,255,255,0.03)'}`,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.65rem',
                color: '#555',
                minWidth: 36,
                flexShrink: 0,
              }}>
                {formatTime(s.started_at)}
              </div>
              <div style={{
                flex: 1,
                fontSize: '0.78rem',
                color: '#bbb',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {s.task_label || <span style={{ color: '#444' }}>—</span>}
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.65rem',
                color: s.interrupted ? '#FF5252' : '#555',
                flexShrink: 0,
              }}>
                {formatDuration(s.duration_sec)}{s.interrupted && s.duration_sec > 0 ? ' ✕' : ''}
              </div>
              {/* Delete button */}
              <button
                onClick={() => handleDelete(s.id)}
                disabled={isDel}
                title="Delete session"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#333',
                  cursor: isDel ? 'default' : 'pointer',
                  fontSize: '0.85rem',
                  padding: '1px 4px',
                  lineHeight: 1,
                  flexShrink: 0,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => { if (!isDel) e.target.style.color = '#FF5252'; }}
                onMouseLeave={e => { if (!isDel) e.target.style.color = '#333'; }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineBar({ sessions }) {
  const DAY_START = 6 * 60;
  const DAY_END   = 22 * 60;
  const SPAN      = DAY_END - DAY_START;

  const bars = useMemo(() => {
    return (sessions || [])
      .filter(s => s.started_at && s.duration_sec > 0)
      .map(s => {
        const start = new Date(s.started_at);
        const startMin = start.getHours() * 60 + start.getMinutes();
        const endMin = startMin + Math.floor((s.duration_sec || 0) / 60);
        const left = Math.max(0, ((startMin - DAY_START) / SPAN) * 100);
        const width = Math.min(100 - left, Math.max(0.5, ((endMin - startMin) / SPAN) * 100));
        const color = s.type === 'break' ? '#76FF03' : (SOURCE_COLORS[s.source] || '#FF3D00');
        return { id: s.id, left, width, color, type: s.type };
      });
  }, [sessions]);

  return (
    <div style={{ position: 'relative', height: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 5, overflow: 'hidden' }}>
      {bars.map(b => (
        <div
          key={b.id}
          style={{
            position: 'absolute',
            left: `${b.left}%`,
            width: `${b.width}%`,
            top: b.type === 'break' ? 2 : 0,
            height: b.type === 'break' ? 6 : 10,
            background: b.color,
            borderRadius: 2,
            opacity: b.type === 'break' ? 0.5 : 0.85,
          }}
        />
      ))}
      {[8, 12, 16, 20].map(h => (
        <div key={h} style={{
          position: 'absolute',
          left: `${((h * 60 - DAY_START) / SPAN) * 100}%`,
          top: 0,
          width: 1,
          height: 10,
          background: 'rgba(255,255,255,0.1)',
        }} />
      ))}
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
  margin: 0,
};

const statBox = {
  flex: 1,
  background: 'rgba(255,255,255,0.03)',
  borderRadius: 6,
  padding: '8px 6px',
  textAlign: 'center',
};

const statNum = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '1.1rem',
  fontWeight: 700,
};

const statLabel = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '0.48rem',
  fontWeight: 600,
  letterSpacing: '1.5px',
  color: '#444',
  marginTop: 2,
};
