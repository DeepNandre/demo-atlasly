const Features = () => {
  const insights = [
    {
      title: "The $50B Problem",
      description: "Manual site analysis costs $50k-$200k per project and takes 2-4 weeks of repetitive data gathering."
    },
    {
      title: "Automated Intelligence",
      description: "80% of feasibility work is data collection that should be automated—terrain, solar, climate, and context."
    },
    {
      title: "API-First Platform",
      description: "First geospatial intelligence API for construction tech—integrate site analysis into your workflow."
    },
    {
      title: "Smart Site Selection",
      description: "Stop wasting time on unfeasible sites. Know the constraints and opportunities before you invest."
    }
  ];

  return (
    <section id="problem" className="py-32 px-6 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-20 space-y-6">
          <h2 className="text-5xl md:text-6xl font-serif font-bold leading-tight">
            Why This Matters
          </h2>
          <p className="text-xl text-muted-foreground font-light max-w-3xl mx-auto">
            Billions are spent annually on manual feasibility studies. Most of this is repetitive work that can be automated.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-x-16 gap-y-12">
          {insights.map((insight, index) => (
            <div key={index} className="space-y-3">
              <h3 className="text-2xl font-serif font-semibold">
                {insight.title}
              </h3>
              <p className="text-lg text-muted-foreground font-light leading-relaxed">
                {insight.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
