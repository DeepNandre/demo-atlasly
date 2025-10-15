import { Sparkles, Palette, Bot, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

const NewFeatures = () => {
  const features = [
    {
      icon: Bot,
      title: "AI Site Assistant",
      description: "Ask questions about any site and get instant, context-aware answers powered by advanced AI",
      badge: "New",
      color: "text-blue-500"
    },
    {
      icon: Palette,
      title: "Multi-Angle Renders",
      description: "Generate professional visualizations from multiple camera angles and lighting conditions automatically",
      badge: "New",
      color: "text-purple-500"
    },
    {
      icon: BarChart3,
      title: "Advanced Site Analytics",
      description: "Comprehensive feasibility scoring, climate projections, and cost estimation for informed decisions",
      badge: "Enhanced",
      color: "text-green-500"
    },
    {
      icon: Sparkles,
      title: "Smart Portfolio Management",
      description: "Manage multiple sites, compare metrics, and generate portfolio-wide reports with bulk analysis",
      badge: "Coming Soon",
      color: "text-orange-500"
    }
  ];

  return (
    <section className="py-24 px-6 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-5xl md:text-6xl font-serif font-bold">
            What's New in SiteIQ
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We're constantly shipping new features to make site analysis faster, 
            smarter, and more powerful for architects and developers.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="border-border/50 hover:border-primary/30 transition-all duration-300">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className={`w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center ${feature.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <Badge variant={feature.badge === "New" ? "default" : "secondary"}>
                      {feature.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default NewFeatures;
