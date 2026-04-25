import { createClient } from '@supabase/supabase-js'

// These come from Netlify environment variables (set in the Netlify UI)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const USER_ID = import.meta.env.VITE_USER_ID || 'adrian'

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

export const isConfigured = !!supabase
export const userId = USER_ID

// ──────────────────────────────────────────────────────────────────
// Dashboard storage (TODAY/WEEK/MONTH/PLAN tabs)
// Table: lifemax_data (user_id text, key text, value jsonb, updated_at timestamptz)
// Primary key: (user_id, key)
// ──────────────────────────────────────────────────────────────────

export const storage = {
  async get(key) {
    if (!supabase) return null
    const { data, error } = await supabase
      .from('lifemax_data')
      .select('value')
      .eq('user_id', USER_ID)
      .eq('key', key)
      .maybeSingle()
    if (error) {
      console.error('storage.get error:', error)
      return null
    }
    return data?.value ?? null
  },

  async set(key, value) {
    if (!supabase) return
    const { error } = await supabase
      .from('lifemax_data')
      .upsert(
        { user_id: USER_ID, key, value, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,key' }
      )
    if (error) console.error('storage.set error:', error)
  },

  async loadAll() {
    if (!supabase) return {}
    const { data, error } = await supabase
      .from('lifemax_data')
      .select('key, value')
      .eq('user_id', USER_ID)
    if (error) {
      console.error('storage.loadAll error:', error)
      return {}
    }
    return Object.fromEntries((data ?? []).map(r => [r.key, r.value]))
  },

  subscribe(onChange) {
    if (!supabase) return () => {}
    const channel = supabase
      .channel('lifemax_data_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lifemax_data', filter: `user_id=eq.${USER_ID}` },
        (payload) => {
          const row = payload.new || payload.old
          if (row?.key) onChange(row.key, payload.new?.value, payload.eventType)
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  },
}

// ──────────────────────────────────────────────────────────────────
// Ideas pipeline (IDEAS tab)
// Table: ideas (see ideas-setup.sql)
// Falls back to localStorage when Supabase isn't configured
// ──────────────────────────────────────────────────────────────────

export const ideas = {
  async list() {
    if (!supabase) return getLocalIdeas()
    const { data, error } = await supabase
      .from('ideas')
      .select('*')
      .eq('user_id', USER_ID)
      .order('updated_at', { ascending: false })
    if (error) {
      console.error('ideas.list error:', error)
      return getLocalIdeas()
    }
    return data || []
  },

  async create(idea) {
    const now = new Date().toISOString()
    const newIdea = {
      ...idea,
      user_id: USER_ID,
      created_at: now,
      updated_at: now,
      last_reviewed_at: now,
    }
    if (!supabase) return createLocalIdea(newIdea)
    const { data, error } = await supabase
      .from('ideas')
      .insert(newIdea)
      .select()
      .single()
    if (error) {
      console.error('ideas.create error:', error)
      return createLocalIdea(newIdea)
    }
    return data
  },

  async update(id, patch) {
    const updateData = { ...patch, updated_at: new Date().toISOString() }
    if (!supabase) return updateLocalIdea(id, updateData)
    const { data, error } = await supabase
      .from('ideas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    if (error) {
      console.error('ideas.update error:', error)
      return updateLocalIdea(id, updateData)
    }
    return data
  },

  async delete(id) {
    if (!supabase) return deleteLocalIdea(id)
    const { error } = await supabase
      .from('ideas')
      .delete()
      .eq('id', id)
    if (error) console.error('ideas.delete error:', error)
    else deleteLocalIdea(id)
  },

  subscribeIdeas(callback) {
    if (!supabase) return () => {}
    const channel = supabase
      .channel('ideas-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ideas',
        filter: `user_id=eq.${USER_ID}`,
      }, (payload) => callback(payload))
      .subscribe()
    return () => supabase.removeChannel(channel)
  },
}

// ──────────────────────────────────────────────────────────────────
// Focus sessions (FOCUS tab)
// Table: focus_sessions (see focus-setup.sql)
// ──────────────────────────────────────────────────────────────────

export const focus = {
  async createSession(session) {
    if (!supabase) return null
    const { data, error } = await supabase
      .from('focus_sessions')
      .insert({ ...session, user_id: USER_ID })
      .select()
      .single()
    if (error) { console.error('focus.createSession error:', error); return null }
    return data
  },

  async updateSession(id, patch) {
    if (!supabase) return null
    const { data, error } = await supabase
      .from('focus_sessions')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) { console.error('focus.updateSession error:', error); return null }
    return data
  },

  async listSessionsToday() {
    if (!supabase) return []
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { data, error } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', USER_ID)
      .gte('started_at', todayStart.toISOString())
      .order('started_at', { ascending: true })
    if (error) { console.error('focus.listSessionsToday error:', error); return [] }
    return data || []
  },

  async deleteSession(id) {
    if (!supabase) return
    const { error } = await supabase
      .from('focus_sessions')
      .delete()
      .eq('id', id)
    if (error) console.error('focus.deleteSession error:', error)
  },

  subscribeSessions(callback) {
    if (!supabase) return () => {}
    const channel = supabase
      .channel('focus-sessions-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'focus_sessions',
        filter: `user_id=eq.${USER_ID}`,
      }, (payload) => callback(payload))
      .subscribe()
    return () => supabase.removeChannel(channel)
  },
}

// ── localStorage fallback ──

function getLocalIdeas() {
  try {
    return JSON.parse(localStorage.getItem('lifemax_ideas') || '[]')
  } catch { return [] }
}

function saveLocalIdeas(list) {
  localStorage.setItem('lifemax_ideas', JSON.stringify(list))
}

function createLocalIdea(idea) {
  const all = getLocalIdeas()
  const created = { ...idea, id: crypto.randomUUID() }
  all.unshift(created)
  saveLocalIdeas(all)
  return created
}

function updateLocalIdea(id, patch) {
  const all = getLocalIdeas()
  const idx = all.findIndex(i => i.id === id)
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...patch }
    saveLocalIdeas(all)
    return all[idx]
  }
  return null
}

function deleteLocalIdea(id) {
  const all = getLocalIdeas().filter(i => i.id !== id)
  saveLocalIdeas(all)
}
