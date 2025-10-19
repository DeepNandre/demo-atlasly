import { Rocket, Brain, Shield, Plug } from "lucide-react";

const differentiators = [
  {
    icon: Rocket,
    title: "Speed",
    stat: "100x Faster",
    description: "Site analysis that takes consultants 2-4 weeks completes in under 2 minutes. Automated data fusion from satellite, elevation, climate, and OpenStreetMap sources."
  },
  {
    icon: Brain,
    title: "Intelligence",
    stat: "AI-Powered",
    description: "Machine learning models trained on thousands of real projects. Get feasibility scores, cost estimates, and risk assessments backed by actual site data."
  },
  {
    icon: Shield,
    title: "Accuracy",
    stat: "Verified Data",
    description: "Every export is validated against source data quality metrics. Terrain accuracy down to 1m resolution, solar calculations validated by NREL standards."
  },
  {
    icon: Plug,
    title: "Integration",
    stat: "API-First",
    description: "RESTful API with comprehensive documentation. Embed site intelligence into construction tech platforms, PropTech apps, and enterprise workflows."
  }
];

const Differentiators = () => {
  return (
    <section id="differentiators" className="py-24 px-6 bg-gradient-to-b from-muted/20 to-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-serif font-bold">
            Why Leading Firms Choose Atlasly
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            The competitive advantages that matter for site analysis at scale
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {differentiators.map((point, index) => {
            const Icon = point.icon;
            
            return (
              <div
                key={index}
                className="relative bg-card rounded-2xl p-8 border border-border/50 hover:border-primary/30 hover:shadow-xl transition-all duration-300 group"
              >
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-8 h-8 text-primary" strokeWidth={1.5} />
                  </div>
                  <div className="space-y-3 flex-1">
                    <div>
                      <div className="text-2xl font-bold text-primary mb-1">
                        {point.stat}
                      </div>
                      <h3 className="text-xl font-serif font-bold">
                        {point.title}
                      </h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {point.description}
                    </p>
                  </div>
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
