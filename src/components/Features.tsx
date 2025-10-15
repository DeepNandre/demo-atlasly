import { Check } from "lucide-react";

const Features = () => {
  const painPoints = [
    "Manual site analysis takes 2-4 weeks and costs $50k-$200k per project",
    "80% of feasibility work is just data gathering that could be automated",
    "No API access to geospatial intelligence for construction tech platforms",
    "Architects waste time on sites that won't get approved or are too costly"
  ];

  return (
    <section id="problem" className="py-24 px-6 bg-background">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-16 space-y-8">
          <h2 className="text-5xl md:text-6xl font-serif font-bold leading-tight">
            The $50B Manual Analysis Problem
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            Every year, architects and developers spend billions on manual feasibility studies. 
            Most of this work is repetitive data gathering that should be automated.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 mt-16">
          {painPoints.map((point, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-6 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-4 h-4 text-primary" strokeWidth={2.5} />
              </div>
              <span className="text-foreground font-medium leading-relaxed text-lg">
                {point}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
