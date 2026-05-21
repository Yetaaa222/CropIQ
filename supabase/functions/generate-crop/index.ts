import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { cropName } = await req.json();
    if (!cropName) return new Response(JSON.stringify({ error: "cropName required" }), { status: 400, headers: corsHeaders });

    const prompt = `You are an agricultural expert specialising in Zambian farming conditions. Generate detailed agronomic data for the crop: "${cropName}". Respond with ONLY a valid JSON object, no markdown, no backticks. Schema: {"name":"lowercase short name","full_name":"full botanical or common name","category":"one of: Cereal, Legume, Root & Tuber, Vegetable, Fruit, Cash Crop, Oil Crop, Fibre Crop","short_description":"one sentence 15-20 words for a farmer app","description":"2-3 sentences on growing habits, importance in Zambia, typical uses","temp_range_min":0,"temp_range_max":0,"rainfall_min":0,"rainfall_max":0,"humidity_min":0,"humidity_max":0,"soil_type":"e.g. Well-drained loamy soils","water_needs":"e.g. Moderate (500-800mm/season)","growing_months":"e.g. Nov-Apr","common_diseases":"comma-separated 3-5 diseases or pests in Zambia","management_practices":"2-3 sentences on fertiliser, spacing, weeding for Zambia"}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.map((b: any) => b.text || "").join("").trim();
    const cleaned = text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    const crop = JSON.parse(cleaned);

    return new Response(JSON.stringify(crop), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});