import { marketingContent } from "@/lib/content";

const Process = () => {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-muted/20">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-serif font-bold">
            {marketingContent.howItWorks.title}
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-12 mb-16">
          {marketingContent.howItWorks.steps.map((step, index) => (
            <div key={index} className="relative space-y-6">
              <div className="text-[120px] font-serif font-bold text-muted/10 leading-none">
                {step.number}
              </div>
              <h3 className="text-2xl font-serif font-bold -mt-4">
                {step.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                {step.description}
              </p>
            </div>
          ))}
        </div>
        
        {/* Animated data stack visualization */}
        <div className="flex justify-center pt-8">
          <div className="relative">
            <div className="flex gap-3 items-end">
              <div className="w-20 h-16 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-2 border-blue-200 dark:border-blue-800 flex items-center justify-center text-sm font-semibold text-blue-700 dark:text-blue-300">
                Map
              </div>
              <div className="w-20 h-20 bg-primary/10 rounded-lg border-2 border-primary/30 flex items-center justify-center text-sm font-semibold text-primary">
                Terrain
              </div>
              <div className="w-20 h-18 bg-orange-50 dark:bg-orange-950/30 rounded-lg border-2 border-orange-200 dark:border-orange-800 flex items-center justify-center text-sm font-semibold text-orange-700 dark:text-orange-300">
                Climate
              </div>
              <div className="w-20 h-24 bg-muted/50 rounded-lg border-2 border-border flex items-center justify-center text-sm font-semibold text-foreground">
                3D
              </div>
            </div>
            <div className="text-center mt-6 text-base text-muted-foreground font-medium">
              Real-time data fusion
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Process;
