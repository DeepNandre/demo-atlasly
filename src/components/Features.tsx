import { Database, Map, FileCode, Layers } from "lucide-react";
import terrainFeature from "@/assets/terrain-feature.jpg";

const features = [
  {
    icon: Map,
    title: "AI-Powered Boundary Detection",
    description: "Neural networks automatically identify optimal site boundaries from satellite imagery and property data. 95% more accurate than manual selection.",
  },
  {
    icon: Layers,
    title: "Real-Time Data Fusion",
    description: "Live integration of 12+ global data sources: OpenStreetMap, USGS elevation, Open-Meteo climate, and more. Updated every 24 hours.",
  },
  {
    icon: FileCode,
    title: "Intelligent Export Engine",
    description: "AI optimizes file formats for your specific use case. AutoCAD-ready DXF, Rhino GLB, Revit IFC, and more with zero manual cleanup.",
  },
  {
    icon: Database,
    title: "Enterprise-Grade Processing",
    description: "Cloud infrastructure handles sites up to 10km² with sub-meter precision. Processing that would take weeks now completes in under 3 minutes.",
  },
];

const Features = () => {
  return (
    <section id="benefits" className="py-20 px-6 bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
            Powered by Advanced AI & Machine Learning
          </div>
          <h2 className="text-5xl md:text-6xl font-serif font-bold">
            The future of site analysis
            <span className="text-primary"> is here.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Revolutionary AI infrastructure that processes terabytes of geospatial data in real-time, 
            delivering production-ready architectural assets faster than you ever thought possible.
          </p>
          <div className="flex items-center justify-center gap-6 pt-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-muted-foreground">500,000+ cells analyzed per second</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span className="text-muted-foreground">12 global data sources</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <span className="text-muted-foreground">Sub-meter precision</span>
            </div>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-card rounded-2xl p-6 shadow-soft hover:shadow-medium transition-smooth"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-serif font-semibold mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
        
        <div className="rounded-3xl overflow-hidden shadow-strong">
          <img
            src={terrainFeature}
            alt="Dramatic geological terrain showing natural earth patterns"
            className="w-full h-[500px] object-cover"
          />
        </div>
      </div>
    </section>
  );
};

export default Features;
