import { Button } from "@/components/ui/button";
import topo3d from "@/assets/topo-3d.jpg";

const steps = [
  {
    number: "01",
    title: "AI Finds Your Site",
    description: "Simply search any address worldwide. Our AI automatically detects optimal boundaries using satellite imagery and property data. Takes 30 seconds, not 30 minutes.",
  },
  {
    number: "02",
    title: "Intelligence at Work",
    description: "Watch as our AI engine fuses 12+ global data sources in real-time. Solar analysis, terrain modeling, and climate data—all processed simultaneously with zero manual intervention.",
  },
  {
    number: "03",
    title: "Production-Ready Assets",
    description: "Download your complete site pack: AutoCAD DXF, Rhino GLB, Revit IFC, and more. Zero cleanup required. Import directly and start designing immediately.",
  },
];

const Process = () => {
  return (
    <section id="how-to" className="py-20 px-6">
      <div className="container mx-auto">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-600 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            From Search to Site Pack in 3 Minutes
          </div>
          <h2 className="text-5xl md:text-6xl font-serif font-bold">
            See the magic
            <span className="text-primary"> in action.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Watch how AI transforms site analysis from weeks of manual work into minutes of automated intelligence.
          </p>
          <Button variant="outline" size="lg">
            Watch 2-Minute Demo →
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
