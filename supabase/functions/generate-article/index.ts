import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { topic } = await req.json();
    if (!topic) return new Response(JSON.stringify({ error: "topic required" }), { status: 400, headers: corsHeaders });

    const prompt = `You are an agricultural education writer specialising in Zambian farming conditions. Generate a complete educational article for smallholder farmers about: "${topic}". Respond with ONLY a valid JSON object, no markdown, no backticks. Schema: {"title":"clear concise article title","description":"1-2 sentence summary suitable for a card preview","duration":"estimated read time e.g. 15 min read","icon":"single relevant emoji","paragraphs":[{"type":"text","content":"paragraph text"},{"type":"text","content":"paragraph text"}]} Rules: 1) Write 5-8 paragraphs of rich educational content. 2) Use simple language a Zambian smallholder farmer can understand. 3) Include practical, actionable advice specific to Zambian conditions (provinces, seasons, local crops). 4) Cover: introduction, why it matters, step-by-step guidance, common mistakes, and a summary. 5) Each paragraph should be 3-5 sentences. 6) Do NOT include image blocks, only text paragraphs.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY") ?? ""}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.error?.message || JSON.stringify(data);
      throw new Error(`Groq API error (${response.status}): ${errMsg}`);
    }

    const text = data.choices?.[0]?.message?.content || "";
    if (!text) {
      throw new Error("AI returned empty response — please try again.");
    }
    const cleaned = text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    const article = JSON.parse(cleaned);

    return new Response(JSON.stringify(article), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
