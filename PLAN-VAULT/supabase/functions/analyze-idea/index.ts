// supabase/functions/analyze-idea/index.ts
// Supabase Edge Function — AI analysis of business ideas
// Uses Anthropic Claude claude-sonnet-4-5 to evaluate ideas for Adrian

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
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { idea } = await req.json();
    if (!idea || !idea.title) {
      return new Response(JSON.stringify({ error: "Missing idea data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting
    const userId = "adrian";
    const isLimited = await checkRateLimit(userId, "analyze-idea", 30);
    if (isLimited) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Max 30 analyses per hour." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt
    const prompt = `You are a ruthless, founder-experienced business analyst advising Adrian Titkov, 24, based in Belgium, who is pushing for €15k/month net income within 12 months via an AI-first services business. He runs combat-sports videography (@grapple.vision), has parked 3D printers awaiting resources, is a competitive grappler (2x NAGA champion, 3rd ADCC Amateur Worlds), and has 2+ years of deep AI tooling knowledge most Belgian SMBs lack.

Evaluate this idea:

Title: ${idea.title}
Category: ${idea.category || "other"}
Description: ${idea.description || "No description provided"}
Why he thinks it fits: ${idea.why_it_fits || "Not specified"}
His first step: ${idea.first_step || "Not specified"}
Revenue potential estimate: ${idea.revenue_potential || "medium"}
Effort estimate: ${idea.effort || "medium"}
Capital needed: ${idea.capital_needed || "small"}
Fits his year-one freedom push: ${idea.fits_year_one !== false}

Give him, in prose (not bullet-worshipping):

1. **Cold truth** — is this actually good for him right now, or a distraction? Be direct.
2. **Hidden risks** — 3-5 things he hasn't thought about
3. **Leverage points** — unfair advantages he has for THIS specific idea
4. **Recommended first moves** — the 3 most important actions in order
5. **Kill criteria** — what specific signals in the next 30 days would mean "kill this"
6. **Verdict** — one of: EXECUTE NOW / RESEARCH 2 WEEKS / PARK FOR LATER / KILL IT

Be brief. Every sentence must earn its place. Don't soft-pedal.`;

    // Call Anthropic API with streaming
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250514",
        max_tokens: 1024,
        stream: true,
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

    // Stream the response back
    const readable = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                  controller.enqueue(new TextEncoder().encode(parsed.delta.text));
                }
              } catch {
                // Skip unparseable lines
              }
            }
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
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

    // Upsert rate limit counter
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

    // Fallback: just check the count
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rate_limits?user_id=eq.${userId}&bucket=eq.${bucket}&window_start=eq.${windowStart}&select=count`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (checkRes.ok) {
      const data = await checkRes.json();
      if (data.length > 0 && data[0].count >= maxPerHour) return true;
    }

    return false;
  } catch {
    // If rate limiting fails, allow the request
    return false;
  }
}
