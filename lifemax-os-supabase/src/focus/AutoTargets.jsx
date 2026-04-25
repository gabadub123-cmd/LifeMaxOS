import { useState, useMemo } from 'react';
import { DAY_TEMPLATES } from './constants';

const EDGE_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : '';

async function fetchSuggestedTargets({ dayOfWeek, dayTemplate, activeIdeas, currentTargets }) {
  if (!EDGE_BASE) return null;
  try {
    const res = await fetch(`${EDGE_BASE}/suggest-targets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
      },
      body: JSON.stringify({ dayOfWeek, dayTemplate, activeIdeas, currentTargets }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data?.targets) ? data.targets.slice(0, 3) : null;
  } catch {
    return null;
  }
}

export default function AutoTargets({ todayTargets, onUpdateTarget, ideas, dayOfWeek }) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTargets, setAiTargets] = useState(null); // null = show template, array = show AI

  const template = DAY_TEMPLATES[dayOfWeek] || DAY_TEMPLATES[1];
  const suggestions = aiTargets || template.targets;

  const targets = todayTargets || ['', '', ''];

  const activeIdeas = useMemo(
    () => (ideas || [])
      .filter(i => i.stage === 'mvp' || i.stage === 'researching' || i.stage === 'spark')
      .slice(0, 5)
      .map(i => ({ title: i.title, stage: i.stage })),
    [ideas]
  );

  const handleRefreshAI = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    const result = await fetchSuggestedTargets({
      dayOfWeek,
      dayTemplate: template.targets,
      activeIdeas,
      currentTargets: targets,
    });
    setAiTargets(result);
    setAiLoading(false);
  };

  // Click a suggestion: fill next empty slot, or do nothing if all filled
  const applySuggestion = (text) => {
    if (!onUpdateTarget) return;
    const alreadyIn = targets.includes(text);
    if (alreadyIn) {
      // Deselect — clear that slot
      const idx = targets.indexOf(text);
      onUpdateTarget(idx, '');
      return;
    }
    const emptyIdx = targets.findIndex(t => !t?.trim());
    if (emptyIdx !== -1) onUpdateTarget(emptyIdx, text);
  };

  const applyAll = () => {
    if (!onUpdateTarget) return;
    suggestions.slice(0, 3).forEach((t, i) => onUpdateTarget(i, t));
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.015)',
      border: '1px solid rgba(255,255,255,0.04)',
      borderRadius: 10,
      padding: '16px 20px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={sectionHeader}>
          3 TARGETS
          <span style={{ color: '#444', fontWeight: 400, fontSize: '0.55rem', marginLeft: 8 }}>
            — synced with TODAY
          </span>
        </div>
        {EDGE_BASE && (
          <button
            onClick={handleRefreshAI}
            disabled={aiLoading}
            style={{
              background: aiLoading ? 'rgba(0,229,255,0.04)' : 'rgba(0,229,255,0.08)',
              border: '1px solid rgba(0,229,255,0.2)',
              color: aiLoading ? '#555' : '#00E5FF',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.6rem',
              fontWeight: 600,
              letterSpacing: '1px',
              padding: '4px 10px',
              borderRadius: 5,
              cursor: aiLoading ? 'default' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {aiLoading ? '...' : '✨ SUGGEST'}
          </button>
        )}
      </div>

      {/* Editable inputs — same data as TODAY's 3 TARGETS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ position: 'relative' }}>
            <input
              type="text"
              value={targets[i] || ''}
              onChange={e => onUpdateTarget && onUpdateTarget(i, e.target.value)}
              placeholder={`Target ${i + 1}...`}
              style={{
                width: '100%',
                background: targets[i]?.trim() ? 'rgba(255,61,0,0.06)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${targets[i]?.trim() ? 'rgba(255,61,0,0.2)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 7,
                color: '#fff',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '0.88rem',
                padding: targets[i]?.trim() ? '11px 36px 11px 14px' : '11px 14px',
                outline: 'none',
                transition: 'border 0.2s, background 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={e => {
                e.target.style.borderColor = 'rgba(255,61,0,0.4)';
                e.target.style.background = 'rgba(255,61,0,0.08)';
              }}
              onBlur={e => {
                e.target.style.borderColor = targets[i]?.trim() ? 'rgba(255,61,0,0.2)' : 'rgba(255,255,255,0.07)';
                e.target.style.background = targets[i]?.trim() ? 'rgba(255,61,0,0.06)' : 'rgba(255,255,255,0.03)';
              }}
            />
            {targets[i]?.trim() && (
              <button
                onClick={() => onUpdateTarget && onUpdateTarget(i, '')}
                title="Clear target"
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#444',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  padding: '2px 4px',
                  lineHeight: 1,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.target.style.color = '#FF5252'}
                onMouseLeave={e => e.target.style.color = '#444'}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Suggestions strip */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.04)',
        paddingTop: 12,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
          gap: 8,
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.55rem',
            fontWeight: 600,
            letterSpacing: '2px',
            color: '#444',
            textTransform: 'uppercase',
          }}>
            {aiTargets ? '✨ AI suggestions' : `${template.label} suggestions`}
            {aiTargets && (
              <button
                onClick={() => setAiTargets(null)}
                style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: '0.6rem', marginLeft: 8 }}
              >
                reset
              </button>
            )}
          </div>
          <button
            onClick={applyAll}
            style={{
              background: 'rgba(255,61,0,0.08)',
              border: '1px solid rgba(255,61,0,0.2)',
              color: '#FF3D00',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.55rem',
              fontWeight: 600,
              letterSpacing: '1px',
              padding: '3px 10px',
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(255,61,0,0.14)'}
            onMouseLeave={e => e.target.style.background = 'rgba(255,61,0,0.08)'}
          >
            APPLY ALL →
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {suggestions.map((s, i) => {
            const applied = targets.includes(s);
            return (
              <button
                key={i}
                onClick={() => applySuggestion(s)}
                title={applied ? 'Click to remove' : 'Click to apply to next empty slot'}
                style={{
                  flex: '1 1 160px',
                  background: applied ? 'rgba(118,255,3,0.07)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${applied ? 'rgba(118,255,3,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  color: applied ? '#76FF03' : '#888',
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '0.75rem',
                  padding: '8px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  textAlign: 'left',
                  lineHeight: 1.35,
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 6,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = applied ? 'rgba(118,255,3,0.04)' : 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.color = applied ? '#76FF03' : '#bbb';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = applied ? 'rgba(118,255,3,0.07)' : 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.color = applied ? '#76FF03' : '#888';
                }}
              >
                <span style={{ color: applied ? '#76FF03' : '#444', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                  {applied ? '✓' : `${i + 1}.`}
                </span>
                {s}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const sectionHeader = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '0.68rem',
  fontWeight: 600,
  letterSpacing: '2.5px',
  color: '#FF3D00',
  textTransform: 'uppercase',
};
