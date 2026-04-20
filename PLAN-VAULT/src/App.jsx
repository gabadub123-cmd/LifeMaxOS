import { useState } from 'react';
import IdeasView from './ideas/IdeasView';

const TABS = [
  { key: 'today', label: 'TODAY' },
  { key: 'week',  label: 'WEEK' },
  { key: 'month', label: 'MONTH' },
  { key: 'plan',  label: 'PLAN' },
  { key: 'ideas', label: 'IDEAS' },
];

// ── Placeholder views for existing LifeMax tabs ──

function TodayView() {
  return (
    <div style={{ padding: '40px 24px', animation: 'fadeIn 0.3s ease' }}>
      <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.6rem', fontWeight: 700, marginBottom: 8 }}>
        Today
      </h2>
      <p style={{ color: '#888', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 32 }}>
        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.03)',
        borderRadius: 8,
        padding: '32px 24px',
        textAlign: 'center',
        color: '#555',
      }}>
        <p style={{ fontSize: '0.9rem' }}>Daily focus, habits, and tasks will appear here.</p>
        <p style={{ fontSize: '0.75rem', marginTop: 8, color: '#444' }}>Connect Supabase to enable full functionality.</p>
      </div>
    </div>
  );
}

function WeekView() {
  return (
    <div style={{ padding: '40px 24px', animation: 'fadeIn 0.3s ease' }}>
      <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.6rem', fontWeight: 700, marginBottom: 8 }}>
        This Week
      </h2>
      <p style={{ color: '#888', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 32 }}>
        WEEKLY GOALS & REVIEW
      </p>
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.03)',
        borderRadius: 8,
        padding: '32px 24px',
        textAlign: 'center',
        color: '#555',
      }}>
        <p style={{ fontSize: '0.9rem' }}>Weekly objectives and progress tracking.</p>
      </div>
    </div>
  );
}

function MonthView() {
  return (
    <div style={{ padding: '40px 24px', animation: 'fadeIn 0.3s ease' }}>
      <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.6rem', fontWeight: 700, marginBottom: 8 }}>
        This Month
      </h2>
      <p style={{ color: '#888', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 32 }}>
        MONTHLY TARGETS
      </p>
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.03)',
        borderRadius: 8,
        padding: '32px 24px',
        textAlign: 'center',
        color: '#555',
      }}>
        <p style={{ fontSize: '0.9rem' }}>Monthly milestones and financial targets.</p>
      </div>
    </div>
  );
}

function PlanView() {
  return (
    <div style={{ padding: '40px 24px', animation: 'fadeIn 0.3s ease' }}>
      <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.6rem', fontWeight: 700, marginBottom: 8 }}>
        The Plan
      </h2>
      <p style={{ color: '#888', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 32 }}>
        12-MONTH FREEDOM BLUEPRINT
      </p>
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.03)',
        borderRadius: 8,
        padding: '32px 24px',
        textAlign: 'center',
        color: '#555',
      }}>
        <p style={{ fontSize: '0.9rem' }}>Strategic roadmap to €15k/month net.</p>
      </div>
    </div>
  );
}

// ── View Router ──

function ViewRouter({ tab }) {
  switch (tab) {
    case 'today': return <TodayView />;
    case 'week':  return <WeekView />;
    case 'month': return <MonthView />;
    case 'plan':  return <PlanView />;
    case 'ideas': return <IdeasView />;
    default:      return <TodayView />;
  }
}

// ── Main App ──

export default function App() {
  const [activeTab, setActiveTab] = useState('ideas');

  return (
    <div style={{
      minHeight: '100vh',
      background: '#070709',
      color: '#fff',
      fontFamily: "'Outfit', sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* ── Top Bar ── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px 0',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: 'linear-gradient(135deg, #FF3D00 0%, #FF6D00 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: 800,
            color: '#000',
          }}>
            LM
          </div>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.68rem',
            fontWeight: 600,
            letterSpacing: '2.5px',
            textTransform: 'uppercase',
            color: '#888',
          }}>
            LIFEMAX OS
          </span>
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.65rem',
          color: '#555',
          letterSpacing: '1px',
        }}>
          {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
        </div>
      </header>

      {/* ── Tab Navigation ── */}
      <nav style={{
        display: 'flex',
        gap: 4,
        padding: '12px 24px 0',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        flexShrink: 0,
        overflowX: 'auto',
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              id={`tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #FF3D00' : '2px solid transparent',
                color: isActive ? '#fff' : '#666',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.68rem',
                fontWeight: 600,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                padding: '10px 18px',
                cursor: 'pointer',
                borderRadius: '6px 6px 0 0',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.target.style.color = '#aaa';
                  e.target.style.background = 'rgba(255,255,255,0.03)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.target.style.color = '#666';
                  e.target.style.background = 'transparent';
                }
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* ── Content ── */}
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <ViewRouter tab={activeTab} />
      </main>
    </div>
  );
}
