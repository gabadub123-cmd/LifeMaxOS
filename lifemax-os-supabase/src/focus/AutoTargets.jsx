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
      currentTargets: todayTargets || [],
    });
    setAiTargets(result); // null = fallback to template
    setAiLoading(false);
  };

  const toggleTarget = (index, text) => {
    if (!onUpdateTarget) return;
    const targets = [...(todayTargets || ['', '', ''])];
    const existingIdx = targets.indexOf(text);
    if (existingIdx !== -1) {
      // Already applied — deselect (clear that slot)
      onUpdateTarget(existingIdx, '');
    } else {
      // Apply to first empty slot, else overwrite slot at `index`
      const emptyIdx = targets.findIndex(t => !t?.trim());
      const slot = emptyIdx !== -1 ? emptyIdx : index;
      onUpdateTarget(slot, text);
    }
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={sectionHeader}>
          {template.label.toUpperCase()} TARGETS
          {aiTargets && (
            <span style={{ color: '#00E5FF', marginLeft: 8, fontSize: '0.55rem', letterSpacing: '1px' }}>✨ AI</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {EDGE_BASE && (
            <button
              onClick={handleRefreshAI}
              disabled={aiLoading}
              style={{
                background: aiLoading ? 'rgba(0,229,255,0.06)' : 'rgba(0,229,255,0.08)',
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
          {aiTargets && (
            <button
              onClick={() => setAiTargets(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#444',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.6rem',
                cursor: 'pointer',
                padding: '4px 6px',
              }}
            >
              reset
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {suggestions.map((suggestion, i) => {
          const alreadyApplied = (todayTargets || []).includes(suggestion);
          return (
            <div
              key={i}
              style={{
                flex: '1 1 200px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '10px 12px',
                background: alreadyApplied ? 'rgba(118,255,3,0.05)' : 'rgba(255,255,255,0.025)',
                border: `1px solid ${alreadyApplied ? 'rgba(118,255,3,0.2)' : 'rgba(255,255,255,0.05)'}`,
                borderRadius: 7,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onClick={() => toggleTarget(i, suggestion)}
              onMouseEnter={e => {
                e.currentTarget.style.background = alreadyApplied ? 'rgba(118,255,3,0.02)' : 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = alreadyApplied ? 'rgba(118,255,3,0.05)' : 'rgba(255,255,255,0.025)';
              }}
            >
              <div
                title={alreadyApplied ? 'Click to remove from targets' : 'Click to add to targets'}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.62rem',
                  color: alreadyApplied ? '#76FF03' : '#555',
                  marginTop: 1,
                  flexShrink: 0,
                  fontWeight: 700,
                }}
              >
                {alreadyApplied ? '✓' : `${i + 1}.`}
              </div>
              <div style={{
                fontSize: '0.8rem',
                color: alreadyApplied ? '#76FF03' : '#bbb',
                lineHeight: 1.4,
              }}>
                {suggestion}
              </div>
            </div>
          );
        })}
      </div>

      {/* Apply all */}
      {onUpdateTarget && suggestions.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button
            onClick={applyAll}
            style={{
              background: 'rgba(255,61,0,0.08)',
              border: '1px solid rgba(255,61,0,0.2)',
              color: '#FF3D00',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.6rem',
              fontWeight: 600,
              letterSpacing: '1px',
              padding: '5px 12px',
              borderRadius: 5,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(255,61,0,0.14)'}
            onMouseLeave={e => e.target.style.background = 'rgba(255,61,0,0.08)'}
          >
            APPLY ALL →
          </button>
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
};
