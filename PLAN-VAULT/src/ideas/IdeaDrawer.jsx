import { useState, useRef, useCallback, useEffect } from 'react';
import { calcScore, scoreColor } from './scoring';
import {
  CATEGORIES, CATEGORY_KEYS, STAGES, REVENUE_OPTIONS,
  EFFORT_OPTIONS, CAPITAL_OPTIONS,
} from './constants';
import { analyzeIdea } from './anthropic';

export default function IdeaDrawer({ idea, onUpdate, onDelete, onClose, onDuplicate }) {
  const [editTitle, setEditTitle] = useState(idea.title);
  const [editDesc, setEditDesc] = useState(idea.description || '');
  const [editWhy, setEditWhy] = useState(idea.why_it_fits || '');
  const [editFirstStep, setEditFirstStep] = useState(idea.first_step || '');
  const [noteText, setNoteText] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [analysisText, setAnalysisText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedAnalysis, setExpandedAnalysis] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const saveTimer = useRef(null);

  // Sync state when idea changes
  useEffect(() => {
    setEditTitle(idea.title);
    setEditDesc(idea.description || '');
    setEditWhy(idea.why_it_fits || '');
    setEditFirstStep(idea.first_step || '');
  }, [idea.id]);

  const debouncedUpdate = useCallback((patch) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onUpdate(patch);
    }, 400);
  }, [onUpdate]);

  const score = calcScore(idea);
  const sColor = scoreColor(score);
  const cat = CATEGORIES[idea.category] || CATEGORIES.other;
  const analyses = idea.analyses || [];
  const notes = idea.notes || [];
  const tags = idea.tags || [];

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    const note = { ts: new Date().toISOString(), text: noteText.trim() };
    onUpdate({ notes: [...notes, note] });
    setNoteText('');
  };

  const handleAddTag = (e) => {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      const tag = tagInput.trim().replace(/,$/, '');
      if (tag && !tags.includes(tag)) {
        onUpdate({ tags: [...tags, tag] });
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    onUpdate({ tags: tags.filter(t => t !== tag) });
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisText('');
    try {
      const result = await analyzeIdea(idea, (chunk) => {
        setAnalysisText(chunk);
      });
      // Save analysis
      const entry = {
        ts: new Date().toISOString(),
        verdict: extractVerdict(result),
        content: result,
      };
      onUpdate({ analyses: [...analyses, entry] });
    } catch (err) {
      console.error('Analysis failed:', err);
    }
    setIsAnalyzing(false);
  };

  const handleDuplicate = () => {
    const dup = { ...idea };
    delete dup.id;
    delete dup.created_at;
    delete dup.updated_at;
    dup.title = `${idea.title} (copy)`;
    dup.stage = 'spark';
    dup.notes = [];
    dup.analyses = [];
    onDuplicate(dup);
  };

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 6,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    fontSize: '0.82rem',
    padding: '8px 10px',
    outline: 'none',
    resize: 'vertical',
    transition: 'border 0.2s',
  };

  const labelStyle = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.58rem',
    fontWeight: 600,
    letterSpacing: '2.5px',
    textTransform: 'uppercase',
    color: '#555',
    marginBottom: 6,
    display: 'block',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.15s ease',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 420,
        maxWidth: '100vw',
        background: '#0c0c0f',
        borderLeft: '1px solid rgba(255,255,255,0.05)',
        zIndex: 101,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
      }}>
        {/* Close button */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px 0',
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              color: '#888',
              fontSize: '0.9rem',
              width: 28, height: 28,
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.55rem',
            color: '#444',
            letterSpacing: '1px',
          }}>
            {new Date(idea.created_at).toLocaleDateString('en-GB')}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px 24px',
        }}>
          {/* ── Header: Title ── */}
          <input
            type="text"
            value={editTitle}
            onChange={e => {
              setEditTitle(e.target.value);
              debouncedUpdate({ title: e.target.value });
            }}
            style={{
              ...inputStyle,
              fontSize: '1.1rem',
              fontWeight: 700,
              background: 'transparent',
              border: '1px solid transparent',
              padding: '4px 0',
              marginBottom: 10,
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(255,61,0,0.2)'}
            onBlur={e => {
              e.target.style.borderColor = 'transparent';
              onUpdate({ title: editTitle });
            }}
          />

          {/* Category + Stage */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <select
              value={idea.category}
              onChange={e => onUpdate({ category: e.target.value })}
              style={{
                background: cat.color + '15',
                border: `1px solid ${cat.color}33`,
                color: cat.color,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.6rem',
                fontWeight: 600,
                letterSpacing: '1px',
                padding: '4px 8px',
                borderRadius: 4,
                cursor: 'pointer',
                outline: 'none',
                textTransform: 'uppercase',
              }}
            >
              {CATEGORY_KEYS.map(k => (
                <option key={k} value={k} style={{ background: '#111', color: '#fff' }}>
                  {CATEGORIES[k].label}
                </option>
              ))}
            </select>

            <select
              value={idea.stage}
              onChange={e => onUpdate({ stage: e.target.value })}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#ccc',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.6rem',
                fontWeight: 600,
                letterSpacing: '1px',
                padding: '4px 8px',
                borderRadius: 4,
                cursor: 'pointer',
                outline: 'none',
                textTransform: 'uppercase',
              }}
            >
              {STAGES.map(s => (
                <option key={s.key} value={s.key} style={{ background: '#111', color: '#fff' }}>
                  {s.icon} {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* ── ROI Score ── */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
            borderRadius: 8,
            padding: '14px 16px',
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '1.8rem',
                fontWeight: 800,
                color: sColor,
              }}>
                {score}
              </span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.58rem',
                color: '#555',
                letterSpacing: '2px',
              }}>
                ROI SCORE
              </span>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {/* Revenue chip */}
              <select
                value={idea.revenue_potential}
                onChange={e => onUpdate({ revenue_potential: e.target.value })}
                style={chipSelectStyle}
              >
                {REVENUE_OPTIONS.map(r => (
                  <option key={r.key} value={r.key} style={{ background: '#111', color: '#fff' }}>
                    {r.icon} {r.label}
                  </option>
                ))}
              </select>

              {/* Effort chip */}
              <select
                value={idea.effort}
                onChange={e => onUpdate({ effort: e.target.value })}
                style={chipSelectStyle}
              >
                {EFFORT_OPTIONS.map(e => (
                  <option key={e.key} value={e.key} style={{ background: '#111', color: '#fff' }}>
                    {e.label}
                  </option>
                ))}
              </select>

              {/* Capital chip */}
              <select
                value={idea.capital_needed}
                onChange={e => onUpdate({ capital_needed: e.target.value })}
                style={chipSelectStyle}
              >
                {CAPITAL_OPTIONS.map(c => (
                  <option key={c.key} value={c.key} style={{ background: '#111', color: '#fff' }}>
                    {c.label}
                  </option>
                ))}
              </select>

              {/* Year-one toggle */}
              <button
                onClick={() => onUpdate({ fits_year_one: !idea.fits_year_one })}
                style={{
                  ...chipSelectStyle,
                  cursor: 'pointer',
                  background: idea.fits_year_one ? 'rgba(255,61,0,0.15)' : 'rgba(255,255,255,0.04)',
                  color: idea.fits_year_one ? '#FF3D00' : '#555',
                  border: `1px solid ${idea.fits_year_one ? 'rgba(255,61,0,0.3)' : 'rgba(255,255,255,0.05)'}`,
                }}
              >
                {idea.fits_year_one ? '● Y1' : '○ Y1'}
              </button>
            </div>
          </div>

          {/* ── Description ── */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={editDesc}
              onChange={e => {
                setEditDesc(e.target.value);
                debouncedUpdate({ description: e.target.value });
              }}
              onBlur={() => onUpdate({ description: editDesc })}
              placeholder="Describe the idea..."
              rows={3}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'rgba(255,61,0,0.2)'}
            />
          </div>

          {/* ── Why it fits ── */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Why It Fits Adrian</label>
            <textarea
              value={editWhy}
              onChange={e => {
                setEditWhy(e.target.value);
                debouncedUpdate({ why_it_fits: e.target.value });
              }}
              onBlur={() => onUpdate({ why_it_fits: editWhy })}
              placeholder="Unfair advantage for this idea..."
              rows={2}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'rgba(255,61,0,0.2)'}
            />
          </div>

          {/* ── First Step ── */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>First Step</label>
            <input
              type="text"
              value={editFirstStep}
              onChange={e => {
                setEditFirstStep(e.target.value);
                debouncedUpdate({ first_step: e.target.value });
              }}
              onBlur={() => onUpdate({ first_step: editFirstStep })}
              placeholder="One concrete action..."
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'rgba(255,61,0,0.2)'}
            />
          </div>

          {/* ── Tags ── */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Tags</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {tags.map(tag => (
                <span key={tag} style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.6rem',
                  color: '#ccc',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '3px 8px',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  {tag}
                  <span
                    onClick={() => handleRemoveTag(tag)}
                    style={{ cursor: 'pointer', color: '#666', fontSize: '0.7rem' }}
                  >
                    ✕
                  </span>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Add tag (comma to add)..."
              style={{ ...inputStyle, fontSize: '0.75rem' }}
              onFocus={e => e.target.style.borderColor = 'rgba(255,61,0,0.2)'}
            />
          </div>

          {/* ── Notes Timeline ── */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Notes</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Quick note..."
                rows={2}
                style={{ ...inputStyle, flex: 1 }}
                onFocus={e => e.target.style.borderColor = 'rgba(255,61,0,0.2)'}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddNote();
                  }
                }}
              />
            </div>
            <button
              onClick={handleAddNote}
              disabled={!noteText.trim()}
              style={{
                background: noteText.trim() ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                border: 'none',
                color: noteText.trim() ? '#ccc' : '#444',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '6px 14px',
                borderRadius: 5,
                cursor: noteText.trim() ? 'pointer' : 'default',
                marginBottom: 10,
              }}
            >
              Add Note
            </button>
            {/* Notes list (reverse chronological) */}
            {[...notes].reverse().map((note, i) => (
              <div key={i} style={{
                padding: '8px 10px',
                borderLeft: '2px solid rgba(255,255,255,0.06)',
                marginBottom: 6,
              }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.5rem',
                  color: '#444',
                  marginBottom: 3,
                }}>
                  {new Date(note.ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#ccc', lineHeight: 1.4 }}>
                  {note.text}
                </div>
              </div>
            ))}
          </div>

          {/* ── Analyses ── */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>AI Analyses</label>
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              id="run-analysis-btn"
              style={{
                background: isAnalyzing ? 'rgba(255,61,0,0.1)' : '#FF3D00',
                border: 'none',
                color: isAnalyzing ? '#FF3D00' : '#000',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '8px 18px',
                borderRadius: 6,
                cursor: isAnalyzing ? 'default' : 'pointer',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                animation: isAnalyzing ? 'pulse 1.5s infinite' : 'none',
              }}
            >
              {isAnalyzing ? '↻ Analyzing...' : '🗲 Run Analysis'}
            </button>

            {/* Live analysis stream */}
            {isAnalyzing && analysisText && (
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: 6,
                padding: '12px 14px',
                marginBottom: 10,
                fontSize: '0.78rem',
                color: '#ccc',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}>
                {analysisText}
              </div>
            )}

            {/* Past analyses */}
            {[...analyses].reverse().map((a, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.03)',
                borderRadius: 6,
                marginBottom: 6,
                overflow: 'hidden',
              }}>
                <button
                  onClick={() => setExpandedAnalysis(expandedAnalysis === i ? null : i)}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    color: '#ccc',
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '0.75rem',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      color: a.verdict?.includes('EXECUTE') ? '#76FF03'
                        : a.verdict?.includes('KILL') ? '#FF5252'
                        : '#FFD600',
                      marginRight: 8,
                    }}>
                      {a.verdict || 'ANALYSIS'}
                    </span>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.5rem',
                      color: '#444',
                    }}>
                      {new Date(a.ts).toLocaleDateString('en-GB')}
                    </span>
                  </span>
                  <span style={{ color: '#555', fontSize: '0.65rem' }}>
                    {expandedAnalysis === i ? '▼' : '▶'}
                  </span>
                </button>
                {expandedAnalysis === i && (
                  <div style={{
                    padding: '0 12px 12px',
                    fontSize: '0.78rem',
                    color: '#aaa',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {a.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer Bar ── */}
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '12px 20px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          flexShrink: 0,
        }}>
          <button
            onClick={handleDuplicate}
            style={footerBtn}
          >
            Duplicate
          </button>
          <button
            onClick={() => onUpdate({ stage: 'killed' })}
            style={{ ...footerBtn, color: '#FF5252' }}
          >
            Archive
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{ ...footerBtn, color: '#FF5252', marginLeft: 'auto' }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: '#111114',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            padding: '24px',
            width: 340,
            animation: 'scaleIn 0.2s ease',
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>Delete permanently?</h3>
            <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: 16 }}>
              This cannot be undone. Consider archiving instead.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={footerBtn}>Cancel</button>
              <button
                onClick={() => { setShowDeleteConfirm(false); onDelete(); }}
                style={{ ...footerBtn, background: '#FF5252', color: '#000', fontWeight: 700 }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Styles
const chipSelectStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.05)',
  color: '#ccc',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '0.58rem',
  fontWeight: 500,
  padding: '4px 8px',
  borderRadius: 4,
  outline: 'none',
  cursor: 'pointer',
};

const footerBtn = {
  background: 'rgba(255,255,255,0.05)',
  border: 'none',
  color: '#888',
  fontFamily: "'Outfit', sans-serif",
  fontSize: '0.72rem',
  fontWeight: 600,
  padding: '7px 14px',
  borderRadius: 6,
  cursor: 'pointer',
};

function extractVerdict(text) {
  const match = text.match(/Verdict[^:]*:\s*(.+?)(\n|$)/i);
  if (match) {
    const v = match[1].trim().replace(/\*+/g, '');
    if (v.includes('EXECUTE')) return 'EXECUTE NOW';
    if (v.includes('RESEARCH')) return 'RESEARCH 2 WEEKS';
    if (v.includes('PARK')) return 'PARK FOR LATER';
    if (v.includes('KILL')) return 'KILL IT';
    return v.slice(0, 30);
  }
  return 'ANALYZED';
}
