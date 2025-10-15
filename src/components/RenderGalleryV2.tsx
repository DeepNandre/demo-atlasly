import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Share2, Sparkles, Loader2, Heart, Camera, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMultiAngleRendering } from "@/hooks/useMultiAngleRendering";

interface RenderGalleryV2Props {
  siteRequestId: string;
}

interface VisualResult {
  id: string;
  input_url: string;
  output_url: string;
  style: string;
  prompt: string | null;
  created_at: string;
}

const AUTO_STYLES = [
  { value: "modern-minimal", label: "Modern Minimal", prompt: "Clean lines, minimalist aesthetic, natural light" },
  { value: "atmospheric-realism", label: "Atmospheric", prompt: "Photorealistic, dramatic lighting, rich materials" },
  { value: "night", label: "Night Scene", prompt: "Evening atmosphere, artificial lighting, urban context" },
];

export function RenderGalleryV2({ siteRequestId }: RenderGalleryV2Props) {
  const [visualResults, setVisualResults] = useState<VisualResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [siteData, setSiteData] = useState<any>(null);
  const { 
    generateMultiAngleRenders, 
    isGenerating: isMultiGenerating, 
    progress,
    availableAngles,
    availableStyles 
  } = useMultiAngleRendering();

  useEffect(() => {
    loadData();
  }, [siteRequestId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load site data
      const { data: site, error: siteError } = await supabase
        .from("site_requests")
        .select("*")
        .eq("id", siteRequestId)
        .single();

      if (siteError) throw siteError;
      setSiteData(site);

      // Load existing renders
      const { data, error } = await supabase
        .from("visual_results")
        .select("*")
        .eq("site_request_id", siteRequestId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVisualResults(data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load visualizations");
    } finally {
      setIsLoading(false);
    }
  };

  const generateAutoRenders = async () => {
    if (!siteData?.preview_image_url) {
      toast.error("No preview image available for this site");
      return;
    }

    setIsGenerating(true);
    try {
      // Generate all 3 styles
      for (const style of AUTO_STYLES) {
        const { data, error } = await supabase.functions.invoke("generate-visualization", {
          body: {
            siteRequestId,
            style: style.value,
            prompt: style.prompt,
            imageUrl: siteData.preview_image_url,
          },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);
      }

      toast.success(`Generated ${AUTO_STYLES.length} styled renders!`);
      await loadData();
    } catch (error: any) {
      console.error("Generation error:", error);
      toast.error(error.message || "Failed to generate renders");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAdvancedRenders = async () => {
    if (!siteData?.preview_image_url) {
      toast.error("No preview image available for this site");
      return;
    }

    await generateMultiAngleRenders(
      siteRequestId,
      siteData.preview_image_url,
      availableAngles.slice(0, 3), // Use first 3 angles
      availableStyles.slice(0, 2)  // Use first 2 styles
    );
    
    await loadData();
  };

  const handleDownload = (url: string, id: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `render-${id}.png`;
    link.click();
  };

  const handleShare = async (resultId: string) => {
    try {
      // Create share card
      const { data, error } = await supabase.functions.invoke("create-share-card", {
        body: { siteRequestId, visualResultId: resultId }
      });

      if (error) throw error;
      
      toast.success("Share card created!");
      // TODO: Copy link to clipboard
    } catch (error) {
      console.error("Share error:", error);
      toast.error("Failed to create share card");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading gallery...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                AI Render Gallery
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Generate professional architectural visualizations
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="quick" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="quick">
                <Sparkles className="w-4 h-4 mr-2" />
                Quick (3 renders)
              </TabsTrigger>
              <TabsTrigger value="advanced">
                <Camera className="w-4 h-4 mr-2" />
                Multi-Angle (6 renders)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="quick" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate 3 styled renders with different atmospheres
              </p>
              <Button
                onClick={generateAutoRenders}
                disabled={isGenerating || isMultiGenerating || !siteData?.preview_image_url}
                size="lg"
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Quick Renders
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Generate multiple camera angles with different times of day
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Camera className="w-3 h-3" />
                  <span>3 Angles (Aerial, Street, Isometric)</span>
                  <span>×</span>
                  <Clock className="w-3 h-3" />
                  <span>2 Times (Day, Golden Hour)</span>
                </div>
              </div>
              
              {isMultiGenerating && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress:</span>
                    <span>{progress.current} of {progress.total}</span>
                  </div>
                  <Progress value={(progress.current / progress.total) * 100} />
                </div>
              )}

              <Button
                onClick={generateAdvancedRenders}
                disabled={isGenerating || isMultiGenerating || !siteData?.preview_image_url}
                size="lg"
                className="w-full"
              >
                {isMultiGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating {progress.current}/{progress.total}...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Generate Multi-Angle Renders
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {visualResults.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No renders yet. Click "Generate 3 Renders" to create styled visualizations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visualResults.map((result) => (
            <Card key={result.id} className="overflow-hidden group">
              <div className="relative aspect-[4/3]">
                <img
                  src={result.output_url}
                  alt={`${result.style} render`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="bg-background/80 backdrop-blur">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Generated
                  </Badge>
                </div>
              </div>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium capitalize">{result.style.replace('-', ' ')}</p>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {result.prompt && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {result.prompt}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDownload(result.output_url, result.id)}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleShare(result.id)}
                  >
                    <Share2 className="w-4 h-4 mr-1" />
                    Share
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(result.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
