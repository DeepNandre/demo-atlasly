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
    <section id="differentiators" className="py-24 px-6 bg-muted/20">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-serif font-bold leading-tight">
            {marketingContent.differentiators.title}
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {marketingContent.differentiators.points.map((point, index) => {
            const IconComponent = iconMap[point.title as keyof typeof iconMap];
            
            return (
              <div
                key={index}
                className="flex items-start gap-6 p-8 rounded-2xl bg-card border border-border/50 hover:shadow-soft transition-all duration-300"
              >
                <div className="w-14 h-14 bg-muted/50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <IconComponent className="w-6 h-6 text-foreground" strokeWidth={1.5} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-serif font-bold">
                    {point.title}
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
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