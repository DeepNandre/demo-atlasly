import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { siteRequestId, style, prompt, imageBase64 } = await req.json();

    console.log("🎨 Generating visualization:", { siteRequestId, style });

    if (!siteRequestId || !style || !imageBase64) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY not configured");
    }

    // Build style-specific prompt
    const stylePrompts: Record<string, string> = {
      "modern-minimal": "Clean, minimal modern architecture with simple forms, white surfaces, and large glass windows. Photorealistic daytime lighting.",
      "atmospheric-realism": "Atmospheric architectural render with moody lighting, realistic materials, subtle fog or haze, cinematic composition.",
      "brutalist": "Brutalist concrete architecture with bold geometric forms, raw exposed concrete, dramatic shadows, monumental scale.",
      "timber-warm": "Warm timber architecture with natural wood textures, organic materials, soft natural lighting, cozy atmosphere.",
      "night": "Night-time architectural visualization with dramatic artificial lighting, glowing windows, ambient street lights, dark moody sky.",
      "foggy": "Foggy atmospheric render with mist and soft diffused light, mysterious ambiance, reduced visibility, dreamlike quality.",
    };

    const styleDescription = stylePrompts[style] || "Architectural visualization with high-quality rendering";
    const fullPrompt = `Transform this architectural sketch or massing model into a ${styleDescription}. ${prompt || ""} 
    
IMPORTANT: Maintain the exact same building form, massing, and proportions from the input image. Only add realistic materials, lighting, and architectural details. Keep the same viewing angle and composition.`;

    console.log("📝 Full prompt:", fullPrompt);

    // Prepare input image (strip data URL prefix if present)
    let base64Only = imageBase64;
    const commaIdx = imageBase64.indexOf(',');
    if (commaIdx !== -1) base64Only = imageBase64.slice(commaIdx + 1);

    // Call Google Gemini (image-to-image via generateContent)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_AI_API_KEY}`;
    const geminiResp = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: fullPrompt },
              // Inline input image
              { inline_data: { mime_type: "image/png", data: base64Only } }
            ]
          }
        ]
      }),
    });

    if (!geminiResp.ok) {
      const errorText = await geminiResp.text();
      console.error("❌ Gemini error:", geminiResp.status, errorText);
      return new Response(
        JSON.stringify({ error: "Image generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResp.json();
    console.log("✅ Gemini response received");

    // Try to extract inline image data from candidates → content → parts → inlineData
    let outputBase64: string | null = null;
    const candidates = geminiData.candidates || [];
    for (const cand of candidates) {
      const parts = cand?.content?.parts || [];
      for (const p of parts) {
        // Some responses may use inlineData; others may return text only
        if (p.inlineData?.data) {
          outputBase64 = p.inlineData.data;
          break;
        }
        if (p.inline_data?.data) {
          outputBase64 = p.inline_data.data;
          break;
        }
      }
      if (outputBase64) break;
    }

    if (!outputBase64) {
      throw new Error("Gemini did not return an image payload");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Convert base64 to bytes and upload to storage
    const binaryData = Uint8Array.from(atob(outputBase64), (c) => c.charCodeAt(0));
    
    const timestamp = Date.now();
    const outputPath = `${siteRequestId}/${timestamp}.png`;

    console.log("📤 Uploading to storage:", outputPath);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("visuals")
      .upload(outputPath, binaryData, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("❌ Upload error:", uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("visuals")
      .getPublicUrl(outputPath);

    console.log("✅ Uploaded to:", urlData.publicUrl);

    // Save to database
    const { data: visualResult, error: dbError } = await supabase
      .from("visual_results")
      .insert({
        site_request_id: siteRequestId,
        input_url: imageBase64.substring(0, 100) + "...", // Store truncated for reference
        output_url: urlData.publicUrl,
        style,
        prompt,
      })
      .select()
      .single();

    if (dbError) {
      console.error("❌ DB error:", dbError);
      throw dbError;
    }

    console.log("✅ Visualization saved:", visualResult.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        visualResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error in generate-visualization:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
