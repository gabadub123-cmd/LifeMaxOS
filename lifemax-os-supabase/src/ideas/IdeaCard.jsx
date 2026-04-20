import { calcScore, scoreColor } from './scoring';
import { CATEGORIES, REVENUE_OPTIONS } from './constants';
import { daysSince } from './scoring';

export default function IdeaCard({ idea, onClick, isDragging, style: externalStyle }) {
  const score = calcScore(idea);
  const sColor = scoreColor(score);
  const cat = CATEGORIES[idea.category] || CATEGORIES.other;
  const rev = REVENUE_OPTIONS.find(r => r.key === idea.revenue_potential);
  const days = daysSince(idea.updated_at || idea.created_at);
  const daysText = days === Infinity ? '—' : days === 0 ? 'today' : `${days}d`;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.04)',
        borderRadius: 8,
        padding: '12px 14px',
        cursor: 'grab',
        transition: 'all 0.15s ease',
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? 'scale(1.02)' : 'none',
        ...externalStyle,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
        e.currentTarget.style.background = 'rgba(255,255,255,0.035)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
      }}
    >
      {/* Top row: title + score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <h4 style={{
          fontSize: '0.82rem',
          fontWeight: 600,
          lineHeight: 1.3,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {idea.title}
        </h4>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.7rem',
          fontWeight: 700,
          color: sColor,
          background: sColor + '15',
          padding: '2px 7px',
          borderRadius: 4,
          flexShrink: 0,
        }}>
          {score}
        </div>
      </div>

      {/* Bottom row: category + revenue + days */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
      }}>
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

        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.65rem',
          color: '#888',
          letterSpacing: '1px',
        }}>
          {rev ? rev.icon : '€'}
        </span>

        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.55rem',
          color: days > 14 ? '#FF5252' : '#555',
          marginLeft: 'auto',
        }}>
          {daysText}
        </span>
      </div>
    </div>
  );
}
