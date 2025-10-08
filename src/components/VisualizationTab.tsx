import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, Sparkles, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VisualizationTabProps {
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

const STYLES = [
  { value: "modern-minimal", label: "Modern Minimal" },
  { value: "atmospheric-realism", label: "Atmospheric Realism" },
  { value: "brutalist", label: "Brutalist" },
  { value: "timber-warm", label: "Timber Warm" },
  { value: "night", label: "Night Scene" },
  { value: "foggy", label: "Foggy Atmosphere" },
];

export function VisualizationTab({ siteRequestId }: VisualizationTabProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [style, setStyle] = useState<string>("modern-minimal");
  const [prompt, setPrompt] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [visualResults, setVisualResults] = useState<VisualResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVisualResults();
  }, [siteRequestId]);

  const loadVisualResults = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("visual_results")
        .select("*")
        .eq("site_request_id", siteRequestId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVisualResults(data || []);
    } catch (error) {
      console.error("Error loading visualizations:", error);
      toast.error("Failed to load visualizations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error("File size must be less than 20MB");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleGenerate = async () => {
    if (!selectedFile) {
      toast.error("Please upload an image first");
      return;
    }

    setIsGenerating(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const imageBase64 = await base64Promise;

      const { data, error } = await supabase.functions.invoke("generate-visualization", {
        body: {
          siteRequestId,
          style,
          prompt: prompt.trim() || null,
          imageBase64,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success("Visualization generated successfully!");
      await loadVisualResults();
      
      // Reset form
      setSelectedFile(null);
      setPreviewUrl("");
      setPrompt("");
    } catch (error: any) {
      console.error("Generation error:", error);
      toast.error(error.message || "Failed to generate visualization");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (url: string, id: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `visualization-${id}.png`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Conceptual Visualization:</strong> AI-generated renders are for design exploration only. 
          Verify lighting, materials, and proportions in your final workflow. Do not include public figures or branded content.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Generate Styled Render
          </CardTitle>
          <CardDescription>
            Upload a sketch or massing model to generate a photorealistic architectural visualization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="image-upload">Upload Image (PNG/JPG)</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById("image-upload")?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                {selectedFile ? selectedFile.name : "Choose Image"}
              </Button>
              <input
                id="image-upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            {previewUrl && (
              <div className="mt-2">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full max-h-64 object-contain rounded-lg border"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="style">Visualization Style</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger id="style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">Additional Instructions (Optional)</Label>
            <Textarea
              id="prompt"
              placeholder="Add specific details like materials, context, time of day, etc."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!selectedFile || isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>Generating...</>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Render
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generated Visualizations</CardTitle>
          <CardDescription>
            Previous renders for this site pack
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : visualResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No visualizations yet. Upload an image to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visualResults.map((result) => (
                <div key={result.id} className="space-y-2">
                  <div className="relative group">
                    <img
                      src={result.output_url}
                      alt="Generated visualization"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="bg-background/80 backdrop-blur">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI Generated
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {STYLES.find((s) => s.value === result.style)?.label}
                      </p>
                      {result.prompt && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {result.prompt}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(result.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(result.output_url, result.id)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
