import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import heroImage from "@/assets/hero-landscape.jpg";

const Hero = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Full-screen background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/30 to-background/60" />
      </div>
      
      {/* Content */}
      <div className="container mx-auto px-6 relative z-10">
        <div className={`max-w-5xl mx-auto text-center space-y-12 transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          {/* Tagline */}
          <p className="text-lg md:text-xl text-foreground/70 font-light tracking-wide">
            Transform any location into actionable intelligence
          </p>
          
          {/* Main Heading */}
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-serif font-bold leading-tight tracking-tight">
            Geospatial Intelligence{" "}
            <span className="text-primary">for the Built Environment</span>
          </h1>
          
          {/* Supporting text */}
          <p className="text-xl md:text-2xl text-foreground/80 leading-relaxed max-w-3xl mx-auto font-light">
            Terrain, solar, climate, and feasibility data in minutes, not weeks. 
            Built for architects and developers who need fast, accurate site analysis.
          </p>
          
          {/* CTA Button */}
          <div className={`pt-8 transform transition-all duration-1000 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <Button 
              variant="hero" 
              size="xl" 
              className="rounded-lg px-12 py-7 text-lg"
              onClick={() => window.location.href = '/generate'}
            >
              Start Your Free Analysis
            </Button>
          </div>
        </div>
      </div>
      
      {/* Bottom text sections - like the reference */}
      <div className="absolute bottom-12 left-0 right-0 z-10">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto text-center md:text-left">
            <div>
              <h3 className="font-serif text-lg font-semibold underline decoration-primary decoration-2 underline-offset-4 mb-2">
                API Platform
              </h3>
              <p className="text-sm text-foreground/70 font-light">
                RESTful API for seamless integration into your construction tech platform or workflow automation.
              </p>
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold underline decoration-primary decoration-2 underline-offset-4 mb-2">
                AI-Powered Analysis
              </h3>
              <p className="text-sm text-foreground/70 font-light">
                Intelligent site feasibility insights using advanced AI to identify opportunities and constraints.
              </p>
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold underline decoration-primary decoration-2 underline-offset-4 mb-2">
                30-Second Results
              </h3>
              <p className="text-sm text-foreground/70 font-light">
                From location pin to complete site pack with terrain models, solar analysis, and climate data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
