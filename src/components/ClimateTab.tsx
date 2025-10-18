import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { ClimateViewer } from './ClimateViewer';
import { Terrain3DViewer } from './Terrain3DViewer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Download, CloudSun } from 'lucide-react';

interface ClimateTabProps {
  siteRequestId: string;
  centerLat: number;
  centerLng: number;
}

export function ClimateTab({ siteRequestId, centerLat, centerLng }: ClimateTabProps) {
  const [climateData, setClimateData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);
  const [elevationGrid, setElevationGrid] = useState<any>(null);
  const [loadingElevation, setLoadingElevation] = useState(false);

  // Load existing climate data
  useEffect(() => {
    loadClimateData();
    loadElevationData();
  }, [siteRequestId]);

  const loadClimateData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_requests')
        .select('climate_summary')
        .eq('id', siteRequestId)
        .single();

      if (error) throw error;

      if (data?.climate_summary) {
        setClimateData(data.climate_summary);
        console.log('✅ Climate data loaded');
      } else {
        console.log('ℹ️ No climate data available yet');
      }
    } catch (error: any) {
      console.error('Failed to load climate data:', error);
      toast.error('Failed to load climate data');
    } finally {
      setLoading(false);
    }
  };

  const loadElevationData = async () => {
    setLoadingElevation(true);
    try {
      const { data: gridData, error } = await supabase.functions.invoke('get-elevation-grid', {
        body: { site_id: siteRequestId },
      });

      if (error) throw error;
      if (gridData) {
        setElevationGrid(gridData);
        console.log('✅ Elevation grid loaded for 3D view');
      }
    } catch (error: any) {
      console.error('Failed to load elevation:', error);
    } finally {
      setLoadingElevation(false);
    }
  };

  const handleComputeClimate = async () => {
    setComputing(true);
    try {
      console.log('🌤️ Computing climate data...');
      
      const { data, error } = await supabase.functions.invoke('compute-climate', {
        body: { siteRequestId }
      });

      if (error) throw error;

      if (data?.climateSummary) {
        setClimateData(data.climateSummary);
        toast.success('Climate analysis complete');
        console.log('✅ Climate computed successfully');
      }
    } catch (error: any) {
      console.error('Failed to compute climate:', error);
      toast.error(error.message || 'Failed to compute climate data');
    } finally {
      setComputing(false);
    }
  };

  const handleExportClimate = async () => {
    if (!climateData) return;

    try {
      const exportData = {
        siteLocation: { lat: centerLat, lng: centerLng },
        ...climateData
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `climate-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Climate data exported');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export climate data');
    }
  };

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (!climateData) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-4">
          <CloudSun className="h-16 w-16 mx-auto text-muted-foreground" />
          <h3 className="text-lg font-semibold">Climate Analysis Not Available</h3>
          <p className="text-muted-foreground">
            Compute climate data to view temperature, rainfall, solar irradiance, and wind patterns.
          </p>
          <Button 
            onClick={handleComputeClimate} 
            disabled={computing}
            size="lg"
          >
            {computing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Computing Climate Data...
              </>
            ) : (
              'Compute Climate Data'
            )}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Climate Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Historical weather patterns and solar data
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleComputeClimate} 
            disabled={computing}
            variant="outline"
          >
            {computing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recomputing...
              </>
            ) : (
              'Recompute'
            )}
          </Button>
          <Button onClick={handleExportClimate} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <ClimateViewer climateData={climateData} />

      {/* 3D Terrain Viewer */}
      {elevationGrid && (
        <Terrain3DViewer
          elevationGrid={elevationGrid}
          height="h-[500px]"
        />
      )}

      {climateData.dataSource && (
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">
            Data Source: {climateData.dataSource}
            {climateData.computedAt && ` • Computed: ${new Date(climateData.computedAt).toLocaleString()}`}
          </p>
        </Card>
      )}
    </div>
  );
}
