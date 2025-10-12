import { marketingContent } from "@/lib/content";

const Process = () => {
  return (
    <section id="how-it-works" className="py-20 px-6">
      <div className="container mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-serif font-bold">
            {marketingContent.howItWorks.title}
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {marketingContent.howItWorks.steps.map((step, index) => (
            <div key={index} className="relative space-y-4">
              <div className="text-6xl font-serif font-bold text-primary/20">
                {step.number}
              </div>
              <h3 className="text-2xl font-serif font-semibold">
                {step.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>
              
              {/* Connection line for desktop */}
              {index < marketingContent.howItWorks.steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-primary/30 to-transparent transform translate-x-4" />
              )}
            </div>
          ))}
        </div>
        
        {/* Animated data stack visualization */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="flex gap-2 items-end">
              <div className="w-16 h-12 bg-blue-100 rounded border-2 border-blue-300 flex items-center justify-center text-xs font-semibold text-blue-700">
                Map
              </div>
              <div className="w-16 h-16 bg-green-100 rounded border-2 border-green-300 flex items-center justify-center text-xs font-semibold text-green-700">
                Terrain
              </div>
              <div className="w-16 h-14 bg-orange-100 rounded border-2 border-orange-300 flex items-center justify-center text-xs font-semibold text-orange-700">
                Climate
              </div>
              <div className="w-16 h-20 bg-primary/10 rounded border-2 border-primary/30 flex items-center justify-center text-xs font-semibold text-primary">
                3D
              </div>
            </div>
            <div className="text-center mt-4 text-sm text-muted-foreground">
              Real-time data fusion
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Process;
