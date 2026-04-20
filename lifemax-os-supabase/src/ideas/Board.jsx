import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import IdeaCard from './IdeaCard';
import { STAGES } from './constants';

// ── Kill Modal ──

function KillModal({ idea, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease',
    }}
      onClick={onCancel}
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
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>Kill this idea?</h3>
        <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: 16 }}>
          "{idea?.title}" — capture why so you learn from it.
        </p>
        <textarea
          autoFocus
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Why are you killing this idea?"
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
          onFocus={e => e.target.style.borderColor = 'rgba(255,61,0,0.3)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <button
            onClick={onCancel}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              color: '#ccc',
              fontFamily: "'Outfit', sans-serif",
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
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim()}
            style={{
              background: reason.trim() ? '#FF5252' : 'rgba(255,82,82,0.3)',
              border: 'none',
              color: reason.trim() ? '#000' : '#666',
              fontFamily: "'Outfit', sans-serif",
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '8px 18px',
              borderRadius: 6,
              cursor: reason.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Kill It
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sortable Card Wrapper ──

function SortableCard({ idea, onSelect }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: idea.id, data: { stage: idea.stage } });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        marginBottom: 6,
      }}
    >
      <IdeaCard idea={idea} onClick={() => onSelect(idea.id)} isDragging={isDragging} />
    </div>
  );
}

// ── Column ──

function Column({ stage, ideas, onSelect }) {
  const items = ideas.map(i => i.id);
  const { setNodeRef, isOver } = useDroppable({
    id: stage.key,
    data: { stage: stage.key },
  });

  return (
    <div style={{
      minWidth: 240,
      maxWidth: 280,
      flex: '0 0 260px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      {/* Column header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 4px 10px',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.68rem',
          fontWeight: 600,
          letterSpacing: '2.5px',
          color: stage.key === 'killed' ? '#FF5252' : '#888',
          textTransform: 'uppercase',
        }}>
          {stage.icon} {stage.label}
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.55rem',
          fontWeight: 600,
          color: '#555',
          background: 'rgba(255,255,255,0.04)',
          padding: '1px 6px',
          borderRadius: 3,
        }}>
          {ideas.length}
        </span>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '0 2px 20px',
          background: isOver ? 'rgba(255,61,0,0.04)' : 'transparent',
          borderRadius: 6,
          transition: 'background 0.15s',
        }}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {ideas.map(idea => (
            <SortableCard key={idea.id} idea={idea} onSelect={onSelect} />
          ))}
        </SortableContext>

        {ideas.length === 0 && (
          <div style={{
            padding: '20px 8px',
            textAlign: 'center',
            color: isOver ? '#FF3D00' : '#333',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.6rem',
            letterSpacing: '1px',
            borderRadius: 6,
            border: `1px dashed ${isOver ? 'rgba(255,61,0,0.4)' : 'rgba(255,255,255,0.04)'}`,
            transition: 'all 0.15s',
          }}>
            DROP HERE
          </div>
        )}
      </div>
    </div>
  );
}

// ── Board ──

export default function Board({ ideas, onSelect, onUpdate }) {
  const [activeId, setActiveId] = useState(null);
  const [killTarget, setKillTarget] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const ideasByStage = useMemo(() => {
    const map = {};
    STAGES.forEach(s => { map[s.key] = []; });
    ideas.forEach(idea => {
      if (map[idea.stage]) map[idea.stage].push(idea);
      else map.spark.push(idea);
    });
    return map;
  }, [ideas]);

  const activeIdea = activeId ? ideas.find(i => i.id === activeId) : null;

  const findStageForId = useCallback((id) => {
    const idea = ideas.find(i => i.id === id);
    return idea?.stage || 'spark';
  }, [ideas]);

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragOver = useCallback(() => {
    // Could highlight target column here
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeIdea = ideas.find(i => i.id === active.id);
    if (!activeIdea) return;

    // Determine target stage
    let targetStage = null;

    // Check if dropped over a card
    const overIdea = ideas.find(i => i.id === over.id);
    if (overIdea) {
      targetStage = overIdea.stage;
    }

    // Check if dropped over a column droppable
    if (!targetStage && over.data?.current?.stage) {
      targetStage = over.data.current.stage;
    }

    // If we still don't have a target, check over.id against stage keys
    if (!targetStage) {
      const stageMatch = STAGES.find(s => s.key === over.id);
      if (stageMatch) targetStage = stageMatch.key;
    }

    if (!targetStage || targetStage === activeIdea.stage) return;

    // Dragging to KILLED requires confirmation
    if (targetStage === 'killed') {
      setKillTarget({ idea: activeIdea, targetStage });
      return;
    }

    onUpdate(activeIdea.id, { stage: targetStage });
  }, [ideas, onUpdate]);

  const handleKillConfirm = useCallback((reason) => {
    if (!killTarget) return;
    const { idea } = killTarget;
    const note = {
      ts: new Date().toISOString(),
      text: `KILLED: ${reason}`,
    };
    const notes = [...(idea.notes || []), note];
    onUpdate(idea.id, { stage: 'killed', notes });
    setKillTarget(null);
  }, [killTarget, onUpdate]);

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div style={{
          display: 'flex',
          gap: 12,
          height: '100%',
          overflowX: 'auto',
          padding: '0 24px 16px',
        }}>
          {STAGES.map(stage => (
            <Column
              key={stage.key}
              stage={stage}
              ideas={ideasByStage[stage.key] || []}
              onSelect={onSelect}
            />
          ))}
        </div>

        <DragOverlay>
          {activeIdea ? (
            <div style={{ width: 260 }}>
              <IdeaCard idea={activeIdea} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {killTarget && (
        <KillModal
          idea={killTarget.idea}
          onConfirm={handleKillConfirm}
          onCancel={() => setKillTarget(null)}
        />
      )}
    </div>
  );
}
