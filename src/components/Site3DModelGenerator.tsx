import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2, Box, CheckCircle2, AlertCircle } from 'lucide-react';
import { Progress } from './ui/progress';

interface Site3DModelGeneratorProps {
  siteId: string;
  siteName: string;
}

export function Site3DModelGenerator({ siteId, siteName }: Site3DModelGeneratorProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedModel, setGeneratedModel] = useState<{
    dxfContent: string;
    metadata: any;
  } | null>(null);

  const generateModel = async () => {
    setIsGenerating(true);
    setProgress(10);
    
    try {
      toast({
        title: '🏗️ Generating 3D Model',
        description: 'Fetching real-world geospatial data...',
      });

      setProgress(30);

      const { data, error } = await supabase.functions.invoke('generate-3d-site-model', {
        body: { siteId },
      });

      if (error) throw error;

      setProgress(100);

      if (data.success) {
        setGeneratedModel({
          dxfContent: data.dxfContent,
          metadata: data.metadata,
        });

        toast({
          title: '✅ 3D Model Generated',
          description: `Successfully created professional 3D model with ${data.metadata.buildingCount} buildings, ${data.metadata.roadCount} roads, and ${data.metadata.elevationPoints} elevation points.`,
        });
      } else {
        throw new Error(data.error || 'Failed to generate model');
      }
    } catch (error: any) {
      console.error('Error generating 3D model:', error);
      toast({
        title: '❌ Generation Failed',
        description: error.message || 'Failed to generate 3D model. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadDXF = () => {
    if (!generatedModel) return;

    const blob = new Blob([generatedModel.dxfContent], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${siteName.replace(/\s+/g, '_')}_3D_Model.dxf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: '📥 Download Started',
      description: 'DXF file is being downloaded',
    });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-primary" />
            <CardTitle>3D Site Context Model</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            Professional Grade
          </Badge>
        </div>
        <CardDescription>
          Generate a data-driven 3D model with real-world buildings, roads, terrain, and water bodies
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Feature List */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>Building Footprints</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>Road Networks</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>Terrain Elevation</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>Water Bodies</span>
          </div>
        </div>

        {/* Technical Details */}
        <div className="space-y-2 p-4 bg-muted/30 rounded-lg border border-border/50">
          <div className="font-semibold text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Output Specifications
          </div>
          <ul className="text-xs space-y-1 text-muted-foreground ml-6">
            <li>• Format: DXF (AutoCAD Drawing Exchange Format)</li>
            <li>• Compatible with: AutoCAD, Rhino, SketchUp, Revit</li>
            <li>• Data Source: OpenStreetMap + SRTM Elevation</li>
            <li>• Organized layers: BUILDINGS, ROADS, TOPOGRAPHY, WATER</li>
            <li>• Georeferenced coordinates with metadata</li>
          </ul>
        </div>

        {/* Generation Progress */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing geospatial data...</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Generated Model Info */}
        {generatedModel && (
          <div className="space-y-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold">
              <CheckCircle2 className="w-5 h-5" />
              <span>Model Generated Successfully</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <div className="text-muted-foreground">Buildings</div>
                <div className="font-semibold">{generatedModel.metadata.buildingCount}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Roads</div>
                <div className="font-semibold">{generatedModel.metadata.roadCount}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Water Bodies</div>
                <div className="font-semibold">{generatedModel.metadata.waterBodyCount}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Elevation Points</div>
                <div className="font-semibold">{generatedModel.metadata.elevationPoints}</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!generatedModel ? (
            <Button
              onClick={generateModel}
              disabled={isGenerating}
              className="flex-1"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Box className="w-4 h-4 mr-2" />
                  Generate 3D Model
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                onClick={downloadDXF}
                className="flex-1"
                size="lg"
                variant="default"
              >
                <Download className="w-4 h-4 mr-2" />
                Download DXF
              </Button>
              <Button
                onClick={() => {
                  setGeneratedModel(null);
                  setProgress(0);
                }}
                variant="outline"
                size="lg"
              >
                Generate New
              </Button>
            </>
          )}
        </div>

        {/* Info Footer */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Generated models use real-world data and are ready for professional CAD software
        </div>
      </CardContent>
    </Card>
  );
}
