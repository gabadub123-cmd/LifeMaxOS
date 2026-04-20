// LifeMax OS — Supabase Client & Helpers
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const USER_ID = 'adrian';

// ── Existing storage helpers (placeholder for real LifeMax methods) ──

export const storage = {
  async getTodayData() { return null; },
  async saveTodayData(data) { return data; },
  async getWeekData() { return null; },
  async saveWeekData(data) { return data; },
  async getMonthData() { return null; },
  async saveMonthData(data) { return data; },
  async getPlanData() { return null; },
  async savePlanData(data) { return data; },
};

// ── Ideas Helpers ──

export const ideas = {
  async list() {
    if (!supabase) return getLocalIdeas();
    const { data, error } = await supabase
      .from('ideas')
      .select('*')
      .eq('user_id', USER_ID)
      .order('updated_at', { ascending: false });
    if (error) {
      console.error('Error fetching ideas:', error);
      return getLocalIdeas();
    }
    return data || [];
  },

  async create(idea) {
    const now = new Date().toISOString();
    const newIdea = {
      ...idea,
      user_id: USER_ID,
      created_at: now,
      updated_at: now,
      last_reviewed_at: now,
    };
    if (!supabase) return createLocalIdea(newIdea);
    const { data, error } = await supabase
      .from('ideas')
      .insert(newIdea)
      .select()
      .single();
    if (error) {
      console.error('Error creating idea:', error);
      return createLocalIdea(newIdea);
    }
    return data;
  },

  async update(id, patch) {
    const updateData = { ...patch, updated_at: new Date().toISOString() };
    if (!supabase) return updateLocalIdea(id, updateData);
    const { data, error } = await supabase
      .from('ideas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating idea:', error);
      return updateLocalIdea(id, updateData);
    }
    return data;
  },

  async delete(id) {
    if (!supabase) return deleteLocalIdea(id);
    const { error } = await supabase
      .from('ideas')
      .delete()
      .eq('id', id);
    if (error) console.error('Error deleting idea:', error);
    else deleteLocalIdea(id);
  },

  subscribeIdeas(callback) {
    if (!supabase) return () => {};
    const channel = supabase
      .channel('ideas-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ideas',
        filter: `user_id=eq.${USER_ID}`,
      }, (payload) => {
        callback(payload);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  },
};

// ── Local Storage Fallback (works without Supabase) ──

function getLocalIdeas() {
  try {
    return JSON.parse(localStorage.getItem('lifemax_ideas') || '[]');
  } catch { return []; }
}

function saveLocalIdeas(list) {
  localStorage.setItem('lifemax_ideas', JSON.stringify(list));
}

function createLocalIdea(idea) {
  const all = getLocalIdeas();
  const created = { ...idea, id: crypto.randomUUID() };
  all.unshift(created);
  saveLocalIdeas(all);
  return created;
}

function updateLocalIdea(id, patch) {
  const all = getLocalIdeas();
  const idx = all.findIndex(i => i.id === id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...patch };
    saveLocalIdeas(all);
    return all[idx];
  }
  return null;
}

function deleteLocalIdea(id) {
  const all = getLocalIdeas().filter(i => i.id !== id);
  saveLocalIdeas(all);
}
