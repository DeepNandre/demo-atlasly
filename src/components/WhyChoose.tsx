import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const features = [
  ["AI-powered solar analysis", "GPU-accelerated processing", "NREL-standard accuracy"],
  ["12+ global data sources", "Real-time climate data", "Sub-meter precision terrain"],
  ["Zero manual cleanup", "Enterprise-grade security", "99.9% uptime SLA"],
];

const WhyChoose = () => {
  return (
    <section className="py-20 px-6 bg-accent/20">
      <div className="container mx-auto">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-600 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Trusted by Industry Leaders
          </div>
          <h2 className="text-5xl md:text-6xl font-serif font-bold">
            Why the world's top firms
            <span className="text-primary"> choose Area.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            While competitors still rely on outdated manual processes, Area delivers 
            enterprise-grade AI infrastructure that transforms how architectural teams approach site analysis.
            <span className="block mt-4 font-semibold text-foreground">
              Join 1,200+ professionals who've already made the switch.
            </span>
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button variant="hero" size="lg" onClick={() => window.location.href = '/generate'}>
              Start Building Your First Site Pack →
            </Button>
            <Button variant="outline" size="lg">
              Talk to Our Team
            </Button>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {features.map((column, colIndex) => (
            <div key={colIndex} className="space-y-4">
              {column.map((feature, index) => (
                <div
                  key={index}
                  className="bg-card rounded-xl p-5 shadow-soft hover:shadow-medium transition-all duration-300 flex items-start gap-3 border border-primary/10 hover:border-primary/20"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{feature}</span>
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
