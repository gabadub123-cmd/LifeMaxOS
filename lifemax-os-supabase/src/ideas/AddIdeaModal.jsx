import { useState, useCallback } from 'react';
import VoiceCapture from './VoiceCapture';
import { parseVoice } from './anthropic';
import { DEFAULT_IDEA, CATEGORIES, CATEGORY_KEYS, REVENUE_OPTIONS, EFFORT_OPTIONS, CAPITAL_OPTIONS } from './constants';
import { calcScore, scoreColor } from './scoring';

export default function AddIdeaModal({ onCreate, onClose }) {
  const [form, setForm] = useState({ ...DEFAULT_IDEA });
  const [isParsing, setIsParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleVoiceTranscript = useCallback(async (transcript) => {
    setIsParsing(true);
    try {
      const parsed = await parseVoice(transcript);
      setForm(f => ({
        ...f,
        ...parsed,
        // Keep existing values if parsed returns empty
        title: parsed.title || f.title,
        category: parsed.category || f.category,
        description: parsed.description || f.description,
      }));
    } catch (err) {
      console.error('Voice parse failed:', err);
    }
    setIsParsing(false);
  }, []);

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await onCreate(form);
    setSaving(false);
    onClose();
  };

  const score = calcScore(form);
  const sColor = scoreColor(score);
  const cat = CATEGORIES[form.category] || CATEGORIES.other;

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 6,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    fontSize: '0.82rem',
    padding: '8px 12px',
    outline: 'none',
    transition: 'border 0.2s',
  };

  const labelStyle = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.55rem',
    fontWeight: 600,
    letterSpacing: '2.5px',
    textTransform: 'uppercase',
    color: '#555',
    marginBottom: 5,
    display: 'block',
  };

  const selectStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 6,
    color: '#ccc',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.68rem',
    padding: '6px 10px',
    outline: 'none',
    cursor: 'pointer',
    flex: 1,
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0e0e12',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14,
          width: 520,
          maxWidth: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px 0',
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>New Idea</h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              color: '#888',
              width: 28, height: 28,
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '16px 24px 24px' }}>
          {/* Voice Capture */}
          <VoiceCapture onTranscript={handleVoiceTranscript} />

          {isParsing && (
            <div style={{
              textAlign: 'center',
              padding: '12px 0',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.7rem',
              color: '#FF3D00',
              animation: 'pulse 1.5s infinite',
            }}>
              Parsing transcript with AI...
            </div>
          )}

          {/* Title */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Title</label>
            <input
              type="text"
              autoFocus
              value={form.title}
              onChange={e => update('title', e.target.value)}
              placeholder="Short, punchy — e.g., AI chatbot for Belgian gyms"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'rgba(255,61,0,0.3)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
            />
          </div>

          {/* Category + Score preview */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Category</label>
              <select
                value={form.category}
                onChange={e => update('category', e.target.value)}
                style={{
                  ...selectStyle,
                  width: '100%',
                  color: cat.color,
                  background: cat.color + '10',
                  border: `1px solid ${cat.color}30`,
                }}
              >
                {CATEGORY_KEYS.map(k => (
                  <option key={k} value={k} style={{ background: '#111', color: '#fff' }}>
                    {CATEGORIES[k].label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '1.4rem',
              fontWeight: 800,
              color: sColor,
              lineHeight: 1,
              paddingBottom: 4,
            }}>
              {score}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={form.description}
              onChange={e => update('description', e.target.value)}
              placeholder="What's the idea?"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
              onFocus={e => e.target.style.borderColor = 'rgba(255,61,0,0.3)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
            />
          </div>

          {/* Why it fits */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Why It Fits</label>
            <textarea
              value={form.why_it_fits}
              onChange={e => update('why_it_fits', e.target.value)}
              placeholder="Unfair advantage..."
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
              onFocus={e => e.target.style.borderColor = 'rgba(255,61,0,0.3)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
            />
          </div>

          {/* First step */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>First Step</label>
            <input
              type="text"
              value={form.first_step}
              onChange={e => update('first_step', e.target.value)}
              placeholder="One concrete action..."
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'rgba(255,61,0,0.3)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
            />
          </div>

          {/* ROI selectors row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={labelStyle}>Revenue</label>
              <select value={form.revenue_potential} onChange={e => update('revenue_potential', e.target.value)} style={selectStyle}>
                {REVENUE_OPTIONS.map(r => (
                  <option key={r.key} value={r.key}>{r.icon} {r.label}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={labelStyle}>Effort</label>
              <select value={form.effort} onChange={e => update('effort', e.target.value)} style={selectStyle}>
                {EFFORT_OPTIONS.map(e => (
                  <option key={e.key} value={e.key}>{e.label}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={labelStyle}>Capital</label>
              <select value={form.capital_needed} onChange={e => update('capital_needed', e.target.value)} style={selectStyle}>
                {CAPITAL_OPTIONS.map(c => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Year-one toggle */}
          <button
            onClick={() => update('fits_year_one', !form.fits_year_one)}
            style={{
              background: form.fits_year_one ? 'rgba(255,61,0,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${form.fits_year_one ? 'rgba(255,61,0,0.25)' : 'rgba(255,255,255,0.06)'}`,
              color: form.fits_year_one ? '#FF3D00' : '#666',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.65rem',
              fontWeight: 600,
              letterSpacing: '1.5px',
              padding: '7px 14px',
              borderRadius: 6,
              cursor: 'pointer',
              marginBottom: 20,
              transition: 'all 0.15s',
            }}
          >
            {form.fits_year_one ? '● FITS YEAR-ONE PUSH' : '○ NOT YEAR-ONE ALIGNED'}
          </button>

          {/* Submit */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                color: '#ccc',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '0.82rem',
                fontWeight: 600,
                padding: '10px 22px',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!form.title.trim() || saving}
              id="save-idea-btn"
              style={{
                background: form.title.trim() ? '#FF3D00' : 'rgba(255,61,0,0.3)',
                border: 'none',
                color: form.title.trim() ? '#000' : '#666',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '0.82rem',
                fontWeight: 700,
                padding: '10px 28px',
                borderRadius: 8,
                cursor: form.title.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
              }}
            >
              {saving ? 'Saving...' : 'Save Idea'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
