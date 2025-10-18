import { TrendingDown, Clock, Zap, Target } from "lucide-react";
import { Card } from "./ui/card";

const Features = () => {
  const features = [
    {
      icon: Clock,
      stat: "2 Minutes",
      label: "Average Analysis Time",
      description: "Complete site intelligence delivered faster than you can grab coffee"
    },
    {
      icon: TrendingDown,
      stat: "99%",
      label: "Cost Reduction",
      description: "From $50k+ consultant fees to automated intelligence at scale"
    },
    {
      icon: Zap,
      stat: "15+",
      label: "Data Layers",
      description: "Terrain, solar, climate, buildings, infrastructure in one platform"
    },
    {
      icon: Target,
      stat: "Export Ready",
      label: "Multiple Formats",
      description: "DXF, GeoJSON, PDF, CSV - integrate with any workflow"
    }
  ];

  return (
    <section id="features" className="py-24 px-6 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16 space-y-6">
          <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight">
            Site Intelligence That Moves at the Speed of Business
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Stop waiting weeks for consultant reports. Get actionable geospatial data instantly.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index}
                className="p-6 text-center hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30"
              >
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-primary" strokeWidth={1.5} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-primary">
                    {feature.stat}
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {feature.label}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
