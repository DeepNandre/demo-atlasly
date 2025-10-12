import { useState } from 'react';
import { Lightbulb, Wind, Sun, Compass, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DesignAssistantPanelProps {
  siteRequestId: string;
  locationName: string;
}

const quickQuestions = [
  { 
    icon: Compass, 
    label: 'Best orientation?', 
    question: 'What is the optimal building orientation for this site considering sun path and prevailing winds?' 
  },
  { 
    icon: Sun, 
    label: 'Shading depth?', 
    question: 'What overhang depth should I use for effective solar shading on south-facing windows?' 
  },
  { 
    icon: Wind, 
    label: 'Prevailing wind?', 
    question: 'What is the prevailing wind direction and how should I position openings for natural ventilation?' 
  },
  { 
    icon: Lightbulb, 
    label: 'Massing strategy?', 
    question: 'Based on the terrain and climate, what building massing and setback strategy would you recommend?' 
  },
];

export const DesignAssistantPanel = ({ siteRequestId, locationName }: DesignAssistantPanelProps) => {
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);

  const askQuestion = async (question: string) => {
    setLoading(true);
    setActiveQuestion(question);
    setResponse(null);

    try {
      const { data, error } = await supabase.functions.invoke('design-assistant', {
        body: {
          site_request_id: siteRequestId,
          question: question
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setResponse(data.recommendation);
    } catch (error) {
      console.error('Design assistant error:', error);
      toast.error('Failed to get recommendation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="absolute top-16 right-4 w-80 max-h-[calc(100vh-140px)] z-10 flex flex-col shadow-lg">
      <div className="p-4 border-b bg-card/95 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Design Assistant</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          AI-powered recommendations for {locationName}
        </p>
      </div>

      <div className="p-4 space-y-2 border-b bg-muted/30">
        <p className="text-xs font-medium text-muted-foreground mb-2">Quick Questions:</p>
        {quickQuestions.map((q, idx) => {
          const Icon = q.icon;
          return (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 h-auto py-2 text-left"
              onClick={() => askQuestion(q.question)}
              disabled={loading}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-xs">{q.label}</span>
            </Button>
          );
        })}
      </div>

      <ScrollArea className="flex-1 p-4">
        {!response && !loading && (
          <div className="text-center text-muted-foreground py-8">
            <Compass className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-xs">
              Click a question above to get site-specific design recommendations
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">
              Analyzing site data...
            </p>
          </div>
        )}

        {response && (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="text-xs font-medium mb-1">Recommendation:</p>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {response}
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setResponse(null)}
            >
              Ask another question
            </Button>
          </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t bg-muted/30">
        <p className="text-[10px] text-muted-foreground text-center">
          AI-generated. Verify critical design decisions.
        </p>
      </div>
    </Card>
  );
};
