import { Button } from "@/components/ui/button";
import heroLandscape from "@/assets/hero-landscape.jpg";

const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-serif font-bold leading-tight">
                Browse everything.
              </h1>
              <p className="text-lg text-muted-foreground max-w-md">
                Transform any location into a complete architectural site pack with GIS layers, 
                terrain data, and export-ready formats.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <Button variant="hero" size="xl" onClick={() => window.location.href = '/generate'}>
                Get Started
              </Button>
              <Button variant="outline" size="xl" onClick={() => window.location.href = '/generate'}>
                View Demo
              </Button>
            </div>
            
            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-secondary border-2 border-background"
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Trusted by architects & urban planners worldwide
              </p>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-accent/30 rounded-3xl -rotate-6 transform transition-spring"></div>
            <div className="relative rounded-3xl overflow-hidden shadow-strong">
              <img
                src={heroLandscape}
                alt="3D GIS terrain visualization showing topographic data"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
