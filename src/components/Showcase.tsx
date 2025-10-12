import { Button } from "@/components/ui/button";
import abstractForms from "@/assets/abstract-forms.jpg";

const benefits = [
  {
    category: "Data",
    items: [
      "OpenStreetMap layers",
      "SRTM elevation data",
      "Mapbox aerial imagery",
      "Coordinate transformation",
    ],
  },
  {
    category: "Workflow",
    items: [
      "One-click generation",
      "Async job processing",
      "Real-time progress",
      "Cloud storage",
    ],
  },
  {
    category: "Output Formats",
    items: [
      "DXF for CAD",
      "GeoJSON for GIS",
      "GLB for 3D",
      "IFC for BIM (Pro)",
    ],
  },
];

const Showcase = () => {
  return (
    <section id="specifications" className="py-20 px-6">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 order-2 lg:order-1">
            <div className="space-y-4">
              <h2 className="text-5xl md:text-6xl font-serif font-bold">
                See the Big Picture
              </h2>
              <p className="text-lg text-muted-foreground">
                From raw coordinates to refined 3D models, our pipeline handles 
                every step of the architectural site preparation workflow.
              </p>
            </div>
            
            <div className="space-y-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="border-l-2 border-primary pl-4">
                  <h3 className="font-semibold mb-2">{benefit.category}</h3>
                  <ul className="space-y-1">
                    {benefit.items.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            
            <Button variant="hero" size="lg">
              Explore Features →
            </Button>
          </div>
          
          <div className="order-1 lg:order-2">
            <div className="rounded-3xl overflow-hidden shadow-strong">
              <img
                src={abstractForms}
                alt="Minimalist architectural forms in warm tones"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Showcase;
