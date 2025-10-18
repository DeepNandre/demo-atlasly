import { MessageSquare, Image, Download, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

const NewFeatures = () => {
  const features = [
    {
      icon: MessageSquare,
      title: "AI Site Assistant",
      description: "Ask questions about terrain, solar potential, climate risks, and feasibility in natural language. Get instant answers grounded in real geospatial data.",
      highlight: "New"
    },
    {
      icon: Image,
      title: "3D Visualizations",
      description: "Generate professional site renders with accurate terrain, shadows, and context. Export high-resolution images for presentations and reports.",
      highlight: "Enhanced"
    },
    {
      icon: Download,
      title: "Multi-Format Export",
      description: "Export to DXF for CAD, GeoJSON for GIS, PDF for reports, CSV for spreadsheets. One-click batch export of all formats.",
      highlight: "New"
    },
    {
      icon: Sparkles,
      title: "API Access",
      description: "Integrate site intelligence into your own applications. RESTful API with comprehensive documentation and usage-based pricing.",
      highlight: "Available"
    }
  ];

  return (
    <section className="py-24 px-6 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-serif font-bold">
            Built for Modern Workflows
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From AI-powered analysis to developer APIs, we are building the future of geospatial intelligence.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index} 
                className="border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 bg-card"
              >
                <CardHeader className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-7 h-7 text-primary" strokeWidth={1.5} />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      {feature.highlight}
                    </span>
                  </div>
                  <CardTitle className="text-2xl font-serif">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed text-muted-foreground">
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
