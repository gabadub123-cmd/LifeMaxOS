import { useState, useMemo } from 'react';
import { calcScore, scoreColor, daysSince } from './scoring';
import { CATEGORIES, STAGES, REVENUE_OPTIONS, EFFORT_OPTIONS } from './constants';

const COLUMNS = [
  { key: 'title',    label: 'Title',    flex: 2 },
  { key: 'category', label: 'Category', flex: 1 },
  { key: 'stage',    label: 'Stage',    flex: 1 },
  { key: 'revenue',  label: 'Revenue',  flex: 0.8 },
  { key: 'effort',   label: 'Effort',   flex: 0.8 },
  { key: 'score',    label: 'Score',    flex: 0.6 },
  { key: 'touched',  label: 'Touched',  flex: 0.6 },
];

export default function ListView({ ideas, onSelect, totalCount = 0, onAdd }) {
  const [sortKey, setSortKey] = useState('score');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...ideas];
    arr.sort((a, b) => {
      let va, vb;
      switch (sortKey) {
        case 'title':
          va = (a.title || '').toLowerCase();
          vb = (b.title || '').toLowerCase();
          return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
        case 'category':
          va = a.category; vb = b.category;
          return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
        case 'stage':
          va = STAGES.findIndex(s => s.key === a.stage);
          vb = STAGES.findIndex(s => s.key === b.stage);
          return sortAsc ? va - vb : vb - va;
        case 'revenue':
          va = (REVENUE_OPTIONS.find(r => r.key === a.revenue_potential) || {}).value || 0;
          vb = (REVENUE_OPTIONS.find(r => r.key === b.revenue_potential) || {}).value || 0;
          return sortAsc ? va - vb : vb - va;
        case 'effort':
          va = EFFORT_OPTIONS.findIndex(e => e.key === a.effort);
          vb = EFFORT_OPTIONS.findIndex(e => e.key === b.effort);
          return sortAsc ? va - vb : vb - va;
        case 'score':
          va = calcScore(a); vb = calcScore(b);
          return sortAsc ? va - vb : vb - va;
        case 'touched':
          va = new Date(a.updated_at || a.created_at || 0).getTime();
          vb = new Date(b.updated_at || b.created_at || 0).getTime();
          return sortAsc ? va - vb : vb - va;
        default:
          return 0;
      }
    });
    return arr;
  }, [ideas, sortKey, sortAsc]);

  const handleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: '0 24px 16px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '8px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        position: 'sticky',
        top: 0,
        background: '#070709',
        zIndex: 2,
      }}>
        {COLUMNS.map(col => (
          <button
            key={col.key}
            onClick={() => handleSort(col.key)}
            style={{
              flex: col.flex,
              background: 'none',
              border: 'none',
              color: sortKey === col.key ? '#FF3D00' : '#555',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.58rem',
              fontWeight: 600,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              textAlign: 'left',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {col.label}
            {sortKey === col.key && (
              <span style={{ fontSize: '0.5rem' }}>{sortAsc ? '▲' : '▼'}</span>
            )}
          </button>
        ))}
      </div>

      {/* Rows */}
      {sorted.length === 0 ? (
        totalCount === 0 ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.6rem',
              fontWeight: 600,
              letterSpacing: '2.5px',
              color: '#FF3D00',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}>
              No ideas yet
            </div>
            <div style={{
              fontSize: '0.85rem',
              color: '#888',
              marginBottom: 20,
              maxWidth: 360,
              margin: '0 auto 20px',
              lineHeight: 1.5,
            }}>
              Capture your first idea — voice it, type it, or paste a half-formed thought. Score it, kill it, ship it.
            </div>
            {onAdd && (
              <button
                onClick={onAdd}
                style={{
                  background: '#FF3D00',
                  border: 'none',
                  color: '#000',
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '8px 20px',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                + ADD FIRST IDEA
              </button>
            )}
          </div>
        ) : (
          <div style={{
            padding: '40px 0',
            textAlign: 'center',
            color: '#555',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.7rem',
            letterSpacing: '1px',
          }}>
            No ideas match your filters.
          </div>
        )
      ) : (
        sorted.map(idea => {
          const score = calcScore(idea);
          const sColor = scoreColor(score);
          const cat = CATEGORIES[idea.category] || CATEGORIES.other;
          const stage = STAGES.find(s => s.key === idea.stage) || STAGES[0];
          const rev = REVENUE_OPTIONS.find(r => r.key === idea.revenue_potential);
          const eff = EFFORT_OPTIONS.find(e => e.key === idea.effort);
          const days = daysSince(idea.updated_at || idea.created_at);
          const daysText = days === Infinity ? '—' : days === 0 ? 'today' : `${days}d ago`;

          return (
            <div
              key={idea.id}
              onClick={() => onSelect(idea.id)}
              style={{
                display: 'flex',
                gap: 8,
                padding: '10px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.02)',
                cursor: 'pointer',
                transition: 'background 0.15s',
                alignItems: 'center',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                flex: 2,
                fontSize: '0.82rem',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {idea.title}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.55rem',
                  fontWeight: 600,
                  letterSpacing: '1px',
                  color: cat.color,
                  background: cat.color + '15',
                  padding: '2px 6px',
                  borderRadius: 3,
                  textTransform: 'uppercase',
                }}>
                  {cat.label}
                </span>
              </div>
              <div style={{
                flex: 1,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.6rem',
                color: idea.stage === 'killed' ? '#FF5252' : '#888',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}>
                {stage.icon} {stage.label}
              </div>
              <div style={{
                flex: 0.8,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.65rem',
                color: '#888',
              }}>
                {rev ? rev.icon : '€'}
              </div>
              <div style={{
                flex: 0.8,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.6rem',
                color: '#666',
              }}>
                {eff ? eff.label : '—'}
              </div>
              <div style={{
                flex: 0.6,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.72rem',
                fontWeight: 700,
                color: sColor,
              }}>
                {score}
              </div>
              <div style={{
                flex: 0.6,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.58rem',
                color: days > 14 ? '#FF5252' : '#555',
              }}>
                {daysText}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
