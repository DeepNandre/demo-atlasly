import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RenderAngle {
  name: string;
  cameraPosition: { x: number; y: number; z: number };
  lookAt: { x: number; y: number; z: number };
  description: string;
}

export interface RenderStyle {
  value: string;
  label: string;
  prompt: string;
  timeOfDay?: 'morning' | 'noon' | 'evening' | 'night';
}

const RENDER_ANGLES: RenderAngle[] = [
  {
    name: 'Aerial View',
    cameraPosition: { x: 0, y: 150, z: 0 },
    lookAt: { x: 0, y: 0, z: 0 },
    description: 'Bird\'s eye perspective'
  },
  {
    name: 'Street Level',
    cameraPosition: { x: 100, y: 5, z: 100 },
    lookAt: { x: 0, y: 10, z: 0 },
    description: 'Human perspective from ground'
  },
  {
    name: 'Isometric',
    cameraPosition: { x: 100, y: 100, z: 100 },
    lookAt: { x: 0, y: 0, z: 0 },
    description: 'Technical axonometric view'
  },
  {
    name: 'Entrance Focus',
    cameraPosition: { x: 50, y: 15, z: 80 },
    lookAt: { x: 0, y: 0, z: 0 },
    description: 'Approaching the main entrance'
  }
];

const RENDER_STYLES: RenderStyle[] = [
  {
    value: 'photorealistic-day',
    label: 'Photorealistic Day',
    prompt: 'Photorealistic architectural rendering, bright daylight, blue sky, natural shadows',
    timeOfDay: 'noon'
  },
  {
    value: 'golden-hour',
    label: 'Golden Hour',
    prompt: 'Warm golden hour lighting, long shadows, orange-pink sky, architectural photography',
    timeOfDay: 'evening'
  },
  {
    value: 'night-scene',
    label: 'Night Scene',
    prompt: 'Night architectural rendering, artificial lighting, warm interior glow, twilight blue hour',
    timeOfDay: 'night'
  },
  {
    value: 'morning-mist',
    label: 'Morning Mist',
    prompt: 'Early morning atmosphere, soft mist, cool blue tones, gentle sunrise light',
    timeOfDay: 'morning'
  },
  {
    value: 'minimalist-white',
    label: 'Minimalist',
    prompt: 'Clean minimalist architectural render, white background, studio lighting, precise shadows'
  },
  {
    value: 'contextual-realism',
    label: 'Contextual',
    prompt: 'Realistic site context, surrounding landscape, trees, people, urban environment'
  }
];

export const useMultiAngleRendering = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const generateMultiAngleRenders = async (
    siteRequestId: string,
    baseImageUrl: string,
    selectedAngles: RenderAngle[] = RENDER_ANGLES,
    selectedStyles: RenderStyle[] = RENDER_STYLES.slice(0, 3)
  ) => {
    setIsGenerating(true);
    const totalRenders = selectedAngles.length * selectedStyles.length;
    setProgress({ current: 0, total: totalRenders });

    try {
      let successCount = 0;
      let failCount = 0;

      for (const angle of selectedAngles) {
        for (const style of selectedStyles) {
          try {
            const enhancedPrompt = `${style.prompt}. Camera angle: ${angle.description}. ${angle.name} perspective.`;
            
            const { data, error } = await supabase.functions.invoke('generate-visualization', {
              body: {
                siteRequestId,
                style: `${style.value}-${angle.name.toLowerCase().replace(/\s+/g, '-')}`,
                prompt: enhancedPrompt,
                imageUrl: baseImageUrl,
                metadata: {
                  angle: angle.name,
                  timeOfDay: style.timeOfDay,
                  renderType: 'multi-angle'
                }
              }
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);
            
            successCount++;
          } catch (error) {
            console.error(`Failed to generate ${angle.name} - ${style.label}:`, error);
            failCount++;
          }

          setProgress(prev => ({ ...prev, current: prev.current + 1 }));
          
          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (successCount > 0) {
        toast.success(`Generated ${successCount} renders successfully${failCount > 0 ? `, ${failCount} failed` : ''}`);
      } else {
        toast.error('Failed to generate any renders');
      }

      return { success: successCount, failed: failCount };
    } catch (error) {
      console.error('Multi-angle generation error:', error);
      toast.error('Failed to generate multi-angle renders');
      return { success: 0, failed: progress.total };
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return {
    generateMultiAngleRenders,
    isGenerating,
    progress,
    availableAngles: RENDER_ANGLES,
    availableStyles: RENDER_STYLES
  };
};
