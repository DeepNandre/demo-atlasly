import { Button } from "@/components/ui/button";
import topo3d from "@/assets/topo-3d.jpg";

const steps = [
  {
    number: "01",
    title: "Select Location",
    description: "Search address or drop a pin on the map. Draw a custom boundary or use automatic radius.",
  },
  {
    number: "02",
    title: "Configure & Generate",
    description: "Choose your export formats and data layers. Click generate and track progress in real-time.",
  },
  {
    number: "03",
    title: "Download & Import",
    description: "Get your complete site pack as a ZIP. Import directly into your CAD, GIS, or BIM software.",
  },
];

const Process = () => {
  return (
    <section id="how-to" className="py-20 px-6">
      <div className="container mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-5xl md:text-6xl font-serif font-bold">
            Map Your Success
          </h2>
          <Button variant="outline" size="lg">
            Watch Tutorial →
          </Button>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => (
            <div key={index} className="space-y-4">
              <div className="text-6xl font-serif font-bold text-primary/20">
                {step.number}
              </div>
              <h3 className="text-2xl font-serif font-semibold">
                {step.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
        
        <div className="rounded-3xl overflow-hidden shadow-strong">
          <img
            src={topo3d}
            alt="3D topographic terrain model with elevation data and urban features"
            className="w-full h-auto"
          />
        </div>
      </div>
    </section>
  );
};

export default Process;
