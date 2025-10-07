import { Database, Map, FileCode, Layers } from "lucide-react";
import terrainFeature from "@/assets/terrain-feature.jpg";

const features = [
  {
    icon: Map,
    title: "Precision Mapping",
    description: "Drop a pin or search any address. Define your site boundary with custom polygons or automatic radius selection.",
  },
  {
    icon: Layers,
    title: "Multi-Layer Data",
    description: "Buildings, roads, land use from OpenStreetMap. Elevation from SRTM. Optional aerial imagery from Mapbox.",
  },
  {
    icon: FileCode,
    title: "Universal Exports",
    description: "Download as DXF, GeoJSON, GLB, or IFC. All files include proper coordinate systems and metadata.",
  },
  {
    icon: Database,
    title: "Complete Site Pack",
    description: "Everything bundled in one ZIP: cleaned GIS layers, terrain models, imagery, and documentation.",
  },
];

const Features = () => {
  return (
    <section id="benefits" className="py-20 px-6 bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-5xl md:text-6xl font-serif font-bold">
            We've cracked the code.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our advanced data pipeline transforms raw geographic information into 
            production-ready architectural assets in minutes.
          </p>
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
