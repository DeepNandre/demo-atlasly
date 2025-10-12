import { Button } from "@/components/ui/button";
import heroLandscape from "@/assets/hero-landscape.jpg";

const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                AI-Powered Site Analysis Revolution
              </div>
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-serif font-bold leading-tight">
                Site analysis in 
                <span className="text-primary"> minutes</span>, not weeks.
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                The world's first AI-powered platform that instantly transforms any location into 
                production-ready architectural site packs. Complete with solar analysis, 3D terrain 
                modeling, and professional exports.
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                  <span>78% faster than traditional methods</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                  <span>NREL-standard accuracy</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <Button variant="hero" size="xl" onClick={() => window.location.href = '/generate'}>
                Start Building Site Packs →
              </Button>
              <Button variant="outline" size="xl" onClick={() => window.location.href = '/generate'}>
                See Live Demo
              </Button>
            </div>
            
            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 border-2 border-background flex items-center justify-center text-xs font-bold text-primary"
                  >
                    {i === 1 && "🏢"}
                    {i === 2 && "🏗️"}
                    {i === 3 && "🏛️"}
                    {i === 4 && "🌆"}
                    {i === 5 && "📐"}
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Trusted by 1,200+ architects across 40+ countries
                </p>
                <p className="text-xs text-muted-foreground">
                  From boutique studios to Fortune 500 firms
                </p>
              </div>
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
