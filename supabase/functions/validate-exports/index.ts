import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  details?: any;
}

interface ValidationResult {
  status: 'pass' | 'warning' | 'fail';
  quality_score: number;
  issues: ValidationIssue[];
  metrics: {
    file_size_bytes?: number;
    validation_duration_ms?: number;
    [key: string]: any;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { site_request_id, file_type, file_content, file_url } = await req.json();

    if (!site_request_id || !file_type) {
      return new Response(
        JSON.stringify({ error: 'site_request_id and file_type required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Validating ${file_type} for site: ${site_request_id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get file content if URL provided
    let content = file_content;
    if (!content && file_url) {
      const response = await fetch(file_url);
      content = await response.text();
    }

    if (!content) {
      throw new Error('No file content provided or accessible');
    }

    // Validate based on file type
    let validationResult: ValidationResult;
    
    switch (file_type.toLowerCase()) {
      case 'dxf':
        validationResult = validateDXF(content);
        break;
      case 'glb':
        validationResult = await validateGLB(content);
        break;
      case 'geojson':
        validationResult = validateGeoJSON(content);
        break;
      case 'pdf':
        validationResult = validatePDF(content);
        break;
      default:
        throw new Error(`Unsupported file type: ${file_type}`);
    }

    // Add validation duration
    validationResult.metrics.validation_duration_ms = Date.now() - startTime;
    validationResult.metrics.file_size_bytes = new TextEncoder().encode(content).length;

    // Store validation results
    const { data: checkData, error: checkError } = await supabase
      .from('export_quality_checks')
      .insert({
        site_request_id,
        file_type: file_type.toLowerCase(),
        status: validationResult.status,
        quality_score: validationResult.quality_score,
        issues: validationResult.issues,
        metrics: validationResult.metrics,
        validation_duration_ms: validationResult.metrics.validation_duration_ms,
        file_size_bytes: validationResult.metrics.file_size_bytes,
      })
      .select()
      .single();

    if (checkError) {
      console.error('Failed to store validation results:', checkError);
    }

    console.log(`✅ Validation complete: ${validationResult.status} (score: ${validationResult.quality_score})`);

    return new Response(
      JSON.stringify(validationResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Validation error:', error);
    
    const errorResult: ValidationResult = {
      status: 'fail',
      quality_score: 0,
      issues: [{
        severity: 'error',
        code: 'VALIDATION_ERROR',
        message: error.message,
      }],
      metrics: {
        validation_duration_ms: Date.now() - startTime,
      },
    };

    return new Response(
      JSON.stringify(errorResult),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function validateDXF(content: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const metrics: any = {};
  
  // Check file structure
  if (!content.includes('SECTION') || !content.includes('ENDSEC')) {
    issues.push({
      severity: 'error',
      code: 'DXF_INVALID_STRUCTURE',
      message: 'Missing required DXF SECTION blocks',
    });
  }

  // Check for EOF marker
  if (!content.trim().endsWith('EOF')) {
    issues.push({
      severity: 'warning',
      code: 'DXF_MISSING_EOF',
      message: 'Missing EOF marker - may cause import issues',
    });
  }

  // Count entities
  const entityMatches = content.match(/0\nLINE\n|0\nPOLYLINE\n|0\n3DFACE\n/g);
  metrics.entity_count = entityMatches?.length || 0;

  if (metrics.entity_count === 0) {
    issues.push({
      severity: 'warning',
      code: 'DXF_NO_ENTITIES',
      message: 'No geometric entities found',
    });
  }

  // Check for layers
  const layerMatches = content.match(/8\n([^\n]+)\n/g);
  const layers = new Set(layerMatches?.map(m => m.split('\n')[1]) || []);
  metrics.layer_count = layers.size;

  if (metrics.layer_count === 0) {
    issues.push({
      severity: 'info',
      code: 'DXF_NO_LAYERS',
      message: 'No explicit layers defined - entities on default layer',
    });
  }

  // Check for broken polylines (POLYLINE without SEQEND)
  const polylineStarts = (content.match(/0\nPOLYLINE\n/g) || []).length;
  const polylineEnds = (content.match(/0\nSEQEND\n/g) || []).length;
  
  if (polylineStarts !== polylineEnds) {
    issues.push({
      severity: 'error',
      code: 'DXF_BROKEN_POLYLINES',
      message: `${polylineStarts - polylineEnds} unclosed polylines detected`,
      details: { polyline_starts: polylineStarts, seqend_count: polylineEnds },
    });
  }

  metrics.polyline_count = polylineStarts;

  // Check for coordinate system metadata
  if (!content.includes('999')) {
    issues.push({
      severity: 'info',
      code: 'DXF_NO_METADATA',
      message: 'No metadata comments found - consider adding coordinate system info',
    });
  }

  // Calculate quality score
  let score = 100;
  issues.forEach(issue => {
    if (issue.severity === 'error') score -= 30;
    else if (issue.severity === 'warning') score -= 10;
    else score -= 2;
  });
  score = Math.max(0, Math.min(100, score));

  const status = score >= 80 ? 'pass' : score >= 50 ? 'warning' : 'fail';

  return {
    status,
    quality_score: score,
    issues,
    metrics,
  };
}

async function validateGLB(content: string): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  const metrics: any = {};

  try {
    // Basic GLB validation - check for glTF marker in content
    const hasGltfMarker = content.includes('glTF') || content.startsWith('glTF');
    
    if (!hasGltfMarker) {
      issues.push({
        severity: 'warning',
        code: 'GLB_NO_MARKER',
        message: 'glTF marker not found - may not be a valid GLB file',
      });
    }

    // Basic size checks
    const contentLength = new TextEncoder().encode(content).length;
    metrics.file_length = contentLength;

    if (contentLength < 100) {
      issues.push({
        severity: 'warning',
        code: 'GLB_TOO_SMALL',
        message: 'File seems unusually small - may be placeholder or incomplete',
      });
    }

    if (contentLength > 50_000_000) {
      issues.push({
        severity: 'info',
        code: 'GLB_LARGE_FILE',
        message: 'Large GLB file - may impact load times',
      });
    }

  } catch (error: any) {
    issues.push({
      severity: 'error',
      code: 'GLB_PARSE_ERROR',
      message: `Failed to parse GLB: ${error.message}`,
    });
  }

  // Calculate quality score
  let score = 100;
  issues.forEach(issue => {
    if (issue.severity === 'error') score -= 30;
    else if (issue.severity === 'warning') score -= 10;
    else score -= 2;
  });
  score = Math.max(0, Math.min(100, score));

  const status = score >= 80 ? 'pass' : score >= 50 ? 'warning' : 'fail';

  return {
    status,
    quality_score: score,
    issues,
    metrics,
  };
}

function validateGeoJSON(content: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const metrics: any = {};

  try {
    const geojson = JSON.parse(content);

    // Check type
    if (!geojson.type) {
      issues.push({
        severity: 'error',
        code: 'GEOJSON_NO_TYPE',
        message: 'Missing "type" property',
      });
    }

    // Validate FeatureCollection
    if (geojson.type === 'FeatureCollection') {
      if (!Array.isArray(geojson.features)) {
        issues.push({
          severity: 'error',
          code: 'GEOJSON_INVALID_FEATURES',
          message: 'FeatureCollection must have "features" array',
        });
      } else {
        metrics.feature_count = geojson.features.length;

        if (geojson.features.length === 0) {
          issues.push({
            severity: 'warning',
            code: 'GEOJSON_EMPTY',
            message: 'No features in FeatureCollection',
          });
        }

        // Check each feature
        geojson.features.forEach((feature: any, index: number) => {
          if (!feature.type || feature.type !== 'Feature') {
            issues.push({
              severity: 'error',
              code: 'GEOJSON_INVALID_FEATURE',
              message: `Feature ${index} missing or invalid type`,
            });
          }

          if (!feature.geometry) {
            issues.push({
              severity: 'error',
              code: 'GEOJSON_NO_GEOMETRY',
              message: `Feature ${index} missing geometry`,
            });
          } else {
            // Check for valid coordinates
            if (!feature.geometry.coordinates) {
              issues.push({
                severity: 'error',
                code: 'GEOJSON_NO_COORDINATES',
                message: `Feature ${index} geometry missing coordinates`,
              });
            }
          }
        });
      }
    }

    // Check for CRS (optional but recommended)
    if (!geojson.crs) {
      issues.push({
        severity: 'info',
        code: 'GEOJSON_NO_CRS',
        message: 'No CRS specified - WGS84 assumed',
      });
    }

  } catch (error: any) {
    issues.push({
      severity: 'error',
      code: 'GEOJSON_PARSE_ERROR',
      message: `Invalid JSON: ${error.message}`,
    });
  }

  // Calculate quality score
  let score = 100;
  issues.forEach(issue => {
    if (issue.severity === 'error') score -= 30;
    else if (issue.severity === 'warning') score -= 10;
    else score -= 2;
  });
  score = Math.max(0, Math.min(100, score));

  const status = score >= 80 ? 'pass' : score >= 50 ? 'warning' : 'fail';

  return {
    status,
    quality_score: score,
    issues,
    metrics,
  };
}

function validatePDF(content: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const metrics: any = {};

  // Check PDF header
  if (!content.startsWith('%PDF-')) {
    issues.push({
      severity: 'error',
      code: 'PDF_INVALID_HEADER',
      message: 'Missing PDF header - not a valid PDF file',
    });
  } else {
    const versionMatch = content.match(/%PDF-(\d+\.\d+)/);
    if (versionMatch) {
      metrics.pdf_version = versionMatch[1];
    }
  }

  // Check for EOF marker
  if (!content.includes('%%EOF')) {
    issues.push({
      severity: 'error',
      code: 'PDF_NO_EOF',
      message: 'Missing %%EOF marker - file may be corrupted',
    });
  }

  // Basic size check
  if (content.length < 200) {
    issues.push({
      severity: 'warning',
      code: 'PDF_TOO_SMALL',
      message: 'File seems unusually small - may be incomplete',
    });
  }

  // Check for metadata
  if (content.includes('/Producer') || content.includes('/Creator')) {
    metrics.has_metadata = true;
  } else {
    issues.push({
      severity: 'info',
      code: 'PDF_NO_METADATA',
      message: 'No metadata found - consider adding document properties',
    });
    metrics.has_metadata = false;
  }

  // Calculate quality score
  let score = 100;
  issues.forEach(issue => {
    if (issue.severity === 'error') score -= 30;
    else if (issue.severity === 'warning') score -= 10;
    else score -= 2;
  });
  score = Math.max(0, Math.min(100, score));

  const status = score >= 80 ? 'pass' : score >= 50 ? 'warning' : 'fail';

  return {
    status,
    quality_score: score,
    issues,
    metrics,
  };
}
