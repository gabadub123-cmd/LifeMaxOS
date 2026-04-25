// supabase/functions/suggest-targets/index.ts
// Supabase Edge Function — AI-suggested daily focus targets
// Uses Claude Haiku (cheap, fast) to personalise the day template

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { dayOfWeek, dayTemplate, activeIdeas, currentTargets } = await req.json();

    if (typeof dayOfWeek !== "number") {
      return new Response(JSON.stringify({ error: "Missing dayOfWeek" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = "adrian";
    const isLimited = await checkRateLimit(userId, "suggest-targets", 10);
    if (isLimited) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Max 10 suggestions per hour." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dayName = DAYS_FULL[dayOfWeek] || "Weekday";
    const ideasList = (activeIdeas || [])
      .slice(0, 5)
      .map((i: { title: string; stage: string }) => `- ${i.title} [${i.stage}]`)
      .join("\n") || "None";

    const templateList = (dayTemplate || [])
      .map((t: string, i: number) => `${i + 1}. ${t}`)
      .join("\n");

    const existingList = (currentTargets || [])
      .filter((t: string) => t?.trim())
      .map((t: string, i: number) => `${i + 1}. ${t}`)
      .join("\n") || "None";

    const prompt = `You are Adrian Titkov's focus assistant. Adrian is 24, Belgian, pushing for €15k/month net income in 12 months via AI services. Today is ${dayName}.

Default template targets for ${dayName}:
${templateList}

Active idea pipeline (MVP/Researching stage):
${ideasList}

Existing targets Adrian already set (if any):
${existingList}

Your job: give Adrian exactly 3 sharp, specific, actionable focus targets for today.
Rules:
- Each target must be completable in one day
- Prioritise money-generating actions above everything else
- Reference the pipeline ideas where relevant
- Be direct — no motivational fluff
- If he already has targets, you can keep them or improve them

Output ONLY valid JSON — no explanation, no markdown:
{"targets": ["target 1", "target 2", "target 3"]}`;

    if (!ANTHROPIC_API_KEY) {
      // No API key — return the template as fallback
      return new Response(JSON.stringify({ targets: (dayTemplate || []).slice(0, 3) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      // Graceful fallback to template
      return new Response(JSON.stringify({ targets: (dayTemplate || []).slice(0, 3) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ targets: (dayTemplate || []).slice(0, 3) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const targets = Array.isArray(parsed.targets) ? parsed.targets.slice(0, 3) : (dayTemplate || []).slice(0, 3);

    return new Response(JSON.stringify({ targets }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function checkRateLimit(
  userId: string,
  bucket: string,
  maxPerHour: number
): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;

  try {
    const now = new Date();
    const windowStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours()
    ).toISOString();

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_rate_limit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        p_user_id: userId,
        p_bucket: bucket,
        p_window_start: windowStart,
      }),
    });

    if (res.ok) {
      const count = await res.json();
      return count > maxPerHour;
    }

    return false;
  } catch {
    return false;
  }
}
