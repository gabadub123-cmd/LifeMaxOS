import { useState, useMemo } from 'react';
import { calcScore, scoreColor, daysSince } from './scoring';
import { CATEGORIES, STAGES, REVENUE_OPTIONS, STALE_DAYS } from './constants';

export default function ReviewView({ ideas, onUpdate, onAdd }) {
  const [killId, setKillId] = useState(null);
  const [killReason, setKillReason] = useState('');

  // Filter to stale ideas (>14 days since last activity, not killed)
  const staleIdeas = useMemo(() => {
    return ideas
      .filter(i => i.stage !== 'killed')
      .filter(i => {
        const d = daysSince(i.last_reviewed_at || i.updated_at || i.created_at);
        return d >= STALE_DAYS;
      })
      .sort((a, b) => {
        const da = daysSince(a.last_reviewed_at || a.updated_at || a.created_at);
        const db = daysSince(b.last_reviewed_at || b.updated_at || b.created_at);
        return db - da;
      });
  }, [ideas]);

  // Pipeline health
  const health = useMemo(() => {
    const activeIdeas = ideas.filter(i => i.stage !== 'killed');
    const counts = {};
    STAGES.forEach(s => counts[s.key] = 0);
    activeIdeas.forEach(i => { counts[i.stage] = (counts[i.stage] || 0) + 1; });

    // Weighted revenue potential — uses monthly_equiv from REVENUE_OPTIONS
    // One-time options get their annualised monthly equivalent
    const totalPotential = activeIdeas.reduce((sum, idea) => {
      const score = calcScore(idea);
      const revOpt = REVENUE_OPTIONS.find(r => r.key === idea.revenue_potential);
      const revVal = revOpt ? revOpt.monthly_equiv : 1750;
      return sum + (score / 100) * revVal;
    }, 0);

    // Health indicator
    let status = 'green';
    const hasMVP = counts.mvp >= 1;
    const hasLaunched = counts.launched >= 1;
    const sparkCount = counts.spark;
    const tooManyParked = sparkCount > 5 && !hasMVP && !hasLaunched;

    if (tooManyParked) status = 'red';
    else if (!hasMVP && !hasLaunched) status = 'yellow';
    else if (!hasMVP || (!hasLaunched && sparkCount > 5)) status = 'yellow';

    return { counts, totalPotential, status };
  }, [ideas]);

  const statusColors = { green: '#76FF03', yellow: '#FFD600', red: '#FF5252' };

  if (ideas.length === 0) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.65rem',
            fontWeight: 600,
            letterSpacing: '2.5px',
            color: '#FF3D00',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            Sunday Review
          </div>
          <div style={{
            fontSize: '0.85rem',
            color: '#888',
            lineHeight: 1.5,
            marginBottom: 20,
          }}>
            Nothing to review yet. The Review tab surfaces stale ideas every Sunday so nothing rots in your pipeline. Add an idea first.
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
      </div>
    );
  }

  const handleAdvance = (idea) => {
    const idx = STAGES.findIndex(s => s.key === idea.stage);
    if (idx < STAGES.length - 2) { // Don't auto-advance to killed
      const nextStage = STAGES[idx + 1].key;
      onUpdate(idea.id, {
        stage: nextStage,
        last_reviewed_at: new Date().toISOString(),
      });
    }
  };

  const handlePark = (idea) => {
    onUpdate(idea.id, {
      last_reviewed_at: new Date().toISOString(),
    });
  };

  const handleKill = () => {
    if (!killId || !killReason.trim()) return;
    const idea = ideas.find(i => i.id === killId);
    if (!idea) return;
    const note = { ts: new Date().toISOString(), text: `KILLED: ${killReason.trim()}` };
    const notes = [...(idea.notes || []), note];
    onUpdate(idea.id, { stage: 'killed', notes, last_reviewed_at: new Date().toISOString() });
    setKillId(null);
    setKillReason('');
  };

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: '0 24px 24px',
    }}>
      {/* Pipeline Health Banner */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.04)',
        borderRadius: 10,
        padding: '20px 24px',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.65rem',
            fontWeight: 600,
            letterSpacing: '2.5px',
            color: '#888',
            textTransform: 'uppercase',
          }}>
            PIPELINE HEALTH
          </span>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: statusColors[health.status],
            boxShadow: `0 0 8px ${statusColors[health.status]}40`,
          }} />
        </div>

        {/* Stage counts */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          {STAGES.filter(s => s.key !== 'killed').map(stage => (
            <div key={stage.key} style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 6,
              padding: '8px 14px',
              textAlign: 'center',
              minWidth: 80,
            }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '1.1rem',
                fontWeight: 700,
                color: '#fff',
              }}>
                {health.counts[stage.key] || 0}
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.5rem',
                fontWeight: 600,
                letterSpacing: '1.5px',
                color: '#555',
                textTransform: 'uppercase',
                marginTop: 2,
              }}>
                {stage.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.7rem',
          color: '#888',
        }}>
          Total weighted potential:{' '}
          <span style={{ color: '#fff', fontWeight: 600 }}>
            €{Math.round(health.totalPotential).toLocaleString()}/mo
          </span>
        </div>
      </div>

      {/* Stale Ideas Header */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.65rem',
        fontWeight: 600,
        letterSpacing: '2.5px',
        color: '#888',
        textTransform: 'uppercase',
        marginBottom: 12,
      }}>
        NEEDS REVIEW ({staleIdeas.length})
      </div>

      {staleIdeas.length === 0 ? (
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.03)',
          borderRadius: 8,
          padding: '32px 24px',
          textAlign: 'center',
          color: '#444',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.75rem',
        }}>
          All ideas reviewed recently. Come back in a few days.
        </div>
      ) : (
        staleIdeas.map(idea => {
          const score = calcScore(idea);
          const sColor = scoreColor(score);
          const cat = CATEGORIES[idea.category] || CATEGORIES.other;
          const stage = STAGES.find(s => s.key === idea.stage) || STAGES[0];
          const days = daysSince(idea.last_reviewed_at || idea.updated_at || idea.created_at);
          const canAdvance = STAGES.findIndex(s => s.key === idea.stage) < STAGES.length - 2;

          return (
            <div
              key={idea.id}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: 8,
                padding: '16px 18px',
                marginBottom: 8,
                animation: 'fadeIn 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{idea.title}</h4>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.55rem',
                      fontWeight: 600,
                      color: cat.color,
                      background: cat.color + '15',
                      padding: '1px 6px',
                      borderRadius: 3,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}>
                      {cat.label}
                    </span>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.55rem',
                      color: '#666',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                    }}>
                      {stage.icon} {stage.label}
                    </span>
                  </div>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.6rem',
                    color: '#FF5252',
                  }}>
                    {days} days without activity
                  </div>
                </div>

                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: sColor,
                }}>
                  {score}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                {canAdvance && (
                  <button
                    onClick={() => handleAdvance(idea)}
                    style={{
                      background: '#76FF03',
                      border: 'none',
                      color: '#000',
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '8px 18px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => e.target.style.opacity = '0.85'}
                    onMouseLeave={e => e.target.style.opacity = '1'}
                  >
                    ▲ ADVANCE
                  </button>
                )}
                <button
                  onClick={() => handlePark(idea)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: 'none',
                    color: '#ccc',
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '8px 18px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.06)'}
                >
                  ↻ PARK
                </button>
                <button
                  onClick={() => { setKillId(idea.id); setKillReason(''); }}
                  style={{
                    background: 'rgba(255,82,82,0.1)',
                    border: 'none',
                    color: '#FF5252',
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '8px 18px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.target.style.background = 'rgba(255,82,82,0.2)'}
                  onMouseLeave={e => e.target.style.background = 'rgba(255,82,82,0.1)'}
                >
                  ✕ KILL
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* Kill modal inline */}
      {killId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onClick={() => setKillId(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#111114',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              padding: '28px 24px',
              width: 400,
              maxWidth: '90vw',
              animation: 'scaleIn 0.2s ease',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Why kill it?</h3>
            <textarea
              autoFocus
              value={killReason}
              onChange={e => setKillReason(e.target.value)}
              placeholder="Capture the lesson..."
              style={{
                width: '100%',
                minHeight: 80,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6,
                color: '#fff',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '0.82rem',
                padding: '10px 12px',
                resize: 'vertical',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button
                onClick={() => setKillId(null)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: '#ccc',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  padding: '8px 18px',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleKill}
                disabled={!killReason.trim()}
                style={{
                  background: killReason.trim() ? '#FF5252' : 'rgba(255,82,82,0.3)',
                  border: 'none',
                  color: killReason.trim() ? '#000' : '#666',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '8px 18px',
                  borderRadius: 6,
                  cursor: killReason.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Kill It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
