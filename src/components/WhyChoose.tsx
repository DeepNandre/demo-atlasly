import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const features = [
  ["Fast processing", "Automated workflow", "Clean data export"],
  ["Multi-format support", "Pro IFC export", "Live 3D preview"],
  ["OpenStreetMap integration", "Terrain modeling", "Custom boundaries"],
];

const WhyChoose = () => {
  return (
    <section className="py-20 px-6 bg-accent/20">
      <div className="container mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-5xl md:text-6xl font-serif font-bold">
            Why Choose Area?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Purpose-built for architects and urban planners who need reliable, 
            production-ready site data without the manual labor.
          </p>
          <Button variant="hero" size="lg">
            Start Free Trial
          </Button>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {features.map((column, colIndex) => (
            <div key={colIndex} className="space-y-4">
              {column.map((feature, index) => (
                <div
                  key={index}
                  className="bg-card rounded-xl p-4 shadow-soft flex items-start gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{feature}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChoose;
