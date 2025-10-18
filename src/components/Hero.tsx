import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const Hero = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden bg-background">
      <div className="container mx-auto" style={{ minHeight: '600px' }}>
        <div className="max-w-6xl mx-auto text-center">
          <div className={`space-y-8 transform transition-all duration-300 ease-out ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div className="space-y-6">
              <p className="text-lg text-foreground/70">Transform any location into actionable intelligence</p>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold leading-tight tracking-tight">
                AI-Powered Site Analysis{" "}
                <span className="text-primary">in Minutes, Not Weeks</span>
              </h1>
              <div className="space-y-4">
                <p className="text-xl text-foreground/80 leading-relaxed max-w-3xl mx-auto">
                  Comprehensive terrain, solar, climate, and feasibility data. 
                  Built for architects and developers who need fast, accurate site analysis.
                </p>
              </div>
            </div>
            
            <div className={`flex flex-wrap justify-center gap-4 transform transition-all duration-300 ease-out delay-100 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <Button 
                variant="hero" 
                size="xl" 
                className="rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                onClick={() => window.location.href = '/generate'}
              >
                Start Free Analysis Now
              </Button>
              <Button 
                variant="outline" 
                size="xl"
                className="rounded-lg"
                onClick={() => window.location.href = '/dashboard'}
              >
                View API Docs →
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground pt-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                <span>2-minute setup</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                <span>Export-ready data</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🚀</span>
                <span>Enterprise scale</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
