// Ideas — Anthropic Edge Function Wrappers
import { supabase } from '../supabase';

const EDGE_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : '';

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
  };
}

/**
 * Run AI analysis on an idea. Returns streamed text via callback.
 * Falls back to a mock response if edge functions aren't deployed.
 */
export async function analyzeIdea(idea, onChunk) {
  if (!EDGE_BASE) {
    return mockAnalysis(idea, onChunk);
  }

  try {
    const res = await fetch(`${EDGE_BASE}/analyze-idea`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ idea }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      full += chunk;
      onChunk(full);
    }

    return full;
  } catch (err) {
    console.error('Analysis error:', err);
    return mockAnalysis(idea, onChunk);
  }
}

/**
 * Parse a voice transcript into structured idea fields.
 */
export async function parseVoice(transcript) {
  if (!EDGE_BASE) {
    return mockParse(transcript);
  }

  try {
    const res = await fetch(`${EDGE_BASE}/parse-voice`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ transcript }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Parse error:', err);
    return mockParse(transcript);
  }
}

// ── Mock fallback (when edge functions aren't deployed) ──

async function mockAnalysis(idea, onChunk) {
  const text = `**Cold truth**: "${idea.title}" is ${idea.fits_year_one ? 'aligned with' : 'a distraction from'} your 12-month freedom push. Revenue potential is ${idea.revenue_potential} with ${idea.effort} effort — ${idea.revenue_potential === 'massive' || idea.revenue_potential === 'high' ? 'worth investigating seriously' : 'needs to prove itself fast'}.

**Hidden risks**: (1) You might underestimate the time to first revenue. (2) Category "${idea.category}" has competitors you haven't mapped yet. (3) Your attention is already split across multiple projects. (4) Belgian market dynamics may differ from what online advice suggests.

**Leverage points**: Your AI tooling knowledge, combat sports network, and existing client base from @grapple.vision give you distribution others don't have.

**Recommended first moves**: (1) ${idea.first_step || 'Define your first step'}. (2) Talk to 3 potential customers this week. (3) Set a 2-week kill deadline — if no traction by then, park it.

**Kill criteria**: No paying customer interest within 14 days. Can't articulate the value prop in one sentence. Requires capital you don't have.

**Verdict**: ${idea.fits_year_one && (idea.revenue_potential === 'high' || idea.revenue_potential === 'massive') ? 'RESEARCH 2 WEEKS' : 'PARK FOR LATER'}

*Note: This is a mock analysis. Deploy the edge functions for real AI analysis.*`;

  // Simulate streaming
  for (let i = 0; i < text.length; i += 8) {
    await new Promise(r => setTimeout(r, 15));
    onChunk(text.slice(0, i + 8));
  }
  return text;
}

function mockParse(transcript) {
  return {
    title: transcript.split(/[.!?]/)[0]?.trim().slice(0, 60) || 'Untitled Idea',
    category: 'other',
    description: transcript,
    why_it_fits: '',
    first_step: '',
    revenue_potential: 'medium',
    effort: 'medium',
    capital_needed: 'small',
    fits_year_one: true,
  };
}
