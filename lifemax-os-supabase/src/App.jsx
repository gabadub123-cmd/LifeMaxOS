import { useState, useEffect, useMemo, useRef } from "react";
import { storage, ideas as ideasApi, isConfigured } from "./supabase.js";
import IdeasView from "./ideas/IdeasView.jsx";
import FocusView from "./focus/FocusView.jsx";

// ========== DEFAULTS ==========
const DEFAULT_SCHEDULE = [
  { start: "06:30", end: "06:45", title: "Wake, cold water, 3 targets", tag: "LOCK-IN", color: "#FF3D00" },
  { start: "06:45", end: "07:15", title: "Mobility + physio + breath", tag: "BODY", color: "#76FF03" },
  { start: "07:15", end: "07:45", title: "Breakfast + pipeline review", tag: "FUEL", color: "#8BC34A" },
  { start: "07:45", end: "10:30", title: "DEEP WORK — Client delivery", tag: "BUILD", color: "#00E5FF" },
  { start: "10:30", end: "12:00", title: "OUTREACH — Leads + sales", tag: "SELL", color: "#FFD600" },
  { start: "12:00", end: "14:30", title: "Lunch + training", tag: "COMPETE", color: "#76FF03" },
  { start: "14:30", end: "16:30", title: "DEEP WORK — Product / learning", tag: "BUILD", color: "#00E5FF" },
  { start: "16:30", end: "17:30", title: "Discovery calls", tag: "SELL", color: "#FFD600" },
  { start: "17:30", end: "18:00", title: "Content capture", tag: "BRAND", color: "#B388FF" },
  { start: "18:00", end: "18:45", title: "Admin batch", tag: "OPS", color: "#78909C" },
  { start: "18:45", end: "20:00", title: "Family dinner", tag: "FAMILY", color: "#E91E63" },
  { start: "20:00", end: "21:00", title: "Skill sharpening", tag: "GROW", color: "#FF6D00" },
  { start: "21:00", end: "21:30", title: "Journal + plan tomorrow", tag: "LOCK-IN", color: "#FF3D00" },
  { start: "21:30", end: "22:00", title: "Wind down", tag: "REST", color: "#546E7A" },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TAG_COLORS = {
  "LOCK-IN": "#FF3D00", BODY: "#76FF03", FUEL: "#8BC34A",
  BUILD: "#00E5FF", SELL: "#FFD600", COMPETE: "#76FF03",
  BRAND: "#B388FF", OPS: "#78909C", FAMILY: "#E91E63",
  GROW: "#FF6D00", REST: "#546E7A", TRAIN: "#76FF03",
  WORK: "#00E5FF", PERSONAL: "#E91E63", OTHER: "#B388FF",
};

const DEFAULT_HABITS = [
  { id: "h1", title: "Morning mobility + physio", category: "BODY" },
  { id: "h2", title: "20 outreach messages sent", category: "SELL" },
  { id: "h3", title: "3 hours of deep work", category: "BUILD" },
  { id: "h4", title: "1 piece of content captured", category: "BRAND" },
  { id: "h5", title: "Training session", category: "COMPETE" },
  { id: "h6", title: "Journal + 3 wins", category: "LOCK-IN" },
];

const DEFAULT_WEEKLY = [
  { id: "w1", title: "New outreach messages", target: 100, current: 0 },
  { id: "w2", title: "Discovery calls booked", target: 5, current: 0 },
  { id: "w3", title: "Deals closed", target: 2, current: 0 },
  { id: "w4", title: "Training sessions", target: 5, current: 0 },
  { id: "w5", title: "Content pieces shipped", target: 5, current: 0 },
];

const DEFAULT_RECURRING = [
  { id: "r1", title: "Grappling class", dayOfWeek: 0, start: "09:30", end: "11:00", tag: "COMPETE", color: "#76FF03" },
];

const timeToMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
const dateKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

function buildDaySchedule(date, recurring, oneTime, template, habits = []) {
  const dayOfWeek = date.getDay();
  const dateStr = dateKey(date);
  const todaysRecurring = recurring.filter((e) => e.dayOfWeek === dayOfWeek).map((e) => ({ ...e, fixed: true, source: "recurring" }));
  const todaysOneTime = oneTime.filter((e) => e.date === dateStr).map((e) => ({ ...e, fixed: true, source: "one-time" }));

  // Timed habits — those with `time` and `duration_min` set, active today
  const timedHabits = (habits || [])
    .filter((h) => h.time && h.duration_min)
    .filter((h) => {
      const days = h.active_days && h.active_days.length > 0 ? h.active_days : [0, 1, 2, 3, 4, 5, 6];
      return days.includes(dayOfWeek);
    })
    .map((h) => {
      const [hh, mm] = h.time.split(":").map(Number);
      const endMin = hh * 60 + (mm || 0) + Number(h.duration_min);
      const endH = Math.floor(endMin / 60);
      const endM = endMin % 60;
      return {
        id: h.id,
        title: h.title,
        start: h.time,
        end: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
        tag: h.category,
        color: TAG_COLORS[h.category] || "#888",
        fixed: true,
        source: "habit",
      };
    });

  const fixedEvents = [...todaysRecurring, ...todaysOneTime, ...timedHabits].sort((a, b) => timeToMin(a.start) - timeToMin(b.start));
  const result = [...fixedEvents];
  template.forEach((t) => {
    const ts = timeToMin(t.start), te = timeToMin(t.end);
    const conflicts = fixedEvents.some((fe) => {
      const fs = timeToMin(fe.start), feEnd = timeToMin(fe.end);
      return !(te <= fs || ts >= feEnd);
    });
    if (!conflicts) result.push({ ...t, source: "template" });
  });
  return result.sort((a, b) => timeToMin(a.start) - timeToMin(b.start));
}

// ========== SETUP SCREEN (if env vars missing) ==========
function SetupScreen() {
  return (
    <div style={{ background: "#070709", color: "#fff", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Outfit', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 620, width: "100%", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,61,0,0.25)", borderRadius: 12, padding: 32 }}>
        <div style={{ fontSize: "0.7rem", letterSpacing: 3, color: "#FF3D00", fontFamily: "monospace", fontWeight: 800, marginBottom: 10 }}>SETUP REQUIRED</div>
        <h1 style={{ fontSize: "1.6rem", margin: "0 0 16px", fontWeight: 800 }}>Connect your Supabase database</h1>
        <p style={{ color: "#bbb", lineHeight: 1.7, fontSize: "0.95rem" }}>
          Set these environment variables in Netlify (Site settings → Environment variables):
        </p>
        <div style={{ background: "#0f0f12", padding: 16, borderRadius: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem", lineHeight: 1.8, color: "#76FF03", margin: "12px 0" }}>
          VITE_SUPABASE_URL=https://xxxxx.supabase.co<br/>
          VITE_SUPABASE_ANON_KEY=eyJhbGc...<br/>
          VITE_USER_ID=adrian
        </div>
        <p style={{ color: "#888", fontSize: "0.85rem", lineHeight: 1.6 }}>
          See the README for full setup steps. After adding vars, trigger a redeploy in Netlify.
        </p>
      </div>
    </div>
  );
}

// ========== APP ==========
export default function App() {
  if (!isConfigured) return <SetupScreen />;

  const [view, setView] = useState("today");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("connecting"); // connecting | synced | offline

  // Data state
  const [recurring, setRecurring] = useState(DEFAULT_RECURRING);
  const [oneTime, setOneTime] = useState([]);
  const [habits, setHabits] = useState(DEFAULT_HABITS);
  const [weeklyTargets, setWeeklyTargets] = useState(DEFAULT_WEEKLY);
  const [metrics, setMetrics] = useState({ revenue_mtd: 0, pipeline: 0, retainer_mrr: 0, active_clients: 0 });
  const [habitLog, setHabitLog] = useState({});
  const [journal, setJournal] = useState({});

  // Track initial load so we don't immediately write defaults back to DB
  const initialLoadDone = useRef(false);
  // Track pending saves to debounce
  const saveTimers = useRef({});
  // Track which keys we just wrote locally to avoid realtime echo
  const justWrote = useRef({});

  // Form state
  const [eventForm, setEventForm] = useState({ mode: "one-time", title: "", date: "", start: "", end: "", dayOfWeek: 0, tag: "COMPETE" });
  const [habitForm, setHabitForm] = useState({ title: "", category: "BODY", time: "", duration_min: "", active_days: [] });
  const [targetForm, setTargetForm] = useState({ title: "", target: 0 });

  // Map of key -> setter for realtime updates from other devices
  const setters = {
    recurring: setRecurring, oneTime: setOneTime, habits: setHabits,
    weeklyTargets: setWeeklyTargets, metrics: setMetrics,
    habitLog: setHabitLog, journal: setJournal,
  };

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const all = await storage.loadAll();
        if (!mounted) return;
        if (all.recurring !== undefined) setRecurring(all.recurring);
        if (all.oneTime !== undefined) setOneTime(all.oneTime);
        if (all.habits !== undefined) setHabits(all.habits);
        if (all.weeklyTargets !== undefined) setWeeklyTargets(all.weeklyTargets);
        if (all.metrics !== undefined) setMetrics(all.metrics);
        if (all.habitLog !== undefined) setHabitLog(all.habitLog);
        if (all.journal !== undefined) setJournal(all.journal);
        setSyncStatus("synced");
      } catch (e) {
        console.error(e);
        setSyncStatus("offline");
      } finally {
        initialLoadDone.current = true;
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Subscribe to realtime changes from other devices
  useEffect(() => {
    const unsub = storage.subscribe((key, value, eventType) => {
      // Skip if this is an echo of our own write
      if (justWrote.current[key] && Date.now() - justWrote.current[key] < 2000) return;
      if (eventType === "DELETE") return;
      if (setters[key] && value !== undefined) {
        setters[key](value);
      }
    });
    return unsub;
  }, []);

  // Debounced save helper
  const scheduleSave = (key, value) => {
    if (!initialLoadDone.current) return;
    clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(async () => {
      justWrote.current[key] = Date.now();
      setSyncStatus("connecting");
      await storage.set(key, value);
      setSyncStatus("synced");
    }, 400); // 400ms debounce — collapses rapid edits into one write
  };

  useEffect(() => scheduleSave("recurring", recurring), [recurring]);
  useEffect(() => scheduleSave("oneTime", oneTime), [oneTime]);
  useEffect(() => scheduleSave("habits", habits), [habits]);
  useEffect(() => scheduleSave("weeklyTargets", weeklyTargets), [weeklyTargets]);
  useEffect(() => scheduleSave("metrics", metrics), [metrics]);
  useEffect(() => scheduleSave("habitLog", habitLog), [habitLog]);
  useEffect(() => scheduleSave("journal", journal), [journal]);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Auto-rollover at midnight if viewing today
  useEffect(() => {
    const checkDay = () => {
      const now = new Date();
      if (view === "today" && dateKey(currentDate) !== dateKey(now)) {
        const wasViewingToday = dateKey(currentDate) === dateKey(new Date(currentTime));
        if (wasViewingToday) setCurrentDate(now);
      }
    };
    const timer = setInterval(checkDay, 60000);
    return () => clearInterval(timer);
  }, [currentDate, currentTime, view]);

  const todayStr = dateKey(currentDate);
  const todaysSchedule = useMemo(() => buildDaySchedule(currentDate, recurring, oneTime, DEFAULT_SCHEDULE, habits), [currentDate, recurring, oneTime, habits]);

  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const isViewingToday = dateKey(currentDate) === dateKey(new Date());
  const currentActivity = isViewingToday ? todaysSchedule.find((s) => {
    const ss = timeToMin(s.start), se = timeToMin(s.end);
    return currentMinutes >= ss && currentMinutes < se;
  }) : null;

  const toggleHabit = (habitId) => {
    setHabitLog((prev) => {
      const today = prev[todayStr] || {};
      return { ...prev, [todayStr]: { ...today, [habitId]: !today[habitId] } };
    });
  };

  const todayHabits = habitLog[todayStr] || {};
  const habitsCompleted = Object.values(todayHabits).filter(Boolean).length;

  const addEvent = () => {
    if (!eventForm.title || !eventForm.start || !eventForm.end) return;
    const color = TAG_COLORS[eventForm.tag] || "#B388FF";
    if (eventForm.mode === "recurring") {
      setRecurring((prev) => [...prev, { id: `r${Date.now()}`, title: eventForm.title, dayOfWeek: Number(eventForm.dayOfWeek), start: eventForm.start, end: eventForm.end, tag: eventForm.tag, color }]);
    } else {
      if (!eventForm.date) return;
      setOneTime((prev) => [...prev, { id: `o${Date.now()}`, title: eventForm.title, date: eventForm.date, start: eventForm.start, end: eventForm.end, tag: eventForm.tag, color }]);
    }
    setEventForm({ mode: eventForm.mode, title: "", date: "", start: "", end: "", dayOfWeek: 0, tag: "COMPETE" });
  };

  const removeRecurring = (id) => setRecurring((p) => p.filter((e) => e.id !== id));
  const removeOneTime = (id) => setOneTime((p) => p.filter((e) => e.id !== id));

  const addHabit = () => {
    if (!habitForm.title) return;
    const habit = { id: `h${Date.now()}`, title: habitForm.title, category: habitForm.category };
    if (habitForm.time && habitForm.duration_min) {
      habit.time = habitForm.time;
      habit.duration_min = parseInt(habitForm.duration_min, 10);
      if (habitForm.active_days.length > 0 && habitForm.active_days.length < 7) {
        habit.active_days = [...habitForm.active_days].sort();
      }
    }
    setHabits((p) => [...p, habit]);
    setHabitForm({ title: "", category: "BODY", time: "", duration_min: "", active_days: [] });
  };
  const toggleHabitFormDay = (d) => {
    setHabitForm((f) => {
      const next = f.active_days.includes(d) ? f.active_days.filter((x) => x !== d) : [...f.active_days, d];
      return { ...f, active_days: next };
    });
  };
  const removeHabit = (id) => setHabits((p) => p.filter((h) => h.id !== id));

  const updateTarget = (id, field, value) => {
    setWeeklyTargets((p) => p.map((t) => t.id === id ? { ...t, [field]: Number(value) } : t));
  };
  const addTarget = () => {
    if (!targetForm.title) return;
    setWeeklyTargets((p) => [...p, { id: `w${Date.now()}`, title: targetForm.title, target: Number(targetForm.target), current: 0 }]);
    setTargetForm({ title: "", target: 0 });
  };
  const removeTarget = (id) => setWeeklyTargets((p) => p.filter((t) => t.id !== id));
  const resetWeek = () => setWeeklyTargets((p) => p.map((t) => ({ ...t, current: 0 })));

  const updateJournal = (field, value) => {
    setJournal((prev) => ({ ...prev, [todayStr]: { ...(prev[todayStr] || {}), [field]: value } }));
  };
  const todayJournal = journal[todayStr] || { targets: ["", "", ""], wins: ["", "", ""], lesson: "" };

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const exportData = async () => {
    setExporting(true);
    try {
      const allIdeas = await ideasApi.list();
      const payload = {
        version: 2,
        exported: new Date().toISOString(),
        dashboard: { recurring, oneTime, habits, weeklyTargets, metrics, habitLog, journal },
        ideas: allIdeas,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lifemax-backup-${dateKey(new Date())}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed — check console.");
    }
    setExporting(false);
  };

  const importData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const d = JSON.parse(ev.target.result);

        // Support both v1 (flat) and v2 (nested) backup format
        const dash = d.version === 2 ? d.dashboard : d;
        if (dash.recurring)     setRecurring(dash.recurring);
        if (dash.oneTime)       setOneTime(dash.oneTime);
        if (dash.habits)        setHabits(dash.habits);
        if (dash.weeklyTargets) setWeeklyTargets(dash.weeklyTargets);
        if (dash.metrics)       setMetrics(dash.metrics);
        if (dash.habitLog)      setHabitLog(dash.habitLog);
        if (dash.journal)       setJournal(dash.journal);

        // Restore ideas (v2 only)
        if (d.version === 2 && Array.isArray(d.ideas) && d.ideas.length > 0) {
          let restored = 0;
          for (const idea of d.ideas) {
            try {
              // Strip the id so Supabase generates a fresh one (avoids PK conflicts)
              const { id, ...rest } = idea;
              await ideasApi.create(rest);
              restored++;
            } catch (err) {
              console.warn("Skipped idea:", idea.title, err);
            }
          }
          alert(`Imported successfully.\nDashboard data restored.\n${restored} idea${restored !== 1 ? "s" : ""} restored.`);
        } else {
          alert("Dashboard data imported successfully.");
        }
      } catch (err) {
        console.error("Import failed:", err);
        alert("Invalid backup file — could not parse JSON.");
      }
      setImporting(false);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const navigateDay = (offset) => {
    const d = new Date(currentDate); d.setDate(d.getDate() + offset); setCurrentDate(d);
  };

  const weekStart = useMemo(() => {
    const d = new Date(currentDate); d.setDate(d.getDate() - d.getDay()); return d;
  }, [currentDate]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
  }), [weekStart]);

  const monthStart = useMemo(() => {
    const d = new Date(currentDate); d.setDate(1); return d;
  }, [currentDate]);

  const monthDays = useMemo(() => {
    const firstDay = new Date(monthStart);
    const start = new Date(firstDay); start.setDate(start.getDate() - firstDay.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start); d.setDate(d.getDate() + i); return d;
    });
  }, [monthStart]);

  // Loading state
  if (loading) {
    return (
      <div style={{ background: "#070709", color: "#fff", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ color: "#FF3D00", fontFamily: "monospace", letterSpacing: 3, fontSize: "0.8rem" }}>SYNCING...</div>
      </div>
    );
  }

  // ========== RENDERERS ==========
  const renderToday = () => (
    <>
      <div style={{ padding: "24px 20px", background: "linear-gradient(135deg, rgba(255,61,0,0.08), transparent)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: "0.65rem", color: "#666", letterSpacing: 3, fontFamily: "monospace", marginBottom: 2 }}>{isViewingToday ? "TODAY" : "VIEWING"}</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: -0.5 }}>{DAYS_FULL[currentDate.getDay()]}</div>
            <div style={{ fontSize: "0.9rem", color: "#888", marginTop: 2 }}>
              {currentDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "#FF3D00", fontFamily: "'JetBrains Mono', monospace", letterSpacing: -1, lineHeight: 1 }}>
              {currentTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </div>
            {currentActivity && (
              <div style={{ marginTop: 8, padding: "6px 12px", background: `${currentActivity.color}18`, border: `1px solid ${currentActivity.color}40`, borderRadius: 20, display: "inline-block" }}>
                <div style={{ fontSize: "0.65rem", color: currentActivity.color, letterSpacing: 1.5, fontFamily: "monospace", fontWeight: 700 }}>NOW</div>
                <div style={{ fontSize: "0.85rem", color: "#fff", fontWeight: 600 }}>{currentActivity.title}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 20px 16px" }}>
        <div style={{ fontSize: "0.68rem", color: "#FF3D00", letterSpacing: 2.5, fontFamily: "monospace", fontWeight: 800, marginBottom: 12 }}>3 TARGETS</div>
        <div style={{ display: "grid", gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <input key={i} value={todayJournal.targets?.[i] || ""} onChange={(e) => {
              const targets = [...(todayJournal.targets || ["", "", ""])]; targets[i] = e.target.value; updateJournal("targets", targets);
            }} placeholder={`Target ${i + 1}...`}
              style={{ background: "rgba(255,61,0,0.05)", border: "1px solid rgba(255,61,0,0.15)", borderRadius: 8, padding: "12px 14px", color: "#fff", fontSize: "0.95rem", fontFamily: "inherit", outline: "none" }} />
          ))}
        </div>
      </div>

      <div style={{ padding: "8px 20px 20px" }}>
        <div style={{ fontSize: "0.68rem", color: "#00E5FF", letterSpacing: 2.5, fontFamily: "monospace", fontWeight: 800, marginBottom: 12 }}>SCHEDULE</div>
        {todaysSchedule.map((s, i) => {
          const ss = timeToMin(s.start), se = timeToMin(s.end);
          const isNow = isViewingToday && currentMinutes >= ss && currentMinutes < se;
          const isPast = isViewingToday && currentMinutes >= se;
          return (
            <div key={i} style={{
              display: "flex", gap: 12, padding: "10px 12px", marginBottom: 4, borderRadius: 8,
              background: isNow ? `${s.color}15` : "rgba(255,255,255,0.02)",
              border: isNow ? `1px solid ${s.color}40` : "1px solid rgba(255,255,255,0.03)",
              opacity: isPast ? 0.4 : 1, transition: "all 0.2s",
            }}>
              <div style={{ fontFamily: "monospace", fontSize: "0.78rem", color: isNow ? s.color : "#555", minWidth: 96, fontWeight: isNow ? 700 : 400 }}>
                {s.start} — {s.end}
              </div>
              <div style={{ flex: 1, fontSize: "0.88rem", color: "#ddd", textDecoration: isPast ? "line-through" : "none" }}>
                {s.title}
                {s.source === "recurring" && <span style={{ marginLeft: 8, fontSize: "0.7rem", color: "#666", fontFamily: "monospace" }}>↻</span>}
                {s.source === "one-time" && <span style={{ marginLeft: 8, fontSize: "0.7rem", color: "#666", fontFamily: "monospace" }}>◆</span>}
                {s.source === "habit" && <span style={{ marginLeft: 8, fontSize: "0.7rem", color: "#666", fontFamily: "monospace" }} title="Timed habit">●</span>}
              </div>
              <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: 1, color: s.color, background: `${s.color}18`, padding: "3px 7px", borderRadius: 3, alignSelf: "center", whiteSpace: "nowrap" }}>{s.tag}</span>
            </div>
          );
        })}
      </div>

      <div style={{ padding: "8px 20px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <div style={{ fontSize: "0.68rem", color: "#76FF03", letterSpacing: 2.5, fontFamily: "monospace", fontWeight: 800 }}>HABITS</div>
          <div style={{ fontSize: "0.78rem", color: "#76FF03", fontFamily: "monospace", fontWeight: 700 }}>{habitsCompleted}/{habits.length}</div>
        </div>
        {habits.map((h) => {
          const done = todayHabits[h.id];
          return (
            <div key={h.id} onClick={() => toggleHabit(h.id)} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 6,
              background: done ? "rgba(118,255,3,0.08)" : "rgba(255,255,255,0.02)",
              border: done ? "1px solid rgba(118,255,3,0.25)" : "1px solid rgba(255,255,255,0.03)", transition: "all 0.15s",
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                border: done ? "2px solid #76FF03" : "2px solid #333",
                background: done ? "#76FF03" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", color: "#000", fontWeight: 900,
              }}>{done && "✓"}</div>
              <span style={{ flex: 1, color: done ? "#888" : "#ddd", textDecoration: done ? "line-through" : "none", fontSize: "0.87rem" }}>{h.title}</span>
              <span style={{ fontSize: "0.6rem", color: TAG_COLORS[h.category] || "#888", fontFamily: "monospace", fontWeight: 700, letterSpacing: 1 }}>{h.category}</span>
            </div>
          );
        })}
      </div>

      <div style={{ padding: "8px 20px 24px" }}>
        <div style={{ fontSize: "0.68rem", color: "#FFD600", letterSpacing: 2.5, fontFamily: "monospace", fontWeight: 800, marginBottom: 12 }}>END OF DAY — 3 WINS</div>
        <div style={{ display: "grid", gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <input key={i} value={todayJournal.wins?.[i] || ""} onChange={(e) => {
              const wins = [...(todayJournal.wins || ["", "", ""])]; wins[i] = e.target.value; updateJournal("wins", wins);
            }} placeholder={`Win ${i + 1}...`}
              style={{ background: "rgba(255,214,0,0.04)", border: "1px solid rgba(255,214,0,0.15)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: "0.88rem", fontFamily: "inherit", outline: "none" }} />
          ))}
          <input value={todayJournal.lesson || ""} onChange={(e) => updateJournal("lesson", e.target.value)} placeholder="One lesson learned today..."
            style={{ background: "rgba(255,109,0,0.04)", border: "1px solid rgba(255,109,0,0.15)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: "0.88rem", fontFamily: "inherit", outline: "none" }} />
        </div>
      </div>
    </>
  );

  const renderWeek = () => (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }} style={btnSecondary}>← Prev</button>
        <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>Week of {weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
        <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }} style={btnSecondary}>Next →</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 20 }}>
        {weekDays.map((d, i) => {
          const events = [
            ...recurring.filter((e) => e.dayOfWeek === d.getDay()),
            ...oneTime.filter((e) => e.date === dateKey(d)),
          ].sort((a, b) => timeToMin(a.start) - timeToMin(b.start));
          const isToday = dateKey(d) === dateKey(new Date());
          return (
            <div key={i} onClick={() => { setCurrentDate(d); setView("today"); }} style={{
              background: isToday ? "rgba(255,61,0,0.08)" : "rgba(255,255,255,0.02)",
              border: isToday ? "1px solid rgba(255,61,0,0.3)" : "1px solid rgba(255,255,255,0.04)",
              borderRadius: 8, padding: 10, cursor: "pointer", minHeight: 140,
            }}>
              <div style={{ fontSize: "0.65rem", color: isToday ? "#FF3D00" : "#666", letterSpacing: 1.5, fontFamily: "monospace", fontWeight: 700 }}>{DAYS[i]}</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: isToday ? "#FF3D00" : "#fff", marginBottom: 8 }}>{d.getDate()}</div>
              <div style={{ display: "grid", gap: 3 }}>
                {events.slice(0, 4).map((e, j) => (
                  <div key={j} style={{ background: `${e.color}15`, padding: "3px 5px", borderRadius: 3, fontSize: "0.65rem", color: e.color, borderLeft: `2px solid ${e.color}`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {e.start} {e.title}
                  </div>
                ))}
                {events.length > 4 && <div style={{ fontSize: "0.65rem", color: "#666" }}>+{events.length - 4}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: "0.68rem", color: "#FFD600", letterSpacing: 2.5, fontFamily: "monospace", fontWeight: 800, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>WEEKLY TARGETS</span>
        <button onClick={resetWeek} style={{ background: "rgba(255,214,0,0.1)", border: "1px solid rgba(255,214,0,0.2)", color: "#FFD600", padding: "4px 10px", borderRadius: 4, fontSize: "0.65rem", cursor: "pointer", fontFamily: "monospace", letterSpacing: 1 }}>RESET</button>
      </div>
      {weeklyTargets.map((t) => {
        const pct = t.target > 0 ? Math.min(100, (t.current / t.target) * 100) : 0;
        return (
          <div key={t.id} style={{ marginBottom: 10, padding: 12, background: "rgba(255,255,255,0.02)", borderRadius: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#ddd" }}>{t.title}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="number" value={t.current} onChange={(e) => updateTarget(t.id, "current", e.target.value)} style={inputNum} />
                <span style={{ color: "#666", fontFamily: "monospace", fontSize: "0.8rem" }}>/</span>
                <input type="number" value={t.target} onChange={(e) => updateTarget(t.id, "target", e.target.value)} style={{ ...inputNum, color: "#888" }} />
                <button onClick={() => removeTarget(t.id)} style={btnRemove}>×</button>
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.05)", height: 4, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ background: pct >= 100 ? "#76FF03" : "#FFD600", height: "100%", width: `${pct}%`, transition: "width 0.3s" }} />
            </div>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <input value={targetForm.title} onChange={(e) => setTargetForm({ ...targetForm, title: e.target.value })} placeholder="New weekly target..." style={inputStd} />
        <input type="number" value={targetForm.target} onChange={(e) => setTargetForm({ ...targetForm, target: e.target.value })} placeholder="Target" style={{ ...inputStd, width: 80, flex: "0 0 auto", textAlign: "center" }} />
        <button onClick={addTarget} style={{ ...btnPrimary, background: "#FFD600" }}>Add</button>
      </div>
    </div>
  );

  const renderMonth = () => (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); }} style={btnSecondary}>← Prev</button>
        <div style={{ fontSize: "1.05rem", fontWeight: 800 }}>{currentDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</div>
        <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); }} style={btnSecondary}>Next →</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 6 }}>
        {DAYS.map((d) => <div key={d} style={{ textAlign: "center", fontSize: "0.7rem", color: "#666", fontFamily: "monospace", fontWeight: 700, letterSpacing: 1, padding: 4 }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {monthDays.map((d, i) => {
          const isCurrentMonth = d.getMonth() === currentDate.getMonth();
          const isToday = dateKey(d) === dateKey(new Date());
          const events = [...recurring.filter((e) => e.dayOfWeek === d.getDay()), ...oneTime.filter((e) => e.date === dateKey(d))];
          return (
            <div key={i} onClick={() => { setCurrentDate(d); setView("today"); }} style={{
              background: isToday ? "rgba(255,61,0,0.1)" : "rgba(255,255,255,0.02)",
              border: isToday ? "1px solid rgba(255,61,0,0.3)" : "1px solid rgba(255,255,255,0.03)",
              borderRadius: 5, padding: 6, minHeight: 56, cursor: "pointer", opacity: isCurrentMonth ? 1 : 0.3,
            }}>
              <div style={{ fontSize: "0.75rem", color: isToday ? "#FF3D00" : isCurrentMonth ? "#ccc" : "#666", fontWeight: isToday ? 800 : 500 }}>{d.getDate()}</div>
              <div style={{ display: "flex", gap: 2, marginTop: 3, flexWrap: "wrap" }}>
                {events.slice(0, 4).map((e, j) => <div key={j} style={{ width: 5, height: 5, borderRadius: "50%", background: e.color }} title={e.title} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderPlan = () => (
    <div style={{ padding: "20px" }}>
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: 18, marginBottom: 24 }}>
        <div style={{ fontSize: "0.68rem", color: "#00E5FF", letterSpacing: 2.5, fontFamily: "monospace", fontWeight: 800, marginBottom: 14 }}>ADD EVENT</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <button onClick={() => setEventForm({ ...eventForm, mode: "one-time" })} style={{ flex: 1, background: eventForm.mode === "one-time" ? "#00E5FF" : "rgba(255,255,255,0.05)", color: eventForm.mode === "one-time" ? "#000" : "#ccc", border: "none", padding: "8px", borderRadius: 6, cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}>One-time</button>
          <button onClick={() => setEventForm({ ...eventForm, mode: "recurring" })} style={{ flex: 1, background: eventForm.mode === "recurring" ? "#00E5FF" : "rgba(255,255,255,0.05)", color: eventForm.mode === "recurring" ? "#000" : "#ccc", border: "none", padding: "8px", borderRadius: 6, cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}>Recurring weekly</button>
        </div>
        <input value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Event title (e.g., Grappling class)" style={{ ...inputStd, width: "100%", marginBottom: 8, boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {eventForm.mode === "one-time" ? (
            <input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} style={{ ...inputStd, flex: "1 1 140px" }} />
          ) : (
            <select value={eventForm.dayOfWeek} onChange={(e) => setEventForm({ ...eventForm, dayOfWeek: e.target.value })} style={{ ...inputStd, flex: "1 1 140px" }}>
              {DAYS_FULL.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          )}
          <input type="time" value={eventForm.start} onChange={(e) => setEventForm({ ...eventForm, start: e.target.value })} style={{ ...inputStd, flex: "1 1 100px" }} />
          <input type="time" value={eventForm.end} onChange={(e) => setEventForm({ ...eventForm, end: e.target.value })} style={{ ...inputStd, flex: "1 1 100px" }} />
          <select value={eventForm.tag} onChange={(e) => setEventForm({ ...eventForm, tag: e.target.value })} style={{ ...inputStd, flex: "1 1 100px" }}>
            {Object.keys(TAG_COLORS).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <button onClick={addEvent} style={{ ...btnPrimary, width: "100%", background: "#00E5FF" }}>+ Add Event</button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: "0.68rem", color: "#76FF03", letterSpacing: 2.5, fontFamily: "monospace", fontWeight: 800, marginBottom: 10 }}>RECURRING WEEKLY ({recurring.length})</div>
        {recurring.length === 0 && <div style={{ color: "#555", fontSize: "0.85rem", padding: 12, textAlign: "center" }}>No recurring events yet.</div>}
        {recurring.map((e) => (
          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderLeft: `3px solid ${e.color}`, borderRadius: 4, marginBottom: 4 }}>
            <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#666", minWidth: 90 }}>{DAYS[e.dayOfWeek]} {e.start}-{e.end}</span>
            <span style={{ flex: 1, fontSize: "0.88rem", color: "#ddd" }}>{e.title}</span>
            <span style={{ fontSize: "0.6rem", color: e.color, fontFamily: "monospace", fontWeight: 700 }}>{e.tag}</span>
            <button onClick={() => removeRecurring(e.id)} style={btnRemove}>×</button>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: "0.68rem", color: "#FFD600", letterSpacing: 2.5, fontFamily: "monospace", fontWeight: 800, marginBottom: 10 }}>UPCOMING ({oneTime.filter((e) => e.date >= todayStr).length})</div>
        {oneTime.filter((e) => e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)).slice(0, 15).map((e) => (
          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderLeft: `3px solid ${e.color}`, borderRadius: 4, marginBottom: 4 }}>
            <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#666", minWidth: 100 }}>{e.date.substring(5)} {e.start}</span>
            <span style={{ flex: 1, fontSize: "0.88rem", color: "#ddd" }}>{e.title}</span>
            <span style={{ fontSize: "0.6rem", color: e.color, fontFamily: "monospace", fontWeight: 700 }}>{e.tag}</span>
            <button onClick={() => removeOneTime(e.id)} style={btnRemove}>×</button>
          </div>
        ))}
        {oneTime.filter((e) => e.date >= todayStr).length === 0 && <div style={{ color: "#555", fontSize: "0.85rem", padding: 12, textAlign: "center" }}>No upcoming events.</div>}
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: "0.68rem", color: "#76FF03", letterSpacing: 2.5, fontFamily: "monospace", fontWeight: 800, marginBottom: 10 }}>HABITS ({habits.length})</div>
        {habits.map((h) => {
          const hasTime = h.time && h.duration_min;
          const dayLabel = hasTime
            ? (h.active_days && h.active_days.length > 0 && h.active_days.length < 7
                ? h.active_days.map((d) => DAYS[d]).join("·")
                : "DAILY")
            : null;
          return (
            <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 4, marginBottom: 4 }}>
              {hasTime && (
                <span style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "#666", minWidth: 88 }}>
                  {h.time} · {h.duration_min}m
                </span>
              )}
              <span style={{ flex: 1, fontSize: "0.88rem", color: "#ddd" }}>{h.title}</span>
              {hasTime && (
                <span style={{ fontSize: "0.55rem", color: "#555", fontFamily: "monospace", letterSpacing: 1 }}>{dayLabel}</span>
              )}
              <span style={{ fontSize: "0.6rem", color: TAG_COLORS[h.category] || "#888", fontFamily: "monospace", fontWeight: 700 }}>{h.category}</span>
              <button onClick={() => removeHabit(h.id)} style={btnRemove}>×</button>
            </div>
          );
        })}

        <div style={{ marginTop: 12, padding: 12, background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            <input value={habitForm.title} onChange={(e) => setHabitForm({ ...habitForm, title: e.target.value })} placeholder="New habit..." style={{ ...inputStd, flex: "2 1 200px" }} />
            <select value={habitForm.category} onChange={(e) => setHabitForm({ ...habitForm, category: e.target.value })} style={{ ...inputStd, flex: "1 1 110px" }}>
              {Object.keys(TAG_COLORS).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.62rem", color: "#555", fontFamily: "monospace", letterSpacing: 1 }}>OPTIONAL TIME:</span>
            <input
              type="time"
              value={habitForm.time}
              onChange={(e) => setHabitForm({ ...habitForm, time: e.target.value })}
              style={{ ...inputStd, flex: "0 0 110px" }}
            />
            <input
              type="number"
              min={1}
              max={480}
              value={habitForm.duration_min}
              onChange={(e) => setHabitForm({ ...habitForm, duration_min: e.target.value })}
              placeholder="min"
              style={{ ...inputStd, flex: "0 0 70px", textAlign: "center" }}
            />
            <span style={{ fontSize: "0.6rem", color: "#444", fontFamily: "monospace" }}>min</span>
            <div style={{ display: "flex", gap: 3, marginLeft: "auto", flexWrap: "wrap" }}>
              {DAYS.map((d, i) => {
                const active = habitForm.active_days.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => toggleHabitFormDay(i)}
                    style={{
                      background: active ? "rgba(118,255,3,0.18)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${active ? "rgba(118,255,3,0.4)" : "rgba(255,255,255,0.06)"}`,
                      color: active ? "#76FF03" : "#666",
                      fontFamily: "monospace",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      letterSpacing: 1,
                      padding: "4px 7px",
                      borderRadius: 4,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    title={DAYS_FULL[i]}
                  >
                    {d.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ flex: 1, fontSize: "0.62rem", color: "#444", fontFamily: "monospace", letterSpacing: 0.5, alignSelf: "center" }}>
              Set time + duration to make this habit appear in TODAY's schedule. No days selected = daily.
            </div>
            <button onClick={addHabit} style={{ ...btnPrimary, background: "#76FF03" }}>+ Add</button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: "0.68rem", color: "#00E676", letterSpacing: 2.5, fontFamily: "monospace", fontWeight: 800, marginBottom: 10 }}>METRICS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
          {[
            { key: "revenue_mtd", label: "Revenue MTD", prefix: "€" },
            { key: "pipeline", label: "Pipeline", prefix: "€" },
            { key: "retainer_mrr", label: "Retainer MRR", prefix: "€" },
            { key: "active_clients", label: "Active Clients", prefix: "" },
          ].map((m) => (
            <div key={m.key} style={{ background: "rgba(0,230,118,0.04)", border: "1px solid rgba(0,230,118,0.15)", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: "0.7rem", color: "#00E676", fontFamily: "monospace", letterSpacing: 1, fontWeight: 700, marginBottom: 4 }}>{m.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ color: "#00E676", fontSize: "0.9rem" }}>{m.prefix}</span>
                <input type="number" value={metrics[m.key]} onChange={(e) => setMetrics({ ...metrics, [m.key]: Number(e.target.value) })} style={{ flex: 1, background: "transparent", border: "none", color: "#fff", fontSize: "1.1rem", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", outline: "none", width: "100%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: 14, background: "rgba(255,255,255,0.02)", borderRadius: 8, marginTop: 20 }}>
        <div style={{ fontSize: "0.68rem", color: "#888", letterSpacing: 2.5, fontFamily: "monospace", fontWeight: 700, marginBottom: 10 }}>BACKUP / RESTORE</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={exportData}
            disabled={exporting}
            style={{ ...btnSecondary, flex: 1, opacity: exporting ? 0.5 : 1 }}
          >
            {exporting ? "Exporting..." : "⬇ Export JSON"}
          </button>
          <label style={{
            ...btnSecondary, flex: 1, textAlign: "center",
            cursor: importing ? "default" : "pointer",
            opacity: importing ? 0.5 : 1,
          }}>
            {importing ? "Importing..." : "⬆ Import JSON"}
            <input type="file" accept=".json" onChange={importData} disabled={importing} style={{ display: "none" }} />
          </label>
        </div>
        <div style={{ fontSize: "0.68rem", color: "#444", marginTop: 10, lineHeight: 1.6, fontFamily: "'JetBrains Mono', monospace" }}>
          Backup includes: schedule · habits · journal · targets · metrics · all ideas + notes + AI analyses.<br/>
          Import restores everything — ideas get new IDs so duplicates won't conflict.
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background: "#070709", color: "#fff", minHeight: "100vh", fontFamily: "'Outfit', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: 4, color: "#FF3D00", fontFamily: "monospace" }}>LIFEMAX OS</div>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: syncStatus === "synced" ? "#76FF03" : syncStatus === "offline" ? "#FF3D00" : "#FFD600",
              boxShadow: syncStatus === "synced" ? "0 0 6px #76FF03" : "none",
              transition: "all 0.3s"
            }} title={syncStatus} />
          </div>
          <div style={{ fontSize: "0.7rem", color: "#444", fontFamily: "monospace", letterSpacing: 1 }}>ADRIAN · SYNCED ACROSS DEVICES</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {view === "today" && (
            <>
              <button onClick={() => navigateDay(-1)} style={{ background: "rgba(255,255,255,0.04)", border: "none", color: "#ccc", padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontSize: "0.8rem" }}>←</button>
              <button onClick={() => setCurrentDate(new Date())} style={{ background: "rgba(255,61,0,0.1)", border: "1px solid rgba(255,61,0,0.2)", color: "#FF3D00", padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontSize: "0.72rem", fontFamily: "monospace", fontWeight: 700, letterSpacing: 1 }}>TODAY</button>
              <button onClick={() => navigateDay(1)} style={{ background: "rgba(255,255,255,0.04)", border: "none", color: "#ccc", padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontSize: "0.8rem" }}>→</button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {[
          { id: "today", label: "TODAY", color: "#FF3D00" },
          { id: "focus", label: "FOCUS", color: "#FF6D00" },
          { id: "week", label: "WEEK", color: "#00E5FF" },
          { id: "month", label: "MONTH", color: "#B388FF" },
          { id: "plan", label: "PLAN", color: "#FFD600" },
          { id: "ideas", label: "IDEAS", color: "#76FF03" },
        ].map((v) => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            flex: 1, background: view === v.id ? "rgba(255,255,255,0.04)" : "transparent",
            border: "none", borderBottom: view === v.id ? `2px solid ${v.color}` : "2px solid transparent",
            color: view === v.id ? v.color : "#555", padding: "12px 10px",
            fontSize: "0.72rem", fontWeight: 800, letterSpacing: 2, cursor: "pointer",
            fontFamily: "monospace", transition: "all 0.15s",
          }}>{v.label}</button>
        ))}
      </div>

      {view === "ideas" ? (
        <div style={{ height: "calc(100vh - 130px)", maxWidth: 1400, margin: "0 auto", width: "100%" }}>
          <IdeasView />
        </div>
      ) : view === "focus" ? (
        <div style={{ height: "calc(100vh - 130px)", maxWidth: 1400, margin: "0 auto", width: "100%" }}>
          <FocusView
            habits={habits}
            todayTargets={todayJournal.targets || ["", "", ""]}
            onUpdateTarget={(i, val) => {
              const targets = [...(todayJournal.targets || ["", "", ""])];
              targets[i] = val;
              updateJournal("targets", targets);
            }}
            todaysSchedule={todaysSchedule}
          />
        </div>
      ) : (
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {view === "today" && renderToday()}
          {view === "week" && renderWeek()}
          {view === "month" && renderMonth()}
          {view === "plan" && renderPlan()}
        </div>
      )}

      <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.04)", textAlign: "center" }}>
        <p style={{ color: "#222", fontSize: "0.65rem", fontFamily: "monospace", letterSpacing: 1.5, margin: 0 }}>
          CLOUD-SYNCED · EDIT ANYWHERE · UPDATES EVERYWHERE
        </p>
      </div>
    </div>
  );
}

const btnPrimary = { border: "none", color: "#000", padding: "10px 16px", borderRadius: 6, cursor: "pointer", fontSize: "0.85rem", fontWeight: 700 };
const btnSecondary = { background: "rgba(255,255,255,0.05)", border: "none", color: "#fff", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontSize: "0.85rem" };
const btnRemove = { background: "transparent", border: "none", color: "#555", cursor: "pointer", fontSize: "1rem", padding: 4 };
const inputStd = { background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", padding: "10px 12px", borderRadius: 6, fontSize: "0.85rem", fontFamily: "inherit", outline: "none" };
const inputNum = { width: 56, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#FFD600", padding: "4px 8px", borderRadius: 4, fontSize: "0.85rem", textAlign: "center", fontFamily: "monospace" };
