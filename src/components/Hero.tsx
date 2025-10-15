import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import heroImage from "@/assets/hero-landscape.jpg";

const Hero = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      {/* Background image with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-background/60" />
      </div>
      
      <div className="container mx-auto relative z-10" style={{ minHeight: '600px' }}>
        <div className="max-w-6xl mx-auto text-center">
          <div className={`space-y-8 transform transition-all duration-300 ease-out ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div className="space-y-6">
              <p className="text-lg text-foreground/70">Transform any location into actionable intelligence</p>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold leading-tight tracking-tight">
                Geospatial Intelligence{" "}
                <span className="text-primary">for the Built Environment</span>
              </h1>
              <div className="space-y-4">
                <p className="text-xl text-foreground/80 leading-relaxed max-w-3xl mx-auto">
                  Terrain, solar, climate, and feasibility data in minutes, not weeks.
                  Built for architects and developers who need fast, accurate site analysis.
                </p>
              </div>
            </div>
            
            <div className={`flex flex-wrap justify-center gap-4 transform transition-all duration-300 ease-out delay-100 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <Button 
                variant="hero" 
                size="xl" 
                className="rounded-lg"
                onClick={() => window.location.href = '/generate'}
              >
                Start Your Free Analysis
              </Button>
              <Button 
                variant="outline" 
                size="xl"
                className="rounded-lg"
                onClick={() => window.location.href = '/dashboard'}
              >
                Get API Access →
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
