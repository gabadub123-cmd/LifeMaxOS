import { useState, useEffect, useCallback, useRef } from 'react';
import { ideas as ideasApi } from '../supabase';
import Board from './Board';
import ListView from './ListView';
import ReviewView from './ReviewView';
import IdeaDrawer from './IdeaDrawer';
import AddIdeaModal from './AddIdeaModal';

const SUB_VIEWS = [
  { key: 'board',  label: 'BOARD' },
  { key: 'list',   label: 'LIST' },
  { key: 'review', label: 'REVIEW' },
];

export default function IdeasView() {
  const [subView, setSubView] = useState('board');
  const [allIdeas, setAllIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filters, setFilters] = useState({
    categories: [],
    fitsYearOne: null,
    search: '',
    minScore: 0,
  });
  const loadRef = useRef(false);

  // Load ideas
  const loadIdeas = useCallback(async () => {
    const data = await ideasApi.list();
    setAllIdeas(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loadRef.current) {
      loadRef.current = true;
      loadIdeas();
    }
    // Subscribe to realtime
    const unsub = ideasApi.subscribeIdeas(() => loadIdeas());
    return unsub;
  }, [loadIdeas]);

  // CRUD handlers
  const handleCreate = useCallback(async (idea) => {
    const created = await ideasApi.create(idea);
    if (created) setAllIdeas(prev => [created, ...prev]);
    return created;
  }, []);

  const handleUpdate = useCallback(async (id, patch) => {
    const updated = await ideasApi.update(id, patch);
    if (updated) {
      setAllIdeas(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i));
    }
    return updated;
  }, []);

  const handleDelete = useCallback(async (id) => {
    await ideasApi.delete(id);
    setAllIdeas(prev => prev.filter(i => i.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const selectedIdea = allIdeas.find(i => i.id === selectedId) || null;
  const isSunday = new Date().getDay() === 0;

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      animation: 'fadeIn 0.3s ease',
    }}>
      {/* ── Sub-view toggle + Add button ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px 12px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {SUB_VIEWS.map(sv => {
            const isActive = subView === sv.key;
            const isReviewSunday = sv.key === 'review' && isSunday;
            return (
              <button
                key={sv.key}
                id={`ideas-subview-${sv.key}`}
                onClick={() => setSubView(sv.key)}
                style={{
                  background: isActive
                    ? 'rgba(255,61,0,0.15)'
                    : isReviewSunday
                      ? 'rgba(255,109,0,0.08)'
                      : 'rgba(255,255,255,0.04)',
                  border: isActive ? '1px solid rgba(255,61,0,0.3)' : '1px solid transparent',
                  color: isActive ? '#FF3D00' : isReviewSunday ? '#FF6D00' : '#888',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  letterSpacing: '2px',
                  padding: '6px 14px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {sv.label}
              </button>
            );
          })}
        </div>

        <button
          id="add-idea-btn"
          onClick={() => setShowAddModal(true)}
          style={{
            background: '#FF3D00',
            border: 'none',
            color: '#000',
            fontFamily: "'Outfit', sans-serif",
            fontSize: '0.8rem',
            fontWeight: 700,
            padding: '8px 20px',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => e.target.style.background = '#FF5722'}
          onMouseLeave={e => e.target.style.background = '#FF3D00'}
        >
          + NEW IDEA
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <FilterBar filters={filters} setFilters={setFilters} />

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#555',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.75rem',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}>
            Loading ideas...
          </div>
        ) : (
          <>
            {subView === 'board' && (
              <Board
                ideas={applyFilters(allIdeas, filters)}
                onSelect={setSelectedId}
                onUpdate={handleUpdate}
              />
            )}
            {subView === 'list' && (
              <ListView
                ideas={applyFilters(allIdeas, filters)}
                onSelect={setSelectedId}
              />
            )}
            {subView === 'review' && (
              <ReviewView
                ideas={allIdeas}
                onUpdate={handleUpdate}
              />
            )}
          </>
        )}

        {/* ── Drawer ── */}
        {selectedIdea && (
          <IdeaDrawer
            idea={selectedIdea}
            onUpdate={(patch) => handleUpdate(selectedIdea.id, patch)}
            onDelete={() => handleDelete(selectedIdea.id)}
            onClose={() => setSelectedId(null)}
            onDuplicate={handleCreate}
          />
        )}
      </div>

      {/* ── Add Modal ── */}
      {showAddModal && (
        <AddIdeaModal
          onCreate={handleCreate}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

// ── Filter Bar Component ──

function FilterBar({ filters, setFilters }) {
  const categories = ['ai', '3d-printing', 'grappling', 'videography', 'trading', 'events', 'content', 'other'];
  const catColors = {
    ai: '#00E5FF', '3d-printing': '#B388FF', grappling: '#76FF03',
    videography: '#FF6D00', trading: '#FFD600', events: '#E91E63',
    content: '#FF3D00', other: '#78909C',
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 24px 12px',
      flexShrink: 0,
      flexWrap: 'wrap',
    }}>
      {/* Search */}
      <input
        id="ideas-search"
        type="text"
        placeholder="Search ideas..."
        value={filters.search}
        onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 6,
          color: '#fff',
          fontFamily: "'Outfit', sans-serif",
          fontSize: '0.78rem',
          padding: '6px 12px',
          width: 180,
          outline: 'none',
          transition: 'border 0.2s',
        }}
        onFocus={e => e.target.style.borderColor = 'rgba(255,61,0,0.3)'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
      />

      {/* Category chips */}
      {categories.map(cat => {
        const active = filters.categories.includes(cat);
        return (
          <button
            key={cat}
            onClick={() => setFilters(f => ({
              ...f,
              categories: active
                ? f.categories.filter(c => c !== cat)
                : [...f.categories, cat],
            }))}
            style={{
              background: active ? catColors[cat] + '22' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${active ? catColors[cat] + '55' : 'transparent'}`,
              color: active ? catColors[cat] : '#666',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.58rem',
              fontWeight: 500,
              letterSpacing: '1px',
              padding: '4px 8px',
              borderRadius: 4,
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'all 0.15s',
            }}
          >
            {cat}
          </button>
        );
      })}

      {/* Year-one toggle */}
      <button
        id="filter-year-one"
        onClick={() => setFilters(f => ({
          ...f,
          fitsYearOne: f.fitsYearOne === true ? null : true,
        }))}
        style={{
          background: filters.fitsYearOne ? 'rgba(255,61,0,0.15)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${filters.fitsYearOne ? 'rgba(255,61,0,0.3)' : 'transparent'}`,
          color: filters.fitsYearOne ? '#FF3D00' : '#666',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.58rem',
          fontWeight: 500,
          letterSpacing: '1px',
          padding: '4px 8px',
          borderRadius: 4,
          cursor: 'pointer',
          textTransform: 'uppercase',
          transition: 'all 0.15s',
        }}
      >
        Y1 ONLY
      </button>

      {/* Score slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.58rem',
          color: '#555',
          letterSpacing: '1px',
        }}>
          MIN SCORE: {filters.minScore}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={filters.minScore}
          onChange={e => setFilters(f => ({ ...f, minScore: parseInt(e.target.value) }))}
          style={{
            width: 80,
            accentColor: '#FF3D00',
          }}
        />
      </div>
    </div>
  );
}

// ── Filter Logic ──

import { calcScore } from './scoring';

function applyFilters(ideas, filters) {
  return ideas.filter(idea => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const match = (idea.title || '').toLowerCase().includes(q) ||
        (idea.description || '').toLowerCase().includes(q) ||
        (idea.tags || []).some(t => t.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (filters.categories.length > 0 && !filters.categories.includes(idea.category)) {
      return false;
    }
    if (filters.fitsYearOne === true && !idea.fits_year_one) {
      return false;
    }
    if (filters.minScore > 0 && calcScore(idea) < filters.minScore) {
      return false;
    }
    return true;
  });
}
