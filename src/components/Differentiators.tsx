import { Target, Globe, Layers, Clock } from "lucide-react";

const Differentiators = () => {
  const differentiators = [
    {
      icon: Target,
      title: "Purpose-Built",
      description: "Designed specifically for architects and developers—not a generic mapping tool with feasibility as an afterthought."
    },
    {
      icon: Globe,
      title: "Global Coverage",
      description: "Analyze any site worldwide with data fusion from multiple authoritative sources across all continents."
    },
    {
      icon: Layers,
      title: "Multi-Format Export",
      description: "DXF, GeoTIFF, PDF, GLB, and more. Import directly into your CAD or BIM workflow."
    },
    {
      icon: Clock,
      title: "30-Second Analysis",
      description: "What takes 2-4 weeks manually now happens in seconds. Focus on design, not data gathering."
    }
  ];

  return (
    <section id="differentiators" className="py-32 px-6 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-20 space-y-6">
          <h2 className="text-5xl md:text-6xl font-serif font-bold">
            What Sets Us Apart
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          {differentiators.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
                  <Icon className="w-8 h-8 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-serif font-semibold">
                  {item.title}
                </h3>
                <p className="text-muted-foreground font-light leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Differentiators;