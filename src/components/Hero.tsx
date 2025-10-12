import { Button } from "@/components/ui/button";
import { marketingContent } from "@/lib/content";
import DemoVideo from "@/components/DemoVideo";
import MetricDots from "@/components/MetricDots";
import { useEffect, useState } from "react";

const Hero = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      {/* Subtle topography background */}
      <div 
        className="absolute inset-0 opacity-[0.04] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0idG9wbyIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiPjxwYXRoIGQ9Ik0yMCwxMDBjMjAsMCw0MCwxMCw2MCwwYzIwLTEwLDQwLDEwLDYwLDBjMjAsLTEwLDQwLDEwLDYwLDBNMCwxNDBjMjAsMCw0MCwxMCw2MCwwYzIwLC0xMCw0MCwxMCw2MCwwYzIwLC0xMCw0MCwxMCw2MCwwYzIwLC0xMCw0MCwxMCw2MCwwTTAsNjBjMjAsMCw0MCwxMCw2MCwwYzIwLC0xMCw0MCwxMCw2MCwwYzIwLC0xMCw0MCwxMCw2MCwwYzIwLC0xMCw0MCwxMCw2MCwwIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI3RvcG8pIi8+PC9zdmc+')] 
        [animation-play-state:paused]"
        style={{ animationPlayState: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'paused' : 'running' }}
      />
      
      <div className="container mx-auto" style={{ minHeight: '600px' }}>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className={`space-y-8 transform transition-all duration-300 ease-out ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold leading-tight tracking-tight">
                We built the world's first{" "}
                <span className="text-primary">Built-Environment Intelligence OS</span>
              </h1>
              <div className="space-y-4">
                {marketingContent.hero.subheadline.split('\n\n').map((line, index) => (
                  <p key={index} className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                    {line}
                  </p>
                ))}
              </div>
            </div>
            
            <div className={`flex flex-wrap gap-4 transform transition-all duration-300 ease-out delay-100 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <Button 
                variant="hero" 
                size="xl" 
                className="rounded-lg"
                onClick={() => window.location.href = '/generate'}
              >
                {marketingContent.hero.primaryCTA}
              </Button>
              <Button 
                variant="outline" 
                size="xl"
                className="rounded-lg"
              >
                {marketingContent.hero.secondaryCTA}
              </Button>
            </div>
            
            <MetricDots 
              metrics={marketingContent.hero.metrics}
              className={`pt-4 transform transition-all duration-300 ease-out delay-200 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
            />
          </div>
          
          <div className="relative">
            <DemoVideo
              src="/demo-loop.mp4"
              poster="/demo-poster.jpg"
              caption="SiteIQ demo showing boundary detection, data fusion, 3D terrain generation, and CAD export workflow"
              className="shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
