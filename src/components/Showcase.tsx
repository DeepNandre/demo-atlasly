import { Layers, Sun, Cloud, Building2 } from "lucide-react";

const capabilities = [
  {
    icon: Layers,
    title: "Terrain Analysis",
    description: "High-resolution elevation data, contours, slope analysis, and 3D terrain modeling for accurate grading plans",
    features: ["DEM Processing", "Contour Generation", "Cut/Fill Calculations"]
  },
  {
    icon: Sun,
    title: "Solar Assessment",
    description: "Year-round solar irradiance, shadow analysis, panel placement optimization, and energy production estimates",
    features: ["Shadow Mapping", "Panel Optimization", "ROI Projections"]
  },
  {
    icon: Cloud,
    title: "Climate Intelligence",
    description: "Historical weather patterns, precipitation data, temperature trends, and climate risk projections",
    features: ["Weather Patterns", "Risk Analysis", "Seasonal Trends"]
  },
  {
    icon: Building2,
    title: "Site Context",
    description: "Buildings, roads, land use, infrastructure, and zoning data for comprehensive feasibility analysis",
    features: ["Zoning Context", "Infrastructure Map", "Building Footprints"]
  }
];

const Showcase = () => {
  return (
    <section id="capabilities" className="py-24 px-6 bg-background">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-serif font-bold">
            Everything You Need for Site Intelligence
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Comprehensive geospatial analysis powered by AI and satellite data
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {capabilities.map((capability, index) => {
            const Icon = capability.icon;
            
            return (
              <div
                key={index}
                className="group relative bg-card rounded-2xl p-8 border border-border/50 hover:border-primary/30 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-8 h-8 text-primary" strokeWidth={1.5} />
                  </div>
                  <div className="space-y-4 flex-1">
                    <div>
                      <h3 className="text-2xl font-serif font-bold mb-2">
                        {capability.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {capability.description}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {capability.features.map((feature, idx) => (
                        <span 
                          key={idx}
                          className="inline-flex items-center px-3 py-1 rounded-full bg-primary/5 text-primary text-sm font-medium"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
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

export default Showcase;
