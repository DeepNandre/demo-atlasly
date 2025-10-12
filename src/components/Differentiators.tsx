import { marketingContent } from "@/lib/content";
import { ExternalLink, Target, Download, TrendingUp } from "lucide-react";

const iconMap = {
  "Open lineage": ExternalLink,
  "Accuracy first": Target,
  "Export fidelity": Download,
  "Scales with you": TrendingUp,
};

const Differentiators = () => {
  return (
    <section id="differentiators" className="py-20 px-6 bg-muted/30">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-serif font-bold">
            {marketingContent.differentiators.title}
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {marketingContent.differentiators.points.map((point, index) => {
            const IconComponent = iconMap[point.title as keyof typeof iconMap];
            
            return (
              <div
                key={index}
                className="flex items-start gap-4 p-6 rounded-xl bg-card border border-border/50"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <IconComponent className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-semibold mb-1">
                    {point.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {point.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Differentiators;