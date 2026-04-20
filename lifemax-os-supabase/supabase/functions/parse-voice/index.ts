// supabase/functions/parse-voice/index.ts
// Supabase Edge Function — Parse voice transcript into structured idea fields
// Uses Anthropic Claude claude-haiku-4-5 (cheaper model for simple extraction)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

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
    const { transcript } = await req.json();
    if (!transcript || typeof transcript !== "string") {
      return new Response(JSON.stringify({ error: "Missing transcript" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = "adrian";
    const isLimited = await checkRateLimit(userId, "parse-voice", 30);
    if (isLimited) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Max 30 parses per hour." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Adrian just spoke a business idea. Extract it into structured fields.

Transcript: ${transcript}

Return ONLY valid JSON, no prose:
{
  "title": "short punchy title",
  "category": "ai|3d-printing|grappling|videography|trading|events|content|other",
  "description": "cleaned-up version of what he said",
  "why_it_fits": "if he mentioned a reason, else empty string",
  "first_step": "if he mentioned an action, else empty string",
  "revenue_potential": "low|medium|high|massive",
  "effort": "quick|medium|heavy|major",
  "capital_needed": "none|small|medium|large",
  "fits_year_one": true or false
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", errorText);
      return new Response(JSON.stringify({ error: "AI provider error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(parsed), {
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
