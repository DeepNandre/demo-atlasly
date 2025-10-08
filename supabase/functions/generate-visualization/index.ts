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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
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

    // Call Lovable AI image generation
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: fullPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64,
                },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ AI response received");

    const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!generatedImageUrl) {
      throw new Error("No image generated");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Convert base64 to blob and upload to storage
    const base64Data = generatedImageUrl.split(",")[1];
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    
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
