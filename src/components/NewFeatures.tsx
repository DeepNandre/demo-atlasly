import { Sparkles, Zap, Brain, Cloud } from "lucide-react";

const NewFeatures = () => {
  const features = [
    {
      icon: Sparkles,
      title: "AI Site Analysis",
      description: "Natural language insights about feasibility, opportunities, and constraints"
    },
    {
      icon: Zap,
      title: "Solar Intelligence",
      description: "Radiation analysis, shading patterns, and energy generation estimates"
    },
    {
      icon: Brain,
      title: "Design Assistant",
      description: "AI-powered recommendations based on site context and constraints"
    },
    {
      icon: Cloud,
      title: "Climate Data",
      description: "Historical and future climate patterns including extremes and trends"
    }
  ];

  return (
    <section id="new-features" className="py-32 px-6 bg-muted/20">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-20 space-y-6">
          <h2 className="text-5xl md:text-6xl font-serif font-bold">
            New Capabilities
          </h2>
          <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto">
            Recently launched features that expand what's possible with automated site intelligence
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="text-center space-y-4"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
                  <Icon className="w-8 h-8 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-serif font-semibold">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground font-light leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default NewFeatures;
