import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userQuery, siteBoundary } = await req.json();
    console.log('AI Geospatial Query received:', userQuery);

    if (!userQuery || !siteBoundary) {
      throw new Error("Missing required parameters: userQuery or siteBoundary");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Extract boundary coordinates for Overpass query
    const coords = siteBoundary.geometry.coordinates[0];
    if (!coords || coords.length === 0) {
      throw new Error("Invalid site boundary coordinates");
    }

    const lats = coords.map((c: number[]) => c[1]);
    const lons = coords.map((c: number[]) => c[0]);
    const bbox = {
      south: Math.min(...lats),
      north: Math.max(...lats),
      west: Math.min(...lons),
      east: Math.max(...lons)
    };

    console.log('Bounding box:', bbox);

    // Construct system prompt with geospatial context
    const systemPrompt = `You are a geospatial analysis assistant. Analyze the user's query and determine what type of POI (Point of Interest) they're looking for.

Site boundary bbox: ${bbox.south},${bbox.west},${bbox.north},${bbox.east}

Common queries and their Overpass tags:
- Schools: amenity=school
- Cafes/Coffee shops: amenity=cafe
- Restaurants: amenity=restaurant
- Parks/Gardens/Green spaces: leisure=park OR leisure=garden OR landuse=grass OR landuse=recreation_ground
- Bus stops: highway=bus_stop
- Hospitals: amenity=hospital
- Banks: amenity=bank
- Gas stations: amenity=fuel
- Supermarkets: shop=supermarket
- Pharmacies: amenity=pharmacy
- ATMs: amenity=atm
- Post offices: amenity=post_office
- Libraries: amenity=library
- Places of worship: amenity=place_of_worship
- Police stations: amenity=police
- Fire stations: amenity=fire_station
- Hotels: tourism=hotel
- Gyms: leisure=fitness_centre
- Bars/Pubs: amenity=bar OR amenity=pub

Respond with ONLY a JSON object in this exact format:
{
  "tags": ["amenity=school"],
  "description": "schools",
  "needsGeometry": false
}

For parks/green spaces/gardens, set needsGeometry to true to get polygon data.
Keep description short (1-2 words).`;

    console.log('Calling Lovable AI...');

    // Call Lovable AI to interpret the query
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuery }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    console.log('AI interpreted query:', aiContent);

    // Parse AI response
    let interpretation;
    try {
      // Clean the response in case there's markdown formatting
      const cleanedContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      interpretation = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      throw new Error('Failed to parse AI interpretation');
    }

    console.log('Parsed interpretation:', interpretation);
    
    // Build Overpass query
    const overpassQuery = `
      [out:json][timeout:30];
      (
        ${interpretation.tags.map((tag: string) => {
          const geometryType = interpretation.needsGeometry ? 'way' : 'node';
          return `${geometryType}[${tag}](${bbox.south},${bbox.west},${bbox.north},${bbox.east});`;
        }).join('\n        ')}
      );
      out geom;
    `;

    console.log('Overpass query:', overpassQuery);

    // Query Overpass API
    const overpassResponse = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (!overpassResponse.ok) {
      const errorText = await overpassResponse.text();
      console.error('Overpass API error:', errorText);
      throw new Error(`Overpass API error: ${overpassResponse.status}`);
    }

    const osmData = await overpassResponse.json();
    console.log('OSM data received:', osmData.elements.length, 'features');

    // Convert to GeoJSON
    const features = osmData.elements.map((element: any) => {
      if (element.type === 'node') {
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [element.lon, element.lat]
          },
          properties: {
            ...element.tags,
            osmId: element.id,
            osmType: element.type
          }
        };
      } else if (element.type === 'way' && element.geometry) {
        return {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [element.geometry.map((node: any) => [node.lon, node.lat])]
          },
          properties: {
            ...element.tags,
            osmId: element.id,
            osmType: element.type
          }
        };
      }
      return null;
    }).filter((f: any) => f !== null);

    const geojson = {
      type: 'FeatureCollection',
      features
    };

    return new Response(
      JSON.stringify({
        geojson,
        description: interpretation.description,
        count: features.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-geospatial-query:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
