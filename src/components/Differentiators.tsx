import { Zap, Database, Shield, Code } from "lucide-react";

const differentiators = [
  {
    icon: Zap,
    title: "10x Faster",
    description: "What takes weeks of manual work happens in under 30 seconds. Automated data fusion from multiple geospatial sources."
  },
  {
    icon: Database,
    title: "Proprietary Dataset",
    description: "Every analysis trains our AI. 10,000+ sites analyzed means better predictions for your next project."
  },
  {
    icon: Shield,
    title: "Predictive Intelligence",
    description: "Feasibility scoring, cost estimates, permit probability, and climate risk projections in one platform."
  },
  {
    icon: Code,
    title: "API-First Platform",
    description: "Integrate geospatial intelligence into your apps. Developer docs, SDKs, and usage-based pricing."
  }
];

const Differentiators = () => {
  return (
    <section id="differentiators" className="py-24 px-6 bg-muted/20">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-serif font-bold leading-tight">
            Why SiteIQ Wins
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {differentiators.map((point, index) => {
            const IconComponent = point.icon;
            
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